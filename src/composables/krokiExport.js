import {
  buildKmz,
  buildDocKml,
  buildInfoText,
  dataUrlToBytes,
} from "../utils/kmz";
import { makeExportFilename } from "../utils/jalali";
import { logger } from "../utils/logger";
import { vertexLabel } from "../utils/templates";
import { findNorthWestIndex } from "../utils/canvas";
import { escapeHtml, flattenPins } from "./krokiGeometry";

/*
 * توابع خروجی (KML / KMZ / DXF / CSV).
 * این توابع به state و last و template از کپوزابل اصلی وابسته‌اند،
 * بنابراین از طریق factory ساخته می‌شوند تا همان رفتار closure حفظ شود.
 */
export function createExportFunctions(state, last, template, renderSketch) {
  // ─────────────── KML Export ───────────────
  function exportKml() {
    const metas = state.selectedShapesMeta;
    const pts = state.utmPoints;
    if (!pts.length || !metas.length) return;

    let placemarks = "";
    for (let m = 0; m < metas.length; m++) {
      const meta = metas[m];
      const slice = pts.slice(meta.startIdx, meta.startIdx + meta.count);
      const coords = slice
        .map((p) => `${p.lon.toFixed(8)},${p.lat.toFixed(8)},0`)
        .join(" ");

      if (meta.isClosed) {
        const first = slice[0];
        const closedCoords =
          coords + ` ${first.lon.toFixed(8)},${first.lat.toFixed(8)},0`;
        placemarks += `<Placemark><name>ترسیم ${m + 1} (پلی‌گان)</name><Style><LineStyle><color>ff0000ff</color><width>2</width></LineStyle><PolyStyle><color>330000ff</color></PolyStyle></Style><Polygon><outerBoundaryIs><LinearRing><coordinates>${closedCoords}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`;
      } else {
        placemarks += `<Placemark><name>ترسیم ${m + 1} (خط)</name><Style><LineStyle><color>ff0000ff</color><width>3</width></LineStyle></Style><LineString><coordinates>${coords}</coordinates></LineString></Placemark>`;
      }
    }

    const kml = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>کروکی - ${escapeHtml(last.form?.title) || "بدون عنوان"}</name><Folder><name>ترسیمات</name>${placemarks}</Folder></Document></kml>`;
    const blob = new Blob([kml], {
      type: "application/vnd.google-earth.kml+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = makeExportFilename("mapiq", 1) + ".kml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ─────────────── KMZ Export (ZIP با پوشه‌بندی داخلی) ───────────────
  // ساخت فایل KMZ با ساختار زیر:
  //   doc.kml                — فایل اصلی KML با پوشه‌های ترسیمات و نقاط + Ground Overlay
  //   images/sketch.png      — تصویر کروکی (canvas)
  //   images/map.png         — تصویر ماهواره‌ای محدوده (در صورت وجود)
  //   data/points.csv        — مختصات UTM نقاط
  //   data/source-points.csv — تمام نقاط فایل‌های KML/KMZ ورودی
  //   data/info.txt          — مشخصات متنی کروکی
  //
  // نکته: canvas باید از بیرون پاس داده شود (مانند exportKml/PDF) تا
  // تصویر کروکی به‌روز باشد. اگر canvas پاس داده نشد، فقط بخش‌های متنی و نقشه
  // در KMZ قرار می‌گیرند.
  async function exportKmz(canvas) {
    const metas = state.selectedShapesMeta;
    const pts = state.utmPoints;
    if (!pts.length || !metas.length) return;

    const t = template();
    const form = last.form || {};

    // ۱) تصویر کروکی از روی canvas (در صورت پاس داده شدن)
    let sketchBytes = null;
    if (canvas) {
      try {
        // رندر تازه روی canvas پنهان
        renderSketch(canvas);
      } catch (e) {}
      try {
        const dataUrl = canvas.toDataURL("image/png");
        sketchBytes = dataUrlToBytes(dataUrl);
      } catch (e) {
        sketchBytes = null;
      }
    }

    // ۲) تصویر ماهواره‌ای نقشه (اگر در state موجود است)
    let mapBytes = null;
    if (state.mapImage) {
      mapBytes = dataUrlToBytes(state.mapImage);
    }

    // ۳) محاسبه مرز جغرافیایی برای Ground Overlay تصویر ماهواره
    let bounds = null;
    if (mapBytes) {
      let north = -Infinity, south = Infinity, east = -Infinity, west = Infinity;
      for (const p of pts) {
        if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue;
        if (p.lat > north) north = p.lat;
        if (p.lat < south) south = p.lat;
        if (p.lon > east) east = p.lon;
        if (p.lon < west) west = p.lon;
      }
      if (Number.isFinite(north)) {
        bounds = { north, south, east, west };
      }
    }

    // ۴) ساخت doc.kml با ارجاع به فایل‌های کناری
    const docKml = buildDocKml({
      metas,
      utmPoints: pts,
      form,
      areaM2: state.areaM2,
      mapImagePath: mapBytes && bounds ? "images/map.png" : null,
      bounds,
    });

    // ۵) ساخت CSV نقاط (مشابه exportCsv اما بدون دانلود، فقط محتوا)
    const nwIdx = (() => {
      try {
        return findNorthWestIndex(pts);
      } catch (e) {
        return 0;
      }
    })();
    const style = t.vertexLabels || "numbers";
    const csvLines = ["No,Label,X_Easting,Y_Northing,Zone,Latitude,Longitude"];
    pts.forEach((p, i) => {
      if (!p) return;
      const x = Number(p.x);
      const y = Number(p.y);
      const lat = Number(p.lat);
      const lon = Number(p.lon ?? p.lng);
      let label = String(i + 1);
      try {
        label = String(vertexLabel(style, i, nwIdx));
      } catch (e) {}
      const cells = [
        String(i + 1),
        String(label).replace(/,/g, " "),
        Number.isFinite(x) ? x.toFixed(2) : "",
        Number.isFinite(y) ? y.toFixed(2) : "",
        String(p.zone ?? state.utmZone ?? "").replace(/,/g, " "),
        Number.isFinite(lat) ? lat.toFixed(8) : "",
        Number.isFinite(lon) ? lon.toFixed(8) : "",
      ];
      csvLines.push(cells.join(","));
    });
    const csvContent = "﻿" + csvLines.join("\r\n") + "\r\n";
    const sourcePins = flattenPins(last.pins || []).filter(
      (pin) =>
        pin.shape?.sourceKmlImportId &&
        Array.isArray(pin.shape.positions),
    );
    const sourceCsvRows = ["Source,Shape,Point,Latitude,Longitude"];
    for (const pin of sourcePins) {
      pin.shape.positions.forEach((point, index) => {
        const cells = [
          pin.shape.sourceKmlFileName || "",
          pin.name || "",
          String(index + 1),
          Number.isFinite(Number(point.lat)) ? Number(point.lat).toFixed(8) : "",
          Number.isFinite(Number(point.lon)) ? Number(point.lon).toFixed(8) : "",
        ].map((value) => `"${String(value).replace(/"/g, '""')}"`);
        sourceCsvRows.push(cells.join(","));
      });
    }
    const sourceCsvContent = sourceCsvRows.length > 1
      ? "﻿" + sourceCsvRows.join("\r\n") + "\r\n"
      : "";

    // ۶) ساخت info.txt با مشخصات کروکی
    const infoContent = buildInfoText({
      form,
      areaM2: state.areaM2,
      utmPoints: pts,
      utmZone: state.utmZone,
      templateName: t.name,
      trackingCode: form.trackingCode || "",
    });

    // ۷) ساخت لیست فایل‌ها با مسیرهای پوشه‌بندی‌شده
    const files = [];
    files.push({ path: "doc.kml", content: docKml });
    if (sketchBytes) {
      files.push({ path: "images/sketch.png", content: sketchBytes });
    }
    if (mapBytes) {
      files.push({ path: "images/map.png", content: mapBytes });
    }
    files.push({ path: "data/points.csv", content: csvContent });
    if (sourceCsvContent) {
      files.push({ path: "data/source-points.csv", content: sourceCsvContent });
    }
    files.push({ path: "data/info.txt", content: infoContent });

    // ۸) ساخت و دانلود KMZ
    const filename = makeExportFilename("mapiq", 1) + ".kmz";
    await buildKmz({ files, filename });
    logger.info("export", "خروجی KMZ با پوشه‌بندی ساخته شد", {
      files: files.length,
      hasMap: !!mapBytes,
      hasSketch: !!sketchBytes,
    });
  }

  // ─────────────── DXF Export (R12 / AC1009 — سازگار با همه اتوکدها) ───────────────
  // مشکل قبلی: فایل AC1027 با LWPOLYLINE بدون مارکرهای 100 (AcDbEntity/AcDbPolyline)
  // توسط اتوکد نادیده گرفته می‌شد و فایل خالی به نظر می‌رسید.
  // راه‌حل: خروجی R12 فقط با LINE و TEXT روی لایه 0 که همه اتوکدها بازش می‌کنند.
  function exportDxf() {
    const metas = state.selectedShapesMeta;
    const pts = state.utmPoints;
    if (!pts.length || !metas.length) return;

    // جمع‌آوری شکل‌های معتبر
    const shapes = [];
    for (const meta of metas) {
      const slice = pts.slice(meta.startIdx, meta.startIdx + meta.count);
      const clean = (slice || []).filter(
        (p) => p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y)),
      );
      if (clean.length < 2) continue;
      shapes.push({ isClosed: !!meta.isClosed, pts: clean });
    }
    if (!shapes.length) return;

    // ارتفاع متن پویا نسبت به ابعاد زمین (متن ثابت 2.5 متری یا خیلی ریز بود یا خیلی درشت)
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const s of shapes) {
      for (const p of s.pts) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
    }
    const span = Math.max(maxX - minX, maxY - minY, 1);
    const textH = Math.min(Math.max(span * 0.025, 0.5), 20);
    const offset = textH * 0.8;
    const f3 = (n) => Number(n).toFixed(3);

    const L = [];
    const w = (code, val) => {
      L.push(String(code), String(val));
    };

    w(0, "SECTION");
    w(2, "HEADER");
    w(9, "$ACADVER");
    w(1, "AC1009");
    w(0, "ENDSEC");
    w(0, "SECTION");
    w(2, "ENTITIES");

    for (const s of shapes) {
      const n = s.pts.length;
      const edgeCount = s.isClosed ? n : n - 1;
      // ۱) خطوط محیط (هر یال یک LINE مستقل — مطمئن‌ترین موجودیت DXF)
      for (let i = 0; i < edgeCount; i++) {
        const a = s.pts[i];
        const b = s.pts[(i + 1) % n];
        w(0, "LINE");
        w(8, "0");
        w(10, f3(a.x));
        w(20, f3(a.y));
        w(30, "0.0");
        w(11, f3(b.x));
        w(21, f3(b.y));
        w(31, "0.0");
      }
      // ۲) لیبل طول هر ضلع
      for (let i = 0; i < edgeCount; i++) {
        const a = s.pts[i];
        const b = s.pts[(i + 1) % n];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (!Number.isFinite(len) || len < 1e-9) continue;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const nlen = len || 1;
        const nx = -dy / nlen;
        const ny = dx / nlen;
        let rot = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (rot > 90) rot -= 180;
        if (rot < -90) rot += 180;
        w(0, "TEXT");
        w(8, "0");
        w(10, f3(mx + nx * offset));
        w(20, f3(my + ny * offset));
        w(30, "0.0");
        w(40, f3(textH));
        w(1, len.toFixed(2));
        w(50, rot.toFixed(2));
        w(7, "STANDARD");
      }
    }

    w(0, "ENDSEC");
    w(0, "EOF");
    const dxf = L.join("\r\n") + "\r\n";
    const blob = new Blob([dxf], { type: "application/dxf;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = makeExportFilename("mapiq", 1) + ".dxf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  // ------------------------------------

  // ─────────────── CSV Export (مختصات نقاط با شماره) ───────────────
  function exportCsv() {
    const pts = state.utmPoints;
    if (!pts || !pts.length) return;
    const t = template();
    let nw = 0;
    try {
      nw = findNorthWestIndex(pts);
    } catch (e) {
      nw = 0;
    }
    const style = t.vertexLabels || "numbers";
    const lines = ["No,Label,X_Easting,Y_Northing,Zone,Latitude,Longitude"];
    pts.forEach((p, i) => {
      if (!p) return;
      const x = Number(p.x);
      const y = Number(p.y);
      const lat = Number(p.lat);
      const lon = Number(p.lon ?? p.lng);
      let label = String(i + 1);
      try {
        label = String(vertexLabel(style, i, nw));
      } catch (e) {}
      const cells = [
        String(i + 1),
        String(label).replace(/,/g, " "),
        Number.isFinite(x) ? x.toFixed(2) : "",
        Number.isFinite(y) ? y.toFixed(2) : "",
        String(p.zone ?? state.utmZone ?? "").replace(/,/g, " "),
        Number.isFinite(lat) ? lat.toFixed(8) : "",
        Number.isFinite(lon) ? lon.toFixed(8) : "",
      ];
      lines.push(cells.join(","));
    });
    const csv = "﻿" + lines.join("\r\n") + "\r\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = makeExportFilename("mapiq_points", 1) + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  // ------------------------------------

  return { exportKml, exportKmz, exportDxf, exportCsv };
}
