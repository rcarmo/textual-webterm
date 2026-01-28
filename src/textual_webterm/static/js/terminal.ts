/**
 * ghostty-web terminal client for textual-webterm.
 *
 * Implements the WebSocket protocol compatible with local_server.py:
 * - Client → Server: ["stdin", data], ["resize", {width, height}], ["ping", data]
 * - Server → Client: ["stdout", data], ["pong", data], or binary frames
 */

import { Terminal, FitAddon, type ITerminalOptions, type ITheme } from "ghostty-web";

/** Default font stack - prefers system monospace, falls back through programming fonts */
const DEFAULT_FONT_FAMILY =
  'ui-monospace, "SFMono-Regular", "FiraCode Nerd Font", "FiraMono Nerd Font", ' +
  '"Fira Code", "Roboto Mono", Menlo, Monaco, Consolas, "Liberation Mono", ' +
  '"DejaVu Sans Mono", "Courier New", monospace';

/** Predefined terminal themes */
const THEMES: Record<string, ITheme> = {
  // Monokai Pro Ristretto - default theme
  monokai: {
    background: "#2d2a2e",
    foreground: "#fcfcfa",
    cursor: "#fcfcfa",
    cursorAccent: "#2d2a2e",
    selection: "#5b595c",
    black: "#403e41",
    red: "#ff6188",
    green: "#a9dc76",
    yellow: "#ffd866",
    blue: "#fc9867",
    magenta: "#ab9df2",
    cyan: "#78dce8",
    white: "#fcfcfa",
    brightBlack: "#727072",
    brightRed: "#ff6188",
    brightGreen: "#a9dc76",
    brightYellow: "#ffd866",
    brightBlue: "#fc9867",
    brightMagenta: "#ab9df2",
    brightCyan: "#78dce8",
    brightWhite: "#fcfcfa",
  },
  // Dark themes
  dark: {
    background: "#1e1e1e",
    foreground: "#d4d4d4",
    cursor: "#aeafad",
    cursorAccent: "#1e1e1e",
    selection: "#264f78",
    black: "#000000",
    red: "#cd3131",
    green: "#0dbc79",
    yellow: "#e5e510",
    blue: "#2472c8",
    magenta: "#bc3fbc",
    cyan: "#11a8cd",
    white: "#e5e5e5",
    brightBlack: "#666666",
    brightRed: "#f14c4c",
    brightGreen: "#23d18b",
    brightYellow: "#f5f543",
    brightBlue: "#3b8eea",
    brightMagenta: "#d670d6",
    brightCyan: "#29b8db",
    brightWhite: "#ffffff",
  },
  light: {
    background: "#ffffff",
    foreground: "#383a42",
    cursor: "#526eff",
    cursorAccent: "#ffffff",
    selection: "#add6ff",
    black: "#000000",
    red: "#e45649",
    green: "#50a14f",
    yellow: "#c18401",
    blue: "#4078f2",
    magenta: "#a626a4",
    cyan: "#0184bc",
    white: "#a0a1a7",
    brightBlack: "#5c6370",
    brightRed: "#e06c75",
    brightGreen: "#98c379",
    brightYellow: "#d19a66",
    brightBlue: "#61afef",
    brightMagenta: "#c678dd",
    brightCyan: "#56b6c2",
    brightWhite: "#ffffff",
  },
  dracula: {
    background: "#282a36",
    foreground: "#f8f8f2",
    cursor: "#f8f8f2",
    cursorAccent: "#282a36",
    selection: "#44475a",
    black: "#21222c",
    red: "#ff5555",
    green: "#50fa7b",
    yellow: "#f1fa8c",
    blue: "#bd93f9",
    magenta: "#ff79c6",
    cyan: "#8be9fd",
    white: "#f8f8f2",
    brightBlack: "#6272a4",
    brightRed: "#ff6e6e",
    brightGreen: "#69ff94",
    brightYellow: "#ffffa5",
    brightBlue: "#d6acff",
    brightMagenta: "#ff92df",
    brightCyan: "#a4ffff",
    brightWhite: "#ffffff",
  },
  catppuccin: {
    background: "#1e1e2e",
    foreground: "#cdd6f4",
    cursor: "#f5e0dc",
    cursorAccent: "#1e1e2e",
    selection: "#45475a",
    black: "#45475a",
    red: "#f38ba8",
    green: "#a6e3a1",
    yellow: "#f9e2af",
    blue: "#89b4fa",
    magenta: "#f5c2e7",
    cyan: "#94e2d5",
    white: "#bac2de",
    brightBlack: "#585b70",
    brightRed: "#f38ba8",
    brightGreen: "#a6e3a1",
    brightYellow: "#f9e2af",
    brightBlue: "#89b4fa",
    brightMagenta: "#f5c2e7",
    brightCyan: "#94e2d5",
    brightWhite: "#a6adc8",
  },
  nord: {
    background: "#2e3440",
    foreground: "#d8dee9",
    cursor: "#d8dee9",
    cursorAccent: "#2e3440",
    selection: "#434c5e",
    black: "#3b4252",
    red: "#bf616a",
    green: "#a3be8c",
    yellow: "#ebcb8b",
    blue: "#81a1c1",
    magenta: "#b48ead",
    cyan: "#88c0d0",
    white: "#e5e9f0",
    brightBlack: "#4c566a",
    brightRed: "#bf616a",
    brightGreen: "#a3be8c",
    brightYellow: "#ebcb8b",
    brightBlue: "#81a1c1",
    brightMagenta: "#b48ead",
    brightCyan: "#8fbcbb",
    brightWhite: "#eceff4",
  },
  gruvbox: {
    background: "#282828",
    foreground: "#ebdbb2",
    cursor: "#ebdbb2",
    cursorAccent: "#282828",
    selection: "#504945",
    black: "#282828",
    red: "#cc241d",
    green: "#98971a",
    yellow: "#d79921",
    blue: "#458588",
    magenta: "#b16286",
    cyan: "#689d6a",
    white: "#a89984",
    brightBlack: "#928374",
    brightRed: "#fb4934",
    brightGreen: "#b8bb26",
    brightYellow: "#fabd2f",
    brightBlue: "#83a598",
    brightMagenta: "#d3869b",
    brightCyan: "#8ec07c",
    brightWhite: "#ebdbb2",
  },
  solarized: {
    background: "#002b36",
    foreground: "#839496",
    cursor: "#839496",
    cursorAccent: "#002b36",
    selection: "#073642",
    black: "#073642",
    red: "#dc322f",
    green: "#859900",
    yellow: "#b58900",
    blue: "#268bd2",
    magenta: "#d33682",
    cyan: "#2aa198",
    white: "#eee8d5",
    brightBlack: "#586e75",
    brightRed: "#cb4b16",
    brightGreen: "#586e75",
    brightYellow: "#657b83",
    brightBlue: "#839496",
    brightMagenta: "#6c71c4",
    brightCyan: "#93a1a1",
    brightWhite: "#fdf6e3",
  },
  tokyo: {
    background: "#1a1b26",
    foreground: "#a9b1d6",
    cursor: "#c0caf5",
    cursorAccent: "#1a1b26",
    selection: "#33467c",
    black: "#15161e",
    red: "#f7768e",
    green: "#9ece6a",
    yellow: "#e0af68",
    blue: "#7aa2f7",
    magenta: "#bb9af7",
    cyan: "#7dcfff",
    white: "#a9b1d6",
    brightBlack: "#414868",
    brightRed: "#f7768e",
    brightGreen: "#9ece6a",
    brightYellow: "#e0af68",
    brightBlue: "#7aa2f7",
    brightMagenta: "#bb9af7",
    brightCyan: "#7dcfff",
    brightWhite: "#c0caf5",
  },
};

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
  if (element.dataset.theme) {
    const themeName = element.dataset.theme.toLowerCase();
    if (themeName in THEMES) {
      config.theme = THEMES[themeName];
    } else {
      // Try parsing as JSON for custom themes
      try {
        config.theme = JSON.parse(element.dataset.theme) as ITheme;
      } catch {
        console.warn(`Unknown theme "${element.dataset.theme}", using default`);
      }
    }
  }

  return config;
}

/** Get WASM path based on script location */
function getWasmPath(): string {
  // Try to find the script element and derive path from it
  const scripts = document.querySelectorAll('script[src*="terminal.js"]');
  if (scripts.length > 0) {
    const scriptSrc = (scripts[0] as HTMLScriptElement).src;
    const basePath = scriptSrc.substring(0, scriptSrc.lastIndexOf('/') + 1);
    return basePath + 'ghostty-vt.wasm';
  }
  // Fallback to common static paths
  return '/static/js/ghostty-vt.wasm';
}

/**
 * WebTerminal - wraps ghostty-web with WebSocket communication.
 */
class WebTerminal {
  private terminal: Terminal;
  private fitAddon: FitAddon;
  private socket: WebSocket | null = null;
  private element: HTMLElement;
  private wsUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageQueue: [string, unknown][] = [];
  private lastValidSize: { cols: number; rows: number } | null = null;
  private mobileInput: HTMLTextAreaElement | null = null;

  private constructor(
    container: HTMLElement,
    wsUrl: string,
    terminal: Terminal,
    fitAddon: FitAddon
  ) {
    this.element = container;
    this.wsUrl = wsUrl;
    this.terminal = terminal;
    this.fitAddon = fitAddon;
  }

  /** Create and initialize a WebTerminal instance */
  static async create(
    container: HTMLElement,
    wsUrl: string,
    config: TerminalConfig
  ): Promise<WebTerminal> {
    // Determine WASM path - try to find it relative to the script location
    const wasmPath = getWasmPath();
    
    // Build terminal options
    const options: ITerminalOptions = {
      fontFamily: config.fontFamily ?? DEFAULT_FONT_FAMILY,
      fontSize: config.fontSize ?? 16,
      scrollback: config.scrollback ?? 1000,
      cursorBlink: true,
      cursorStyle: "block",
      theme: config.theme ?? THEMES.monokai,
      wasmPath,
    };

    const terminal = new Terminal(options);
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    // Open terminal (this loads WASM and initializes everything)
    await terminal.open(container);

    const instance = new WebTerminal(container, wsUrl, terminal, fitAddon);
    instance.initialize();
    return instance;
  }

  /** Initialize event handlers and connect */
  private initialize(): void {
    // Wait for fonts to load before fitting to ensure correct measurements
    this.waitForFonts().then(() => {
      this.fit();
    });
    
    // Setup resize observer (we use our own fit method, not FitAddon's)
    this.setupResizeObserver();

    // Handle window resize (some browsers don't trigger ResizeObserver on window resize)
    window.addEventListener("resize", () => {
      this.fit();
    });

    // Handle terminal input
    this.terminal.onData((data) => {
      this.send(["stdin", data]);
    });

    // Handle resize
    this.terminal.onResize((size) => {
      if (this.isValidSize(size.cols, size.rows)) {
        this.lastValidSize = { cols: size.cols, rows: size.rows };
        this.send(["resize", { width: size.cols, height: size.rows }]);
      }
    });

    // Setup mobile keyboard support
    this.setupMobileKeyboard();

    // Connect WebSocket
    this.connect();
  }

  /** Setup mobile keyboard input via hidden textarea */
  private setupMobileKeyboard(): void {
    // Create hidden textarea for mobile keyboard input
    const textarea = document.createElement("textarea");
    textarea.setAttribute("autocapitalize", "off");
    textarea.setAttribute("autocomplete", "off");
    textarea.setAttribute("autocorrect", "off");
    textarea.setAttribute("spellcheck", "false");
    textarea.setAttribute("inputmode", "text");
    textarea.setAttribute("enterkeyhint", "send");
    // Style to be invisible but still focusable (not display:none)
    textarea.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: 1px;
      height: 1px;
      opacity: 0;
      z-index: -1;
      pointer-events: none;
      font-size: 16px;
    `;
    // Font size 16px prevents iOS auto-zoom on focus
    
    this.element.style.position = "relative";
    this.element.appendChild(textarea);
    this.mobileInput = textarea;

    // Handle input from mobile keyboard
    textarea.addEventListener("input", () => {
      const value = textarea.value;
      if (value) {
        this.send(["stdin", value]);
        textarea.value = "";
      }
    });

    // Handle special keys via keydown
    textarea.addEventListener("keydown", (e) => {
      let seq: string | null = null;
      switch (e.key) {
        case "Enter":
          seq = "\r";
          break;
        case "Backspace":
          seq = "\x7f";
          break;
        case "Escape":
          seq = "\x1b";
          break;
        case "ArrowUp":
          seq = "\x1b[A";
          break;
        case "ArrowDown":
          seq = "\x1b[B";
          break;
        case "ArrowRight":
          seq = "\x1b[C";
          break;
        case "ArrowLeft":
          seq = "\x1b[D";
          break;
        case "Tab":
          seq = "\t";
          e.preventDefault();
          break;
      }
      if (seq) {
        e.preventDefault();
        this.send(["stdin", seq]);
      }
    });

    // Focus textarea on touch/click to show mobile keyboard
    this.element.addEventListener("touchstart", () => {
      this.focusMobileInput();
    }, { passive: true });
    
    this.element.addEventListener("click", () => {
      this.focusMobileInput();
    });
  }

  /** Focus the mobile input to show keyboard */
  private focusMobileInput(): void {
    if (this.mobileInput) {
      // Small delay helps with iOS keyboard activation
      setTimeout(() => {
        this.mobileInput?.focus({ preventScroll: true });
      }, 10);
    }
    // Also focus the terminal for desktop
    this.terminal.focus();
  }

  /** Wait for fonts to be loaded */
  private async waitForFonts(): Promise<void> {
    if (!("fonts" in document)) {
      return;
    }
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font loading errors
    }
  }

  /** 
   * Custom fit method that doesn't reserve space for scrollbar.
   * The FitAddon subtracts 15px for a scrollbar, but ghostty-web
   * uses canvas rendering without a visible scrollbar.
   */
  private fit(): void {
    // Try to get metrics from renderer (private but accessible at runtime)
    const termAny = this.terminal as unknown as Record<string, unknown>;
    const renderer = termAny.renderer as { getMetrics?: () => { width: number; height: number } } | undefined;
    
    let cellWidth: number;
    let cellHeight: number;
    
    if (renderer?.getMetrics) {
      const metrics = renderer.getMetrics();
      if (metrics && metrics.width > 0 && metrics.height > 0) {
        cellWidth = metrics.width;
        cellHeight = metrics.height;
      } else {
        // Fall back to measuring
        const dims = this.measureCellSize();
        if (!dims) {
          this.fitAddon.fit();
          return;
        }
        cellWidth = dims.width;
        cellHeight = dims.height;
      }
    } else {
      // Fall back to measuring
      const dims = this.measureCellSize();
      if (!dims) {
        this.fitAddon.fit();
        return;
      }
      cellWidth = dims.width;
      cellHeight = dims.height;
    }

    const style = window.getComputedStyle(this.element);
    const paddingTop = parseInt(style.paddingTop) || 0;
    const paddingBottom = parseInt(style.paddingBottom) || 0;
    const paddingLeft = parseInt(style.paddingLeft) || 0;
    const paddingRight = parseInt(style.paddingRight) || 0;

    const availableWidth = this.element.clientWidth - paddingLeft - paddingRight;
    const availableHeight = this.element.clientHeight - paddingTop - paddingBottom;

    if (availableWidth <= 0 || availableHeight <= 0) {
      return;
    }

    const cols = Math.max(2, Math.floor(availableWidth / cellWidth));
    const rows = Math.max(1, Math.floor(availableHeight / cellHeight));

    if (cols !== this.terminal.cols || rows !== this.terminal.rows) {
      this.terminal.resize(cols, rows);
    }
  }

  /** Measure cell size by creating a test character */
  private measureCellSize(): { width: number; height: number } | null {
    const testElement = document.createElement('span');
    testElement.style.visibility = 'hidden';
    testElement.style.position = 'absolute';
    testElement.style.fontFamily = this.options.fontFamily || 'monospace';
    testElement.style.fontSize = `${this.options.fontSize || 14}px`;
    testElement.style.lineHeight = 'normal';
    testElement.textContent = 'W';
    
    document.body.appendChild(testElement);
    const width = testElement.offsetWidth;
    const height = testElement.offsetHeight;
    document.body.removeChild(testElement);
    
    if (width > 0 && height > 0) {
      return { width, height };
    }
    return null;
  }

  /** Setup resize observer for container */
  private setupResizeObserver(): void {
    const resizeObserver = new ResizeObserver(() => {
      // Debounce resize events
      if (this.resizeDebounceTimer) {
        clearTimeout(this.resizeDebounceTimer);
      }
      this.resizeDebounceTimer = window.setTimeout(() => {
        this.fit();
      }, 100);
    });
    resizeObserver.observe(this.element);
  }

  private resizeDebounceTimer: number | undefined;

  /** Validate terminal dimensions */
  private isValidSize(cols: number, rows: number): boolean {
    return cols >= 2 && cols <= 500 && rows >= 1 && rows <= 200;
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

      // Process any queued messages
      this.processMessageQueue();

      // Send initial size
      const cols = this.terminal.cols;
      const rows = this.terminal.rows;
      if (this.isValidSize(cols, rows)) {
        this.lastValidSize = { cols, rows };
        this.send(["resize", { width: cols, height: rows }]);
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

  /** Send message to server with queueing support */
  private send(message: [string, unknown]): void {
    this.messageQueue.push(message);
    this.processMessageQueue();
  }

  /** Process queued messages when WebSocket is ready */
  private processMessageQueue(): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return;
    }

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      try {
        if (message) {
          this.socket.send(JSON.stringify(message));
        }
      } catch (e) {
        console.error("Failed to send message:", e, message);
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

  /** Clean up resources */
  dispose(): void {
    this.socket?.close();
    if (this.mobileInput) {
      this.mobileInput.remove();
      this.mobileInput = null;
    }
    this.fitAddon.dispose();
    this.terminal.dispose();
  }
}

// Store instances for potential external access
const instances: Map<HTMLElement, WebTerminal> = new Map();

/** Initialize all terminal containers on page load */
async function initTerminals(): Promise<void> {
  const containers = document.querySelectorAll<HTMLElement>(".textual-terminal");

  for (const el of containers) {
    const wsUrl = el.dataset.sessionWebsocketUrl;
    if (!wsUrl) {
      console.error("Missing data-session-websocket-url on terminal container");
      continue;
    }

    const config = parseConfig(el);
    try {
      const terminal = await WebTerminal.create(el, wsUrl, config);
      instances.set(el, terminal);
    } catch (e) {
      console.error("Failed to create terminal:", e);
    }
  }
}

// Auto-initialize on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => initTerminals());
} else {
  initTerminals();
}

// Export for potential external use
export { WebTerminal, initTerminals, instances, THEMES };
