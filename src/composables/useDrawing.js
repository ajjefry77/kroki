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
  computeCircleCoords,
} from "../utils/useDrawingHelpers";
import { renderPinOnMap } from "../utils/pinRenderer";

export function useDrawing(map, pins) {
  // Reactive state
  const loading = ref(false);
  const drawMode = ref("");
  const color = ref("#ff0000");
  const measureActive = ref(false);
  const positions = reactive([]);
  const formData = ref({ name: "", description: "" });
  const showForm = ref(false);
  const shape = ref(null);
  const activeTab = ref("measurements");
  const tempCircle = ref(null);
  const measurePoints = reactive([]);
  const coordinateSystem = ref("utm");
  const nameError = ref(false);

  // Non-reactive mutable state
  const hs = {
    mouseMove: null,
    click: null,
    dblClick: null,
    rightClick: null,
    key: null,
    featureClick: null,
    styleLoad: null,
  };
  const ts = {
    sourceId: null,
    layerIds: [],
    polygonLabelSourceId: null,
    lineLabelSourceId: null,
    extraSourceIds: [],
  };
  const cs = { radius: 0, center: null };
  const drawDataSourceId = "pins-draw-" + crypto.randomUUID();

  // Computed
  const livePoints = computed(() => {
    if (shape.value) return getAllPoints();
    if (drawMode.value === "circle" && tempCircle.value)
      return [
        { lat: tempCircle.value.center.lat, lon: tempCircle.value.center.lng },
      ];
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
        return {
          lat,
          lon,
          displayX: x,
          displayY: y,
          zone,
          system: "utm",
          index: i,
        };
      }
      return {
        lat,
        lon,
        displayX: lon,
        displayY: lat,
        system: "latlon",
        index: i,
      };
    });
  });
  const livePointCount = computed(() => {
    if (shape.value) return getPointsCount();
    if (drawMode.value === "circle" && tempCircle.value) return 1;
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
    if (drawMode.value !== "polygon") return "0 m²";
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
  const liveRadius = computed(() => {
    if (shape.value && shape.value.type === "circle")
      return formatDistance(shape.value.radius);
    if (tempCircle.value) return formatDistance(tempCircle.value.radius);
    return "0 m";
  });
  const canFinishDrawing = computed(() => {
    if (shape.value) return false;
    const mode = drawMode.value;
    if (mode === "polyline") return positions.length >= 2;
    if (mode === "polygon") return positions.length >= 3;
    if (mode === "multi_point") return positions.length >= 1;
    if (mode === "circle") return !!(cs.center && cs.radius > 0);
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
    () => {
      nameError.value = false;
    },
  );

  // Core utilities
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
    if (hs.mouseMove) {
      map.off("mousemove", hs.mouseMove);
      hs.mouseMove = null;
    }
    if (hs.click) {
      map.off("click", hs.click);
      hs.click = null;
    }
    if (hs.dblClick) {
      map.off("dblclick", hs.dblClick);
      hs.dblClick = null;
    }
    if (hs.rightClick) {
      map.off("contextmenu", hs.rightClick);
      hs.rightClick = null;
    }
    if (hs.key) {
      window.removeEventListener("keydown", hs.key);
      hs.key = null;
    }
    map.getCanvas().style.cursor = "default";
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
    if (drawMode.value !== "polygon" || !ts.polygonLabelSourceId) return;
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
    // A polyline has no area centroid, so do not place a fake center marker.
    labelSrc.setData({ type: "FeatureCollection", features });
  }

  // Drawing layers setup
  function addPolygonLayers() {
    addTempLayer(ts.sourceId + "-fill", {
      type: "fill",
      paint: { "fill-color": color.value, "fill-opacity": 0.35 },
    });
    addTempLayer(ts.sourceId + "-outline", {
      type: "line",
      paint: {
        "line-color": color.value,
        "line-width": 2.5,
        "line-opacity": 0.9,
      },
    });
    addTempLayer(ts.sourceId + "-points", {
      type: "circle",
      filter: ["==", "$type", "Point"],
      paint: {
        "circle-radius": 5,
        "circle-color": "#ffffff",
        "circle-stroke-color": color.value,
        "circle-stroke-width": 2.5,
        "circle-opacity": 0.9,
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
        "text-size": 11,
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
        "text-size": 10,
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
        "circle-radius": 5,
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
        "text-size": 10,
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
        "line-color": color.value,
        "line-width": 3,
        "line-opacity": 0.85,
      },
    });
    addTempLayer(ts.sourceId + "-points", {
      type: "circle",
      filter: ["==", "$type", "Point"],
      paint: {
        "circle-radius": 6,
        "circle-color": "#ffffff",
        "circle-stroke-color": color.value,
        "circle-stroke-width": 3,
        "circle-opacity": 0.9,
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
        "text-size": 11,
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
        "circle-radius": 5,
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
        "text-size": 10,
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
        "circle-radius": 7,
        "circle-color": color.value,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-opacity": 0.9,
      },
    });
  }

  // Drawing mode setup
  function startDrawing() {
    const m = map;
    m.getCanvas().style.cursor = "crosshair";
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
      let lastClickTs = 0;
      hs.click = (e) => {
        const now = Date.now();
        if (now - lastClickTs < 280) return;
        lastClickTs = now;
        positions.push({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        updateTempSource(positions);
        updateLineLabels(positions);
      };
      hs.mouseMove = (e) => {
        if (positions.length === 0) return;
        updateTempSource([
          ...positions,
          { lng: e.lngLat.lng, lat: e.lngLat.lat },
        ]);
      };
      hs.rightClick = (e) => {
        e.preventDefault();
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
      };
      hs.key = (event) => {
        if (event.key === "Delete" && positions.length > 0) {
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
    } else if (drawMode.value === "polygon") {
      addTempSource();
      addPolygonLayers();
      let lastClickTs = 0;
      hs.click = (e) => {
        const now = Date.now();
        if (now - lastClickTs < 280) return;
        lastClickTs = now;
        positions.push({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        updateTempSource(positions, true);
        updatePolygonLabels(positions);
      };
      hs.mouseMove = (e) => {
        if (positions.length === 0) return;
        updateTempSource(
          [...positions, { lng: e.lngLat.lng, lat: e.lngLat.lat }],
          true,
        );
      };
      hs.rightClick = (e) => {
        e.preventDefault();
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
      };
      hs.key = (event) => {
        if (event.key === "Delete" && positions.length > 0) {
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
    } else if (drawMode.value === "circle") {
      cs.center = null;
      tempCircle.value = null;
      addTempSource();
      addTempLayer(ts.sourceId + "-fill", {
        type: "fill",
        paint: { "fill-color": color.value, "fill-opacity": 0.4 },
      });
      addTempLayer(ts.sourceId + "-outline", {
        type: "line",
        paint: {
          "line-color": color.value,
          "line-width": 2,
          "line-opacity": 0.9,
        },
      });
      addTempLayer(ts.sourceId + "-center", {
        type: "circle",
        filter: ["==", "$type", "Point"],
        paint: {
          "circle-radius": 8,
          "circle-color": "#3b82f6",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
      addTempLayer(ts.sourceId + "-radius", {
        type: "line",
        source: ts.sourceId,
        filter: ["==", "$type", "LineString"],
        paint: {
          "line-color": "#3b82f6",
          "line-width": 2,
          "line-dasharray": [4, 4],
          "line-opacity": 0.8,
        },
      });
      const circleLabelSourceId = addLabelSource();
      addTempLayer(circleLabelSourceId + "-text", {
        type: "symbol",
        source: circleLabelSourceId,
        layout: {
          "text-field": ["get", "label"],
          "text-size": 12,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
          "text-font": ["Droid Sans", "Arial Unicode MS Bold"],
          "text-offset": [0, -1.5],
          "text-anchor": "bottom",
        },
        paint: {
          "text-color": "#1e40af",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
        },
      });
      hs.click = (e) => {
        if (!cs.center) {
          cs.center = [e.lngLat.lng, e.lngLat.lat];
          tempCircle.value = {
            center: { lat: cs.center[1], lng: cs.center[0] },
            radius: 0,
          };
          const src = m.getSource(ts.sourceId);
          if (src)
            src.setData({
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  geometry: { type: "Point", coordinates: cs.center },
                  properties: {},
                },
              ],
            });
        } else {
          cleanupHandlers();
          finishDrawing("circle", {
            center: { lng: cs.center[0], lat: cs.center[1] },
            radius: cs.radius,
          });
        }
      };
      hs.mouseMove = (e) => {
        if (!cs.center) return;
        const dx =
          (e.lngLat.lng - cs.center[0]) *
          111319.9 *
          Math.cos((cs.center[1] * Math.PI) / 180);
        const dy = (e.lngLat.lat - cs.center[1]) * 110540;
        cs.radius = Math.sqrt(dx * dx + dy * dy);
        tempCircle.value = {
          center: { lat: cs.center[1], lng: cs.center[0] },
          radius: cs.radius,
        };
        const circleCoords = computeCircleCoords(
          { lat: cs.center[1], lng: cs.center[0] },
          cs.radius,
        );
        const src = m.getSource(ts.sourceId);
        if (src) {
          src.setData({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: { type: "Polygon", coordinates: [circleCoords] },
                properties: {},
              },
              {
                type: "Feature",
                geometry: { type: "Point", coordinates: cs.center },
                properties: {},
              },
              {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: [cs.center, [e.lngLat.lng, e.lngLat.lat]],
                },
                properties: {},
              },
            ],
          });
        }
        const labelSrc = m.getSource(circleLabelSourceId);
        if (labelSrc) {
          labelSrc.setData({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [
                    (cs.center[0] + e.lngLat.lng) / 2,
                    (cs.center[1] + e.lngLat.lat) / 2,
                  ],
                },
                properties: { label: formatDistance(cs.radius) },
              },
            ],
          });
        }
      };
      m.on("click", hs.click);
      m.on("mousemove", hs.mouseMove);
    }
  }
  function finishDrawing(draw, pos) {
    cleanupHandlers();
    map.getCanvas().style.cursor = "default";
    const defaultOpacity = 0.7;
    if (draw === "circle") {
      shape.value = {
        type: "circle",
        center: pos.center,
        radius: pos.radius ?? cs.radius,
        color: color.value,
        opacity: defaultOpacity,
        width: 3,
        backgroundImage: null,
        show: true,
      };
      tempCircle.value = null;
      cs.center = null;
      cs.radius = 0;
    } else if (draw === "multi_point") {
      shape.value = {
        type: "multi_point",
        positions: pos.map((p) => ({
          lon: p.lng,
          lat: p.lat,
          height: 0,
          color: p.color || color.value,
        })),
        color: color.value,
        opacity: defaultOpacity,
        width: 5,
        show: true,
      };
    } else if (draw === "polyline") {
      shape.value = {
        type: draw,
        positions: pos.map((p) => ({ lon: p.lng, lat: p.lat, height: 0 })),
        color: color.value,
        opacity: defaultOpacity,
        width: 3,
        show: true,
      };
    } else if (draw === "polygon") {
      const coords = pos.map((p) => ({ lon: p.lng, lat: p.lat, height: 0 }));
      coords.push(coords[0]);
      shape.value = {
        type: "polygon",
        positions: coords,
        color: color.value,
        outlineColor: color.value,
        opacity: defaultOpacity,
        width: 3,
        show: true,
      };
    }
    positions.length = 0;
  }

  /** اتمام ترسیم از پنل یا Enter — در صورت داشتن نام، ذخیره هم می‌شود */
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
      cleanupHandlers();
      finishDrawing("polyline", [...positions]);
      finished = true;
    } else if (mode === "polygon" && positions.length >= 3) {
      cleanupHandlers();
      finishDrawing("polygon", [...positions]);
      finished = true;
    } else if (mode === "multi_point" && positions.length >= 1) {
      cleanupHandlers();
      finishDrawing("multi_point", [...positions]);
      finished = true;
    } else if (mode === "circle" && cs.center && cs.radius > 0) {
      cleanupHandlers();
      finishDrawing("circle", {
        center: { lng: cs.center[0], lat: cs.center[1] },
        radius: cs.radius,
      });
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
    measureActive.value = false;
    cleanupHandlers();
    clearTempLayers();
    drawMode.value = mode;
    activeTab.value = "measurements";
    positions.length = 0;
    shape.value = null;
    tempCircle.value = null;
    cs.center = null;
    cs.radius = 0;
    showForm.value = true;
    setTimeout(() => {
      startDrawing();
    }, 100);
  }

  // Measure mode
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
        "line-width": 4,
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
        "circle-radius": 8,
        "circle-color": "#f97316",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 3,
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
        "text-size": 14,
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

  // Cancel form / drawing
  const cancelForm = () => {
    shape.value = null;
    clearTempLayers();
    cleanupHandlers();
    showForm.value = false;
    drawMode.value = "";
    formData.value = { name: "", description: "" };
    tempCircle.value = null;
    cs.center = null;
    cs.radius = 0;
    positions.length = 0;
    measurePoints.length = 0;
    measureActive.value = false;
    map.getCanvas().style.cursor = "default";
  };

  // Save pin
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
      } else if (mode === "circle" && cs.center && cs.radius > 0) {
        cleanupHandlers();
        finishDrawing("circle", {
          center: { lng: cs.center[0], lat: cs.center[1] },
          radius: cs.radius,
        });
      }
    }
    savePin();
  };

  // رندر یک ترسیم تازه ذخیره شده روی نقشه
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
    tempCircle.value = null;
    cs.center = null;
    cs.radius = 0;
    clearTempLayers();
    renderNewPin(pin);
  };

  // Shape helpers
  function getPointsCount() {
    if (!shape.value) return 0;
    if (shape.value.type === "circle" || shape.value.type === "point") return 1;
    if (shape.value.type === "multi_point")
      return shape.value.positions?.length || 0;
    const pos = shape.value.positions || [];
    return pos.length > 0 ? pos.length - 1 : 0;
  }
  function getAllPoints() {
    if (!shape.value) return [];
    if (shape.value.type === "circle")
      return [{ lat: shape.value.center.lat, lon: shape.value.center.lng }];
    if (shape.value.type === "point")
      return [{ lat: shape.value.lat, lon: shape.value.lon }];
    const pos = shape.value.positions || [];
    if (shape.value.type === "polygon" && pos.length > 1)
      return pos.slice(0, -1);
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
    tempCircle.value = null;
    cs.center = null;
    cs.radius = 0;
    if (map.getSource(drawDataSourceId)) {
      map
        .getSource(drawDataSourceId)
        .setData({ type: "FeatureCollection", features: [] });
    }
    map.getCanvas().style.cursor = "default";
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
    tempCircle,
    coordinateSystem,
    nameError,
    livePoints,
    displayPoints,
    livePointCount,
    liveTotalLength,
    liveArea,
    liveRadius,
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
  };
}
