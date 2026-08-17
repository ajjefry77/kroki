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
  registry.forEach((id) => {
    if (map.getLayer(id)) {
      try {
        map.moveLayer(id);
      } catch (e) {
        /* layer may not exist yet, ignore */
      }
    } else {
      registry.delete(id);
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
