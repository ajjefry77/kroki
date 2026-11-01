// پاکسازی لایه‌ها و سورس‌های mapbox مرتبط با یک pin حذف‌شده.
// (خارج‌شده از App.vue)
import { logger } from "./logger";

function removeSource(map, sid) {
  if (!sid) return;
  let layers = [];
  try {
    layers = map.getStyle().layers || [];
  } catch {}
  layers
    .filter((l) => l.source === sid)
    .forEach((l) => {
      try {
        map.removeLayer(l.id);
      } catch {}
    });
  try {
    if (map.getSource(sid)) map.removeSource(sid);
  } catch {}
}

// حذف کامل ردپای یک ترسیم از نقشه: سورس اصلی + سورس لیبل‌ها
// (شماره رئوس/طول اضلاع/مجاورت‌ها) وگرنه اطلاعات نقاط روی نقشه می‌ماند
export function cleanupPinLayers(map, pin) {
  if (!map) return;
  const sids = [];
  if (pin?.shape?._sourceIds?.length) sids.push(...pin.shape._sourceIds);
  if (pin?.shape) {
    sids.push("draw-pin-" + pin.id);
    sids.push("file-" + pin.id);
  }
  const allSids = [...new Set([...sids, ...sids.map((s) => s + "-labels")])];
  allSids.forEach((sid) => removeSource(map, sid));
  logger.info("draw", "حذف ترسیم", { name: pin?.name, id: pin?.id });
}
