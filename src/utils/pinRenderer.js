import { getDashArray, ensurePointSymbolImages, pointIcon } from "./drawStyle";
import { registerDrawLayer, bringDrawingsToFront } from "./layerOrder";
import { measureDistance, formatDistance } from "./useDrawingHelpers";

// فونت لیبل‌های متنی روی نقشه (مشابه حالت در حال ترسیم در useDrawing.js)
const MAP_TEXT_FONT = ["Droid Sans", "Arial Unicode MS Bold"];

// فیچرهای لیبل دائمی یک ترسیم ذخیره‌شده: شماره گوشه‌ها + طول/مجاورت اضلاع
export function buildPinLabelFeatures(pin) {
  const s = pin?.shape;
  if (!s || (s.type !== "polygon" && s.type !== "polyline")) return null;
  const pts = s.positions || [];
  if (pts.length < 2) return null;
  const features = [];
  pts.forEach((p, i) => {
    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [Number(p.lon ?? p.lng), Number(p.lat)],
      },
      properties: { kind: "vertex", label: String(i + 1) },
    });
  });
  const adj = Array.isArray(s.adjacents) ? s.adjacents : [];
  const edgeCount = s.type === "polygon" ? pts.length : pts.length - 1;
  for (let i = 0; i < edgeCount; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    if (!a || !b) continue;
    const alng = Number(a.lon ?? a.lng);
    const alat = Number(a.lat);
    const blng = Number(b.lon ?? b.lng);
    const blat = Number(b.lat);
    if (!isFinite(alng) || !isFinite(alat) || !isFinite(blng) || !isFinite(blat))
      continue;
    let len = "";
    try {
      len = formatDistance(measureDistance([alng, alat], [blng, blat]));
    } catch (e) {
      len = "";
    }
    const adjTxt = String(adj[i] ?? "").trim();
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [(alng + blng) / 2, (alat + blat) / 2] },
      properties: {
        kind: "edge",
        label: adjTxt ? `${adjTxt}\n${len}` : len,
        adj: adjTxt,
        len,
      },
    });
  }
  return { type: "FeatureCollection", features };
}

function addPinLabelLayers(map, sourceId, labelSourceId, visibility) {
  map.addLayer({
    id: sourceId + "-elen",
    type: "symbol",
    source: labelSourceId,
    filter: ["==", ["get", "kind"], "edge"],
    layout: {
      "text-field": ["get", "len"],
      "text-size": 10,
      "text-allow-overlap": true,
      "text-ignore-placement": true,
      "text-font": MAP_TEXT_FONT,
      visibility,
    },
    paint: {
      "text-color": "#b45309",
      "text-halo-color": "#ffffff",
      "text-halo-width": 2,
    },
  });
  map.addLayer({
    id: sourceId + "-eadj",
    type: "symbol",
    source: labelSourceId,
    filter: ["all", ["==", ["get", "kind"], "edge"], ["!=", ["get", "adj"], ""]],
    layout: {
      "text-field": ["get", "adj"],
      "text-size": 11,
      "text-offset": [0, -1.3],
      "text-anchor": "bottom",
      "text-allow-overlap": true,
      "text-ignore-placement": true,
      "text-font": MAP_TEXT_FONT,
      visibility,
    },
    paint: {
      "text-color": "#1d4ed8",
      "text-halo-color": "#ffffff",
      "text-halo-width": 2,
    },
  });
  map.addLayer({
    id: sourceId + "-vlabel",
    type: "symbol",
    source: labelSourceId,
    filter: ["==", ["get", "kind"], "vertex"],
    layout: {
      "text-field": ["get", "label"],
      "text-size": 12,
      "text-offset": [0, -1.2],
      "text-anchor": "bottom",
      "text-allow-overlap": true,
      "text-ignore-placement": true,
      "text-font": MAP_TEXT_FONT,
      visibility,
    },
    paint: {
      "text-color": "#facc15",
      "text-halo-color": "#111111",
      "text-halo-width": 2.5,
    },
  });
  registerDrawLayer(sourceId + "-elen");
  registerDrawLayer(sourceId + "-eadj");
  registerDrawLayer(sourceId + "-vlabel");
}

// بازسازی داده‌های هندسی یک ترسیم روی نقشه پس از ویرایش نقاط آن (دستی، CSV یا KML)
export function updatePinGeometry(map, pin) {
  if (!map || !pin || !pin.shape) return;
  const s = pin.shape;
  const sourceId = s._sourceIds?.[0] || "draw-pin-" + pin.id;
  const source = map.getSource(sourceId);
  if (!source) return;

  if (s.type === "polygon" || s.type === "polyline") {
    const coords = (s.positions || []).map((p) => [Number(p.lon), Number(p.lat)]);
    if (s.type === "polygon" && coords.length) coords.push(coords[0]);
    source.setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry:
            s.type === "polygon"
              ? { type: "Polygon", coordinates: [coords] }
              : { type: "LineString", coordinates: coords },
          properties: { name: pin.name, id: pin.id },
        },
      ],
    });
    // لیبل‌های دائمی (شماره گوشه‌ها + طول/مجاورت) هم به‌روزرسانی شوند
    try {
      const labelSrc = map.getSource(sourceId + "-labels");
      if (labelSrc) {
        const fc = buildPinLabelFeatures(pin);
        if (fc) labelSrc.setData(fc);
      }
    } catch (e) {}
  } else if (s.type === "point") {
    source.setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [Number(s.lon), Number(s.lat)] },
          properties: {},
        },
      ],
    });
  } else if (s.type === "multi_point") {
    const features = (s.positions || []).map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [Number(p.lon), Number(p.lat)] },
      properties: {
        color: p.color || s.color || "#00ff00",
        icon: pointIcon(s.symbol || p.symbol),
      },
    }));
    source.setData({ type: "FeatureCollection", features });
  }
}

// نمایش/مخفی‌سازی همه لایه‌های یک ترسیم (شکل + لیبل‌های شماره/طول/مجاورت)
// روی نقشه؛ سورس لیبل‌ها (`<id>-labels`) هم پوشش داده می‌شود.
export function setPinVisibilityOnMap(map, pin, visible) {
  if (!map || typeof map.getStyle !== "function" || !pin?.shape) return;
  const sids = new Set(Array.isArray(pin.shape._sourceIds) ? pin.shape._sourceIds : []);
  if (!sids.size) {
    sids.add("draw-pin-" + pin.id);
    sids.add("file-" + pin.id);
  }
  for (const s of [...sids]) sids.add(s + "-labels");
  let layers = [];
  try {
    layers = map.getStyle().layers || [];
  } catch (e) {}
  for (const l of layers) {
    if (!sids.has(l.source)) continue;
    try {
      map.setLayoutProperty(l.id, "visibility", visible ? "visible" : "none");
    } catch (e) {}
  }
}

export function renderPinOnMap(map, pin) {
  if (!map || !pin || !pin.shape || !pin.shape.type) return;
  const s = pin.shape;
  const sourceId = "draw-pin-" + pin.id;
  if (map.getSource(sourceId)) return;
  const visibility = s.show === false ? "none" : "visible";
  const opacity = s.opacity ?? 0.7;

  if (s.type === "polyline" || s.type === "polygon") {
    const coords = s.positions.map((p) => [p.lon, p.lat]);
    if (s.type === "polygon") coords.push(coords[0]);
    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry:
              s.type === "polygon"
                ? { type: "Polygon", coordinates: [coords] }
                : { type: "LineString", coordinates: coords },
            properties: { name: pin.name, id: pin.id },
          },
        ],
      },
    });
    if (s.type === "polygon") {
      map.addLayer({
        id: sourceId + "-fill",
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": s.color || "#ff0000",
          "fill-opacity": opacity,
        },
        layout: { visibility },
      });
    }
    map.addLayer({
      id: sourceId + "-line",
      type: "line",
      source: sourceId,
      paint: {
        "line-color": s.outlineColor || s.color || "#ff0000",
        "line-width": s.width || 2,
        "line-opacity": opacity,
        "line-dasharray": getDashArray(s.dash),
      },
      layout: { visibility },
    });
    // لیبل‌های دائمی: شماره گوشه‌ها + طول و مجاورت اضلاع (بعد از ذخیره هم می‌مانند)
    const labelSourceId = sourceId + "-labels";
    map.addSource(labelSourceId, {
      type: "geojson",
      data: buildPinLabelFeatures(pin) || {
        type: "FeatureCollection",
        features: [],
      },
    });
    addPinLabelLayers(map, sourceId, labelSourceId, visibility);
  } else if (s.type === "point") {
    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [s.lon, s.lat] },
            properties: {},
          },
        ],
      },
    });
    map.addLayer({
      id: sourceId + "-point",
      type: "circle",
      source: sourceId,
      paint: {
        "circle-radius": s.pixelSize || 8,
        "circle-color": s.color || "#ff0000",
        "circle-opacity": opacity,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": s.outlineWidth || 1,
        "circle-stroke-opacity": opacity,
      },
      layout: { visibility },
    });
  } else if (s.type === "multi_point") {
    const features = s.positions.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lon, p.lat] },
      properties: {
        color: p.color || s.color || "#00ff00",
        icon: pointIcon(s.symbol || p.symbol),
      },
    }));
    map.addSource(sourceId, {
      type: "geojson",
      data: { type: "FeatureCollection", features },
    });
    ensurePointSymbolImages(map);
    map.addLayer({
      id: sourceId + "-points",
      type: "symbol",
      source: sourceId,
      layout: {
        "icon-image": ["get", "icon"],
        "icon-size": 0.5,
        "icon-allow-overlap": true,
        visibility,
      },
      paint: {
        "icon-color": ["get", "color"],
        "icon-opacity": opacity,
      },
    });
  } else if (s.type === "circle") {
    const center = s.center;
    const r = s.radius;
    const coords = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * 2 * Math.PI;
      const rLat = center.lat + (r / 110540) * Math.sin(angle);
      const rLng =
        center.lng +
        (r / (111319.9 * Math.cos((center.lat * Math.PI) / 180))) *
          Math.cos(angle);
      coords.push([rLng, rLat]);
    }
    coords.push(coords[0]);
    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [coords] },
            properties: {},
          },
        ],
      },
    });
    map.addLayer({
      id: sourceId + "-fill",
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": s.fillColor || s.color || "#0000ff",
        "fill-opacity": opacity,
      },
      layout: { visibility },
    });
    map.addLayer({
      id: sourceId + "-line",
      type: "line",
      source: sourceId,
      paint: {
        "line-color": s.outlineColor || s.color || "#0000ff",
        "line-width": s.outlineWidth || s.width || 2,
        "line-opacity": opacity,
      },
      layout: { visibility },
    });
  } else {
    return;
  }

  s._sourceIds = [sourceId];
  registerDrawLayer(sourceId + "-fill");
  registerDrawLayer(sourceId + "-line");
  registerDrawLayer(sourceId + "-point");
  registerDrawLayer(sourceId + "-points");
  bringDrawingsToFront(map);
}
