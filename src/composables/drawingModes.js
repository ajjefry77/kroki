import { nextTick } from "vue";
import { measureDistance, formatDistance } from "../utils/useDrawingHelpers";
import { ensureVertexSquareImage } from "../utils/drawStyle";
import { DONE_COLOR, MAP_TEXT_FONT } from "./drawingCore";

/**
 * توابع حالت ترسیم (شروع، پایان، تغییر حالت، اندازه‌گیری) را روی ctx قرار می‌دهد.
 * به توابع core و layers از طریق ctx دسترسی دارند.
 */
export function createDrawingModes(ctx) {
  const map = ctx.mapRef;

  ctx.startDrawing = () => {
    const m = map;
    m.getCanvas().style.cursor = "crosshair";
    try {
      ensureVertexSquareImage(m);
    } catch (e) {}

    if (ctx.drawMode.value === "multi_point") {
      ctx.addTempSource();
      ctx.addMultiPointLayers();
      const updateSource = () => {
        const src = m.getSource(ctx.ts.sourceId);
        if (!src) return;
        const features = ctx.positions.map((p) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
          properties: { color: p.color || ctx.color.value },
        }));
        src.setData({ type: "FeatureCollection", features });
      };
      ctx.hs.click = (e) => {
        if (ctx.placingPoint.value) return;
        if (e.originalEvent?.button !== undefined && e.originalEvent.button !== 0) return;
        ctx.positions.push({
          lng: e.lngLat.lng,
          lat: e.lngLat.lat,
          color: ctx.color.value,
        });
        updateSource();
      };
      ctx.hs.rightClick = (e) => {
        e.preventDefault();
        if (ctx.placingPoint.value) return;
        if (ctx.positions.length < 1) return;
        ctx.cleanupHandlers();
        ctx.finishDrawing("multi_point", [...ctx.positions]);
      };
      ctx.hs.key = (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          ctx.finishCurrentDrawing();
        } else if (event.key === "Delete" && ctx.positions.length > 0) {
          ctx.positions.pop();
          updateSource();
        }
      };
      window.addEventListener("keydown", ctx.hs.key);
      m.on("click", ctx.hs.click);
      m.on("contextmenu", ctx.hs.rightClick);

    } else if (ctx.drawMode.value === "polyline") {
      ctx.addTempSource();
      ctx.addPolylineLayers();
      ctx.hs.mousedown = (e) => {
        if (ctx.placingPoint.value) return;
        if (e.originalEvent.button !== 0) return;
        // ذخیره موقعیت پیکسلی برای تشخیص درگ
        ctx.__setDownXY(e.point ? { x: e.point.x, y: e.point.y } : null);
        const pts = ctx.editingPointsRef();
        if (!pts || !pts.length) return;
        const idx = ctx.nearestPointIndex(e.lngLat, 14);
        if (idx >= 0 && pts.length >= 2) {
          ctx.__setDragActive(true);
          ctx.__setDragKind("vertex");
          ctx.__setDraggingIndex(idx);
          m.dragPan.disable();
          return;
        }
        if (pts.length >= 2) {
          const c = ctx.currentCenter();
          if (ctx.nearCenter(e.lngLat, c)) {
            ctx.__setDragActive(true);
            ctx.__setDragKind("center");
            ctx.__setDragCenterRef({ lng: e.lngLat.lng, lat: e.lngLat.lat });
            ctx.__setDragOrigPts(ctx.editingPointsForLonLat(pts).map((p) => ({ ...p })));
            m.dragPan.disable();
          }
        }
      };
      ctx.hs.mouseMove = (e) => {
        if (ctx.__getDragActive()) {
          const downXY = ctx.__getDownXY();
          if (downXY && e.point && ctx.screenDist(downXY, e.point) > 4) {
            ctx.__setSuppressClick(true);
          }
          const pts = ctx.editingPointsRef();
          if (ctx.__getDragKind() === "vertex" && ctx.__getDraggingIndex() >= 0) {
            ctx.setEditablePoint(ctx.__getDraggingIndex(), { lng: e.lngLat.lng, lat: e.lngLat.lat });
            ctx.renderEditable(false);
            return;
          }
          const dragCenterRef = ctx.__getDragCenterRef();
          const dragOrigPts = ctx.__getDragOrigPts();
          if (ctx.__getDragKind() === "center" && dragCenterRef && dragOrigPts.length) {
            const dLng = e.lngLat.lng - dragCenterRef.lng;
            const dLat = e.lngLat.lat - dragCenterRef.lat;
            dragOrigPts.forEach((p, i) => {
              ctx.setEditablePoint(i, { lng: p.lng + dLng, lat: p.lat + dLat });
            });
            ctx.renderEditable(false);
            return;
          }
        }
        const pts = ctx.editingPointsRef();
        if (!pts || pts.length === 0) return;
        if (!ctx.shape.value && !ctx.__getDragActive()) {
          ctx.updateTempSource([...ctx.editingPointsForLonLat(pts), { lng: e.lngLat.lng, lat: e.lngLat.lat }]);
        }
      };
      ctx.hs.mouseup = () => {
        if (ctx.__getDragActive()) {
          ctx.__setDragActive(false);
          ctx.__setDragKind("");
          ctx.__setDraggingIndex(-1);
          ctx.__setDragCenterRef(null);
          ctx.__setDragOrigPts([]);
        }
        ctx.__setDownXY(null);
      };
      ctx.hs.click = (e) => {
        if (ctx.__getSuppressClick()) {
          ctx.__setSuppressClick(false);
          return;
        }
        if (ctx.__getDragActive() || ctx.placingPoint.value || ctx.shape.value) return;
        if (e.originalEvent?.button !== undefined && e.originalEvent.button !== 0) return;
        const now = Date.now();
        if (now - ctx.__getLastClickTs() < 280) return;
        ctx.__setLastClickTs(now);
        const idx = ctx.nearestPointIndex(e.lngLat, 14);
        if (idx >= 0) return;
        if (ctx.isDupOfLast(ctx.positions, e.lngLat)) return;
        ctx.positions.push({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        ctx.updateTempSource(ctx.positions);
        ctx.updateLineLabels(ctx.positions);
      };
      ctx.hs.rightClick = (e) => {
        e.preventDefault();
        if (ctx.placingPoint.value) return;
        if (ctx.shape.value) return; // پس از پایان، حذف فقط از جدول
        if (ctx.positions.length > 0) {
          ctx.positions.pop();
          ctx.updateTempSource(ctx.positions);
          ctx.updateLineLabels(ctx.positions);
          if (ctx.positions.length < 2) ctx.cleanupHandlers();
        }
      };
      ctx.hs.dblClick = (e) => {
        e.preventDefault();
        e.originalEvent?.preventDefault?.();
        e.originalEvent?.stopPropagation?.();
        if (!ctx.shape.value) ctx.finishCurrentDrawing();
      };
      ctx.hs.key = (event) => {
        if (event.key === "Delete" && !ctx.shape.value && ctx.positions.length > 0) {
          ctx.positions.pop();
          ctx.updateTempSource(ctx.positions);
          ctx.updateLineLabels(ctx.positions);
          if (ctx.positions.length < 2) ctx.cleanupHandlers();
        } else if (event.key === "Enter") {
          event.preventDefault();
          ctx.finishCurrentDrawing();
        }
      };
      window.addEventListener("keydown", ctx.hs.key);
      m.on("click", ctx.hs.click);
      m.on("mousemove", ctx.hs.mouseMove);
      m.on("contextmenu", ctx.hs.rightClick);
      m.on("dblclick", ctx.hs.dblClick);
      m.on("mousedown", ctx.hs.mousedown);
      m.on("mouseup", ctx.hs.mouseup);

    } else if (ctx.drawMode.value === "polygon") {
      ctx.addTempSource();
      ctx.addPolygonLayers();
      ctx.hs.mousedown = (e) => {
        if (ctx.placingPoint.value) return;
        if (e.originalEvent.button !== 0) return;
        // ذخیره موقعیت پیکسلی برای تشخیص درگ
        ctx.__setDownXY(e.point ? { x: e.point.x, y: e.point.y } : null);
        const pts = ctx.editingPointsRef();
        if (!pts || !pts.length) return;
        const idx = ctx.nearestPointIndex(e.lngLat, 14);
        if (idx >= 0 && pts.length >= 3) {
          ctx.__setDragActive(true);
          ctx.__setDragKind("vertex");
          ctx.__setDraggingIndex(idx);
          m.dragPan.disable();
          return;
        }
        if (pts.length >= 3) {
          const c = ctx.currentCenter();
          if (ctx.nearCenter(e.lngLat, c)) {
            ctx.__setDragActive(true);
            ctx.__setDragKind("center");
            ctx.__setDragCenterRef({ lng: e.lngLat.lng, lat: e.lngLat.lat });
            ctx.__setDragOrigPts(ctx.editingPointsForLonLat(pts).map((p) => ({ ...p })));
            m.dragPan.disable();
          }
        }
      };
      ctx.hs.mouseMove = (e) => {
        if (ctx.__getDragActive()) {
          const downXY = ctx.__getDownXY();
          if (downXY && e.point && ctx.screenDist(downXY, e.point) > 4) {
            ctx.__setSuppressClick(true);
          }
          if (ctx.__getDragKind() === "vertex" && ctx.__getDraggingIndex() >= 0) {
            ctx.setEditablePoint(ctx.__getDraggingIndex(), { lng: e.lngLat.lng, lat: e.lngLat.lat });
            ctx.renderEditable(true);
            return;
          }
          const dragCenterRef = ctx.__getDragCenterRef();
          const dragOrigPts = ctx.__getDragOrigPts();
          if (ctx.__getDragKind() === "center" && dragCenterRef && dragOrigPts.length) {
            const dLng = e.lngLat.lng - dragCenterRef.lng;
            const dLat = e.lngLat.lat - dragCenterRef.lat;
            dragOrigPts.forEach((p, i) => {
              ctx.setEditablePoint(i, { lng: p.lng + dLng, lat: p.lat + dLat });
            });
            ctx.renderEditable(true);
            return;
          }
        }
        const pts = ctx.editingPointsRef();
        if (!pts || pts.length === 0) return;
        if (!ctx.shape.value && !ctx.__getDragActive()) {
          ctx.updateTempSource(
            [...ctx.editingPointsForLonLat(pts), { lng: e.lngLat.lng, lat: e.lngLat.lat }],
            true,
          );
        }
      };
      ctx.hs.mouseup = () => {
        if (ctx.__getDragActive()) {
          ctx.__setDragActive(false);
          ctx.__setDragKind("");
          ctx.__setDraggingIndex(-1);
          ctx.__setDragCenterRef(null);
          ctx.__setDragOrigPts([]);
        }
        ctx.__setDownXY(null);
      };
      ctx.hs.click = (e) => {
        if (ctx.__getSuppressClick()) {
          ctx.__setSuppressClick(false);
          return;
        }
        if (ctx.__getDragActive() || ctx.placingPoint.value || ctx.shape.value) return;
        if (e.originalEvent?.button !== undefined && e.originalEvent.button !== 0) return;
        const now = Date.now();
        if (now - ctx.__getLastClickTs() < 280) return;
        // بستن پلی‌گان با کلیک روی نقطه شروع (اسنپ ۱۶ پیکسل)
        if (ctx.positions.length >= 3 && e.point) {
          const f = ctx.positions[0];
          const fp = map.project({ lng: f.lng, lat: f.lat });
          if (ctx.screenDist(fp, e.point) <= 16) {
            ctx.__setLastClickTs(now);
            ctx.finishCurrentDrawing();
            return;
          }
        }
        ctx.__setLastClickTs(now);
        const idx = ctx.nearestPointIndex(e.lngLat, 14);
        if (idx >= 0) return;
        if (ctx.isDupOfLast(ctx.positions, e.lngLat)) return;
        ctx.positions.push({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        ctx.updateTempSource(ctx.positions, true);
        ctx.updatePolygonLabels(ctx.positions);
      };
      ctx.hs.rightClick = (e) => {
        e.preventDefault();
        if (ctx.placingPoint.value) return;
        if (ctx.shape.value) return;
        if (ctx.positions.length > 0) {
          ctx.positions.pop();
          ctx.updateTempSource(ctx.positions, true);
          ctx.updatePolygonLabels(ctx.positions);
          if (ctx.positions.length < 3) ctx.cleanupHandlers();
        }
      };
      ctx.hs.dblClick = (e) => {
        e.preventDefault();
        e.originalEvent?.preventDefault?.();
        e.originalEvent?.stopPropagation?.();
        if (!ctx.shape.value) ctx.finishCurrentDrawing();
      };
      ctx.hs.key = (event) => {
        if (event.key === "Delete" && !ctx.shape.value && ctx.positions.length > 0) {
          ctx.positions.pop();
          ctx.updateTempSource(ctx.positions, true);
          ctx.updatePolygonLabels(ctx.positions);
          if (ctx.positions.length < 3) ctx.cleanupHandlers();
        } else if (event.key === "Enter") {
          event.preventDefault();
          ctx.finishCurrentDrawing();
        }
      };
      window.addEventListener("keydown", ctx.hs.key);
      m.on("click", ctx.hs.click);
      m.on("mousemove", ctx.hs.mouseMove);
      m.on("contextmenu", ctx.hs.rightClick);
      m.on("dblclick", ctx.hs.dblClick);
      m.on("mousedown", ctx.hs.mousedown);
      m.on("mouseup", ctx.hs.mouseup);

    } else if (ctx.drawMode.value === "rectangle") {
      ctx.addTempSource();
      ctx.addRectangleLayers();
      ctx.__setRectStart(null);
      ctx.hs.click = (e) => {
        if (e.originalEvent?.button !== undefined && e.originalEvent.button !== 0) return;
        const rectStart = ctx.__getRectStart();
        if (!rectStart) {
          ctx.__setRectStart({ lng: e.lngLat.lng, lat: e.lngLat.lat });
          ctx.positions.length = 0;
          ctx.positions.push({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        } else {
          const s = rectStart;
          const f = { lng: e.lngLat.lng, lat: e.lngLat.lat };
          const pts = [
            { lng: s.lng, lat: s.lat },
            { lng: f.lng, lat: s.lat },
            { lng: f.lng, lat: f.lat },
            { lng: s.lng, lat: f.lat },
          ];
          ctx.positions.length = 0;
          pts.forEach((p) => ctx.positions.push(p));
          ctx.updateTempSource([...ctx.positions, ctx.positions[0]], true);
          ctx.updatePolygonLabels(ctx.positions);
          ctx.cleanupHandlers();
          ctx.finishDrawing("rectangle", [...ctx.positions]);
        }
      };
      ctx.hs.mouseMove = (e) => {
        const rectStart = ctx.__getRectStart();
        if (!rectStart) return;
        const s = rectStart;
        const f = { lng: e.lngLat.lng, lat: e.lngLat.lat };
        ctx.updateRectTempSource(s, f);
      };
      ctx.hs.key = (event) => {
        if (event.key === "Escape") {
          ctx.__setRectStart(null);
          ctx.positions.length = 0;
          const src = m.getSource(ctx.ts.sourceId);
          if (src) src.setData({ type: "FeatureCollection", features: [] });
        }
      };
      window.addEventListener("keydown", ctx.hs.key);
      m.on("click", ctx.hs.click);
      m.on("mousemove", ctx.hs.mouseMove);
    }
  };

  ctx.finishDrawing = (draw, pos) => {
    map.getCanvas().style.cursor = "default";
    const defaultOpacity = 0.7;
    if (draw === "multi_point") {
      ctx.shape.value = {
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
      ctx.shape.value = {
        type: draw,
        positions: ctx.dedupeRing(pos.map((p) => ({ lon: p.lng, lat: p.lat, height: 0 }))),
        color: DONE_COLOR,
        opacity: defaultOpacity,
        width: 3,
        show: true,
      };
    } else if (draw === "polygon" || draw === "rectangle") {
      const coords = ctx.dedupeRing(pos.map((p) => ({ lon: p.lng, lat: p.lat, height: 0 })));
      ctx.shape.value = {
        type: "polygon",
        positions: coords,
        color: DONE_COLOR,
        outlineColor: DONE_COLOR,
        opacity: defaultOpacity,
        width: 3,
        show: true,
      };
    }
    ctx.positions.length = 0;
    ctx.nameError.value = false;
    // پس از پایان ترسیم، شکل سبز می‌شود و فرم نام نمایش داده می‌شود
    ctx.syncAdjacents();
    ctx.refreshAdjacencyLabels();
    ctx.applyDisplayColor();
    ctx.showForm.value = true;
    // برای پلی‌گان و خط، دستگیره‌های درگ (رأس/مرکز) فعال می‌مانند تا کاربر بتواند
    // پیش از ذخیره، شکل را روی نقشه جابه‌جا کند. بقیه حالت‌ها دستگیره ندارند.
    if (draw !== "polygon" && draw !== "polyline") {
      ctx.cleanupHandlers();
    }
  };

  ctx.finishCurrentDrawing = () => {
    if (ctx.shape.value) {
      if (ctx.formData.value?.name?.trim()) {
        ctx.handleSave();
      } else {
        ctx.nameError.value = true;
      }
      return;
    }
    const mode = ctx.drawMode.value;
    let finished = false;
    if (mode === "polyline" && ctx.positions.length >= 2) {
      ctx.finishDrawing("polyline", [...ctx.positions]);
      finished = true;
    } else if (mode === "polygon" && ctx.positions.length >= 3) {
      ctx.finishDrawing("polygon", [...ctx.positions]);
      finished = true;
    } else if (mode === "multi_point" && ctx.positions.length >= 1) {
      ctx.cleanupHandlers();
      ctx.finishDrawing("multi_point", [...ctx.positions]);
      finished = true;
    } else if (mode === "rectangle" && ctx.positions.length >= 4) {
      ctx.cleanupHandlers();
      ctx.finishDrawing("rectangle", [...ctx.positions]);
      finished = true;
    }
    if (finished) {
      nextTick(() => {
        if (ctx.formData.value?.name?.trim() && ctx.shape.value) {
          ctx.handleSave();
        } else if (!ctx.formData.value?.name?.trim()) {
          ctx.nameError.value = true;
        }
      });
    }
  };

  ctx.setDrawMode = (mode) => {
    // تپ مجدد روی ابزار فعال = لغو/خاموش (مهم برای موبایل که Esc ندارد)
    if (ctx.drawMode.value === mode && !ctx.__getEditingPin() && !ctx.showForm.value) {
      ctx.cancelForm();
      return;
    }
    if (ctx.drawMode.value === mode && ctx.showForm.value) return;
    if (ctx.__getEditingPin()) ctx.exitPinEdit();
    ctx.measureActive.value = false;
    ctx.cleanupHandlers();
    ctx.clearTempLayers();
    ctx.drawMode.value = mode;
    ctx.activeTab.value = "measurements";
    ctx.positions.length = 0;
    ctx.shape.value = null;
    // در حالت ترسیم فرم نام نمایش داده نمی‌شود؛ پس از Enter ظاهر می‌شود
    ctx.showForm.value = false;
    ctx.formData.value = { name: "", description: "", adjacentsEnabled: false, adjacents: [] };

    if (mode === "eraser") {
      if (map) map.getCanvas().style.cursor = "crosshair";
      return;
    }

    setTimeout(() => {
      ctx.startDrawing();
    }, 100);
  };

  ctx.toggleMeasure = () => {
    ctx.disarmAddPoint();
    ctx.measureActive.value = !ctx.measureActive.value;
    if (ctx.measureActive.value) {
      ctx.drawMode.value = "measure";
      ctx.startMeasure();
    } else {
      ctx.drawMode.value = "";
      ctx.stopMeasure();
    }
  };

  ctx.startMeasure = () => {
    const m = map;
    ctx.measurePoints.length = 0;
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
        "text-font": MAP_TEXT_FONT,
      },
      paint: {
        "text-color": "#1e293b",
        "text-halo-color": "#ffffff",
        "text-halo-width": 3,
        "text-halo-blur": 2,
      },
    });
    ctx.ts.sourceId = tempId;
    ctx.ts.layerIds.push(tempId + "-line", tempId + "-points", tempId + "-labels");
    const buildMeasureFeatures = (pts, withPreview) => {
      const allPts = withPreview
        ? [...ctx.measurePoints, [withPreview.lng, withPreview.lat]]
        : ctx.measurePoints;
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
    ctx.hs.click = (e) => {
      if (e.originalEvent?.button !== undefined && e.originalEvent.button !== 0) return;
      ctx.measurePoints.push([e.lngLat.lng, e.lngLat.lat]);
      const src = m.getSource(tempId);
      if (src) src.setData(buildMeasureFeatures());
    };
    ctx.hs.mouseMove = (e) => {
      if (ctx.measurePoints.length === 0) return;
      const src = m.getSource(tempId);
      if (src) src.setData(buildMeasureFeatures(ctx.measurePoints, e.lngLat));
    };
    ctx.hs.rightClick = (e) => {
      e.preventDefault();
      ctx.measurePoints.length = 0;
      const src = m.getSource(tempId);
      if (src) src.setData({ type: "FeatureCollection", features: [] });
    };
    m.on("click", ctx.hs.click);
    m.on("mousemove", ctx.hs.mouseMove);
    m.on("contextmenu", ctx.hs.rightClick);
  };

  ctx.stopMeasure = () => {
    ctx.cleanupHandlers();
    ctx.measurePoints.length = 0;
    ctx.measureActive.value = false;
    ctx.clearTempLayers();
  };
}
