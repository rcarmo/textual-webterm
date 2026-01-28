/**
 * xterm.js 6.0 terminal client for textual-webterm.
 *
 * Implements the WebSocket protocol compatible with local_server.py:
 * - Client → Server: ["stdin", data], ["resize", {width, height}], ["ping", data]
 * - Server → Client: ["stdout", data], ["pong", data], or binary frames
 */

import { Terminal, type ITerminalOptions, type ITheme } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { CanvasAddon } from "@xterm/addon-canvas";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { ClipboardAddon } from "@xterm/addon-clipboard";

/** Default font stack - prefers system monospace, falls back through programming fonts */
const DEFAULT_FONT_FAMILY =
  'ui-monospace, "SFMono-Regular", "FiraCode Nerd Font", "FiraMono Nerd Font", ' +
  '"Fira Code", "Roboto Mono", Menlo, Monaco, Consolas, "Liberation Mono", ' +
  '"DejaVu Sans Mono", "Courier New", monospace';

/** Configuration options passed via data attributes or window config */
interface TerminalConfig {
  fontFamily?: string;
  fontSize?: number;
  scrollback?: number;
  theme?: ITheme;
}

/** Parse configuration from element data attributes */
function parseConfig(element: HTMLElement): TerminalConfig {
  const config: TerminalConfig = {};

  if (element.dataset.fontFamily) {
    config.fontFamily = element.dataset.fontFamily;
  }
  if (element.dataset.fontSize) {
    config.fontSize = parseInt(element.dataset.fontSize, 10);
  }
  if (element.dataset.scrollback) {
    config.scrollback = parseInt(element.dataset.scrollback, 10);
  }

  return config;
}

/**
 * WebTerminal - wraps xterm.js with WebSocket communication.
 */
class WebTerminal {
  private terminal: Terminal;
  private socket: WebSocket | null = null;
  private fitAddon: FitAddon;
  private element: HTMLElement;
  private wsUrl: string;
  private resizeObserver: ResizeObserver | null = null;
  private resizeRaf = 0;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private resizeState: {
    isResizing: boolean;
    lastValidSize: {cols: number, rows: number} | null;
    pendingResize: {cols: number, rows: number} | null;
    resizeAttempts: number;
  } = {
    isResizing: false,
    lastValidSize: null,
    pendingResize: null,
    resizeAttempts: 0
  };
  private messageQueue: [string, unknown][] | null = null;
  private minResizeInterval = 50; // ms
  private lastResizeTime = 0;

  constructor(container: HTMLElement, wsUrl: string, config: TerminalConfig = {}) {
    this.element = container;
    this.wsUrl = wsUrl;

    // Build terminal options
    const options: ITerminalOptions = {
      allowProposedApi: true,
      fontFamily: config.fontFamily ?? DEFAULT_FONT_FAMILY,
      fontSize: config.fontSize ?? 16,
      scrollback: config.scrollback ?? 1000,
      cursorBlink: true,
      cursorStyle: "block",
      theme: config.theme,
    };

    this.terminal = new Terminal(options);

    // Initialize addons
    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);

    // Try WebGL first, fall back to Canvas
    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        webglAddon.dispose();
        this.terminal.loadAddon(new CanvasAddon());
      });
      this.terminal.loadAddon(webglAddon);
    } catch {
      this.terminal.loadAddon(new CanvasAddon());
    }

    // Unicode support for wide characters
    const unicode11 = new Unicode11Addon();
    this.terminal.loadAddon(unicode11);
    this.terminal.unicode.activeVersion = "11";

    // Clickable URLs
    this.terminal.loadAddon(new WebLinksAddon());

    // Clipboard integration
    this.terminal.loadAddon(new ClipboardAddon());

    // Open terminal in container
    this.terminal.open(container);

    // Handle terminal input
    this.terminal.onData((data) => {
      this.send(["stdin", data]);
    });

    // Handle resize with validation
    this.terminal.onResize(({ cols, rows }) => {
      if (this.isValidSize(cols, rows)) {
        this.resizeState.lastValidSize = { cols, rows };
        this.send(["resize", { width: cols, height: rows }]);
      } else {
        console.warn(`Invalid resize dimensions: ${cols}x${rows}`);
        if (this.resizeState.lastValidSize) {
          // Restore valid size
          this.terminal.resize(
            this.resizeState.lastValidSize.cols,
            this.resizeState.lastValidSize.rows
          );
        }
      }
    });

    this.ensureInitialFit();

    // Fit to container and handle resize changes
    this.scheduleFit();
    
    // Enhanced window resize handling with throttling
    const throttledWindowResize = this.createThrottledHandler(() => this.scheduleFit(), 100);
    window.addEventListener("resize", throttledWindowResize);
    
    // Enhanced resize observer that also watches parent elements
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver((entries) => {
        // Debounce multiple entries from the same resize event
        this.scheduleFit();
      });
      
      this.resizeObserver.observe(container);
      
      // Also observe parent elements up to body to catch layout changes
      let parent = container.parentElement;
      while (parent && parent !== document.body && parent !== document.documentElement) {
        this.resizeObserver.observe(parent);
        parent = parent.parentElement;
      }
    }

    // Connect WebSocket
    this.connect();
  }

  private ensureInitialFit(): void {
    if (!("fonts" in document)) {
      return;
    }
    document.fonts.ready
      .then(() => this.scheduleFit())
      .catch(() => {
        // Ignore font readiness errors; resize observer will handle future resizes.
      });
  }

  /** Fit terminal to container size */
  /** Fit terminal to container size with state management */
  fit(): void {
    const now = Date.now();
    
    // Throttle rapid resize attempts
    if (now - this.lastResizeTime < this.minResizeInterval) {
      return;
    }
    
    if (this.resizeState.isResizing) {
      return;
    }
    
    // Check if terminal is ready before attempting fit
    if (!this.isTerminalReady()) {
      console.debug("Terminal not ready for fit operation, skipping");
      return;
    }
    
    try {
      this.resizeState.isResizing = true;
      this.resizeState.resizeAttempts++;
      this.lastResizeTime = now;
      
      // Wrap FitAddon operation in additional safety check
      if (this.fitAddon && typeof this.fitAddon.fit === 'function') {
        this.fitAddon.fit();
        this.resizeState.resizeAttempts = 0; // Reset on success
      } else {
        throw new Error("FitAddon not properly initialized");
      }
      
    } catch (e) {
      console.warn("Fit failed:", e);
      this.handleResizeFailure();
    } finally {
      this.resizeState.isResizing = false;
    }
  }
  
  /** Handle resize failures with fallback logic */
  private handleResizeFailure(): void {
    if (this.resizeState.resizeAttempts > 3) {
      if (this.resizeState.lastValidSize) {
        // Restore last known good size
        console.warn("Restoring last valid terminal size:", this.resizeState.lastValidSize);
        this.terminal.resize(
          this.resizeState.lastValidSize.cols,
          this.resizeState.lastValidSize.rows
        );
      } else {
        // Use reasonable fallback
        const fallback = { cols: 80, rows: 24 };
        console.warn("Using fallback terminal dimensions:", fallback);
        this.terminal.resize(fallback.cols, fallback.rows);
        this.resizeState.lastValidSize = fallback;
      }
      this.resizeState.resizeAttempts = 0;
    }
  }
  
  /** Check if terminal is ready for resize operations */
  private isTerminalReady(): boolean {
    try {
      // Check if terminal exists
      if (!this.terminal) {
        return false;
      }
      
      // Check if terminal core is initialized
      if (!this.terminal._core) {
        return false;
      }
      
      const core = this.terminal._core;
      
      // Check if viewport is available (FitAddon requirement)
      if (!core.viewport) {
        return false;
      }
      
      // Check if viewport has scrollBarWidth (this is what was failing)
      if (core.viewport.scrollBarWidth === undefined) {
        return false;
      }
      
      // Check if render service exists
      if (!core._renderService) {
        return false;
      }
      
      // Check if render service has dimensions
      const renderService = core._renderService;
      if (!renderService.dimensions) {
        return false;
      }
      
      // Check if cell dimensions are valid
      const dims = renderService.dimensions;
      if (dims.css.cell.width === 0 || dims.css.cell.height === 0) {
        return false;
      }
      
      // Additional safety check for FitAddon internal state
      if (this.fitAddon) {
        try {
          // Try to access FitAddon's terminal reference
          const fitTerminal = (this.fitAddon as any)._terminal;
          if (!fitTerminal || fitTerminal !== this.terminal) {
            return false;
          }
        } catch (e) {
          // FitAddon might not have the expected structure
          return false;
        }
      }
      
      return true;
    } catch (e) {
      console.warn("Terminal readiness check failed:", e);
      return false;
    }
  }
  
  /** Validate terminal dimensions */
  private isValidSize(cols: number, rows: number): boolean {
    return cols >= 10 && cols <= 500 && rows >= 5 && rows <= 200;
  }

  /** Schedule fit operation with enhanced debouncing */
  private scheduleFit(): void {
    if (this.resizeRaf) {
      window.cancelAnimationFrame(this.resizeRaf);
    }
    
    this.resizeRaf = window.requestAnimationFrame(() => {
      this.resizeRaf = 0;
      this.fit();
    });
  }

  /** Connect to WebSocket server */
  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    this.socket = new WebSocket(this.wsUrl);
    this.socket.binaryType = "arraybuffer";

    this.socket.addEventListener("open", () => {
      this.reconnectAttempts = 0;
      this.element.classList.add("-connected");
      this.element.classList.remove("-disconnected");

      // Process any queued messages immediately
      this.processMessageQueue();

      // Send initial size.
      // Important: the PTY hard-wraps output based on its initial cols/rows.
      // If we send a resize before fonts/layout settle, the initial cols can be
      // too small and the shell will wrap permanently.

      const init = () => {
        const fallback = { cols: 132, rows: 45 };
        const maxAttempts = 120;

        const attemptFitAndResize = (attempt: number) => {
          // Check terminal readiness before calling proposeDimensions to avoid
          // "viewport.scrollBarWidth" errors when terminal is not fully initialized
          if (!this.isTerminalReady()) {
            if (attempt < maxAttempts) {
              window.requestAnimationFrame(() => attemptFitAndResize(attempt + 1));
              return;
            }
            // Terminal not ready after max attempts - use fallback directly
            // Don't call proposeDimensions() as it will throw
            console.warn("Terminal not ready after max attempts, using fallback dimensions");
            this.terminal.resize(fallback.cols, fallback.rows);
            this.resizeState.lastValidSize = fallback;
            this.send(["resize", { width: fallback.cols, height: fallback.rows }]);
            return;
          }
          
          const dims = (() => {
            try {
              return this.fitAddon.proposeDimensions();
            } catch (e) {
              console.warn("proposeDimensions failed:", e);
              return undefined;
            }
          })();
          if (!dims) {
            if (attempt < maxAttempts) {
              window.requestAnimationFrame(() => attemptFitAndResize(attempt + 1));
              return;
            }
            this.terminal.resize(fallback.cols, fallback.rows);
            this.resizeState.lastValidSize = fallback;
            this.send(["resize", { width: fallback.cols, height: fallback.rows }]);
            return;
          }

          // Validate dimensions and terminal readiness before applying
          // Use a defensive approach with multiple fallback strategies
          try {
            if (dims && this.isValidSize(dims.cols, dims.rows) && this.isTerminalReady()) {
              this.terminal.resize(dims.cols, dims.rows);
              this.resizeState.lastValidSize = dims;
              this.send(["resize", { width: dims.cols, height: dims.rows }]);
            } else {
              const reason = !dims ? "proposeDimensions failed" : 
                            !this.isValidSize(dims.cols, dims.rows) ? `invalid dimensions: ${dims.cols}x${dims.rows}` :
                            "terminal not ready";
              console.warn(`Initial fit ${reason}, using fallback`);
              this.terminal.resize(fallback.cols, fallback.rows);
              this.resizeState.lastValidSize = fallback;
              this.send(["resize", { width: fallback.cols, height: fallback.rows }]);
            }
          } catch (e) {
            console.warn(`Initial fit failed with exception: ${e.message}, using fallback`);
            // If anything goes wrong, use the fallback dimensions
            this.terminal.resize(fallback.cols, fallback.rows);
            this.resizeState.lastValidSize = fallback;
            this.send(["resize", { width: fallback.cols, height: fallback.rows }]);
          }
        };

        window.requestAnimationFrame(() => attemptFitAndResize(0));
      };

      if ("fonts" in document) {
        document.fonts.ready.then(init).catch(init);
      } else {
        init();
      }
      
      // Add a timeout-based fallback in case the initial fit never succeeds
      const fallbackTimeout = setTimeout(() => {
        if (!this.resizeState.lastValidSize) {
          console.warn("Initial fit timed out, applying fallback dimensions");
          const fallback = { cols: 80, rows: 24 };
          try {
            this.terminal.resize(fallback.cols, fallback.rows);
            this.resizeState.lastValidSize = fallback;
            this.send(["resize", { width: fallback.cols, height: fallback.rows }]);
          } catch (e) {
            console.error("Fallback resize failed:", e);
          }
        }
      }, 2000);
      
      // Clean up timeout when WebSocket connects
      this.socket?.addEventListener('open', () => {
        clearTimeout(fallbackTimeout);
      });

      // Focus terminal
      this.terminal.focus();
    });

    this.socket.addEventListener("close", () => {
      this.element.classList.remove("-connected");
      this.element.classList.add("-disconnected");
      this.scheduleReconnect();
    });

    this.socket.addEventListener("error", () => {
      // Error handling - close event will follow
    });

    this.socket.addEventListener("message", (event) => {
      this.handleMessage(event.data);
    });
  }

  /** Handle incoming WebSocket message */
  private handleMessage(data: string | ArrayBuffer): void {
    if (data instanceof ArrayBuffer) {
      // Binary data - write directly to terminal
      const text = new TextDecoder().decode(data);
      this.terminal.write(text);
      return;
    }

    // JSON message
    try {
      const envelope = JSON.parse(data) as [string, unknown];
      const [type, payload] = envelope;

      switch (type) {
        case "stdout":
          this.terminal.write(payload as string);
          break;
        case "pong":
          // Keep-alive response - nothing to do
          break;
        default:
          console.debug("Unknown message type:", type);
      }
    } catch {
      // Not JSON - treat as raw text
      this.terminal.write(data);
    }
  }

  /** Send message to server with queueing support */
  private send(message: [string, unknown]): void {
    // Initialize message queue if needed
    if (!this.messageQueue) {
      this.messageQueue = [];
    }
    
    // Queue the message
    this.messageQueue.push(message);
    
    // Process queue if connected
    this.processMessageQueue();
  }
  
  /** Process queued messages when WebSocket is ready */
  private processMessageQueue(): void {
    if (this.socket?.readyState !== WebSocket.OPEN || !this.messageQueue) {
      return;
    }
    
    // Process all queued messages
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      try {
        if (message) {
          this.socket.send(JSON.stringify(message));
          
          // Special handling for resize messages
          if (message[0] === "resize") {
            this.resizeState.pendingResize = null;
          }
        }
      } catch (e) {
        console.error("Failed to send message:", e, message);
        // Put failed message back at front of queue
        if (message) {
          this.messageQueue.unshift(message);
        }
        break;
      }
    }
  }

  /** Schedule reconnection attempt */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      console.log(`Reconnecting (attempt ${this.reconnectAttempts})...`);
      this.connect();
    }, delay);
  }

  /** Create throttled event handler */
  private createThrottledHandler(func: Function, wait: number): () => void {
    let lastCall = 0;
    let timeoutId: number | null = null;
    
    return function(this: any, ...args: any[]) {
      const now = Date.now();
      
      // Leading edge - execute immediately if not called recently
      if (now - lastCall >= wait) {
        lastCall = now;
        func.apply(this, args);
      } else if (!timeoutId) {
        // Trailing edge - schedule execution after delay
        timeoutId = window.setTimeout(() => {
          timeoutId = null;
          lastCall = Date.now();
          func.apply(this, args);
        }, wait);
      }
    }.bind(this);
  }
  
  /** Clean up resources */
  dispose(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.resizeRaf) {
      window.cancelAnimationFrame(this.resizeRaf);
      this.resizeRaf = 0;
    }
    this.socket?.close();
    this.terminal.dispose();
  }
}

// Store instances for potential external access
const instances: Map<HTMLElement, WebTerminal> = new Map();

/** Initialize all terminal containers on page load */
function initTerminals(): void {
  document.querySelectorAll<HTMLElement>(".textual-terminal").forEach((el) => {
    const wsUrl = el.dataset.sessionWebsocketUrl;
    if (!wsUrl) {
      console.error("Missing data-session-websocket-url on terminal container");
      return;
    }

    const config = parseConfig(el);
    const terminal = new WebTerminal(el, wsUrl, config);
    instances.set(el, terminal);
  });
}

// Auto-initialize on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTerminals);
} else {
  initTerminals();
}

// Export for potential external use
export { WebTerminal, initTerminals, instances };
