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

// ساخت متن DXF (R12, POLYLINE) با مختصات UTM در یک زون
export function buildDxf({ metas, allPositions }, zone = 39) {
  const out = [];
  const w = (code, val) => {
    out.push(code, String(val));
  };
  const entities = [];

  let shapeNo = 0;
  for (const meta of metas) {
    shapeNo += 1;
    const slice = allPositions.slice(meta.startIdx, meta.startIdx + meta.count);
    if (slice.length < 2) continue;
    const pts = slice.map((p) => {
      const { x, y } = toUTMInZone(Number(p.lon), Number(p.lat), zone);
      return { x, y };
    });

    entities.push("0", "POLYLINE");
    entities.push("8", "KROKI");
    entities.push("66", "1");
    entities.push("70", String(meta.isClosed ? 1 : 0));
    entities.push("10", "0.0");
    entities.push("20", "0.0");
    entities.push("30", "0.0");
    for (const p of pts) {
      entities.push("0", "VERTEX");
      entities.push("8", "KROKI");
      entities.push("10", p.x.toFixed(3));
      entities.push("20", p.y.toFixed(3));
      entities.push("30", "0.0");
    }
    entities.push("0", "SEQEND");
    entities.push("8", "KROKI");
  }

  w(0, "SECTION");
  w(2, "HEADER");
  w(9, "$ACADVER");
  w(1, "AC1009");
  w(0, "ENDSEC");

  w(0, "SECTION");
  w(2, "ENTITIES");
  out.push(...entities);
  w(0, "ENDSEC");
  w(0, "EOF");
  return out.join("\r\n");
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
