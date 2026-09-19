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
    libPromise = import("mapbox-gl").then((m) =>
      disableMapboxTelemetry(m.default || m),
    );
  return libPromise;
}

export function loadMapboxCss() {
  if (!cssPromise) cssPromise = import("mapbox-gl/dist/mapbox-gl.css");
  return cssPromise;
}

export function loadMap() {
  return Promise.all([loadMapbox(), loadMapboxCss()]).then(([lib]) => lib);
}
