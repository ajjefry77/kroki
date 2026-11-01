import { loadMapbox } from "./loadMapbox";
import { computeCanvasSize } from "./canvas";
import {
  flattenPins,
  toUTM,
  snapshotCanvas,
} from "../composables/krokiGeometry";

/*
 * برداشت تصویر (snapshot) از نقشهٔ mapbox.
 * مستقل از کپوزابل generator؛ فقط به utils و krokiGeometry وابسته است.
 */

export async function captureMapImage(map, pins, allPositions) {
  if (!map || typeof map.getCanvas !== "function") return "";
  try {
    const mapboxgl = await loadMapbox();
    const bounds = new mapboxgl.LngLatBounds();
    allPositions.forEach((p) => bounds.extend([p.lon, p.lat]));
    const allLayers = map.getStyle().layers || [];
    const layerStates = new Map();
    for (const layer of allLayers) {
      try {
        layerStates.set(
          layer.id,
          map.getLayoutProperty(layer.id, "visibility"),
        );
      } catch (e) {
        layerStates.set(layer.id, "visible");
      }
    }
    const baseLayerIds = new Set();
    for (const layer of allLayers) {
      if (
        layer.id.startsWith("basemap-") ||
        layer.id === "satellite" ||
        layer.id === "local-tile-layer" ||
        layer.id === "local-tile"
      )
        baseLayerIds.add(layer.id);
    }
    const activePinIds = new Set();
    for (const pin of flattenPins(pins)) {
      if (pin.shape && pin.shape.show !== false) activePinIds.add(pin.id);
    }
    for (const layer of allLayers) {
      if (!baseLayerIds.has(layer.id)) {
        try {
          map.setLayoutProperty(layer.id, "visibility", "none");
        } catch (e) {}
      }
    }
    for (const layer of allLayers) {
      if (!baseLayerIds.has(layer.id)) {
        for (const pinId of activePinIds) {
          if (layer.id.includes(pinId)) {
            try {
              map.setLayoutProperty(layer.id, "visibility", "visible");
            } catch (e) {}
            break;
          }
        }
      }
    }
    const container = map.getContainer();
    const origWidth = container.style.width;
    const origHeight = container.style.height;
    const origOverflow = document.body.style.overflow;
    const isMobileView =
      typeof window !== "undefined" && window.innerWidth && window.innerWidth < 768;
    const aspectUtm = toUTM(allPositions);
    const aspectSpanX = Math.max(
      Math.max(...aspectUtm.map((p) => p.x)) -
        Math.min(...aspectUtm.map((p) => p.x)),
      1,
    );
    const aspectSpanY = Math.max(
      Math.max(...aspectUtm.map((p) => p.y)) -
        Math.min(...aspectUtm.map((p) => p.y)),
      1,
    );
    let { w: cw, h: ch } = computeCanvasSize(aspectSpanX, aspectSpanY);
    // روی موبایل کانتینر ۱۴۰۰px صفحه را می‌ترکاند و تایل‌ها لود نمی‌شوند؛
    // سقف ابعاد برداشت را پایین می‌آوریم تا تصویر سیوشده دقیق و سالم باشد
    if (isMobileView) {
      cw = Math.min(cw, 900);
      ch = Math.min(ch, 900);
    }
    const pad = isMobileView ? 40 : 120;
    // جلوگیری از پرش اسکرول صفحه هنگام بزرگ‌شدن موقت کانتینر
    try { document.body.style.overflow = "hidden"; } catch (e) {}
    container.style.width = cw + "px";
    container.style.height = ch + "px";
    map.resize();
    let dataUrl = "";
    try {
      await new Promise((resolve) => {
        map.fitBounds(bounds, { padding: pad, maxZoom: 19, duration: 0 });
        map.once("idle", resolve);
        setTimeout(resolve, isMobileView ? 2500 : 1500);
      });
      map.triggerRepaint();
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r)),
      );
      await new Promise((r) => setTimeout(r, isMobileView ? 400 : 200));
      try {
        dataUrl = snapshotCanvas(map.getCanvas(), 800, 0.78);
      } catch (e) {
        dataUrl = "";
      }
    } finally {
      container.style.width = origWidth;
      container.style.height = origHeight;
      try { document.body.style.overflow = origOverflow; } catch (e) {}
      map.resize();
      for (const [layerId, visibility] of layerStates) {
        try {
          map.setLayoutProperty(layerId, "visibility", visibility);
        } catch (e) {}
      }
    }
    return dataUrl;
  } catch (e) {
    return "";
  }
}