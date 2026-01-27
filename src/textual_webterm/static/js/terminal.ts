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

    // Handle resize
    this.terminal.onResize(({ cols, rows }) => {
      this.send(["resize", { width: cols, height: rows }]);
    });

    // Fit to container and handle resize changes
    this.scheduleFit();
    window.addEventListener("resize", () => this.scheduleFit());
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.scheduleFit());
      this.resizeObserver.observe(container);
    }

    // Connect WebSocket
    this.connect();
  }

  /** Fit terminal to container size */
  fit(): void {
    try {
      this.fitAddon.fit();
    } catch {
      // Ignore fit errors during initialization
    }
  }

  private scheduleFit(): void {
    if (this.resizeRaf) {
      return;
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

      // Send initial size
      this.fit();
      const dims = this.fitAddon.proposeDimensions();
      if (dims) {
        this.send(["resize", { width: dims.cols, height: dims.rows }]);
      }

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

  /** Send message to server */
  private send(message: [string, unknown]): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
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
