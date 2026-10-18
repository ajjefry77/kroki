import {
  ref,
  reactive,
  toRaw,
  computed,
  watch,
} from "vue";
import {
  measureDistance,
  formatDistance,
  formatArea,
  toUTM,
  toUTMInZone,
  computeCentroid,
} from "../utils/useDrawingHelpers";
import { renderPinOnMap, updatePinGeometry } from "../utils/pinRenderer";
import { ensureVertexSquareImage, VERTEX_SQUARE_IMAGE } from "../utils/drawStyle";
import { logger } from "../utils/logger";
import { saveDraft, loadDraft, clearDraft } from "../utils/sessionPersist";
import { selectOnlyPin } from "../utils/pins";

// رنگ ترسیم: قرمز هنگام در حال ترسیم، سبز پس از پایان
export const DRAFT_COLOR = "#ff0000";
export const DONE_COLOR = "#00a651";

// فونت لیبل‌های متنی روی نقشه (طول اضلاع، نام رئوس، فاصله)
export const MAP_TEXT_FONT = ["Droid Sans", "Arial Unicode MS Bold"];

/**
 * رابطه اصلی وضعیت ترسیم را ایجاد می‌کند.
 * تمام stateها، computedهای پایه، watchهای سراسری و توابع اصلی
 * روی ctx قرار می‌گیرند تا ماژولهای drawingModes و drawingLayers
 * به آنها دسترسی داشته باشند.
 */
export function createDrawingCore(ctx, map, pins) {
  ctx.mapRef = map;
  ctx.pinsRef = pins;

  ctx.loading = ref(false);
  ctx.drawMode = ref("");
  ctx.color = ref("#ff0000");
  ctx.measureActive = ref(false);
  ctx.positions = reactive([]);
  ctx.formData = ref({ name: "", description: "", adjacentsEnabled: false, adjacents: [] });
  ctx.showForm = ref(false);
  ctx.shape = ref(null);
  ctx.activeTab = ref("measurements");
  ctx.measurePoints = reactive([]);
  ctx.coordinateSystem = ref("utm");
  ctx.nameError = ref(false);
  ctx.placingPoint = ref(false);

  ctx.hs = {
    mouseMove: null,
    click: null,
    dblClick: null,
    rightClick: null,
    key: null,
    mousedown: null,
    mouseup: null,
    styleLoad: null,
  };
  ctx.ts = {
    sourceId: null,
    layerIds: [],
    polygonLabelSourceId: null,
    lineLabelSourceId: null,
    extraSourceIds: [],
  };
  ctx.drawDataSourceId = "pins-draw-" + crypto.randomUUID();

  let draggingIndex = -1;
  let dragActive = false;
  let dragKind = ""; // "vertex" | "center"
  let dragCenterRef = null; // {lng,lat} شروع درگ مرکز
  let dragOrigPts = []; // نقطه‌های اولیه هنگام درگ مرکز
  let downXY = null; // موقعیت پیکسلی mousedown برای تشخیص درگ از کلیک
  let suppressClick = false; // کلیکِ بعد از درگ نباید نقطه اضافه کند
  let lastClickTs = 0;
  let rectStart = null;
  let placeHandlers = null;

  ctx.__resetDragState = () => {
    draggingIndex = -1;
    dragActive = false;
    dragKind = "";
    dragCenterRef = null;
    dragOrigPts = [];
    downXY = null;
    suppressClick = false;
    rectStart = null;
  };

  // Getter/Setterهای وضعیت درگ برای استفاده از drawingModes
  ctx.__getDraggingIndex = () => draggingIndex;
  ctx.__setDraggingIndex = (v) => { draggingIndex = v; };
  ctx.__getDragActive = () => dragActive;
  ctx.__setDragActive = (v) => { dragActive = v; };
  ctx.__getDragKind = () => dragKind;
  ctx.__setDragKind = (v) => { dragKind = v; };
  ctx.__getDragCenterRef = () => dragCenterRef;
  ctx.__setDragCenterRef = (v) => { dragCenterRef = v; };
  ctx.__getDragOrigPts = () => dragOrigPts;
  ctx.__setDragOrigPts = (v) => { dragOrigPts = v; };
  ctx.__getDownXY = () => downXY;
  ctx.__setDownXY = (v) => { downXY = v; };
  ctx.__getSuppressClick = () => suppressClick;
  ctx.__setSuppressClick = (v) => { suppressClick = v; };
  ctx.__getLastClickTs = () => lastClickTs;
  ctx.__setLastClickTs = (v) => { lastClickTs = v; };
  ctx.__getRectStart = () => rectStart;
  ctx.__setRectStart = (v) => { rectStart = v; };

  ctx.screenDist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // حذف نقاط تکراری پشت سر هم (با تلرانس ~۱ سانتی‌متر) تا یال صفرطول («خط اضافه») ساخته نشود
  ctx.dedupeRing = (pos) => {
    const out = [];
    for (const p of pos) {
      const prev = out[out.length - 1];
      const plng = p.lng ?? p.lon;
      if (
        prev &&
        Math.abs((prev.lng ?? prev.lon) - plng) < 1e-7 &&
        Math.abs(prev.lat - p.lat) < 1e-7
      )
        continue;
      out.push(p);
    }
    if (out.length > 1) {
      const f = out[0];
      const l = out[out.length - 1];
      if (
        Math.abs((f.lng ?? f.lon) - (l.lng ?? l.lon)) < 1e-7 &&
        Math.abs(f.lat - l.lat) < 1e-7
      )
        out.pop();
    }
    return out;
  };

  // آیا نقطه جدید عملاً روی نقطه قبلی افتاده؟ (کلیک تکراری/دوبار‌فایر)
  ctx.isDupOfLast = (arr, lngLat, tolPx = 4) => {
    if (!arr.length) return false;
    const last = arr[arr.length - 1];
    const a = map.project({ lng: last.lng ?? last.lon, lat: last.lat });
    const b = map.project(lngLat);
    return ctx.screenDist(a, b) < tolPx;
  };

  ctx.currentColor = () => {
    if (ctx.__getEditingPin()) return DRAFT_COLOR;
    return ctx.shape.value ? DONE_COLOR : DRAFT_COLOR;
  };

  // آرایه نقطه‌های قابل ویرایش (هم هنگام درگِ در دست ترسیم و هم پس از Enter)
  ctx.editingPointsRef = () => {
    return ctx.shape.value ? ctx.shape.value.positions : ctx.positions;
  };
  ctx.setEditablePoint = (i, pt) => {
    const refArr = ctx.shape.value ? ctx.shape.value.positions : ctx.positions;
    if (!refArr || !refArr[i]) return;
    if (ctx.shape.value) {
      refArr[i].lon = pt.lng ?? pt.lon;
      refArr[i].lat = pt.lat;
    } else {
      refArr[i].lng = pt.lng ?? pt.lon;
      refArr[i].lat = pt.lat;
    }
  };
  ctx.editingPointsForLonLat = (arr) => {
    return (arr || []).map((p) => ({ lng: p.lng ?? p.lon, lat: p.lat }));
  };

  ctx.livePoints = computed(() => {
    if (ctx.shape.value) return ctx.getAllPoints();
    if (ctx.positions.length > 0)
      return ctx.positions.map((p) => ({ lat: p.lat, lon: p.lng }));
    return [];
  });
  ctx.displayPoints = computed(() => {
    const src = ctx.measureActive.value ? ctx.measurePoints : ctx.livePoints.value;
    return src.map((p, i) => {
      const lon = Array.isArray(p) ? p[0] : p.lon || p.lng;
      const lat = Array.isArray(p) ? p[1] : p.lat;
      if (ctx.coordinateSystem.value === "utm") {
        const { x, y, zone } = toUTM(lon, lat);
        return { lat, lon, displayX: x, displayY: y, zone, system: "utm", index: i };
      }
      return { lat, lon, displayX: lon, displayY: lat, system: "latlon", index: i };
    });
  });
  ctx.livePointCount = computed(() => {
    if (ctx.shape.value) return ctx.getPointsCount();
    if (ctx.measureActive.value) return ctx.measurePoints.length;
    return ctx.positions.length;
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
  ctx.liveTotalLength = computed(() => {
    if (ctx.shape.value) return ctx.calculateTotalLength();
    if (ctx.measureActive.value) return computeTotalFromArr(ctx.measurePoints);
    return computeTotalFromArr(ctx.livePoints.value);
  });
  ctx.liveArea = computed(() => {
    if (ctx.shape.value) return ctx.calculateArea();
    if (ctx.drawMode.value !== "polygon" && ctx.drawMode.value !== "rectangle") return "0 متر مربع";
    const points = ctx.livePoints.value;
    if (points.length < 3) return "0 متر مربع";
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
  ctx.canFinishDrawing = computed(() => {
    if (ctx.shape.value) return false;
    const mode = ctx.drawMode.value;
    if (mode === "polyline") return ctx.positions.length >= 2;
    if (mode === "polygon") return ctx.positions.length >= 3;
    if (mode === "multi_point") return ctx.positions.length >= 1;
    if (mode === "rectangle") return !!rectStart;
    return false;
  });
  ctx.isSaveEnabled = computed(() => {
    if (ctx.drawMode.value === "multi_point") {
      if (ctx.positions.length > 0) return true;
      if (
        ctx.shape.value &&
        ctx.shape.value.type === "multi_point" &&
        Array.isArray(ctx.shape.value.positions) &&
        ctx.shape.value.positions.length > 0
      )
        return true;
      return false;
    }
    return !!ctx.shape.value;
  });

  watch(
    () => ctx.formData.value.name,
    () => { ctx.nameError.value = false; },
  );

  ctx.cancelForm = () => {
    ctx.shape.value = null;
    ctx.clearTempLayers();
    ctx.cleanupHandlers();
    ctx.showForm.value = false;
    ctx.drawMode.value = "";
    ctx.formData.value = { name: "", description: "", adjacentsEnabled: false, adjacents: [] };
    ctx.positions.length = 0;
    ctx.measurePoints.length = 0;
    ctx.measureActive.value = false;
    rectStart = null;
    map.getCanvas().style.cursor = "default";
    try {
      clearDraft();
    } catch (e) {}
  };

  ctx.handleSave = () => {
    if (!ctx.shape.value && ctx.canFinishDrawing.value) {
      const mode = ctx.drawMode.value;
      if (mode === "polyline" && ctx.positions.length >= 2) {
        ctx.cleanupHandlers();
        ctx.finishDrawing("polyline", [...ctx.positions]);
      } else if (mode === "polygon" && ctx.positions.length >= 3) {
        ctx.cleanupHandlers();
        ctx.finishDrawing("polygon", [...ctx.positions]);
      } else if (mode === "multi_point" && ctx.positions.length >= 1) {
        ctx.finishDrawing("multi_point", [...ctx.positions]);
      } else if (mode === "rectangle" && ctx.positions.length >= 4) {
        ctx.cleanupHandlers();
        ctx.finishDrawing("rectangle", [...ctx.positions]);
      }
    }
    ctx.savePin();
  };

  ctx.renderNewPin = (pin) => {
    renderPinOnMap(map, pin);
  };

  ctx.savePin = () => {
    if (!ctx.formData.value.name.trim()) {
      ctx.nameError.value = true;
      return;
    }
    if (!ctx.shape.value) {
      alert("ترسیم کامل نشده است");
      return;
    }
    ctx.syncAdjacents();
    const adjEnabled = !!ctx.formData.value.adjacentsEnabled;
    const adj = adjEnabled ? [...(ctx.formData.value.adjacents || [])] : [];
    const pin = {
      id: crypto.randomUUID(),
      name: ctx.formData.value.name,
      descr: ctx.formData.value.description,
      shape: { ...toRaw(ctx.shape.value), adjacents: adj, adjacentsEnabled: adjEnabled },
      date: new Date(),
      save: -1,
      type: "draw",
      selected: true,
    };
    pins.push(pin);
    // پیش‌نویس کاملاً پاک شود تا لایه موقت روی لیبل‌های ذخیره‌شده نیفتد
    // و جدول «در حال ترسیم» کهنه نماند
    ctx.shape.value = null;
    ctx.drawMode.value = "";
    ctx.showForm.value = false;
    ctx.formData.value = { name: "", description: "", adjacentsEnabled: false, adjacents: [] };
    rectStart = null;
    ctx.cleanupHandlers();
    ctx.clearTempLayers();
    try {
      clearDraft();
    } catch (e) {}
    ctx.renderNewPin(pin);
    // فقط همین ترسیم انتخاب می‌ماند (تک‌انتخابی)؛ بقیه مخفی می‌شوند
    try {
      selectOnlyPin(pins, pin.id, map);
    } catch (e) {}
  };

  ctx.getPointsCount = () => {
    if (!ctx.shape.value) return 0;
    if (ctx.shape.value.type === "point") return 1;
    if (ctx.shape.value.type === "multi_point")
      return ctx.shape.value.positions?.length || 0;
    return ctx.getAllPoints().length;
  };
  ctx.getAllPoints = () => {
    if (!ctx.shape.value) return [];
    if (ctx.shape.value.type === "point")
      return [{ lat: ctx.shape.value.lat, lon: ctx.shape.value.lon }];
    const pos = ctx.shape.value.positions || [];
    if (pos.length > 1) {
      const first = pos[0];
      const last = pos[pos.length - 1];
      // نقطه پایانی اگر دقیقاً همان نقطه آغازین باشد (بسته‌سازی تکراری) حذف می‌شود
      if (
        ctx.shape.value.type === "polygon" &&
        last.lon === first.lon &&
        last.lat === first.lat
      ) {
        return pos.slice(0, -1);
      }
    }
    return pos;
  };
  ctx.calculateTotalLength = () => {
    const points = ctx.getAllPoints();
    if (points.length < 2) return "0 m";
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += measureDistance(
        [points[i - 1].lon, points[i - 1].lat],
        [points[i].lon, points[i].lat],
      );
    }
    return formatDistance(total);
  };
  ctx.calculateArea = () => {
    if (!ctx.shape.value || ctx.shape.value.type !== "polygon") return "0 متر مربع";
    const points = ctx.getAllPoints();
    if (points.length < 3) return "0 متر مربع";
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
  };

  ctx.inactiveDrawing = () => {
    ctx.shape.value = null;
    ctx.clearTempLayers();
    ctx.cleanupHandlers();
    ctx.showForm.value = false;
    ctx.drawMode.value = "";
    ctx.formData.value = { name: "", description: "", adjacentsEnabled: false, adjacents: [] };
    ctx.measureActive.value = false;
    ctx.measurePoints.length = 0;
    ctx.positions.length = 0;
    rectStart = null;
    try {
      clearDraft();
    } catch (e) {}
    if (map.getSource(ctx.drawDataSourceId)) {
      map
        .getSource(ctx.drawDataSourceId)
        .setData({ type: "FeatureCollection", features: [] });
    }
    map.getCanvas().style.cursor = "default";
  };

  /* -------- ویرایش نقاط ترسیم در حال انجام از جدول ✏️ -------- */

  ctx.renderDraftLayers = () => {
    if (!map) return;
    try {
      ensureVertexSquareImage(map);
    } catch (e) {}
    ctx.syncAdjacents();
    if (ctx.shape.value) {
      const s = ctx.shape.value;
      ctx.clearTempLayers();
      ctx.positions.length = 0;
      (s.positions || []).forEach((p) =>
        ctx.positions.push({ lng: p.lon ?? p.lng, lat: p.lat }),
      );
      ctx.drawMode.value = s.type;
      if (!ctx.positions.length) return;
      ctx.addTempSource();
      if (s.type === "polygon") {
        if (ctx.positions.length >= 3) {
          ctx.addPolygonLayers();
          ctx.updateTempSource(ctx.positions, true);
          ctx.updatePolygonLabels(ctx.positions);
        }
      } else if (s.type === "multi_point") {
        ctx.addMultiPointLayers();
        ctx.updateTempSource(ctx.positions, false);
      } else {
        ctx.addPolylineLayers();
        ctx.updateTempSource(ctx.positions);
        ctx.updateLineLabels(ctx.positions);
      }
      ctx.applyDisplayColor();
      return;
    }
    if (!ctx.positions.length) return;
    if (ctx.drawMode.value === "polygon") {
      ctx.updateTempSource(ctx.positions, true);
      ctx.updatePolygonLabels(ctx.positions);
    } else if (ctx.drawMode.value === "polyline") {
      ctx.updateTempSource(ctx.positions);
      ctx.updateLineLabels(ctx.positions);
    } else {
      const src = map.getSource(ctx.ts.sourceId);
      if (src) src.setData(ctx.buildFeatures(ctx.positions, false));
    }
    ctx.applyDisplayColor();
  };

  ctx.updateDraftPoint = (index, key, value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    if (ctx.shape.value) {
      const s = ctx.shape.value;
      if (s.type === "point") {
        s[key] = num;
      } else if (Array.isArray(s.positions) && s.positions[index]) {
        s.positions[index][key === "lon" ? "lon" : "lat"] = num;
      }
    } else if (Array.isArray(ctx.positions) && ctx.positions[index]) {
      if (key === "lon") ctx.positions[index].lng = num;
      else ctx.positions[index].lat = num;
    }
    ctx.renderDraftLayers();
    logger.info("draw", "ویرایش دستی نقطه در حال ترسیم", { index, key, value: num });
  };

  ctx.removeDraftPoint = (index) => {
    if (ctx.shape.value) {
      const s = ctx.shape.value;
      if (!Array.isArray(s.positions)) return;
      const min = s.type === "polygon" ? 3 : 2;
      if (s.positions.length <= min) return;
      s.positions.splice(index, 1);
    } else if (Array.isArray(ctx.positions) && ctx.positions[index]) {
      ctx.positions.splice(index, 1);
    }
    ctx.renderDraftLayers();
  };

  ctx.addDraftPoint = () => {
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
    if (ctx.shape.value && Array.isArray(ctx.shape.value.positions)) {
      push(ctx.shape.value.positions);
    } else if (ctx.positions.length) {
      const arr = ctx.positions;
      const last = arr[arr.length - 1];
      const prev = arr.length > 1 ? arr[arr.length - 2] : last;
      const dLat = last.lat - prev.lat || 0.0002;
      const dLng = (last.lng ?? last.lon) - (prev.lng ?? prev.lon) || 0.0002;
      arr.push({ lng: last.lng + dLng, lat: last.lat + dLat });
    }
    ctx.renderDraftLayers();
  };

  ctx.addPointTarget = () => {
    const t = ctx.shape.value?.type || ctx.drawMode.value;
    if (t !== "polygon" && t !== "polyline" && t !== "multi_point") return null;
    if (ctx.shape.value && Array.isArray(ctx.shape.value.positions)) return { isShape: true };
    if (Array.isArray(ctx.positions) && ctx.drawMode.value) return { isShape: false };
    return null;
  };

  ctx.disarmAddPoint = () => {
    ctx.placingPoint.value = false;
    if (placeHandlers) {
      try {
        map?.off("click", placeHandlers.onClick);
      } catch (e) {}
      try {
        map?.off("contextmenu", placeHandlers.onCtx);
      } catch (e) {}
      window.removeEventListener("keydown", placeHandlers.onKey);
      placeHandlers = null;
    }
    try {
      if (map?.getCanvas?.()) {
        map.getCanvas().style.cursor =
          ctx.shape.value || ctx.drawMode.value ? "crosshair" : "default";
      }
    } catch (e) {}
  };

  ctx.placePointAt = (lngLat) => {
    if (!lngLat) {
      ctx.disarmAddPoint();
      return;
    }
    const t = ctx.addPointTarget();
    if (!t) {
      ctx.disarmAddPoint();
      return;
    }
    if (t.isShape) {
      const s = ctx.shape.value;
      if (
        (s.type === "polygon" || s.type === "polyline") &&
        ctx.isDupOfLast(s.positions.map((p) => ({ lng: p.lon ?? p.lng, lat: p.lat })), lngLat)
      ) {
        ctx.disarmAddPoint();
        return;
      }
      s.positions.push(
        s.type === "multi_point"
          ? { lon: lngLat.lng, lat: lngLat.lat, height: 0, color: ctx.color.value }
          : { lon: lngLat.lng, lat: lngLat.lat, height: 0 },
      );
    } else if (ctx.drawMode.value === "multi_point") {
      ctx.positions.push({ lng: lngLat.lng, lat: lngLat.lat, color: ctx.color.value });
    } else {
      if (
        (ctx.drawMode.value === "polygon" || ctx.drawMode.value === "polyline") &&
        ctx.isDupOfLast(ctx.positions, lngLat)
      ) {
        ctx.disarmAddPoint();
        return;
      }
      ctx.positions.push({ lng: lngLat.lng, lat: lngLat.lat });
    }
    ctx.renderDraftLayers();
    ctx.disarmAddPoint();
  };

  ctx.armAddPoint = () => {
    if (!map) return false;
    if (!ctx.addPointTarget()) return false;
    if (ctx.placingPoint.value) return true;
    ctx.disarmAddPoint();
    ctx.placingPoint.value = true;
    try {
      map.getCanvas().style.cursor = "crosshair";
    } catch (e) {}
    const onClick = (e) => {
      const btn = e.originalEvent?.button;
      if (btn !== undefined && btn !== 0) return;
      ctx.placePointAt(e.lngLat);
    };
    const onCtx = (e) => {
      e.preventDefault();
      ctx.disarmAddPoint();
    };
    const onKey = (ev) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        ctx.disarmAddPoint();
      }
    };
    map.on("click", onClick);
    map.on("contextmenu", onCtx);
    window.addEventListener("keydown", onKey);
    placeHandlers = { onClick, onCtx, onKey };
    return true;
  };

  let editingPin = null;
  ctx.__getEditingPin = () => editingPin;
  ctx.__setEditingPin = (v) => { editingPin = v; };

  ctx.setPinLayersVisible = (pin, visible) => {
    if (!map || !pin || !pin.shape) return;
    const ids = pin.shape._sourceIds || [];
    ids.forEach((sid) => {
      [sid + "-fill", sid + "-line", sid + "-point", sid + "-points", sid + "-vlabel", sid + "-elen", sid + "-eadj"].forEach(
        (lid) => {
          if (map.getLayer(lid)) {
            map.setLayoutProperty(lid, "visibility", visible ? "visible" : "none");
          }
        },
      );
    });
  };

  ctx.bindEditDrag = () => {
    ctx.cleanupHandlers();
    const m = map;
    ctx.hs.mousedown = (e) => {
      if (ctx.placingPoint.value) return;
      if (e.originalEvent.button !== 0) return;
      const pts = ctx.editingPointsRef();
      if (!pts || pts.length < 2) return;
      const idx = ctx.nearestPointIndex(e.lngLat, 14);
      const isPoly = ctx.shape.value?.type === "polygon";
      if (idx >= 0 && (isPoly ? pts.length >= 3 : pts.length >= 2)) {
        dragActive = true;
        dragKind = "vertex";
        draggingIndex = idx;
        m.dragPan.disable();
        return;
      }
      const c = ctx.currentCenter();
      if (ctx.nearCenter(e.lngLat, c)) {
        dragActive = true;
        dragKind = "center";
        dragCenterRef = { lng: e.lngLat.lng, lat: e.lngLat.lat };
        dragOrigPts = ctx.editingPointsForLonLat(pts).map((p) => ({ ...p }));
        m.dragPan.disable();
      }
    };
    ctx.hs.mouseMove = (e) => {
      if (!dragActive) return;
      const isPoly = ctx.shape.value?.type === "polygon";
      if (dragKind === "vertex" && draggingIndex >= 0) {
        ctx.setEditablePoint(draggingIndex, { lng: e.lngLat.lng, lat: e.lngLat.lat });
        ctx.renderEditable(isPoly);
        return;
      }
      if (dragKind === "center" && dragCenterRef && dragOrigPts.length) {
        const dLng = e.lngLat.lng - dragCenterRef.lng;
        const dLat = e.lngLat.lat - dragCenterRef.lat;
        dragOrigPts.forEach((p, i) => {
          ctx.setEditablePoint(i, { lng: p.lng + dLng, lat: p.lat + dLat });
        });
        ctx.renderEditable(isPoly);
      }
    };
    ctx.hs.mouseup = () => {
      if (dragActive) {
        dragActive = false;
        dragKind = "";
        draggingIndex = -1;
        dragCenterRef = null;
        dragOrigPts = [];
      }
    };
    ctx.hs.key = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (ctx.placingPoint.value) {
          ctx.disarmAddPoint();
          return;
        }
        ctx.exitPinEdit();
      } else if (event.key === "Enter") {
        event.preventDefault();
        ctx.exitPinEdit();
      }
    };
    window.addEventListener("keydown", ctx.hs.key);
    m.on("mousedown", ctx.hs.mousedown);
    m.on("mousemove", ctx.hs.mouseMove);
    m.on("mouseup", ctx.hs.mouseup);
    ctx.hs.rightClick = (e) => {
      e.preventDefault();
      if (dragActive || ctx.placingPoint.value) return;
      const pts = ctx.editingPointsRef();
      if (!pts || !Array.isArray(pts)) return;
      const idx = ctx.nearestPointIndex(e.lngLat, 16);
      if (idx < 0) return;
      const t = ctx.shape.value?.type;
      const min = t === "polygon" ? 3 : t === "multi_point" ? 1 : 2;
      if (pts.length <= min) return;
      pts.splice(idx, 1);
      ctx.renderDraftLayers();
      logger.info("draw", "حذف نقطه از روی نقشه در حالت ویرایش", { index: idx });
    };
    m.on("contextmenu", ctx.hs.rightClick);
  };

  // ورود به حالت ویرایش یک شکل موجود (رسمی مثلث/خط یا KML آپلودشده) روی نقشه
  ctx.editExistingPin = (pin) => {
    if (!map || !pin || !pin.shape) return;
    ctx.exitPinEdit();
    editingPin = pin;
    ctx.__setEditingPin(pin);
    ctx.setPinLayersVisible(pin, false);
    ctx.shape.value = pin.shape;
    ctx.drawMode.value = pin.shape.type;
    ctx.showForm.value = false;
    // مجاورت‌های ذخیره‌شده را در فرم نگه دار تا لیبل‌های نقشه درست نمایش داده شوند
    try {
      const saved = Array.isArray(pin.shape.adjacents) ? [...pin.shape.adjacents] : [];
      ctx.formData.value.adjacents = saved;
      ctx.formData.value.adjacentsEnabled = !!pin.shape.adjacentsEnabled && saved.some((x) => String(x || "").trim());
      if (!ctx.formData.value.adjacentsEnabled && saved.length) ctx.formData.value.adjacentsEnabled = saved.some((x) => String(x || "").trim());
    } catch (e) {}
    ctx.renderDraftLayers();
    ctx.refreshAdjacencyLabels();
    ctx.bindEditDrag();
    map.getCanvas().style.cursor = "crosshair";
  };

  // خروج از حالت ویرایش و اعمال تغییرات روی شکل سبز ذخیره‌شده
  ctx.exitPinEdit = () => {
    const currentEditingPin = ctx.__getEditingPin();
    if (!currentEditingPin) return;
    // مجاورت‌های فرم را با تعداد جدید اضلاع همگام و روی ترسیم ذخیره کن
    // تا لیبل‌های دائمی نقشه هم به‌روز شوند
    try {
      const sh = currentEditingPin.shape;
      if (sh && (sh.type === "polygon" || sh.type === "polyline") && Array.isArray(sh.positions)) {
        const n = sh.type === "polygon" ? sh.positions.length : sh.positions.length - 1;
        const a = [...(ctx.formData.value.adjacents || [])];
        while (a.length < n) a.push("");
        a.length = Math.max(n, 0);
        sh.adjacents = a;
      }
    } catch (e) {}
    try {
      updatePinGeometry(map, currentEditingPin);
    } catch (e) {
      logger.warn("draw", "خطا در به‌روزرسانی شکل پس از ویرایش", e);
    }
    ctx.setPinLayersVisible(currentEditingPin, true);
    ctx.cleanupHandlers();
    ctx.clearTempLayers();
    editingPin = null;
    ctx.__setEditingPin(null);
    ctx.shape.value = null;
    ctx.drawMode.value = "";
    ctx.showForm.value = false;
    if (map) map.getCanvas().style.cursor = "default";
  };

  ctx.isEditingPin = (pin) => {
    const currentEditingPin = ctx.__getEditingPin();
    return currentEditingPin && pin && currentEditingPin.id === pin.id;
  };

  /* -------- ماندگاری پیش‌نویس در localStorage (ضد رفرش) -------- */
  let draftSaveTimer = null;
  ctx.persistDraftNow = () => {
    try {
      // هنگام ویرایش ترسیم ذخیره‌شده، تغییرات مستقیم روی pins اعمال می‌شود
      // و همان کافی است؛ ذخیره هم‌زمان به‌عنوان پیش‌نویس باعث نمایش تکراری بعد رفرش می‌شود
      if (ctx.__getEditingPin()) {
        clearDraft();
        return;
      }
      const hasPositions = Array.isArray(ctx.positions) && ctx.positions.length > 0;
      const hasShape =
        ctx.shape.value && typeof ctx.shape.value === "object" && ctx.shape.value.type;
      if (!hasPositions && !hasShape) {
        clearDraft();
        return;
      }
      // measure ابزار موقت است و نباید بازیابی شود
      if (ctx.drawMode.value === "measure" || ctx.drawMode.value === "eraser") {
        if (!hasShape) {
          clearDraft();
          return;
        }
      }
      saveDraft({
        drawMode: ctx.drawMode.value || "",
        positions: JSON.parse(
          JSON.stringify(toRaw(ctx.positions) || []),
        ),
        shape: ctx.shape.value ? toRaw(ctx.shape.value) : null,
        formData: ctx.formData.value ? JSON.parse(JSON.stringify(toRaw(ctx.formData.value))) : null,
        color: ctx.color.value || "#ff0000",
        showForm: !!ctx.showForm.value,
      });
    } catch (e) {}
  };
  ctx.schedulePersistDraft = () => {
    if (draftSaveTimer) clearTimeout(draftSaveTimer);
    draftSaveTimer = setTimeout(ctx.persistDraftNow, 250);
  };

  // ذخیره خودکار هر تغییر پیش‌نویس (حتی ناقص: تک‌نقطه هم ذخیره می‌شود)
  watch(
    [ctx.drawMode, ctx.color, ctx.showForm],
    () => ctx.schedulePersistDraft(),
  );
  watch(
    ctx.positions,
    () => ctx.schedulePersistDraft(),
    { deep: true },
  );
  watch(
    ctx.shape,
    () => ctx.schedulePersistDraft(),
    { deep: true },
  );
  watch(
    ctx.formData,
    () => ctx.schedulePersistDraft(),
    { deep: true },
  );
  // فلاش نهایی قبل از رفرش تا آخرین کلیک گم نشود
  try {
    window.addEventListener("beforeunload", ctx.persistDraftNow);
    window.addEventListener("pagehide", ctx.persistDraftNow);
  } catch (e) {}

  // بازسازی پیش‌نویس بعد از رفرش: لایه موقت + هندلرها + فرم
  ctx.restoreDraftFromStorage = () => {
    let d = null;
    try {
      d = loadDraft();
    } catch (e) {
      return false;
    }
    if (!d) return false;
    const mode = d.drawMode || d.shape?.type || "";
    if (!mode) return false;
    if (mode === "measure" || mode === "eraser" || mode === "") return false;
    const savedPositions = Array.isArray(d.positions) ? d.positions : [];
    const savedShape = d.shape || null;
    if (!savedPositions.length && !savedShape) return false;

    try {
      ctx.cleanupHandlers();
    } catch (e) {}
    try {
      ctx.clearTempLayers();
    } catch (e) {}

    try {
      ctx.drawMode.value = mode;
      ctx.color.value = d.color || "#ff0000";
    } catch (e) {}
    try {
      const fd = d.formData || {};
      ctx.formData.value = {
        name: fd.name || "",
        description: fd.description || "",
        adjacentsEnabled: !!fd.adjacentsEnabled,
        adjacents: Array.isArray(fd.adjacents) ? [...fd.adjacents] : [],
      };
    } catch (e) {}
    try {
      ctx.positions.length = 0;
      savedPositions.forEach((p) => {
        if (p && (p.lng !== undefined || p.lon !== undefined) && p.lat !== undefined) {
          ctx.positions.push({ ...p });
        }
      });
      ctx.shape.value = savedShape ? JSON.parse(JSON.stringify(savedShape)) : null;
      // فرم نام فقط وقتی برمی‌گردد که شکل تمام‌شده باشد
      ctx.showForm.value = !!(d.showForm && ctx.shape.value);
      ctx.nameError.value = false;
    } catch (e) {}

    try {
      // هندلرها و سورس موقت را مثل شروع ترسیم تازه می‌سازیم
      ctx.startDrawing();
    } catch (e) {}

    try {
      if (ctx.shape.value) {
        const pts = (ctx.shape.value.positions || []).map((p) => ({
          lng: p.lon ?? p.lng,
          lat: p.lat,
        }));
        if (pts.length) {
          if (ctx.shape.value.type === "polygon" || ctx.shape.value.type === "rectangle") {
            ctx.updateTempSource(pts, true);
            ctx.updatePolygonLabels(pts);
          } else if (ctx.shape.value.type === "polyline") {
            ctx.updateTempSource(pts, false);
            ctx.updateLineLabels(pts);
          } else if (ctx.shape.value.type === "multi_point") {
            const src = map.getSource(ctx.ts.sourceId);
            if (src) {
              src.setData({
                type: "FeatureCollection",
                features: pts.map((p) => ({
                  type: "Feature",
                  geometry: { type: "Point", coordinates: [p.lng, p.lat] },
                  properties: {},
                })),
              });
            }
          }
        }
        ctx.syncAdjacents();
        ctx.refreshAdjacencyLabels();
        ctx.applyDisplayColor();
        // رفتار finishDrawing: برای غیر پلی‌گان/خط هندلری باقی نمی‌ماند
        if (ctx.shape.value.type !== "polygon" && ctx.shape.value.type !== "polyline") {
          try {
            ctx.cleanupHandlers();
          } catch (e) {}
          try {
            if (map?.getCanvas?.()) map.getCanvas().style.cursor = "default";
          } catch (e) {}
        }
      } else if (ctx.positions.length) {
        if (ctx.drawMode.value === "polygon") {
          ctx.updateTempSource([...ctx.positions], true);
          ctx.updatePolygonLabels([...ctx.positions]);
        } else if (ctx.drawMode.value === "rectangle") {
          // اگر قبل رفرش فقط نقطه اول مستطیل زده شده بود، همان را ادامه بده
          if (ctx.positions.length === 1) {
            rectStart = { lng: ctx.positions[0].lng ?? ctx.positions[0].lon, lat: ctx.positions[0].lat };
          } else if (ctx.positions.length >= 4) {
            ctx.updateTempSource([...ctx.positions], true);
            ctx.updatePolygonLabels([...ctx.positions]);
          }
          ctx.updateTempSource([...ctx.positions], true);
          try {
            ctx.updatePolygonLabels([...ctx.positions]);
          } catch (e) {}
        } else if (ctx.drawMode.value === "polyline") {
          ctx.updateTempSource([...ctx.positions], false);
          ctx.updateLineLabels([...ctx.positions]);
        } else if (ctx.drawMode.value === "multi_point") {
          const src = map.getSource(ctx.ts.sourceId);
          if (src) {
            src.setData({
              type: "FeatureCollection",
              features: ctx.positions.map((p) => ({
                type: "Feature",
                geometry: { type: "Point", coordinates: [p.lng, p.lat] },
                properties: { color: p.color || ctx.color.value },
              })),
            });
          }
        }
        ctx.syncAdjacents();
        ctx.applyDisplayColor();
      } else {
        return false;
      }
    } catch (e) {}
    logger.info("draw", "بازیابی پیش‌نویس ترسیم پس از رفرش", {
      mode,
      points: ctx.positions.length || ctx.shape.value?.positions?.length || 0,
      finished: !!ctx.shape.value,
    });
    return true;
  };
}
