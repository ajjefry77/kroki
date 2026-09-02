import {
  ref,
  reactive,
  toRaw,
  computed,
  watch,
  nextTick,
} from "vue";
import {
  measureDistance,
  formatDistance,
  formatArea,
  formatVertexLabel,
  getDrawTypeName,
  toUTM,
  toUTMInZone,
  computeCentroid,
} from "../utils/useDrawingHelpers";
import { renderPinOnMap, updatePinGeometry } from "../utils/pinRenderer";
import { ensureVertexSquareImage, VERTEX_SQUARE_IMAGE } from "../utils/drawStyle";

// رنگ ترسیم: قرمز هنگام در حال ترسیم، سبز پس از پایان
export const DRAFT_COLOR = "#ff0000";
export const DONE_COLOR = "#00a651";

export function useDrawing(map, pins) {
  const loading = ref(false);
  const drawMode = ref("");
  const color = ref("#ff0000");
  const measureActive = ref(false);
  const positions = reactive([]);
  const formData = ref({ name: "", description: "" });
  const showForm = ref(false);
  const shape = ref(null);
  const activeTab = ref("measurements");
  const measurePoints = reactive([]);
  const coordinateSystem = ref("utm");
  const nameError = ref(false);

  const hs = {
    mouseMove: null,
    click: null,
    dblClick: null,
    rightClick: null,
    key: null,
    mousedown: null,
    mouseup: null,
    styleLoad: null,
  };
  const ts = {
    sourceId: null,
    layerIds: [],
    polygonLabelSourceId: null,
    lineLabelSourceId: null,
    extraSourceIds: [],
  };
  const drawDataSourceId = "pins-draw-" + crypto.randomUUID();

  let draggingIndex = -1;
  let dragActive = false;
  let dragKind = ""; // "vertex" | "center"
  let dragCenterRef = null; // {lng,lat} شروع درگ مرکز
  let dragOrigPts = []; // نقطه‌های اولیه هنگام درگ مرکز
  let lastClickTs = 0;
  let rectStart = null;

  function currentColor() {
    if (editingPin) return DRAFT_COLOR;
    return shape.value ? DONE_COLOR : DRAFT_COLOR;
  }

  // آرایه نقطه‌های قابل ویرایش (هم هنگام درگِ در دست ترسیم و هم پس از Enter)
  function editingPointsRef() {
    return shape.value ? shape.value.positions : positions;
  }
  function setEditablePoint(i, pt) {
    const refArr = shape.value ? shape.value.positions : positions;
    if (!refArr || !refArr[i]) return;
    if (shape.value) {
      refArr[i].lon = pt.lng ?? pt.lon;
      refArr[i].lat = pt.lat;
    } else {
      refArr[i].lng = pt.lng ?? pt.lon;
      refArr[i].lat = pt.lat;
    }
  }
  function editingPointsForLonLat(arr) {
    return (arr || []).map((p) => ({ lng: p.lng ?? p.lon, lat: p.lat }));
  }
  function currentCenter() {
    const pts = editingPointsRef();
    if (!pts || pts.length === 0) return null;
    const ll = editingPointsForLonLat(pts);
    if (drawMode.value === "polygon" || drawMode.value === "rectangle") {
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
  }
  function nearCenter(lngLat, c, threshold = 18) {
    if (!c) return false;
    const p = map.project({ lng: c.lng, lat: c.lat });
    const q = map.project(lngLat);
    return Math.hypot(p.x - q.x, p.y - q.y) < threshold;
  }
  function renderEditable(closed) {
    const pts = editingPointsRef();
    if (!pts || pts.length === 0) return;
    updateTempSource(editingPointsForLonLat(pts), closed);
    if (drawMode.value === "polygon" || drawMode.value === "rectangle") {
      updatePolygonLabels(editingPointsForLonLat(pts));
    } else if (drawMode.value === "polyline") {
      updateLineLabels(editingPointsForLonLat(pts));
    }
  }

  const livePoints = computed(() => {
    if (shape.value) return getAllPoints();
    if (positions.length > 0)
      return positions.map((p) => ({ lat: p.lat, lon: p.lng }));
    return [];
  });
  const displayPoints = computed(() => {
    const src = measureActive.value ? measurePoints : livePoints.value;
    return src.map((p, i) => {
      const lon = Array.isArray(p) ? p[0] : p.lon || p.lng;
      const lat = Array.isArray(p) ? p[1] : p.lat;
      if (coordinateSystem.value === "utm") {
        const { x, y, zone } = toUTM(lon, lat);
        return { lat, lon, displayX: x, displayY: y, zone, system: "utm", index: i };
      }
      return { lat, lon, displayX: lon, displayY: lat, system: "latlon", index: i };
    });
  });
  const livePointCount = computed(() => {
    if (shape.value) return getPointsCount();
    if (measureActive.value) return measurePoints.length;
    return positions.length;
  });
  const computeTotalFromArr = (arr) => {
    if (arr.length < 2) return "0 m";
    let total = 0;
    for (let i = 1; i < arr.length; i++) {
      const a = arr[i - 1];
      const b = arr[i];
      total += measureDistance(
        Array.isArray(a) ? a : [a.lon || a.lng, a.lat],
        Array.isArray(b) ? b : [b.lon || b.lng, b.lat],
      );
    }
    return formatDistance(total);
  };
  const liveTotalLength = computed(() => {
    if (shape.value) return calculateTotalLength();
    if (measureActive.value) return computeTotalFromArr(measurePoints);
    return computeTotalFromArr(livePoints.value);
  });
  const liveArea = computed(() => {
    if (shape.value) return calculateArea();
    if (drawMode.value !== "polygon" && drawMode.value !== "rectangle") return "0 m²";
    const points = livePoints.value;
    if (points.length < 3) return "0 m²";
    const coords = points.map((p) => {
      const { x, y } = toUTM(p.lon, p.lat);
      return [x, y];
    });
    let area = 0;
    for (let i = 0; i < coords.length; i++) {
      const j = (i + 1) % coords.length;
      area += coords[i][0] * coords[j][1];
      area -= coords[j][0] * coords[i][1];
    }
    return formatArea(Math.abs(area) / 2);
  });
  const canFinishDrawing = computed(() => {
    if (shape.value) return false;
    const mode = drawMode.value;
    if (mode === "polyline") return positions.length >= 2;
    if (mode === "polygon") return positions.length >= 3;
    if (mode === "multi_point") return positions.length >= 1;
    if (mode === "rectangle") return !!rectStart;
    return false;
  });
  const isSaveEnabled = computed(() => {
    if (drawMode.value === "multi_point") {
      if (positions.length > 0) return true;
      if (
        shape.value &&
        shape.value.type === "multi_point" &&
        Array.isArray(shape.value.positions) &&
        shape.value.positions.length > 0
      )
        return true;
      return false;
    }
    return !!shape.value;
  });

  watch(
    () => formData.value.name,
    () => { nameError.value = false; },
  );

  function clearTempLayers() {
    ts.layerIds.forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    ts.layerIds = [];
    if (ts.sourceId && map.getSource(ts.sourceId)) {
      map.removeSource(ts.sourceId);
      ts.sourceId = null;
    }
    ts.extraSourceIds.forEach((id) => {
      if (map.getSource(id)) map.removeSource(id);
    });
    ts.extraSourceIds = [];
    ts.polygonLabelSourceId = null;
    ts.lineLabelSourceId = null;
  }

  function cleanupHandlers() {
    if (hs.mouseMove) { map.off("mousemove", hs.mouseMove); hs.mouseMove = null; }
    if (hs.click) { map.off("click", hs.click); hs.click = null; }
    if (hs.dblClick) { map.off("dblclick", hs.dblClick); hs.dblClick = null; }
    if (hs.rightClick) { map.off("contextmenu", hs.rightClick); hs.rightClick = null; }
    if (hs.mousedown) { map.off("mousedown", hs.mousedown); hs.mousedown = null; }
    if (hs.mouseup) { map.off("mouseup", hs.mouseup); hs.mouseup = null; }
    if (hs.key) { window.removeEventListener("keydown", hs.key); hs.key = null; }
    map.getCanvas().style.cursor = "default";
    draggingIndex = -1;
    dragActive = false;
    dragKind = "";
    dragCenterRef = null;
    dragOrigPts = [];
    rectStart = null;
  }

  function addTempSource() {
    ts.sourceId = "temp-" + crypto.randomUUID();
    map.addSource(ts.sourceId, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    return ts.sourceId;
  }
  function addTempLayer(id, config) {
    map.addLayer({ source: ts.sourceId, ...config, id });
    ts.layerIds.push(id);
  }
  function addLabelSource() {
    const labelId = ts.sourceId + "-labels";
    map.addSource(labelId, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    ts.extraSourceIds.push(labelId);
    return labelId;
  }

  function buildFeatures(pts, closed) {
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
  }

  function updateTempSource(pts, closed) {
    const src = map.getSource(ts.sourceId);
    if (src) src.setData(buildFeatures(pts, closed));
  }

  function midCoord(a, b) {
    const alng = a.lng ?? a.lon;
    const blng = b.lng ?? b.lon;
    return [(alng + blng) / 2, (a.lat + b.lat) / 2];
  }
  function edgeFeature(a, b) {
    const dist = measureDistance(
      [a.lng ?? a.lon, a.lat],
      [b.lng ?? b.lon, b.lat],
    );
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: midCoord(a, b) },
      properties: { kind: "edge", label: formatDistance(dist) },
    };
  }
  function updatePolygonLabels(pts) {
    if (drawMode.value !== "polygon" && drawMode.value !== "rectangle") return;
    if (!ts.polygonLabelSourceId) return;
    const labelSrc = map.getSource(ts.polygonLabelSourceId);
    if (!labelSrc) return;
    const features = [];
    pts.forEach((p) => {
      const lng = p.lng || p.lon;
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, p.lat] },
        properties: {
          kind: "vertex",
          label: formatVertexLabel(lng, p.lat, coordinateSystem.value),
        },
      });
    });
    for (let i = 1; i < pts.length; i++) {
      features.push(edgeFeature(pts[i - 1], pts[i]));
    }
    if (pts.length >= 3) {
      features.push(edgeFeature(pts[pts.length - 1], pts[0]));
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
  }
  function updateLineLabels(pts) {
    if (drawMode.value !== "polyline" || !ts.lineLabelSourceId) return;
    const labelSrc = map.getSource(ts.lineLabelSourceId);
    if (!labelSrc) return;
    const features = [];
    for (let i = 1; i < pts.length; i++) {
      features.push(edgeFeature(pts[i - 1], pts[i]));
    }
    labelSrc.setData({ type: "FeatureCollection", features });
  }

  function updateRectTempSource(start, end) {
    const src = map.getSource(ts.sourceId);
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
  }

  function nearestPointIndex(lngLat, threshold) {
    const p = map.project(lngLat);
    let best = -1;
    let bestDist = threshold;
    for (let i = 0; i < positions.length; i++) {
      const cp = map.project({ lng: positions[i].lng, lat: positions[i].lat });
      const dx = p.x - cp.x;
      const dy = p.y - cp.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }

  function addPolygonLayers() {
    addTempLayer(ts.sourceId + "-fill", {
      type: "fill",
      paint: { "fill-color": currentColor(), "fill-opacity": 0.35 },
    });
    addTempLayer(ts.sourceId + "-outline", {
      type: "line",
      paint: {
        "line-color": currentColor(),
        "line-width": 2.5,
        "line-opacity": 0.9,
      },
    });
    addTempLayer(ts.sourceId + "-points", {
      type: "symbol",
      filter: ["==", "$type", "Point"],
      layout: {
        "icon-image": VERTEX_SQUARE_IMAGE,
        "icon-size": 0.16,
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        "icon-color": currentColor(),
        "icon-opacity": 0.95,
      },
    });
    const labelSrcId = addLabelSource();
    ts.polygonLabelSourceId = labelSrcId;
    addTempLayer(ts.sourceId + "-edge-label", {
      type: "symbol",
      source: labelSrcId,
      filter: ["==", ["get", "kind"], "edge"],
      layout: {
        "text-field": ["get", "label"],
        "text-size": 10,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": ["Droid Sans", "Arial Unicode MS Bold"],
      },
      paint: {
        "text-color": "#b45309",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });
    addTempLayer(ts.sourceId + "-vertex-label", {
      type: "symbol",
      source: labelSrcId,
      filter: ["==", ["get", "kind"], "vertex"],
      layout: {
        "text-field": ["get", "label"],
        "text-size": 9,
        "text-offset": [0, -1.2],
        "text-anchor": "bottom",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": ["Droid Sans", "Arial Unicode MS Bold"],
      },
      paint: {
        "text-color": "#1e3a8a",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });
    addTempLayer(ts.sourceId + "-center-point", {
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
    addTempLayer(ts.sourceId + "-center-label", {
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
        "text-font": ["Droid Sans", "Arial Unicode MS Bold"],
      },
      paint: {
        "text-color": "#1d4ed8",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });
  }

  function addPolylineLayers() {
    addTempLayer(ts.sourceId + "-line", {
      type: "line",
      paint: {
        "line-color": currentColor(),
        "line-width": 2.5,
        "line-opacity": 0.85,
      },
    });
    addTempLayer(ts.sourceId + "-points", {
      type: "symbol",
      filter: ["==", "$type", "Point"],
      layout: {
        "icon-image": VERTEX_SQUARE_IMAGE,
        "icon-size": 0.16,
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        "icon-color": currentColor(),
        "icon-opacity": 0.9,
      },
    });
    const labelSrcId = addLabelSource();
    ts.lineLabelSourceId = labelSrcId;
    addTempLayer(ts.sourceId + "-edge-label", {
      type: "symbol",
      source: labelSrcId,
      filter: ["==", ["get", "kind"], "edge"],
      layout: {
        "text-field": ["get", "label"],
        "text-size": 10,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": ["Droid Sans", "Arial Unicode MS Bold"],
      },
      paint: {
        "text-color": "#b45309",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });
    addTempLayer(ts.sourceId + "-center-point", {
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
    addTempLayer(ts.sourceId + "-center-label", {
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
        "text-font": ["Droid Sans", "Arial Unicode MS Bold"],
      },
      paint: {
        "text-color": "#1d4ed8",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });
  }

  function addMultiPointLayers() {
    addTempLayer(ts.sourceId + "-points", {
      type: "circle",
      paint: {
        "circle-radius": 5,
        "circle-color": color.value,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-opacity": 0.9,
      },
    });
  }

  function addRectangleLayers() {
    addTempLayer(ts.sourceId + "-fill", {
      type: "fill",
      paint: { "fill-color": currentColor(), "fill-opacity": 0.35 },
    });
    addTempLayer(ts.sourceId + "-outline", {
      type: "line",
      paint: {
        "line-color": currentColor(),
        "line-width": 2.5,
        "line-opacity": 0.9,
      },
    });
    addTempLayer(ts.sourceId + "-points", {
      type: "symbol",
      filter: ["==", "$type", "Point"],
      layout: {
        "icon-image": VERTEX_SQUARE_IMAGE,
        "icon-size": 0.16,
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        "icon-color": currentColor(),
        "icon-opacity": 0.9,
      },
    });
    const labelSrcId = addLabelSource();
    ts.polygonLabelSourceId = labelSrcId;
    addTempLayer(ts.sourceId + "-edge-label", {
      type: "symbol",
      source: labelSrcId,
      filter: ["==", ["get", "kind"], "edge"],
      layout: {
        "text-field": ["get", "label"],
        "text-size": 10,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": ["Droid Sans", "Arial Unicode MS Bold"],
      },
      paint: {
        "text-color": "#b45309",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });
    addTempLayer(ts.sourceId + "-vertex-label", {
      type: "symbol",
      source: labelSrcId,
      filter: ["==", ["get", "kind"], "vertex"],
      layout: {
        "text-field": ["get", "label"],
        "text-size": 9,
        "text-offset": [0, -1.2],
        "text-anchor": "bottom",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": ["Droid Sans", "Arial Unicode MS Bold"],
      },
      paint: {
        "text-color": "#1e3a8a",
        "text-halo-color": "#ffffff",
        "text-halo-width": 2,
      },
    });
    addTempLayer(ts.sourceId + "-center-point", {
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
  }

  // رنگ لایه‌های موقت را مطابق وضعیت (قرمز=در حال ترسیم / سبز=پایان) به‌روزرسانی می‌کند
  function applyDisplayColor() {
    const c = currentColor();
    const paint = (id, prop, val) => {
      if (map.getLayer(id)) {
        try {
          map.setPaintProperty(id, prop, val);
        } catch (e) {}
      }
    };
    paint(ts.sourceId + "-fill", "fill-color", c);
    paint(ts.sourceId + "-outline", "line-color", c);
    paint(ts.sourceId + "-points", "icon-color", c);
    paint(ts.sourceId + "-line", "line-color", c);
    if (drawMode.value === "multi_point") {
      // نقاط چندگانه هر نقطه رنگ خود را دارد؛ فقط رنگ پیش‌فرض را تنظیم می‌کنیم
      paint(ts.sourceId + "-points", "circle-color", c);
    }
    // رنگ مرکز بعد از پایان به سبز می‌رود
    paint(ts.sourceId + "-center-point", "circle-color", shape.value ? DONE_COLOR : "#2563eb");
  }

  function startDrawing() {
    const m = map;
    m.getCanvas().style.cursor = "crosshair";
    try {
      ensureVertexSquareImage(m);
    } catch (e) {}

    if (drawMode.value === "multi_point") {
      addTempSource();
      addMultiPointLayers();
      const updateSource = () => {
        const src = m.getSource(ts.sourceId);
        if (!src) return;
        const features = positions.map((p) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
          properties: { color: p.color || color.value },
        }));
        src.setData({ type: "FeatureCollection", features });
      };
      hs.click = (e) => {
        positions.push({
          lng: e.lngLat.lng,
          lat: e.lngLat.lat,
          color: color.value,
        });
        updateSource();
      };
      hs.rightClick = (e) => {
        e.preventDefault();
        if (positions.length < 1) return;
        cleanupHandlers();
        finishDrawing("multi_point", [...positions]);
      };
      hs.key = (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          finishCurrentDrawing();
        } else if (event.key === "Delete" && positions.length > 0) {
          positions.pop();
          updateSource();
        }
      };
      window.addEventListener("keydown", hs.key);
      m.on("click", hs.click);
      m.on("contextmenu", hs.rightClick);

    } else if (drawMode.value === "polyline") {
      addTempSource();
      addPolylineLayers();
      hs.mousedown = (e) => {
        if (e.originalEvent.button !== 0) return;
        const pts = editingPointsRef();
        if (!pts || !pts.length) return;
        const idx = nearestPointIndex(e.lngLat, 14);
        if (idx >= 0 && pts.length >= 2) {
          dragActive = true;
          dragKind = "vertex";
          draggingIndex = idx;
          m.dragPan.disable();
          return;
        }
        if (pts.length >= 2) {
          const c = currentCenter();
          if (nearCenter(e.lngLat, c)) {
            dragActive = true;
            dragKind = "center";
            dragCenterRef = { lng: e.lngLat.lng, lat: e.lngLat.lat };
            dragOrigPts = editingPointsForLonLat(pts).map((p) => ({ ...p }));
            m.dragPan.disable();
          }
        }
      };
      hs.mouseMove = (e) => {
        if (dragActive) {
          const pts = editingPointsRef();
          if (dragKind === "vertex" && draggingIndex >= 0) {
            setEditablePoint(draggingIndex, { lng: e.lngLat.lng, lat: e.lngLat.lat });
            renderEditable(false);
            return;
          }
          if (dragKind === "center" && dragCenterRef && dragOrigPts.length) {
            const dLng = e.lngLat.lng - dragCenterRef.lng;
            const dLat = e.lngLat.lat - dragCenterRef.lat;
            dragOrigPts.forEach((p, i) => {
              setEditablePoint(i, { lng: p.lng + dLng, lat: p.lat + dLat });
            });
            renderEditable(false);
            return;
          }
        }
        const pts = editingPointsRef();
        if (!pts || pts.length === 0) return;
        if (!shape.value && !dragActive) {
          updateTempSource([...editingPointsForLonLat(pts), { lng: e.lngLat.lng, lat: e.lngLat.lat }]);
        }
      };
      hs.mouseup = () => {
        if (dragActive) {
          dragActive = false;
          dragKind = "";
          draggingIndex = -1;
          dragCenterRef = null;
          dragOrigPts = [];
          m.dragPan.enable();
        }
      };
      hs.click = (e) => {
        if (dragActive || shape.value) return;
        const now = Date.now();
        if (now - lastClickTs < 280) return;
        lastClickTs = now;
        const idx = nearestPointIndex(e.lngLat, 14);
        if (idx >= 0) return;
        positions.push({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        updateTempSource(positions);
        updateLineLabels(positions);
      };
      hs.rightClick = (e) => {
        e.preventDefault();
        if (shape.value) return; // پس از پایان، حذف فقط از جدول
        if (positions.length > 0) {
          positions.pop();
          updateTempSource(positions);
          updateLineLabels(positions);
          if (positions.length < 2) cleanupHandlers();
        }
      };
      hs.dblClick = (e) => {
        e.preventDefault();
        e.originalEvent?.preventDefault?.();
        e.originalEvent?.stopPropagation?.();
        if (!shape.value) finishCurrentDrawing();
      };
      hs.key = (event) => {
        if (event.key === "Delete" && !shape.value && positions.length > 0) {
          positions.pop();
          updateTempSource(positions);
          updateLineLabels(positions);
          if (positions.length < 2) cleanupHandlers();
        } else if (event.key === "Enter") {
          event.preventDefault();
          finishCurrentDrawing();
        }
      };
      window.addEventListener("keydown", hs.key);
      m.on("click", hs.click);
      m.on("mousemove", hs.mouseMove);
      m.on("contextmenu", hs.rightClick);
      m.on("dblclick", hs.dblClick);
      m.on("mousedown", hs.mousedown);
      m.on("mouseup", hs.mouseup);

    } else if (drawMode.value === "polygon") {
      addTempSource();
      addPolygonLayers();
      hs.mousedown = (e) => {
        if (e.originalEvent.button !== 0) return;
        const pts = editingPointsRef();
        if (!pts || !pts.length) return;
        const idx = nearestPointIndex(e.lngLat, 14);
        if (idx >= 0 && pts.length >= 3) {
          dragActive = true;
          dragKind = "vertex";
          draggingIndex = idx;
          m.dragPan.disable();
          return;
        }
        if (pts.length >= 3) {
          const c = currentCenter();
          if (nearCenter(e.lngLat, c)) {
            dragActive = true;
            dragKind = "center";
            dragCenterRef = { lng: e.lngLat.lng, lat: e.lngLat.lat };
            dragOrigPts = editingPointsForLonLat(pts).map((p) => ({ ...p }));
            m.dragPan.disable();
          }
        }
      };
      hs.mouseMove = (e) => {
        if (dragActive) {
          if (dragKind === "vertex" && draggingIndex >= 0) {
            setEditablePoint(draggingIndex, { lng: e.lngLat.lng, lat: e.lngLat.lat });
            renderEditable(true);
            return;
          }
          if (dragKind === "center" && dragCenterRef && dragOrigPts.length) {
            const dLng = e.lngLat.lng - dragCenterRef.lng;
            const dLat = e.lngLat.lat - dragCenterRef.lat;
            dragOrigPts.forEach((p, i) => {
              setEditablePoint(i, { lng: p.lng + dLng, lat: p.lat + dLat });
            });
            renderEditable(true);
            return;
          }
        }
        const pts = editingPointsRef();
        if (!pts || pts.length === 0) return;
        if (!shape.value && !dragActive) {
          updateTempSource(
            [...editingPointsForLonLat(pts), { lng: e.lngLat.lng, lat: e.lngLat.lat }],
            true,
          );
        }
      };
      hs.mouseup = () => {
        if (dragActive) {
          dragActive = false;
          dragKind = "";
          draggingIndex = -1;
          dragCenterRef = null;
          dragOrigPts = [];
          m.dragPan.enable();
        }
      };
      hs.click = (e) => {
        if (dragActive || shape.value) return;
        const now = Date.now();
        if (now - lastClickTs < 280) return;
        lastClickTs = now;
        const idx = nearestPointIndex(e.lngLat, 14);
        if (idx >= 0) return;
        positions.push({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        updateTempSource(positions, true);
        updatePolygonLabels(positions);
      };
      hs.rightClick = (e) => {
        e.preventDefault();
        if (shape.value) return;
        if (positions.length > 0) {
          positions.pop();
          updateTempSource(positions, true);
          updatePolygonLabels(positions);
          if (positions.length < 3) cleanupHandlers();
        }
      };
      hs.dblClick = (e) => {
        e.preventDefault();
        e.originalEvent?.preventDefault?.();
        e.originalEvent?.stopPropagation?.();
        if (!shape.value) finishCurrentDrawing();
      };
      hs.key = (event) => {
        if (event.key === "Delete" && !shape.value && positions.length > 0) {
          positions.pop();
          updateTempSource(positions, true);
          updatePolygonLabels(positions);
          if (positions.length < 3) cleanupHandlers();
        } else if (event.key === "Enter") {
          event.preventDefault();
          finishCurrentDrawing();
        }
      };
      window.addEventListener("keydown", hs.key);
      m.on("click", hs.click);
      m.on("mousemove", hs.mouseMove);
      m.on("contextmenu", hs.rightClick);
      m.on("dblclick", hs.dblClick);
      m.on("mousedown", hs.mousedown);
      m.on("mouseup", hs.mouseup);

    } else if (drawMode.value === "rectangle") {
      addTempSource();
      addRectangleLayers();
      rectStart = null;
      hs.click = (e) => {
        if (!rectStart) {
          rectStart = { lng: e.lngLat.lng, lat: e.lngLat.lat };
          positions.length = 0;
          positions.push({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        } else {
          const s = rectStart;
          const f = { lng: e.lngLat.lng, lat: e.lngLat.lat };
          const pts = [
            { lng: s.lng, lat: s.lat },
            { lng: f.lng, lat: s.lat },
            { lng: f.lng, lat: f.lat },
            { lng: s.lng, lat: f.lat },
          ];
          positions.length = 0;
          pts.forEach((p) => positions.push(p));
          updateTempSource([...positions, positions[0]], true);
          updatePolygonLabels(positions);
          cleanupHandlers();
          finishDrawing("rectangle", [...positions]);
        }
      };
      hs.mouseMove = (e) => {
        if (!rectStart) return;
        const s = rectStart;
        const f = { lng: e.lngLat.lng, lat: e.lngLat.lat };
        updateRectTempSource(s, f);
      };
      hs.key = (event) => {
        if (event.key === "Escape") {
          rectStart = null;
          positions.length = 0;
          const src = m.getSource(ts.sourceId);
          if (src) src.setData({ type: "FeatureCollection", features: [] });
        }
      };
      window.addEventListener("keydown", hs.key);
      m.on("click", hs.click);
      m.on("mousemove", hs.mouseMove);
    }
  }

  function finishDrawing(draw, pos) {
    map.getCanvas().style.cursor = "default";
    const defaultOpacity = 0.7;
    if (draw === "multi_point") {
      shape.value = {
        type: "multi_point",
        positions: pos.map((p) => ({
          lon: p.lng,
          lat: p.lat,
          height: 0,
          color: p.color || DONE_COLOR,
        })),
        color: DONE_COLOR,
        opacity: defaultOpacity,
        width: 5,
        show: true,
      };
    } else if (draw === "polyline") {
      shape.value = {
        type: draw,
        positions: pos.map((p) => ({ lon: p.lng, lat: p.lat, height: 0 })),
        color: DONE_COLOR,
        opacity: defaultOpacity,
        width: 3,
        show: true,
      };
    } else if (draw === "polygon" || draw === "rectangle") {
      const coords = pos.map((p) => ({ lon: p.lng, lat: p.lat, height: 0 }));
      shape.value = {
        type: "polygon",
        positions: coords,
        color: DONE_COLOR,
        outlineColor: DONE_COLOR,
        opacity: defaultOpacity,
        width: 3,
        show: true,
      };
    }
    positions.length = 0;
    nameError.value = false;
    // پس از پایان ترسیم، شکل سبز می‌شود و فرم نام نمایش داده می‌شود
    applyDisplayColor();
    showForm.value = true;
    // برای پلی‌گان و خط، دستگیره‌های درگ (رأس/مرکز) فعال می‌مانند تا کاربر بتواند
    // پیش از ذخیره، شکل را روی نقشه جابه‌جا کند. بقیه حالت‌ها دستگیره ندارند.
    if (draw !== "polygon" && draw !== "polyline") {
      cleanupHandlers();
    }
  }

  function finishCurrentDrawing() {
    if (shape.value) {
      if (formData.value?.name?.trim()) {
        handleSave();
      } else {
        nameError.value = true;
      }
      return;
    }
    const mode = drawMode.value;
    let finished = false;
    if (mode === "polyline" && positions.length >= 2) {
      finishDrawing("polyline", [...positions]);
      finished = true;
    } else if (mode === "polygon" && positions.length >= 3) {
      finishDrawing("polygon", [...positions]);
      finished = true;
    } else if (mode === "multi_point" && positions.length >= 1) {
      cleanupHandlers();
      finishDrawing("multi_point", [...positions]);
      finished = true;
    } else if (mode === "rectangle" && positions.length >= 4) {
      cleanupHandlers();
      finishDrawing("rectangle", [...positions]);
      finished = true;
    }
    if (finished) {
      nextTick(() => {
        if (formData.value?.name?.trim() && shape.value) {
          handleSave();
        } else if (!formData.value?.name?.trim()) {
          nameError.value = true;
        }
      });
    }
  }

  function setDrawMode(mode) {
    if (drawMode.value === mode && showForm.value) return;
    if (editingPin) exitPinEdit();
    measureActive.value = false;
    cleanupHandlers();
    clearTempLayers();
    drawMode.value = mode;
    activeTab.value = "measurements";
    positions.length = 0;
    shape.value = null;
    // در حالت ترسیم فرم نام نمایش داده نمی‌شود؛ پس از Enter ظاهر می‌شود
    showForm.value = false;
    setTimeout(() => {
      startDrawing();
    }, 100);
  }

  function toggleMeasure() {
    measureActive.value = !measureActive.value;
    if (measureActive.value) {
      drawMode.value = "measure";
      startMeasure();
    } else {
      drawMode.value = "";
      stopMeasure();
    }
  }

  function startMeasure() {
    const m = map;
    measurePoints.length = 0;
    const tempId = "measure-temp-" + crypto.randomUUID();
    m.addSource(tempId, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    m.addLayer({
      id: tempId + "-line",
      type: "line",
      source: tempId,
      paint: {
        "line-color": "#f97316",
        "line-width": 3,
        "line-dasharray": [8, 6],
        "line-opacity": 0.85,
      },
    });
    m.addLayer({
      id: tempId + "-points",
      type: "circle",
      source: tempId,
      filter: ["==", "$type", "Point"],
      paint: {
        "circle-radius": 5,
        "circle-color": "#f97316",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-opacity": 0.9,
      },
    });
    m.addLayer({
      id: tempId + "-labels",
      type: "symbol",
      source: tempId,
      filter: ["has", "distance"],
      layout: {
        "text-field": ["get", "distance"],
        "text-size": 12,
        "text-offset": [0, -1.5],
        "text-anchor": "top",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-font": ["Droid Sans", "Arial Unicode MS Bold"],
      },
      paint: {
        "text-color": "#1e293b",
        "text-halo-color": "#ffffff",
        "text-halo-width": 3,
        "text-halo-blur": 2,
      },
    });
    ts.sourceId = tempId;
    ts.layerIds.push(tempId + "-line", tempId + "-points", tempId + "-labels");
    const buildMeasureFeatures = (pts, withPreview) => {
      const allPts = withPreview
        ? [...measurePoints, [withPreview.lng, withPreview.lat]]
        : measurePoints;
      const features = allPts.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: p },
        properties: {},
      }));
      if (allPts.length >= 2) {
        features.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates: allPts },
          properties: {},
        });
        let total = 0;
        for (let i = 1; i < allPts.length; i++)
          total += measureDistance(allPts[i - 1], allPts[i]);
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: allPts[allPts.length - 1] },
          properties: { distance: formatDistance(total) },
        });
      }
      return { type: "FeatureCollection", features };
    };
    hs.click = (e) => {
      measurePoints.push([e.lngLat.lng, e.lngLat.lat]);
      const src = m.getSource(tempId);
      if (src) src.setData(buildMeasureFeatures());
    };
    hs.mouseMove = (e) => {
      if (measurePoints.length === 0) return;
      const src = m.getSource(tempId);
      if (src) src.setData(buildMeasureFeatures(measurePoints, e.lngLat));
    };
    hs.rightClick = (e) => {
      e.preventDefault();
      measurePoints.length = 0;
      const src = m.getSource(tempId);
      if (src) src.setData({ type: "FeatureCollection", features: [] });
    };
    m.on("click", hs.click);
    m.on("mousemove", hs.mouseMove);
    m.on("contextmenu", hs.rightClick);
  }

  function stopMeasure() {
    cleanupHandlers();
    measurePoints.length = 0;
    measureActive.value = false;
    clearTempLayers();
  }

  const cancelForm = () => {
    shape.value = null;
    clearTempLayers();
    cleanupHandlers();
    showForm.value = false;
    drawMode.value = "";
    formData.value = { name: "", description: "" };
    positions.length = 0;
    measurePoints.length = 0;
    measureActive.value = false;
    rectStart = null;
    map.getCanvas().style.cursor = "default";
  };

  const handleSave = () => {
    if (!shape.value && canFinishDrawing.value) {
      const mode = drawMode.value;
      if (mode === "polyline" && positions.length >= 2) {
        cleanupHandlers();
        finishDrawing("polyline", [...positions]);
      } else if (mode === "polygon" && positions.length >= 3) {
        cleanupHandlers();
        finishDrawing("polygon", [...positions]);
      } else if (mode === "multi_point" && positions.length >= 1) {
        finishDrawing("multi_point", [...positions]);
      } else if (mode === "rectangle" && positions.length >= 4) {
        cleanupHandlers();
        finishDrawing("rectangle", [...positions]);
      }
    }
    savePin();
  };

  function renderNewPin(pin) {
    renderPinOnMap(map, pin);
  }

  const savePin = () => {
    if (!formData.value.name.trim()) {
      nameError.value = true;
      return;
    }
    if (!shape.value) {
      alert("ترسیم کامل نشده است");
      return;
    }
    const pin = {
      id: crypto.randomUUID(),
      name: formData.value.name,
      descr: formData.value.description,
      shape: toRaw(shape.value),
      date: new Date(),
      save: -1,
      type: "draw",
      selected: true,
    };
    pins.push(pin);
    drawMode.value = "";
    showForm.value = false;
    formData.value = { name: "", description: "" };
    rectStart = null;
    cleanupHandlers();
    clearTempLayers();
    renderNewPin(pin);
  };

  function getPointsCount() {
    if (!shape.value) return 0;
    if (shape.value.type === "point") return 1;
    if (shape.value.type === "multi_point")
      return shape.value.positions?.length || 0;
    return getAllPoints().length;
  }
  function getAllPoints() {
    if (!shape.value) return [];
    if (shape.value.type === "point")
      return [{ lat: shape.value.lat, lon: shape.value.lon }];
    const pos = shape.value.positions || [];
    if (pos.length > 1) {
      const first = pos[0];
      const last = pos[pos.length - 1];
      // نقطه پایانی اگر دقیقاً همان نقطه آغازین باشد (بسته‌سازی تکراری) حذف می‌شود
      if (
        shape.value.type === "polygon" &&
        last.lon === first.lon &&
        last.lat === first.lat
      ) {
        return pos.slice(0, -1);
      }
    }
    return pos;
  }
  function calculateTotalLength() {
    const points = getAllPoints();
    if (points.length < 2) return "0 m";
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += measureDistance(
        [points[i - 1].lon, points[i - 1].lat],
        [points[i].lon, points[i].lat],
      );
    }
    return formatDistance(total);
  }
  function calculateArea() {
    if (!shape.value || shape.value.type !== "polygon") return "0 m²";
    const points = getAllPoints();
    if (points.length < 3) return "0 m²";
    const centroid = computeCentroid(points);
    const refZone = toUTM(centroid.lon, centroid.lat).zone;
    const coords = points.map((p) => {
      const { x, y } = toUTMInZone(p.lon, p.lat, refZone);
      return [x, y];
    });
    let area = 0;
    for (let i = 0; i < coords.length; i++) {
      const j = (i + 1) % coords.length;
      area += coords[i][0] * coords[j][1];
      area -= coords[j][0] * coords[i][1];
    }
    return formatArea(Math.abs(area) / 2);
  }

  function inactiveDrawing() {
    shape.value = null;
    clearTempLayers();
    cleanupHandlers();
    showForm.value = false;
    drawMode.value = "";
    measureActive.value = false;
    measurePoints.length = 0;
    positions.length = 0;
    rectStart = null;
    if (map.getSource(drawDataSourceId)) {
      map
        .getSource(drawDataSourceId)
        .setData({ type: "FeatureCollection", features: [] });
    }
    map.getCanvas().style.cursor = "default";
  }

  /* -------- ویرایش نقاط ترسیم در حال انجام از جدول ✏️ -------- */

  function renderDraftLayers() {
    if (!map) return;
    try {
      ensureVertexSquareImage(map);
    } catch (e) {}
    if (shape.value) {
      const s = shape.value;
      clearTempLayers();
      positions.length = 0;
      (s.positions || []).forEach((p) =>
        positions.push({ lng: p.lon ?? p.lng, lat: p.lat }),
      );
      drawMode.value = s.type;
      if (!positions.length) return;
      addTempSource();
      if (s.type === "polygon") {
        if (positions.length >= 3) {
          addPolygonLayers();
          updateTempSource(positions, true);
          updatePolygonLabels(positions);
        }
      } else if (s.type === "multi_point") {
        addMultiPointLayers();
        updateTempSource(positions, false);
      } else {
        addPolylineLayers();
        updateTempSource(positions);
        updateLineLabels(positions);
      }
      applyDisplayColor();
      return;
    }
    if (!positions.length) return;
    if (drawMode.value === "polygon") {
      updateTempSource(positions, true);
      updatePolygonLabels(positions);
    } else if (drawMode.value === "polyline") {
      updateTempSource(positions);
      updateLineLabels(positions);
    } else {
      const src = map.getSource(ts.sourceId);
      if (src) src.setData(buildFeatures(positions, false));
    }
    applyDisplayColor();
  }

  function updateDraftPoint(index, key, value) {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    if (shape.value) {
      const s = shape.value;
      if (s.type === "point") {
        s[key] = num;
      } else if (Array.isArray(s.positions) && s.positions[index]) {
        s.positions[index][key === "lon" ? "lon" : "lat"] = num;
      }
    } else if (Array.isArray(positions) && positions[index]) {
      if (key === "lon") positions[index].lng = num;
      else positions[index].lat = num;
    }
    renderDraftLayers();
    logger.info("draw", "ویرایش دستی نقطه در حال ترسیم", { index, key, value: num });
  }

  function removeDraftPoint(index) {
    if (shape.value) {
      const s = shape.value;
      if (!Array.isArray(s.positions)) return;
      const min = s.type === "polygon" ? 3 : 2;
      if (s.positions.length <= min) return;
      s.positions.splice(index, 1);
    } else if (Array.isArray(positions) && positions[index]) {
      positions.splice(index, 1);
    }
    renderDraftLayers();
  }

  function addDraftPoint() {
    const push = (arr) => {
      const last = arr[arr.length - 1];
      const prev = arr.length > 1 ? arr[arr.length - 2] : last;
      const dLat = last.lat - prev.lat || 0.0002;
      const dLon =
        (last.lon ?? last.lng) - (prev.lon ?? prev.lng) || 0.0002;
      arr.push({
        lat: last.lat + dLat,
        lon: (last.lon ?? last.lng) + dLon,
        height: 0,
      });
    };
    if (shape.value && Array.isArray(shape.value.positions)) {
      push(shape.value.positions);
    } else if (positions.length) {
      const arr = positions;
      const last = arr[arr.length - 1];
      const prev = arr.length > 1 ? arr[arr.length - 2] : last;
      const dLat = last.lat - prev.lat || 0.0002;
      const dLng = (last.lng ?? last.lon) - (prev.lng ?? prev.lon) || 0.0002;
      arr.push({ lng: last.lng + dLng, lat: last.lat + dLat });
    }
    renderDraftLayers();
  }

  let editingPin = null;

  function setPinLayersVisible(pin, visible) {
    if (!map || !pin || !pin.shape) return;
    const ids = pin.shape._sourceIds || [];
    ids.forEach((sid) => {
      [sid + "-fill", sid + "-line", sid + "-point", sid + "-points"].forEach(
        (lid) => {
          if (map.getLayer(lid)) {
            map.setLayoutProperty(lid, "visibility", visible ? "visible" : "none");
          }
        },
      );
    });
  }

  function bindEditDrag() {
    cleanupHandlers();
    const m = map;
    hs.mousedown = (e) => {
      if (e.originalEvent.button !== 0) return;
      const pts = editingPointsRef();
      if (!pts || pts.length < 2) return;
      const idx = nearestPointIndex(e.lngLat, 14);
      const isPoly = shape.value?.type === "polygon";
      if (idx >= 0 && (isPoly ? pts.length >= 3 : pts.length >= 2)) {
        dragActive = true;
        dragKind = "vertex";
        draggingIndex = idx;
        m.dragPan.disable();
        return;
      }
      const c = currentCenter();
      if (nearCenter(e.lngLat, c)) {
        dragActive = true;
        dragKind = "center";
        dragCenterRef = { lng: e.lngLat.lng, lat: e.lngLat.lat };
        dragOrigPts = editingPointsForLonLat(pts).map((p) => ({ ...p }));
        m.dragPan.disable();
      }
    };
    hs.mouseMove = (e) => {
      if (!dragActive) return;
      const isPoly = shape.value?.type === "polygon";
      if (dragKind === "vertex" && draggingIndex >= 0) {
        setEditablePoint(draggingIndex, { lng: e.lngLat.lng, lat: e.lngLat.lat });
        renderEditable(isPoly);
        return;
      }
      if (dragKind === "center" && dragCenterRef && dragOrigPts.length) {
        const dLng = e.lngLat.lng - dragCenterRef.lng;
        const dLat = e.lngLat.lat - dragCenterRef.lat;
        dragOrigPts.forEach((p, i) => {
          setEditablePoint(i, { lng: p.lng + dLng, lat: p.lat + dLat });
        });
        renderEditable(isPoly);
      }
    };
    hs.mouseup = () => {
      if (dragActive) {
        dragActive = false;
        dragKind = "";
        draggingIndex = -1;
        dragCenterRef = null;
        dragOrigPts = [];
        m.dragPan.enable();
      }
    };
    hs.key = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        exitPinEdit();
      } else if (event.key === "Enter") {
        event.preventDefault();
        exitPinEdit();
      }
    };
    window.addEventListener("keydown", hs.key);
    m.on("mousedown", hs.mousedown);
    m.on("mousemove", hs.mouseMove);
    m.on("mouseup", hs.mouseup);
  }

  // ورود به حالت ویرایش یک شکل موجود (رسمی مثلث/خط یا KML آپلودشده) روی نقشه
  function editExistingPin(pin) {
    if (!map || !pin || !pin.shape) return;
    exitPinEdit();
    editingPin = pin;
    setPinLayersVisible(pin, false);
    shape.value = pin.shape;
    drawMode.value = pin.shape.type;
    showForm.value = false;
    renderDraftLayers();
    bindEditDrag();
    map.getCanvas().style.cursor = "crosshair";
  }

  // خروج از حالت ویرایش و اعمال تغییرات روی شکل سبز ذخیره‌شده
  function exitPinEdit() {
    if (!editingPin) return;
    try {
      updatePinGeometry(map, editingPin);
    } catch (e) {
      logger.warn("draw", "خطا در به‌روزرسانی شکل پس از ویرایش", e);
    }
    setPinLayersVisible(editingPin, true);
    cleanupHandlers();
    clearTempLayers();
    editingPin = null;
    shape.value = null;
    drawMode.value = "";
    showForm.value = false;
    if (map) map.getCanvas().style.cursor = "default";
  }

  function isEditingPin(pin) {
    return editingPin && pin && editingPin.id === pin.id;
  }

  return {
    loading,
    drawMode,
    color,
    measureActive,
    positions,
    formData,
    showForm,
    shape,
    activeTab,
    coordinateSystem,
    nameError,
    livePoints,
    displayPoints,
    livePointCount,
    liveTotalLength,
    liveArea,
    canFinishDrawing,
    isSaveEnabled,
    toggleMeasure,
    setDrawMode,
    cancelForm,
    handleSave,
    finishCurrentDrawing,
    getDrawTypeName: () =>
      getDrawTypeName(shape.value?.type || drawMode.value, false),
    inactiveDrawing,
    updateDraftPoint,
    removeDraftPoint,
    addDraftPoint,
    editExistingPin,
    exitPinEdit,
    isEditingPin,
    editingPin: () => editingPin,
  };
}
