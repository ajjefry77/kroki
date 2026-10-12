const registry = new Set();

export function registerDrawLayer(id) {
  if (id) registry.add(id);
}

export function registerDrawLayers(ids = []) {
  ids.forEach((id) => registerDrawLayer(id));
}

export function unregisterDrawLayer(id) {
  registry.delete(id);
}

export function bringDrawingsToFront(map) {
  if (!map || typeof map.getLayer !== "function") return;
  const isLabelLayer = (id) => /-(vlabel|elen|eadj)$/.test(id || "");
  // اول لایه‌های موجود را جدا کن و شناسه‌های حذف‌شده را از رجیستری پاک کن
  const alive = [];
  registry.forEach((id) => {
    if (map.getLayer(id)) {
      alive.push(id);
    } else {
      registry.delete(id);
    }
  });
  // اول شکل‌ها (fill/line/...) بعد لیبل‌ها (شماره/طول/مجاورت) به بالا منتقل
  // می‌شوند تا نوشته‌ها همیشه روی شکل باشند، نه زیر آن
  const ordered = [
    ...alive.filter((id) => !isLabelLayer(id)),
    ...alive.filter((id) => isLabelLayer(id)),
  ];
  ordered.forEach((id) => {
    try {
      map.moveLayer(id);
    } catch (e) {
      /* layer may not exist yet, ignore */
    }
  });
}

export function clearDrawLayerRegistry() {
  registry.clear();
}

export function registerLayersForSource(map, sourceId) {
  if (!map || !sourceId || typeof map.getStyle !== "function") return;
  const style = map.getStyle();
  if (!style || !style.layers) return;
  style.layers.forEach((layer) => {
    if (layer.source === sourceId) registerDrawLayer(layer.id);
  });
}
