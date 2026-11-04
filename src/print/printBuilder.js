import {
  zoneLabel,
  effectiveLogoSrc,
  escapeHtml,
} from "../composables/krokiGeometry";
import { findNorthWestIndex } from "../utils/canvas";
import { vertexLabel } from "../utils/templates";
import { getTodayJalali } from "../utils/jalali";
import { logger } from "../utils/logger";

/*
 * ساخت HTML/CSS چاپ و بازکردن پنجرهٔ چاپ کروکی.
 * این توابع به state و last و template از کپوزابل اصلی وابسته‌اند،
 * بنابراین از طریق factory ساخته می‌شوند تا همان رفتار closure حفظ شود.
 */
export function printCss(landscape) {
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
.points-sheet {
  display: block;
  page-break-before: always;
  break-before: page;
}
.points-sheet h2 { font-size: 15px; margin: 0 0 3mm; }
.points-sheet .points-subtitle { font-size: 9px; color: #555; margin-bottom: 3mm; }
.points-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5mm; direction: rtl; }
.points-grid table { font-size: 10px; margin: 0; }
.points-grid th, .points-grid td { border: 1px solid #bbb; padding: 3px 5px; text-align: center; white-space: nowrap; }
.points-grid th { background: #f3f3f3; }

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
  .points-sheet { page-break-before: always; break-before: page; }
}
`;
}

export function createPrintBuilder(state, last, template) {
  function buildPrintHtml() {
    const t = template();
    // جدول نقاط: ستون Y قبل از X (جای X و Y عوض شده) + زون با پسوند N
    const tableIndices = Array.isArray(state.outputTableIndices) && state.outputTableIndices.length
      ? state.outputTableIndices
      : state.utmPoints.map((_, index) => index);
    const rows = tableIndices
      .map((pointIndex, rowIndex) => {
        const p = state.utmPoints[pointIndex];
        if (!p) return "";
        return `<tr><td>${rowIndex + 1}</td><td>${p.y.toFixed(2)}</td><td>${p.x.toFixed(2)}</td><td> ${zoneLabel(p.zone ?? state.utmZone ?? "")}</td></tr>`;
      })
      .join("");
    const allPointRows = state.utmPoints
      .map((point, index) => {
        if (!point) return "";
        return `<tr><td>${index + 1}</td><td>${Number(point.y).toFixed(2)}</td><td>${Number(point.x).toFixed(2)}</td></tr>`;
      });
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
    const pointsPerPage = state.orientation === "landscape" ? 60 : 80;
    const fullPointsPages = [];
    for (let pageStart = 0; pageStart < allPointRows.length; pageStart += pointsPerPage) {
      const pageRows = allPointRows.slice(pageStart, pageStart + pointsPerPage);
      const pointColumns = Array.from({ length: 2 }, (_, columnIndex) => {
        const start = Math.ceil(pageRows.length * columnIndex / 2);
        const end = Math.ceil(pageRows.length * (columnIndex + 1) / 2);
        return `<table class="utm-table"><thead><tr><th>نقطه</th><th>Y (Northing)</th><th>X (Easting)</th></tr></thead><tbody>${pageRows.slice(start, end).join("")}</tbody></table>`;
      }).join("");
      fullPointsPages.push(`<section class="sheet points-sheet">
          ${headBlock}
          <h2>فهرست کامل نقاط${pageStart ? " — ادامه" : ""}</h2>
          <div class="points-subtitle">نقاط ${pageStart + 1} تا ${Math.min(pageStart + pageRows.length, allPointRows.length)} از ${allPointRows.length} — مختصات UTM، Zone: ${zoneLabel(state.utmZone ?? "—")}</div>
          <div class="points-grid">${pointColumns}</div>
        </section>`);
    }

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
    const tableEdges = state.tableEdges?.length
      ? state.tableEdges
      : (state.selectedShapesMeta || []).flatMap((meta, shapeIndex) => {
          const count = meta.isClosed ? meta.count : Math.max(meta.count - 1, 0);
          return Array.from({ length: count }, (_, edgeIndex) => ({
            startIndex: meta.startIdx + edgeIndex,
            endIndex: meta.startIdx + (
              meta.isClosed ? (edgeIndex + 1) % meta.count : edgeIndex + 1
            ),
            shapeIndex,
            text: state.edgeTexts?.[shapeIndex]?.[edgeIndex] || "",
          }));
        });
    const hasEdges =
      (state.utmPoints || []).length >= 2 &&
      tableEdges.length > 0;
    const edgeTable = hasEdges
      ? `<div class="block-title">مجاورت‌ها</div>
      <table class="utm-table">
        <thead><tr><th>ضلع</th><th>طول (متر)</th><th>مجاورت</th></tr></thead>
        <tbody>
          ${(() => {
            const tablePoints = tableIndices.map(
              (pointIndex) => state.utmPoints[pointIndex],
            ).filter(Boolean);
            const northWestIndex = findNorthWestIndex(tablePoints);
            const tablePointLabels = new Map(
              tableIndices.map((pointIndex, rowIndex) => [
                pointIndex,
                String(vertexLabel(t.vertexLabels, rowIndex, northWestIndex)),
              ]),
            );
            return tableEdges
              .map((edge, edgeIndex) => {
                const a = state.utmPoints[edge.startIndex];
                const b = state.utmPoints[edge.endIndex];
                const dx = Number(b?.x) - Number(a?.x);
                const dy = Number(b?.y) - Number(a?.y);
                const length = Number.isFinite(dx) && Number.isFinite(dy)
                  ? Math.sqrt(dx * dx + dy * dy).toFixed(2)
                  : "—";
                const shapeCount = state.selectedShapesMeta.length;
                let edgeName = `${tablePointLabels.get(edge.startIndex) || edgeIndex + 1}-${tablePointLabels.get(edge.endIndex) || edgeIndex + 2}`;
                if (shapeCount > 1) edgeName += ` (ترسیم ${edge.shapeIndex + 1})`;
                if (!a || !b) edgeName = `${edgeIndex + 1}`;
                return `<tr><td>${edgeName}</td><td>${length}</td><td>${escapeHtml(edge.text) || "—"}</td></tr>`;
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

    return {
      html: html + (state.utmPoints.length > 50 ? fullPointsPages.join("") : ""),
      style: `headerColor:${t.headerColor}`,
    };
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
      const sheets = Array.from(idoc.querySelectorAll(".sheet"));
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

          for (const sheet of sheets) {
            sheet.style.width = pageW + "px";
            sheet.style.height = pageH + "px";
            sheet.style.maxHeight = pageH + "px";
            sheet.style.margin = "0";
            sheet.style.overflow = "hidden";
          }

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

  return { buildPrintHtml, printCss, openPrint };
}