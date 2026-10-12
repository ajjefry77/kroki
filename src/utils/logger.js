const LOG_KEY = "kroki:logs";
const MAX_ENTRIES = 600;

export const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

const LEVEL_COLORS = {
  debug: "#8b93a7",
  info: "#4f83cc",
  warn: "#c9a227",
  error: "#e2545b",
};

const SENSITIVE_KEY_RE = /password|passwd|pwd|token|authorization|api[-_ ]?key|national|ssn|card[-_ ]?number|payment[-_ ]?(id|track)|secret/i;

function safeStringify(data) {
  if (data === undefined) return undefined;
  try {
    const seen = new WeakSet();
    return JSON.stringify(data, (k, v) => {
      // اطلاعات حساس هرگز در لاگ (localStorage) ذخیره نشود
      if (k && SENSITIVE_KEY_RE.test(k)) return "[redacted]";
      if (typeof v === "bigint") return v.toString();
      if (typeof v === "function") return "[fn]";
      if (v && typeof v === "object") {
        if (seen.has(v)) return "[circular]";
        seen.add(v);
        if (v instanceof Error)
          return { name: v.name, message: v.message, stack: v.stack };
      }
      return v;
    });
  } catch (e) {
    return String(data);
  }
}

function nowIso() {
  return new Date().toISOString();
}

function shortId() {
  if (crypto.randomUUID) return crypto.randomUUID().slice(0, 8);
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

class Logger {
  constructor() {
    this.sessionId = shortId();
    this.entries = [];
    this.listeners = new Set();
    this.load();
    this._emit(
      "info",
      "system",
      "راه‌اندازی سامانه تولید کروکی",
      {
        sessionId: this.sessionId,
        url: typeof location !== "undefined" ? location.href : "",
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      },
      true,
    );
  }

  load() {
    try {
      const raw = localStorage.getItem(LOG_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) this.entries = arr.slice(-MAX_ENTRIES);
      }
    } catch (e) {}
  }

  persist() {
    try {
      localStorage.setItem(
        LOG_KEY,
        JSON.stringify(this.entries.slice(-MAX_ENTRIES)),
      );
    } catch (e) {}
  }

  _emit(level, category, message, data, silent) {
    const entry = {
      id: shortId(),
      ts: nowIso(),
      level,
      category: category || "general",
      message: String(message),
      data: safeStringify(data),
    };
    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES)
      this.entries.splice(0, this.entries.length - MAX_ENTRIES);
    this.persist();

    if (!silent) {
      const method = level === "debug" ? "log" : level;
      try {
        const suffix = entry.data ? " " + entry.data : "";
        const consoleFn =
          console[method] ||
          console.log ||
          (() => {});
        if (typeof consoleFn === "function")
          consoleFn(
            `%c[${this.sessionId}] [${category}] ${message}${suffix}`,
            `color:${LEVEL_COLORS[level] || "#8b93a7"}`,
          );
      } catch (e) {}
    }

    this.listeners.forEach((fn) => {
      try {
        fn(entry);
      } catch (e) {}
    });
  }

  debug(cat, msg, data) {
    this._emit("debug", cat, msg, data);
  }
  info(cat, msg, data) {
    this._emit("info", cat, msg, data);
  }
  warn(cat, msg, data) {
    this._emit("warn", cat, msg, data);
  }
  error(cat, msg, data) {
    this._emit("error", cat, msg, data);
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  clear() {
    this.entries = [];
    this.persist();
    this.listeners.forEach((fn) => {
      try {
        fn(null);
      } catch (e) {}
    });
    this.info("system", "گزارش‌ها پاک شدند");
  }

  exportText() {
    const head = `گزارش سیستم کروکی\nsession: ${this.sessionId}\nتعداد: ${this.entries.length}\n${"".padEnd(
      50,
      "-",
    )}`;
    const lines = this.entries.map(
      (e) =>
        `[${e.ts}] [${e.level.toUpperCase()}] [${e.category}] ${e.message}${
          e.data ? " — " + e.data : ""
        }`,
    );
    return head + "\n" + lines.join("\n");
  }

  exportJson() {
    return JSON.stringify(this.entries, null, 2);
  }

  getStats() {
    const s = { debug: 0, info: 0, warn: 0, error: 0 };
    this.entries.forEach((e) => {
      if (s[e.level] != null) s[e.level] += 1;
    });
    return s;
  }
}

export const logger = new Logger();

export function downloadLogFile(format = "txt") {
  const content = format === "json" ? logger.exportJson() : logger.exportText();
  const blob = new Blob([content], {
    type: format === "json" ? "application/json" : "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  a.href = url;
  a.download = `kroki-logs-${stamp}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
