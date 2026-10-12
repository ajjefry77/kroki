import proj4 from "proj4";
import { toUTMInZone } from "./useDrawingHelpers";

// ساخت متن KML از هندسه‌های انتخاب‌شده
export function buildKml({ metas, allPositions }, name = "کروکی") {
  const lines = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<kml xmlns="http://www.opengis.net/kml/2.2">`);
  lines.push(`  <Document>`);
  lines.push(`    <name>${esc(name)}</name>`);

  let shapeNo = 0;
  for (const meta of metas) {
    shapeNo += 1;
    const slice = allPositions.slice(meta.startIdx, meta.startIdx + meta.count);
    if (slice.length < 2) continue;
    const coordsStr = slice
      .map((p) => `${Number(p.lon).toFixed(8)},${Number(p.lat).toFixed(8)},0`)
      .join(" ");
    const coordsText = meta.isClosed && slice.length
      ? `${coordsStr} ${slice[0].lon.toFixed(8)},${slice[0].lat.toFixed(8)},0`
      : coordsStr;

    lines.push(`    <Placemark>`);
    lines.push(`      <name>${esc(name)} - ${shapeNo}</name>`);
    lines.push(`      <styleUrl>#kroki</styleUrl>`);
    if (meta.isClosed) {
      lines.push(`      <Polygon>`);
      lines.push(`        <outerBoundaryIs>`);
      lines.push(`          <LinearRing>`);
      lines.push(`            <coordinates>${coordsText}</coordinates>`);
      lines.push(`          </LinearRing>`);
      lines.push(`        </outerBoundaryIs>`);
      lines.push(`      </Polygon>`);
    } else {
      lines.push(`      <LineString>`);
      lines.push(`        <coordinates>${coordsText}</coordinates>`);
      lines.push(`      </LineString>`);
    }
    lines.push(`    </Placemark>`);
  }

  lines.push(`  </Document>`);
  lines.push(`</kml>`);
  return lines.join("\n");
}

function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[c]);
}

// ساخت متن DXF سازگار با اتوکد (R12 / AC1009 با LINE و TEXT روی لایه 0)
// نکته: نسخه قبلی با POLYLINE روی لایه تعریف‌نشده KROKI در بعضی اتوکدها خالی باز می‌شد.
export function buildDxf({ metas, allPositions }, zone = 39) {
  const L = [];
  const w = (code, val) => {
    L.push(String(code), String(val));
  };

  const shapes = [];
  for (const meta of metas || []) {
    const slice = (allPositions || []).slice(meta.startIdx, meta.startIdx + meta.count);
    if (slice.length < 2) continue;
    const pts = slice
      .map((p) => {
        const { x, y } = toUTMInZone(Number(p.lon ?? p.lng), Number(p.lat), zone);
        return { x, y };
      })
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (pts.length < 2) continue;
    shapes.push({ isClosed: !!meta.isClosed, pts });
  }

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const s of shapes)
    for (const p of s.pts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  const span = Math.max(
    Number.isFinite(maxX - minX) ? maxX - minX : 1,
    Number.isFinite(maxY - minY) ? maxY - minY : 1,
    1,
  );
  const textH = Math.min(Math.max(span * 0.025, 0.5), 20);
  const offset = textH * 0.8;
  const f3 = (n) => Number(n).toFixed(3);

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
    for (let i = 0; i < edgeCount; i++) {
      const a = s.pts[i];
      const b = s.pts[(i + 1) % n];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (!Number.isFinite(len) || len < 1e-9) continue;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const nx = -dy / (len || 1);
      const ny = dx / (len || 1);
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
  return L.join("\r\n") + "\r\n";
}

export function downloadText(text, filename, mime = "text/plain") {
  const blob = new Blob([text], { type: mime + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
