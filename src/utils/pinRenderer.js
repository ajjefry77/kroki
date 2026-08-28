import { getDashArray, ensurePointSymbolImages, pointIcon } from "./drawStyle";
import { registerDrawLayer, bringDrawingsToFront } from "./layerOrder";

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
          properties: { name: pin.name },
        },
      ],
    });
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
            properties: { name: pin.name },
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
