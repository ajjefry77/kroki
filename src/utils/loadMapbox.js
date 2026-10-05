let libPromise = null;
let cssPromise = null;

function disableMapboxTelemetry(lib) {
  // Mapbox GL JS به‌صورت خودکار رویدادهای تله‌متری (MapLoad/StyleLoad/Turnstile)
  // را به https://events.mapbox.com/events/v2 ارسال می‌کند. در شبکه‌هایی که
  // این دامنه فیلتر/اختلال یا گواهی نامعتبر دارد (ERR_CERT_COMMON_NAME_INVALID)
  // کنسول پر از خطا می‌شود، در حالی که ما اصلاً به تله‌متری نیازی نداریم
  // (استایل نقشه کاستوم است و از سرویس mapbox استفاده نمی‌کند).
  // با null کردن EVENTS_URL همه‌ی رویدادهای تله‌متری no-op می‌شوند.
  try {
    const cfg = lib?.config;
    if (cfg) {
      try {
        cfg.EVENTS_URL = null;
      } catch (_) {
        /* ignore */
      }
      // در برخی بیلدها EVENTS_URL فقط getter است؛ پس مستقیم override می‌کنیم
      try {
        if (cfg.EVENTS_URL) {
          Object.defineProperty(cfg, "EVENTS_URL", {
            value: null,
            writable: true,
            configurable: true,
          });
        }
      } catch (_) {
        /* ignore */
      }
    }
  } catch (_) {
    /* ignore */
  }
  return lib;
}

export function loadMapbox() {
  if (!libPromise)
    libPromise = import("mapbox-gl").then((m) => {
      const lib = disableMapboxTelemetry(m.default || m);
      ensureRtlTextPlugin(lib);
      return lib;
    });
  return libPromise;
}

// بدون این پلاگین، موتور رندر mapbox حروف فارسی/عربی را جدا جدا و
// بدون چسبندگی نمایش می‌دهد. فایل پلاگین در public/ وندور شده تا بدون
// وابستگی به CDN خارجی (که ممکن است فیلتر باشد) از همان origin لود شود.
let rtlRegistered = false;
function ensureRtlTextPlugin(lib) {
  if (rtlRegistered) return;
  rtlRegistered = true;
  try {
    if (lib && typeof lib.setRTLTextPlugin === "function") {
      const status =
        typeof lib.getRTLTextPluginStatus === "function"
          ? lib.getRTLTextPluginStatus()
          : "unavailable";
      if (status === "unavailable") {
        const base = import.meta.env.BASE_URL || "/";
        const url =
          (base.endsWith("/") ? base : base + "/") +
          "mapbox-gl-rtl-text.js";
        lib.setRTLTextPlugin(url, null, true);
      }
    }
  } catch (_) {
    /* ignore — در بدترین حالت متن فارسی جدا نمایش داده می‌شود */
  }
}

export function loadMapboxCss() {
  if (!cssPromise) cssPromise = import("mapbox-gl/dist/mapbox-gl.css");
  return cssPromise;
}

export function loadMap() {
  return Promise.all([loadMapbox(), loadMapboxCss()]).then(([lib]) => lib);
}
