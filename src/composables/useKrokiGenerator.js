import { reactive } from "vue";
import proj4 from "proj4";
import { getTemplate } from "../utils/templates";
import { computeCanvasSize } from "../utils/canvas";
import { getTodayJalali } from "../utils/jalali";
import {
  loadLogoImage,
  toUTM,
  computeArea,
  computeShapeCentroid,
  reverseLookup,
  suggestAddressForPositions,
  eligiblePinsOf,
  isKrokiEligible,
  estimateAreaM2,
  effectiveLogoSrc,
} from "./krokiGeometry";
import { createRenderFunctions } from "./krokiRender";
import { createExportFunctions } from "./krokiExport";
import { createPrintBuilder } from "../print/printBuilder";
import { captureMapImage } from "../utils/mapSnapshot";

export {
  reverseLookup,
  suggestAddressForPositions,
  isKrokiEligible,
  eligiblePinsOf,
  estimateAreaM2,
  getTodayJalali,
};

export function useKrokiGenerator() {
  const state = reactive({
    generating: false,
    ready: false,
    errorMsg: "",
    mapImage: "",
    utmPoints: [],
    outputTableIndices: [],
    areaM2: 0,
    tableEdges: [],
    utmZone: null,
    centerUtm: null,
    shapeCentroids: [],
    edgeTexts: [],
    selectedShapesMeta: [],
    templateId: "technical",
    orientation: "portrait",
    styleOverrides: {},
  });
  const last = reactive({ form: {}, pins: [] });
  const template = () => ({
    ...getTemplate(state.templateId),
    ...state.styleOverrides,
  });

  function setOrientation(o) {
    state.orientation = o === "landscape" ? "landscape" : "portrait";
  }
  function setStyleOverride(key, value) {
    state.styleOverrides[key] = value;
  }
  function resetStyleOverrides() {
    Object.keys(state.styleOverrides).forEach(
      (k) => delete state.styleOverrides[k],
    );
  }
  function setTemplate(id) {
    if (!id) return;
    state.templateId = id;
  }

  function buildGeometry(pins) {
    const selected = eligiblePinsOf(pins);
    if (!selected.length) return null;
    const allPositions = [];
    const metas = [];
    for (const pin of selected) {
      const indexedPositions = (pin.shape.positions || [])
        .map((position, index) => ({ position, index }))
        .filter(
          ({ position, index }, _, arr) =>
            !(
              pin.shape.type === "polygon" &&
              index === arr[arr.length - 1]?.index &&
              arr.length > 1 &&
              position.lon === arr[0].position.lon &&
              position.lat === arr[0].position.lat
            ),
        );
      const positions = indexedPositions.map(({ position }) => position);
      if (!positions || positions.length < 2) continue;
      const startIdx = allPositions.length;
      allPositions.push(...positions);
      const localIndexByPositionIndex = new Map(
        indexedPositions.map(({ index }, localIndex) => [index, localIndex]),
      );
      const tablePositionIndices = Array.isArray(pin.shape.tablePositionIndices)
        ? pin.shape.tablePositionIndices
        : indexedPositions.map(({ index }) => index);
      const selectedLocalIndices = tablePositionIndices
        .map((index) => localIndexByPositionIndex.get(index))
        .filter(Number.isInteger);
      const tableIndices = selectedLocalIndices.map((index) => startIdx + index);
      const adjacencyCount = pin.shape.type === "polygon"
        ? selectedLocalIndices.length
        : Math.max(selectedLocalIndices.length - 1, 0);
      const tableEdges = Array.from({ length: adjacencyCount }, (_, edgeIndex) => {
        const fromLocalIndex = selectedLocalIndices[edgeIndex];
        const toLocalIndex = selectedLocalIndices[
          (edgeIndex + 1) % selectedLocalIndices.length
        ];
        const fromOriginalIndex = indexedPositions[fromLocalIndex]?.index;
        const toOriginalIndex = indexedPositions[toLocalIndex]?.index;
        const sourcePositionsCount = indexedPositions.length;
        let adjacencyIndex = -1;
        if (pin.shape.type === "polygon") {
          if (toLocalIndex === (fromLocalIndex + 1) % sourcePositionsCount) {
            adjacencyIndex = fromOriginalIndex;
          } else if (fromLocalIndex === (toLocalIndex + 1) % sourcePositionsCount) {
            adjacencyIndex = toOriginalIndex;
          }
        } else if (toLocalIndex === fromLocalIndex + 1) {
          adjacencyIndex = fromOriginalIndex;
        } else if (fromLocalIndex === toLocalIndex + 1) {
          adjacencyIndex = toOriginalIndex;
        }
        return {
          startIndex: startIdx + fromLocalIndex,
          endIndex: startIdx + toLocalIndex,
          shapeIndex: metas.length,
          sourceAdjacencyIndex: adjacencyIndex,
          text: Array.isArray(pin.shape.tablePositionIndices)
            ? String(pin.shape.tableAdjacents?.[edgeIndex] ?? "")
            : adjacencyIndex >= 0
              ? String(pin.shape.adjacents?.[adjacencyIndex] ?? "")
              : "",
        };
      });
      metas.push({
        type: pin.shape.type,
        isClosed: pin.shape.type === "polygon",
        startIdx,
        count: positions.length,
        pinId: pin.id,
        tableIndices,
        tableEdges,
        referenceSelection: Array.isArray(pin.shape.tablePositionIndices),
      });
    }
    if (allPositions.length < 2) return null;
    return { selected, allPositions, metas };
  }

  async function computeGeometry(pins, form) {
    state.errorMsg = "";
    state.ready = false;
    const geom = buildGeometry(pins);
    if (!geom) {
      state.errorMsg = "حداقل یک ترسیم معتبر انتخاب کنید.";
      return false;
    }
    last.form = { ...form };
    last.pins = pins;
    try {
      const t0 = template();
      loadLogoImage(effectiveLogoSrc(last.form, t0) || last.form.logo);
    } catch (e) {
      loadLogoImage(last.form.logo);
    }
    state.generating = true;
    try {
      const { allPositions, metas } = geom;
      const utm = toUTM(allPositions);
      state.utmPoints = utm;
      state.outputTableIndices = metas.flatMap((meta) => meta.tableIndices);
      state.tableEdges = metas.flatMap((meta) => meta.tableEdges);
      state.utmZone = utm[0]?.zone ?? null;
      state.selectedShapesMeta = metas;
      let totalArea = 0;
      for (const meta of metas) {
        if (meta.isClosed)
          totalArea += computeArea(
            utm.slice(meta.startIdx, meta.startIdx + meta.count),
          );
      }
      state.areaM2 = totalArea;
      const minX = Math.min(...utm.map((p) => p.x)),
        maxX = Math.max(...utm.map((p) => p.x));
      const minY = Math.min(...utm.map((p) => p.y)),
        maxY = Math.max(...utm.map((p) => p.y));
      let areaSum = 0,
        cxSum = 0,
        cySum = 0;
      for (const meta of metas) {
        if (!meta.isClosed) continue;
        const slice = utm.slice(meta.startIdx, meta.startIdx + meta.count);
        if (slice.length < 3) continue;
        let a = 0,
          cx = 0,
          cy = 0;
        for (let i = 0; i < slice.length; i++) {
          const p = slice[i],
            q = slice[(i + 1) % slice.length];
          const cross = p.x * q.y - q.x * p.y;
          a += cross;
          cx += (p.x + q.x) * cross;
          cy += (p.y + q.y) * cross;
        }
        a /= 2;
        if (Math.abs(a) < 1e-6) continue;
        const absA = Math.abs(a);
        areaSum += absA;
        cxSum += (cx / (6 * a)) * absA;
        cySum += (cy / (6 * a)) * absA;
      }
      let centerX = areaSum > 1e-6 ? cxSum / areaSum : (minX + maxX) / 2;
      let centerY = areaSum > 1e-6 ? cySum / areaSum : (minY + maxY) / 2;
      const meanLat0 =
        allPositions.reduce((s, p) => s + Number(p.lat), 0) /
        allPositions.length;
      const centerProj = `+proj=utm +zone=${state.utmZone} +datum=WGS84 +units=m +no_defs${meanLat0 < 0 ? " +south" : ""}`;
      const [cLon, cLat] = proj4(centerProj, "EPSG:4326", [centerX, centerY]);
      state.centerUtm = {
        x: centerX,
        y: centerY,
        lat: cLat,
        lon: cLon,
        zone: state.utmZone,
      };

      // مرکز هر ترسیم + نشانی پیشنهادی از map.ir (اگر کاربر دستی وارد نکرده باشد)
      const centroidResults = [];
      const centroidTasks = [];
      for (const meta of metas) {
        const slice = allPositions.slice(
          meta.startIdx,
          meta.startIdx + meta.count,
        );
        const c = computeShapeCentroid(slice, state.utmZone);
        if (!c) continue;
        const rec = {
          lat: c.lat,
          lon: c.lon,
          utm: { x: c.x, y: c.y, zone: state.utmZone },
        };
        const idx = centroidResults.length;
        centroidResults.push(rec);
        centroidTasks.push(
          reverseLookup(c.lat, c.lon)
            .then((r) => ({
              idx,
              display: r.display || "",
              road: r.road || "",
            }))
            .catch(() => ({ idx, display: "", road: "" })),
        );
      }
      const results = await Promise.all(centroidTasks);
      for (const r of results) {
        if (centroidResults[r.idx]) {
          centroidResults[r.idx].address = r.display;
          centroidResults[r.idx].road = r.road;
        }
      }
      state.shapeCentroids = centroidResults;
      const firstAddress = centroidResults.find((c) => c.address)?.address;
      if (firstAddress && !last.form.address) last.form.address = firstAddress;
      // مجاورت‌ها از روی ترسیم (مودال «ترسیم جدید») خوانده می‌شوند، نه از پیش‌نمایش
      state.edgeTexts = metas.map((meta) => {
        const n = meta.isClosed ? meta.count : Math.max(meta.count - 1, 0);
        const arr = Array(n).fill("");
        const selectedEdgeTexts = new Map(
          meta.tableEdges.map((edge) => [
            `${Math.min(edge.startIndex, edge.endIndex)}:${Math.max(edge.startIndex, edge.endIndex)}`,
            edge.text,
          ]),
        );
        for (let i = 0; i < n; i++) {
          const startIndex = meta.startIdx + i;
          const endIndex = meta.startIdx + (
            meta.isClosed ? (i + 1) % meta.count : i + 1
          );
          const key = `${Math.min(startIndex, endIndex)}:${Math.max(startIndex, endIndex)}`;
          arr[i] = selectedEdgeTexts.get(key) || "";
        }
        return arr;
      });
      state.ready = true;
      return true;
    } catch (err) {
      state.errorMsg = "خطا در تولید کروکی.";
      return false;
    } finally {
      state.generating = false;
    }
  }

  const {
    renderSketch,
  } = createRenderFunctions(state, last, template);
  const {
    exportKml,
    exportKmz,
    exportDxf,
    exportCsv,
  } = createExportFunctions(state, last, template, renderSketch);
  const {
    buildPrintHtml,
    printCss,
    openPrint,
  } = createPrintBuilder(state, last, template);

  function downloadImage(dataUrl, filename) {
    if (!dataUrl) return;
    try {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {}
    // فالبک موبایل (iOS سافاری download را نادیده می‌گیرد): باز کردن در تب جدید
    const isMobileView =
      typeof window !== "undefined" && window.innerWidth && window.innerWidth < 768;
    if (isMobileView) {
      setTimeout(() => {
        try {
          const check = document.createElement("a");
          // اگر دانلود انجام نشده باشد، کاربر با لمس طولانی می‌تواند ذخیره کند
          if (!check.download && /iPhone|iPad|iPod/i.test(navigator.userAgent || "")) {
            window.open(dataUrl, "_blank");
          }
        } catch (e) {}
      }, 300);
    }
  }

  function downloadDataUrlFallback(dataUrl, filename) {
    // تلاش دوم برای موبایل: باز کردن تصویر در تب جدید تا کاربر ذخیره کند
    try {
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(
          `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${filename}</title></head><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${dataUrl}" style="max-width:100%;height:auto"/></body></html>`,
        );
        w.document.close();
        return true;
      }
    } catch (e) {}
    try {
      window.open(dataUrl, "_blank");
      return true;
    } catch (e) {}
    return false;
  }

  function downloadCanvasImage(canvas, filename) {
    if (!canvas) return;
    let url = "";
    try {
      // صبر برای فونت وزیرمتن تا متن کروکی روی موبایل ناخوانا/جابه‌جا سیو نشود
      url = canvas.toDataURL("image/png");
    } catch (e) {
      url = "";
    }
    if (!url) return;
    downloadImage(url, filename);
  }
  return {
    state,
    last,
    template,
    setTemplate,
    setOrientation,
    setStyleOverride,
    resetStyleOverrides,
    computeGeometry,
    captureMapImage,
    renderSketch,
    downloadCanvasImage,
    openPrint,
    buildPrintHtml,
    printCss,
    getTodayJalali,
    computeCanvasSize,
    buildGeometry,
    eligiblePinsOf,
    isKrokiEligible,
    exportKml,
    exportKmz,
    exportDxf,
    exportCsv,
  };
}