import { reactive } from "vue";
import proj4 from "proj4";
import { getTemplate, vertexLabel } from "../utils/templates";
import { computeCanvasSize, findNorthWestIndex } from "../utils/canvas";
import { loadMapbox } from "../utils/loadMapbox";
import { getTodayJalali } from "../utils/jalali";
import { logger } from "../utils/logger";
import {
  flattenPins,
  loadLogoImage,
  toUTM,
  computeArea,
  computeShapeCentroid,
  reverseLookup,
  suggestAddressForPositions,
  eligiblePinsOf,
  isKrokiEligible,
  estimateAreaM2,
  snapshotCanvas,
  zoneLabel,
  effectiveLogoSrc,
  escapeHtml,
} from "./krokiGeometry";
import {
  createRenderFunctions,
} from "./krokiRender";
import {
  createExportFunctions,
} from "./krokiExport";

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
    areaM2: 0,
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
      const positions = (pin.shape.positions || []).filter(
        (p, i, arr) =>
          !(
            pin.shape.type === "polygon" &&
            i === arr.length - 1 &&
            arr.length > 1 &&
            p.lon === arr[0].lon &&
            p.lat === arr[0].lat
          ),
      );
      if (!positions || positions.length < 2) continue;
      const startIdx = allPositions.length;
      allPositions.push(...positions);
      metas.push({
        type: pin.shape.type,
        isClosed: pin.shape.type === "polygon",
        startIdx,
        count: positions.length,
        pinId: pin.id,
      });
    }
    if (allPositions.length < 2) return null;
    return { selected, allPositions, metas };
  }

  async function captureMapImage(map, pins, allPositions) {
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
      const selectedById = new Map((geom.selected || []).map((p) => [p.id, p]));
      state.edgeTexts = metas.map((meta) => {
        const n = meta.isClosed ? meta.count : Math.max(meta.count - 1, 0);
        const arr = Array(n).fill("");
        try {
          const pin = (meta.pinId && selectedById.get(meta.pinId)) || geom.selected?.[metas.indexOf(meta)];
          const saved = pin?.shape?.adjacents;
          if (Array.isArray(saved)) {
            for (let i = 0; i < Math.min(n, saved.length); i++) {
              arr[i] = String(saved[i] ?? "");
            }
          }
        } catch (e) {}
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

  function buildPrintHtml() {
    const t = template();
    // جدول نقاط: ستون Y قبل از X (جای X و Y عوض شده) + زون با پسوند N
    const rows = state.utmPoints
      .map(
        (p, i) =>
          `<tr><td>${i + 1}</td><td>${p.y.toFixed(2)}</td><td>${p.x.toFixed(2)}</td><td> ${zoneLabel(p.zone ?? state.utmZone ?? "")}</td></tr>`,
      )
      .join("");

    const centerRow = state.centerUtm
      ? `<tr style="background:#eff6ff;font-weight:600"><td>مرکز</td><td>${state.centerUtm.y.toFixed(2)}</td><td>${state.centerUtm.x.toFixed(2)}</td><td> ${zoneLabel(state.centerUtm.zone ?? state.utmZone ?? "")}</td></tr>`
      : "";

    const hasUtm = t.coordinateTable !== "none";
    const landscape = state.orientation === "landscape";

    const headBlock = `
    <div class="head" style="border-bottom-color:${t.headerColor}">
      <div class="head-logo-title">
        ${effectiveLogoSrc(last.form, t) ? `<img class="head-logo" src="${effectiveLogoSrc(last.form, t)}" alt="" />` : ""}
        <div class="head-title">${escapeHtml(last.form.title) || "کروکی وضعیت موجود"}</div>
      </div>
      <div class="head-sub">قالب: ${escapeHtml(t.name)} — تاریخ برداشت: ${escapeHtml(last.form.date)}</div>
    </div>`;

    const infoRows = [
      ["متقاضی", escapeHtml(last.form.client)],
      ["کد ملی متقاضی", escapeHtml(last.form.clientNationalId) || "—"],
      ["شماره همراه متقاضی", escapeHtml(last.form.clientPhone) || "—"],
      ["نشانی ملک", escapeHtml(last.form.address) || "—"],
      ["نوع برداشت اولیه", escapeHtml(last.form.initialSurveyType || last.form.initial_survey_type) || "—"],
      ["سیستم مختصات", `WGS84 / UTM — Zone: ${zoneLabel(state.utmZone ?? "—")}`],
      ["مساحت کل", `<strong>${state.areaM2.toFixed(2)} متر مربع</strong>`],
      ["نهاد", escapeHtml(t.org)],
      ["کارشناس", escapeHtml(last.form.surveyor)],
      ["عرض معبر", `${escapeHtml(last.form.streetWidth) || "—"} متر`],
      ["شماره پلاک ثبتی", escapeHtml(last.form.plaque) || "—"],
    ];
    // جدول دوستونه: اگر تعداد ردیف‌ها فرد شد، ردیف آخر تمام‌عرض می‌شود تا جدول نشکند
    const infoTable2col = `<table class="info-table"><tbody>${Array.from(
      { length: Math.ceil(infoRows.length / 2) },
      (_, r) => {
        const pair = infoRows.slice(r * 2, r * 2 + 2);
        if (pair.length === 1)
          return `<tr><td>${pair[0][0]}</td><td colspan="3">${pair[0][1]}</td></tr>`;
        return `<tr>${pair
          .map(([l, v]) => `<td>${l}</td><td>${v}</td>`)
          .join("")}</tr>`;
      },
    ).join("")}</tbody></table>`;
    const infoTableStacked = `<table class="info-table info-stacked"><tbody>${infoRows
      .map(([l, v]) => `<tr><td class="cell-lb">${l}</td><td>${v}</td></tr>`)
      .join("")}</tbody></table>`;

    const utmTable = hasUtm
      ? `<table class="utm-table">
        <thead>
          <tr><th colspan="4">مختصات UTM — Zone: ${zoneLabel(state.utmZone ?? "—")}</th></tr>
          <tr><th>نقطه</th><th>Y</th><th>X</th><th>Zone</th></tr>
        </thead>
        <tbody>${rows}${centerRow}</tbody>
      </table>`
      : "";

    // جدول مجاورت‌ها: به‌جای ستون «ترسیم»، ستون «طول» (طول هر ضلع به متر)
    const edgeLenOf = (s, e) => {
      try {
        const pts = state.utmPoints || [];
        const meta = (state.selectedShapesMeta || [])[s];
        let a, b;
        if (meta && meta.count >= 2) {
          const aIdx = meta.startIdx + e;
          let bIdx;
          if (meta.isClosed) bIdx = meta.startIdx + ((e + 1) % meta.count);
          else bIdx = meta.startIdx + e + 1;
          a = pts[aIdx];
          b = pts[bIdx];
        } else {
          a = pts[e];
          b = pts[e + 1];
        }
        if (!a || !b) return "—";
        const dx = Number(b.x) - Number(a.x);
        const dy = Number(b.y) - Number(a.y);
        if (!isFinite(dx) || !isFinite(dy)) return "—";
        return Math.sqrt(dx * dx + dy * dy).toFixed(2);
      } catch {
        return "—";
      }
    };
    const hasEdges =
      (state.utmPoints || []).length >= 2 &&
      (state.edgeTexts || []).length > 0;
    const edgeTable = hasEdges
      ? `<div class="block-title">مجاورت‌ها</div>
      <table class="utm-table">
        <thead><tr><th>ضلع</th><th>طول (متر)</th><th>مجاورت</th></tr></thead>
        <tbody>
          ${(() => {
            const _nw = findNorthWestIndex(state.utmPoints);
            const _lbl = (gi) =>
              String(vertexLabel(t.vertexLabels, gi, _nw));
            return state.edgeTexts
              .map((texts, s) => {
                const meta = state.selectedShapesMeta[s];
                const multi = state.edgeTexts.length > 1;
                return texts
                  .map((txt, e) => {
                    let edgeName = `${e + 1}`;
                    if (meta && meta.count >= 2) {
                      const a = _lbl(meta.startIdx + e);
                      const nb = meta.isClosed
                        ? _lbl(meta.startIdx + ((e + 1) % meta.count))
                        : e + 1 < meta.count
                          ? _lbl(meta.startIdx + e + 1)
                          : null;
                      if (nb) edgeName = `${a}-${nb}`;
                      if (multi) edgeName += ` (ترسیم ${s + 1})`;
                    } else if (multi) {
                      edgeName += ` (ترسیم ${s + 1})`;
                    }
                    const len = edgeLenOf(s, e);
                    return `<tr><td>${edgeName}</td><td>${len}</td><td>${escapeHtml(txt) || "—"}</td></tr>`;
                  })
                  .join("");
              })
              .join("");
          })()}
        </tbody>
      </table>`
      : "";

    const disclaimer = `
    <div class="disclaimer">
      کلیه حدود بر اساس اظهارات و ارائه مالک برداشت شده است و نقشه‌بردار هیچ مسئولیتی در قبال تعدی به املاک مجاور و حریم‌های موجود ندارد.
    </div>`;

    const signRow = `
    <div class="sign-row">
      <div class="sign-box"><div class="sign-label">تاریخ: ${getTodayJalali()}</div></div>
      <div class="sign-box"><div class="sign-label">مهر و امضای کارشناس / نقشه‌بردار</div></div>
      <div class="sign-box"><div class="sign-label">امضای متقاضی / مالک</div></div>
    </div>`;

    const mapFig = state.mapImage
      ? `<figure class="map-fig">
        <img src="${state.mapImage}" />
        <figcaption>تصویر نقشه</figcaption>
      </figure>`
      : "";

    let html;
    if (landscape) {
      // چیدمان افقی: کروکی در سمت چپ، جدول مشخصات و سایر جداول در ستون سمت راست
      html = `
  <div class="sheet landscape">
    ${headBlock}
    <div class="map-area">
      <div class="side-panel">
        <div class="mg mg-info">${infoTableStacked}</div>
        <div class="mg mg-utm">
          ${utmTable}
          ${edgeTable}
        </div>
        <div class="mg mg-map">${mapFig}</div>
        <div class="mg mg-note">${disclaimer}</div>
      </div>
      <div class="sketch-side">
        <figure class="sketch-fig">
          <img src="__SKETCH__" />
          <figcaption>${escapeHtml(t.subtitle)}</figcaption>
        </figure>
      </div>
    </div>
    ${signRow}
  </div>`;
    } else {
      // چیدمان عمودی تک‌صفحه: کروکی بزرگ بالا؛ نقشه و جدول‌ها فشرده کنار هم پایین
      const bottomCells = [
        mapFig ? `<div class="bottom-right">${mapFig}</div>` : "",
        utmTable ? `<div class="bottom-mid">${utmTable}</div>` : "",
        edgeTable ? `<div class="bottom-left">${edgeTable}</div>` : "",
      ]
        .filter(Boolean)
        .join("");
      html = `
  <div class="sheet portrait">
    ${headBlock}
    ${infoTable2col}
    <figure class="sketch-fig sketch-fig-full">
      <img src="__SKETCH__" />
      <figcaption>${escapeHtml(t.subtitle)}</figcaption>
    </figure>
    <div class="bottom-section">
      ${bottomCells}
    </div>
    ${disclaimer}
    ${signRow}
  </div>`;
    }

    return { html, style: `headerColor:${t.headerColor}` };
  }

  function openPrint(canvas) {
    const sketchImg = canvas?.toDataURL("image/png") || "";
    const { html } = buildPrintHtml();
    const finalHtml = html.replace("__SKETCH__", sketchImg);
    const landscape = state.orientation === "landscape";

    // نام فایل خروجی PDF (عنوان تب چاپ): «اسم متقاضی + تاریخ»
    const clientName = String(last.form.client || "کروکی").trim() || "کروکی";
    const dateName = String(last.form.date || getTodayJalali()).trim() || getTodayJalali();
    const pdfTitle = `${clientName} ${dateName}`.replace(/[<>:"/\\|?*]/g, " ").replace(/\s+/g, " ").trim();

    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
<meta charset="utf-8">
<title>${escapeHtml(pdfTitle)}</title>
<style>${printCss(landscape)}</style>
</head>
<body>${finalHtml}</body>
</html>`);
    doc.close();

    setTimeout(() => {
      const iw = iframe.contentWindow;
      const idoc = iframe.contentDocument;
      if (!iw || !idoc) return;
      const sheet = idoc.querySelector(".sheet");
      const images = Array.from(idoc.images);

      Promise.all(
        images.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((res) => {
                img.onload = img.onerror = res;
              }),
        ),
      ).then(() => {
        try {
          // ابعاد کامل A4 (بدون حاشیه چاپی مرورگر تا URL صفحه چاپ نشود؛
          // فاصله داخل برگه با padding خود برگه تأمین می‌شود)
          const printWmm = landscape ? 297 : 210;
          const printHmm = landscape ? 210 : 297;
          const pageW = (printWmm * 96) / 25.4;
          const pageH = (printHmm * 96) / 25.4;

          sheet.style.width = pageW + "px";
          // ارتفاع طبیعی مثل پیش‌نمایش (بدون کش‌آمدن)؛ سقف یک صفحه تا خروجی
          // دقیقاً هم‌شکل پیش‌نمایش بماند و تک‌صفحه حفظ شود
          sheet.style.height = "auto";
          sheet.style.maxHeight = pageH + "px";
          sheet.style.margin = "0";
          sheet.style.overflow = "hidden";

          iw.focus();
          iw.print();
        } catch (e) {
          logger.error("print", "خطا در چاپ", e.message);
        }
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      });
    }, 450);
  }

  function printCss(landscape) {
    return `
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: Tahoma, 'Vazirmatn', sans-serif; color: #222; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

/* برگه دقیقاً یک صفحه */
.sheet {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 6mm;
}
.sheet > * { flex-shrink: 0; }

.head { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 4px; margin-bottom: 5px; }
.head-logo-title { display: flex; align-items: center; gap: 8px; }
.head-logo { width: 28px; height: 28px; object-fit: contain; }
.head-title { font-size: 15px; font-weight: 700; }
.head-sub { font-size: 9px; color: #555; }

.block-title { font-weight: 700; font-size: 11px; margin: 5px 0 3px; }

table { width: 100%; border-collapse: collapse; margin-bottom: 4px; font-size: 9.5px; }
table.info-table td { border: 1px solid #bbb; padding: 2px 6px; line-height: 1.3; }
table.info-table td:nth-child(1), table.info-table td:nth-child(3) { background: #f3f3f3; font-weight: 600; width: 14%; white-space: nowrap; }
table.utm-table th, table.utm-table td { border: 1px solid #bbb; padding: 2px 5px; text-align: center; }
table.utm-table thead th { background: #f3f3f3; }

figure { margin: 0; border: 1px solid #bbb; padding: 3px; text-align: center; }
figcaption { font-size: 10px; color: #444; margin-top: 2px; font-weight: 600; }

.disclaimer { font-size: 8px; color: #666; border-top: 1px solid #ccc; padding-top: 2px; margin-top: 3px; }

.sign-row { display: flex; gap: 8px; margin-top: 6px; }
.sign-box { flex: 1; border: 1px solid #bbb; min-height: 38px; border-radius: 6px; padding: 4px 8px; }
.sign-label { font-size: 9px; color: #555; font-weight: 600; }

/* ═══════════════════════════════════════════════════════════════
   چیدمان افقی (landscape): کروکی در سمت چپ + ستون اطلاعات در سمت راست
   ═══════════════════════════════════════════════════════════════ */
.sheet.landscape { position: relative; }
.sheet.landscape .head { position: relative; z-index: 10; flex-shrink: 0; }

/* ناحیه اصلی: فِلکس — کروکی چپ، ستون اطلاعات راست */
.sheet.landscape .map-area {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  border: 1px solid #999;
  margin: 6px 0;
  padding: 4px;
  display: flex;
  gap: 6px;
  overflow: hidden;
}

/* ستون سمت راست (در چیدمان راست‌به‌چپ = ابتدای فِلکس) */
.sheet.landscape .side-panel {
  order: 1;
  flex: 0 0 34%;
  max-width: 34%;
  min-width: 0;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
}
.sheet.landscape .side-panel .mg { width: 100%; }

/* کروکی: سمت چپ و تمام فضای باقی‌مانده */
.sheet.landscape .sketch-side {
  order: 2;
  flex: 1 1 auto;
  min-width: 0;
  position: relative;
  border: 1px solid #bbb;
}
.sheet.landscape .sketch-fig {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0;
  border: none;
  padding: 0;
}
.sheet.landscape .sketch-fig img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
}
.sheet.landscape .sketch-fig figcaption {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255,255,255,0.85);
  padding: 1px 8px;
  border-radius: 3px;
}

/* جعبه‌های اطلاعات */
.sheet.landscape .mg {
  background: rgba(255,255,255,0.94);
  border: 1px solid #bbb;
  padding: 4px 6px;
  font-size: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.25);
}
.sheet.landscape .mg table { font-size: 8px; margin-bottom: 0; }
.sheet.landscape .mg table.info-table td { padding: 2px 4px; }
.sheet.landscape .mg table.utm-table th, 
.sheet.landscape .mg table.utm-table td { padding: 1px 3px; font-size: 7.5px; }

/* ترتیب داخل ستون راست */
.sheet.landscape .mg-info { flex: 0 0 auto; }
.sheet.landscape .mg-utm { flex: 1 1 auto; min-height: 0; overflow: auto; }
.sheet.landscape .mg-map { flex: 0 0 auto; }
.sheet.landscape .mg-map img { max-height: 90px; width: auto; max-width: 100%; margin: 0 auto; }
.sheet.landscape .mg-note { flex: 0 0 auto; font-size: 7.5px; border: 0; box-shadow: none; background: rgba(255,255,255,0.85); }

/* جدول مشخصاتِ عمودی: هر فیلد در یک ردیف */
.sheet.landscape .mg .info-stacked td.cell-lb {
  width: 34%;
  background: #f3f3f3;
  font-weight: 600;
  white-space: nowrap;
}

/* ═══════════════════════════════════════════════════════════════
   چیدمان عمودی (portrait): کروکی بالا، عکس نقشه و جداول کنار هم
   ═══════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════
   چیدمان عمودی (portrait) تک‌صفحه: کروکی بزرگ بالا، نقشه و جدول‌ها
   فشرده کنار هم پایین تا همه‌چیز در یک صفحه A4 جا شود
   ═══════════════════════════════════════════════════════════════ */
/* کروکی فضای باقی‌مانده صفحه را می‌گیرد (بزرگ می‌ماند) */
.sheet.portrait .sketch-fig-full { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; margin: 0 0 8px; }
.sheet.portrait .sketch-fig-full img { flex: 1 1 auto; min-height: 0; width: 100%; height: 100%; object-fit: contain; display: block; }
.sheet.portrait .sketch-fig-full figcaption { flex: 0 0 auto; }

/* ردیف پایینی: نقشه + جدول مختصات + جدول مجاورت کنار هم */
.sheet.portrait .bottom-section {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-bottom: 6px;
}

/* نقشه: ستون باریک */
.sheet.portrait .bottom-right {
  flex: 0 0 26%;
  min-width: 0;
}
.sheet.portrait .bottom-right .map-fig {
  margin: 0;
}
.sheet.portrait .bottom-right .map-fig img {
  width: 100%;
  max-height: 120px;
  height: auto;
  display: block;
  object-fit: contain;
}

/* جدول‌ها: جمع‌وجور کنار هم */
.sheet.portrait .bottom-mid {
  flex: 1 1 37%;
  min-width: 0;
}
.sheet.portrait .bottom-left {
  flex: 1 1 37%;
  min-width: 0;
}
.sheet.portrait .bottom-section table { margin-bottom: 0; font-size: 8.5px; }
.sheet.portrait .bottom-section table th,
.sheet.portrait .bottom-section table td { padding: 1px 3px; }
.sheet.portrait .bottom-section .block-title { font-size: 10px; margin: 0 0 2px; }

/* پیش‌نمایش داخل iframe باریک موبایل: جلوگیری از سرریز و به‌هم‌ریختگی */
.sheet img { max-width: 100%; height: auto; }
.utm-table { table-layout: fixed; }
.utm-table td, .utm-table th { word-break: break-all; overflow-wrap: anywhere; }
@media (max-width: 600px) {
  .sheet { padding: 3mm; }
  .head { flex-wrap: wrap; gap: 4px; }
  .head-title { font-size: 13px; }
  .sheet.portrait .bottom-section { flex-direction: column; }
  .sheet.portrait .bottom-right,
  .sheet.portrait .bottom-mid,
  .sheet.portrait .bottom-left { flex: 1 1 auto; width: 100%; max-width: 100%; }
  .sheet.portrait .bottom-right .map-fig img { max-height: 180px; }
  .sheet.landscape .map-area { flex-direction: column; }
  .sheet.landscape .side-panel { order: 2; flex: 1 1 auto; max-width: 100%; }
  .sheet.landscape .sketch-side { order: 1; min-height: 220px; }
  .sheet.landscape .sketch-fig { position: relative; min-height: 220px; }
  .sheet.landscape .sketch-fig img { max-height: 260px; }
  table { font-size: 8.5px; }
  .sign-row { flex-direction: column; }
}

@page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 0; }
@media print {
  figure, table, .sign-row { page-break-inside: avoid; }
}
`;
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
