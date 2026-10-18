import {
  measureDistance,
  formatDistance,
  computeCentroid,
} from "../utils/useDrawingHelpers";
import { VERTEX_SQUARE_IMAGE } from "../utils/drawStyle";
import { DRAFT_COLOR, DONE_COLOR, MAP_TEXT_FONT } from "./drawingCore";

/**
 * توابع مدیریت لایه‌های موقت نقشه را روی ctx قرار می‌دهد.
 * این توابع به state اصلی از طریق ctx دسترسی دارند.
 */
export function createDrawingLayers(ctx) {
  const map = ctx.mapRef;

  ctx.clearTempLayers = () => {
    ctx.ts.layerIds.forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    ctx.ts.layerIds = [];
    if (ctx.ts.sourceId && map.getSource(ctx.ts.sourceId)) {
      map.removeSource(ctx.ts.sourceId);
      ctx.ts.sourceId = null;
    }
    ctx.ts.extraSourceIds.forEach((id) => {
      if (map.getSource(id)) map.removeSource(id);
    });
    ctx.ts.extraSourceIds = [];
    ctx.ts.polygonLabelSourceId = null;
    ctx.ts.lineLabelSourceId = null;
  };

  ctx.cleanupHandlers = () => {
    ctx.disarmAddPoint();
    if (ctx.hs.mouseMove) { map.off("mousemove", ctx.hs.mouseMove); ctx.hs.mouseMove = null; }
    if (ctx.hs.click) { map.off("click", ctx.hs.click); ctx.hs.click = null; }
    if (ctx.hs.dblClick) { map.off("dblclick", ctx.hs.dblClick); ctx.hs.dblClick = null; }
    if (ctx.hs.rightClick) { map.off("contextmenu", ctx.hs.rightClick); ctx.hs.rightClick = null; }
    if (ctx.hs.mousedown) { map.off("mousedown", ctx.hs.mousedown); ctx.hs.mousedown = null; }
    if (ctx.hs.mouseup) { map.off("mouseup", ctx.hs.mouseup); ctx.hs.mouseup = null; }
    if (ctx.hs.key) { window.removeEventListener("keydown", ctx.hs.key); ctx.hs.key = null; }
    map.getCanvas().style.cursor = "default";
    // ریست متغیرهای درگ (این متغیرها در drawingCore تعریف شده‌اند)
    ctx.__resetDragState();
  };

  ctx.addTempSource = () => {
    ctx.ts.sourceId = "temp-" + crypto.randomUUID();
    map.addSource(ctx.ts.sourceId, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    return ctx.ts.sourceId;
  };
  ctx.addTempLayer = (id, config) => {
    map.addLayer({ source: ctx.ts.sourceId, ...config, id });
    ctx.ts.layerIds.push(id);
  };
  ctx.addLabelSource = () => {
    const labelId = ctx.ts.sourceId + "-labels";
    map.addSource(labelId, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    ctx.ts.extraSourceIds.push(labelId);
    return labelId;
  };

  ctx.buildFeatures = (pts, closed) => {
    const lineCoords = pts.map((p) => [p.lng || p.lon, p.lat]);
    const features = pts.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng || p.lon, p.lat] },
      properties: {},
    }));
    if (lineCoords.length >= 2) {
      if (closed && lineCoords.length >= 3) {
        features.push({
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [[...lineCoords, lineCoords[0]]],
          },
          properties: {},
        });
      } else {
        features.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates: lineCoords },
          properties: {},
        });
      }
    }
    return { type: "FeatureCollection", features };
  };

  ctx.updateTempSource = (pts, closed) => {
    const src = map.getSource(ctx.ts.sourceId);
    if (src) src.setData(ctx.buildFeatures(pts, closed));
  };

  ctx.midCoord = (a, b) => {
    const alng = a.lng ?? a.lon;
    const blng = b.lng ?? b.lon;
    return [(alng + blng) / 2, (a.lat + b.lat) / 2];
  };
  ctx.edgeFeature = (a, b, adj) => {
    const dist = measureDistance(
      [a.lng ?? a.lon, a.lat],
      [b.lng ?? b.lon, b.lat],
    );
    const lenTxt = formatDistance(dist);
    const adjTxt = String(adj ?? "").trim();
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: ctx.midCoord(a, b) },
      properties: {
        kind: "edge",
        label: adjTxt ? `${adjTxt}\n${lenTxt}` : lenTxt,
        adj: adjTxt,
        len: lenTxt,
      },
    };
  };
  // نقاط پیش‌نویس فعلی (نرمال‌شده) — مبنای شماره‌گذاری گوشه‌ها و مجاورت‌ها
  ctx.draftPoints = () => {
    if (ctx.shape.value && Array.isArray(ctx.shape.value.positions)) {
      return ctx.shape.value.positions.map((p) => ({ lng: p.lon ?? p.lng, lat: p.lat }));
    }
    return ctx.positions.map((p) => ({ lng: p.lng ?? p.lon, lat: p.lat }));
  };
  ctx.draftType = () => {
    return ctx.shape.value?.type || ctx.drawMode.value;
  };
  ctx.draftEdgeCount = () => {
    const pts = ctx.draftPoints();
    const t = ctx.draftType();
    if (t === "polygon" || t === "rectangle") {
      return pts.length >= 2 ? pts.length : 0;
    }
    if (t === "polyline") {
      return pts.length >= 2 ? pts.length - 1 : 0;
    }
    return 0;
  };
  ctx.draftEdgeNames = () => {
    const n = ctx.draftEdgeCount();
    const pts = ctx.draftPoints();
    const t = ctx.draftType();
    const names = [];
    for (let i = 0; i < n; i++) {
      if ((t === "polygon" || t === "rectangle") && pts.length >= 2) {
        const a = i + 1;
        const b = (i + 1) % pts.length + 1;
        names.push(`${a}-${b}`);
      } else {
        names.push(`${i + 1}-${i + 2}`);
      }
    }
    return names;
  };
  // طول آرایه مجاورت‌ها را با تعداد اضلاع همگام می‌کند (مقادیر تایپ‌شده حفظ می‌شود)
  ctx.syncAdjacents = () => {
    const n = ctx.draftEdgeCount();
    const arr = ctx.formData.value.adjacents;
    if (!Array.isArray(arr)) ctx.formData.value.adjacents = [];
    const a = ctx.formData.value.adjacents;
    while (a.length < n) a.push("");
    if (a.length > n) a.length = n;
  };
  // بازسازی لیبل‌های روی نقشه تا متن مجاورت به‌صورت لایو کنار همان ضلع دیده شود
  ctx.refreshAdjacencyLabels = () => {
    try {
      const pts = ctx.draftPoints();
      if (!pts.length) return;
      const t = ctx.draftType();
      if (t === "polygon" || t === "rectangle") ctx.updatePolygonLabels(pts);
      else if (t === "polyline") ctx.updateLineLabels(pts);
    } catch (e) {}
  };
  ctx.vertexFeatures = (pts) => {
    return pts.map((p, i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng ?? p.lon, p.lat] },
      properties: { kind: "vertex", label: String(i + 1) },
    }));
  };
  ctx.updatePolygonLabels = (pts) => {
    if (ctx.drawMode.value !== "polygon" && ctx.drawMode.value !== "rectangle") return;
    if (!ctx.ts.polygonLabelSourceId) return;
    const labelSrc = map.getSource(ctx.ts.polygonLabelSourceId);
    if (!labelSrc) return;
    ctx.syncAdjacents();
    // لیبل مختصات UTM رئوس عمداً نمایش داده نمی‌شود؛ فقط شماره گوشه + طول/مجاورت اضلاع و مرکز
    const adj = ctx.formData.value.adjacents || [];
    const features = [];
    // شماره گوشه‌ها
    features.push(...ctx.vertexFeatures(pts));
    for (let i = 1; i < pts.length; i++) {
      features.push(ctx.edgeFeature(pts[i - 1], pts[i], adj[i - 1]));
    }
    if (pts.length >= 3) {
      features.push(ctx.edgeFeature(pts[pts.length - 1], pts[0], adj[pts.length - 1]));
    }
    if (pts.length >= 3) {
      const c = computeCentroid(
        pts.map((p) => ({ lon: p.lng ?? p.lon, lat: p.lat })),
      );
      if (c) {
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [c.lon, c.lat] },
          properties: { kind: "center", label: "C" },
        });
      }
    }
    labelSrc.setData({ type: "FeatureCollection", features });
  };
  ctx.updateLineLabels = (pts) => {
    if (ctx.drawMode.value !== "polyline" || !ctx.ts.lineLabelSourceId) return;
    const labelSrc = map.getSource(ctx.ts.lineLabelSourceId);
    if (!labelSrc) return;
    ctx.syncAdjacents();
    const adj = ctx.formData.value.adjacents || [];
    const features = [];
    features.push(...ctx.vertexFeatures(pts));
    for (let i = 1; i < pts.length; i++) {
      features.push(ctx.edgeFeature(pts[i - 1], pts[i], adj[i - 1]));
    }
    labelSrc.setData({ type: "FeatureCollection", features });
  };

  ctx.updateRectTempSource = (start, end) => {
    const src = map.getSource(ctx.ts.sourceId);
    if (!src) return;
    const s = [start.lng, start.lat];
    const e = [end.lng, end.lat];
    const coords = [
      s,
      [e[0], s[1]],
      e,
      [s[0], e[1]],
      s,
    ];
    const features = [
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [coords] },
        properties: {},
      },
      ...coords.slice(0, 4).map((c) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: c },
        properties: {},
      })),
    ];
    src.setData({ type: "FeatureCollection", features });
  };

  ctx.nearestPointIndex = (lngLat, threshold) => {
    // باید روی نقاط در حال ویرایش جستجو شود (در حالت ویرایش: shape.positions)،
    // نه روی کپی قدیمی positions که بعد از درگ کهنه می‌شود
    const arr = ctx.editingPointsRef();
    if (!arr) return -1;
    const p = map.project(lngLat);
    let best = -1;
    let bestDist = threshold;
    for (let i = 0; i < arr.length; i++) {
      const cp = map.project({ lng: arr[i].lng ?? arr[i].lon, lat: arr[i].lat });
      const dx = p.x - cp.x;
      const dy = p.y - cp.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  };

  ctx.addPolygonLayers = () => {
    ctx.addTempLayer(ctx.ts.sourceId + "-fill", {
      type: "fill",
      paint: { "fill-color": ctx.currentColor(), "fill-opacity": 0.35 },
    });
    ctx.addTempLayer(ctx.ts.sourceId + "-outline", {
      type: "line",
      paint: {
        "line-color": ctx.currentColor(),
        "line-width": 2.5,
        "line-opacity": 0.9,
      },
    });
    ctx.addTempLayer(ctx.ts.sourceId + "-points", {
      type: "symbol",
      filter: ["==", "$type", "Point"],
      layout: {
        "icon-image": VERTEX_SQUARE_IMAGE,
        "icon-size": 0.16,
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        "icon-color": ctx.currentColor(),
        "icon-opacity": 0.95,
      },
    });
    const labelSrcId = ctx.addLabelSource();
    ctx.ts.polygonLabelSourceId = labelSrcId;
    ctx.addTempLayer(ctx.ts.sourceId + "-edge-label", {
      type: "symbol",
      source: labelSrcId,
      filter: ["==", ["get", "kind"], "edge"],
      layout: {
        "text-field": ["get", "len"],
        "text-size": 10,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": MAP_TEXT_FONT,
      },
      paint: {
        "text-color": "#b45309",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });
    ctx.addTempLayer(ctx.ts.sourceId + "-edge-adj-label", {
      type: "symbol",
      source: labelSrcId,
      filter: ["all", ["==", ["get", "kind"], "edge"], ["!=", ["get", "adj"], ""]],
      layout: {
        "text-field": ["get", "adj"],
        "text-size": 11,
        "text-offset": [0, -1.3],
        "text-anchor": "bottom",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": MAP_TEXT_FONT,
      },
      paint: {
        "text-color": "#1d4ed8",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });
    ctx.addTempLayer(ctx.ts.sourceId + "-vertex-label", {
      type: "symbol",
      source: labelSrcId,
      filter: ["==", ["get", "kind"], "vertex"],
      layout: {
        "text-field": ["get", "label"],
        "text-size": 12,
        "text-offset": [0, -1.2],
        "text-anchor": "bottom",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": MAP_TEXT_FONT,
      },
      paint: {
        "text-color": "#facc15",
        "text-halo-color": "#111111",
        "text-halo-width": 2.5,
      },
    });
    ctx.addTempLayer(ctx.ts.sourceId + "-center-point", {
      type: "circle",
      source: labelSrcId,
      filter: ["==", ["get", "kind"], "center"],
      paint: {
        "circle-radius": 4,
        "circle-color": "#2563eb",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });
    ctx.addTempLayer(ctx.ts.sourceId + "-center-label", {
      type: "symbol",
      source: labelSrcId,
      filter: ["==", ["get", "kind"], "center"],
      layout: {
        "text-field": ["get", "label"],
        "text-size": 9,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": MAP_TEXT_FONT,
      },
      paint: {
        "text-color": "#1d4ed8",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });
  };

  ctx.addPolylineLayers = () => {
    ctx.addTempLayer(ctx.ts.sourceId + "-line", {
      type: "line",
      paint: {
        "line-color": ctx.currentColor(),
        "line-width": 2.5,
        "line-opacity": 0.85,
      },
    });
    ctx.addTempLayer(ctx.ts.sourceId + "-points", {
      type: "symbol",
      filter: ["==", "$type", "Point"],
      layout: {
        "icon-image": VERTEX_SQUARE_IMAGE,
        "icon-size": 0.16,
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        "icon-color": ctx.currentColor(),
        "icon-opacity": 0.9,
      },
    });
    const labelSrcId = ctx.addLabelSource();
    ctx.ts.lineLabelSourceId = labelSrcId;
    ctx.addTempLayer(ctx.ts.sourceId + "-edge-label", {
      type: "symbol",
      source: labelSrcId,
      filter: ["==", ["get", "kind"], "edge"],
      layout: {
        "text-field": ["get", "len"],
        "text-size": 10,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": MAP_TEXT_FONT,
      },
      paint: {
        "text-color": "#b45309",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });
    ctx.addTempLayer(ctx.ts.sourceId + "-edge-adj-label", {
      type: "symbol",
      source: labelSrcId,
      filter: ["all", ["==", ["get", "kind"], "edge"], ["!=", ["get", "adj"], ""]],
      layout: {
        "text-field": ["get", "adj"],
        "text-size": 11,
        "text-offset": [0, -1.3],
        "text-anchor": "bottom",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": MAP_TEXT_FONT,
      },
      paint: {
        "text-color": "#1d4ed8",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });
    ctx.addTempLayer(ctx.ts.sourceId + "-vertex-label", {
      type: "symbol",
      source: labelSrcId,
      filter: ["==", ["get", "kind"], "vertex"],
      layout: {
        "text-field": ["get", "label"],
        "text-size": 12,
        "text-offset": [0, -1.2],
        "text-anchor": "bottom",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": MAP_TEXT_FONT,
      },
      paint: {
        "text-color": "#facc15",
        "text-halo-color": "#111111",
        "text-halo-width": 2.5,
      },
    });
    ctx.addTempLayer(ctx.ts.sourceId + "-center-point", {
      type: "circle",
      source: labelSrcId,
      filter: ["==", ["get", "kind"], "center"],
      paint: {
        "circle-radius": 4,
        "circle-color": "#2563eb",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });
    ctx.addTempLayer(ctx.ts.sourceId + "-center-label", {
      type: "symbol",
      source: labelSrcId,
      filter: ["==", ["get", "kind"], "center"],
      layout: {
        "text-field": ["get", "label"],
        "text-size": 9,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": MAP_TEXT_FONT,
      },
      paint: {
        "text-color": "#1d4ed8",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });
  };

  ctx.addMultiPointLayers = () => {
    ctx.addTempLayer(ctx.ts.sourceId + "-points", {
      type: "circle",
      paint: {
        "circle-radius": 5,
        "circle-color": ctx.color.value,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-opacity": 0.9,
      },
    });
  };

  ctx.addRectangleLayers = () => {
    ctx.addTempLayer(ctx.ts.sourceId + "-fill", {
      type: "fill",
      paint: { "fill-color": ctx.currentColor(), "fill-opacity": 0.35 },
    });
    ctx.addTempLayer(ctx.ts.sourceId + "-outline", {
      type: "line",
      paint: {
        "line-color": ctx.currentColor(),
        "line-width": 2.5,
        "line-opacity": 0.9,
      },
    });
    ctx.addTempLayer(ctx.ts.sourceId + "-points", {
      type: "symbol",
      filter: ["==", "$type", "Point"],
      layout: {
        "icon-image": VERTEX_SQUARE_IMAGE,
        "icon-size": 0.16,
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        "icon-color": ctx.currentColor(),
        "icon-opacity": 0.9,
      },
    });
    const labelSrcId = ctx.addLabelSource();
    ctx.ts.polygonLabelSourceId = labelSrcId;
    ctx.addTempLayer(ctx.ts.sourceId + "-edge-label", {
      type: "symbol",
      source: labelSrcId,
      filter: ["==", ["get", "kind"], "edge"],
      layout: {
        "text-field": ["get", "len"],
        "text-size": 10,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": MAP_TEXT_FONT,
      },
      paint: {
        "text-color": "#b45309",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });
    ctx.addTempLayer(ctx.ts.sourceId + "-edge-adj-label", {
      type: "symbol",
      source: labelSrcId,
      filter: ["all", ["==", ["get", "kind"], "edge"], ["!=", ["get", "adj"], ""]],
      layout: {
        "text-field": ["get", "adj"],
        "text-size": 11,
        "text-offset": [0, -1.3],
        "text-anchor": "bottom",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": MAP_TEXT_FONT,
      },
      paint: {
        "text-color": "#1d4ed8",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });
    ctx.addTempLayer(ctx.ts.sourceId + "-vertex-label", {
      type: "symbol",
      source: labelSrcId,
      filter: ["==", ["get", "kind"], "vertex"],
      layout: {
        "text-field": ["get", "label"],
        "text-size": 12,
        "text-offset": [0, -1.2],
        "text-anchor": "bottom",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": MAP_TEXT_FONT,
      },
      paint: {
        "text-color": "#facc15",
        "text-halo-color": "#111111",
        "text-halo-width": 2.5,
      },
    });
    ctx.addTempLayer(ctx.ts.sourceId + "-center-point", {
      type: "circle",
      source: labelSrcId,
      filter: ["==", ["get", "kind"], "center"],
      paint: {
        "circle-radius": 4,
        "circle-color": "#2563eb",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });
  };

  // رنگ لایه‌های موقت را مطابق وضعیت (قرمز=در حال ترسیم / سبز=پایان) به‌روزرسانی می‌کند
  ctx.applyDisplayColor = () => {
    const c = ctx.currentColor();
    const paint = (id, prop, val) => {
      if (map.getLayer(id)) {
        try {
          map.setPaintProperty(id, prop, val);
        } catch (e) {}
      }
    };
    paint(ctx.ts.sourceId + "-fill", "fill-color", c);
    paint(ctx.ts.sourceId + "-outline", "line-color", c);
    paint(ctx.ts.sourceId + "-points", "icon-color", c);
    paint(ctx.ts.sourceId + "-line", "line-color", c);
    if (ctx.drawMode.value === "multi_point") {
      // نقاط چندگانه هر نقطه رنگ خود را دارد؛ فقط رنگ پیش‌فرض را تنظیم می‌کنیم
      paint(ctx.ts.sourceId + "-points", "circle-color", c);
    }
    // رنگ مرکز بعد از پایان به سبز می‌رود
    paint(ctx.ts.sourceId + "-center-point", "circle-color", ctx.shape.value ? DONE_COLOR : "#2563eb");
  };

  ctx.currentCenter = () => {
    const pts = ctx.editingPointsRef();
    if (!pts || pts.length === 0) return null;
    const ll = ctx.editingPointsForLonLat(pts);
    if (ctx.drawMode.value === "polygon" || ctx.drawMode.value === "rectangle") {
      if (ll.length >= 3) {
        const c = computeCentroid(ll);
        if (c) return c;
      }
    }
    const s = ll.reduce(
      (a, p) => ({ lng: a.lng + p.lng, lat: a.lat + p.lat }),
      { lng: 0, lat: 0 },
    );
    return { lng: s.lng / ll.length, lat: s.lat / ll.length };
  };
  ctx.nearCenter = (lngLat, c, threshold = 18) => {
    if (!c) return false;
    const p = map.project({ lng: c.lng, lat: c.lat });
    const q = map.project(lngLat);
    return Math.hypot(p.x - q.x, p.y - q.y) < threshold;
  };
  ctx.renderEditable = (closed) => {
    const pts = ctx.editingPointsRef();
    if (!pts || pts.length === 0) return;
    ctx.syncAdjacents();
    ctx.updateTempSource(ctx.editingPointsForLonLat(pts), closed);
    if (ctx.drawMode.value === "polygon" || ctx.drawMode.value === "rectangle") {
      ctx.updatePolygonLabels(ctx.editingPointsForLonLat(pts));
    } else if (ctx.drawMode.value === "polyline") {
      ctx.updateLineLabels(ctx.editingPointsForLonLat(pts));
    }
  };
}
