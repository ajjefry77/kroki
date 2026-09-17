import proj4 from "proj4";

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === "," || ch === "\t" || ch === ";") {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

export function parseCsv(text) {
  const src = String(text || "").replace(/^\uFEFF/, "");
  const lines = src
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return null;

  const first = splitCsvLine(lines[0]);
  const looksNumeric = (cells) =>
    cells.length > 0 && cells.every((c) => c === "" || isFinite(Number(String(c).replace(",", "."))));
  const hasHeader = !looksNumeric(first);

  const headers = hasHeader ? first.map((c) => String(c).trim()) : null;
  const data = hasHeader ? lines.slice(1) : lines;

  const rows = data.map(splitCsvLine);
  const numericRows = rows
    .map((r) => r.map((c) => Number(String(c).replace(",", "."))))
    .filter((r) => r.length >= 2 && r.slice(0, 2).every((v) => isFinite(v)));

  return { headers, rows, numericRows };
}

function findColumn(headers, names) {
  if (!headers) return -1;
  const lower = headers.map((h) => String(h).trim().toLowerCase());
  for (const n of names) {
    const exact = lower.indexOf(n.toLowerCase());
    if (exact !== -1) return exact;
  }
  for (const n of names) {
    const idx = lower.findIndex((h) => h.includes(n.toLowerCase()));
    if (idx !== -1) return idx;
  }
  return -1;
}

function looksLikeLat(cells) {
  return cells.length > 0 && cells.every((c) => isFinite(c) && c >= -90 && c <= 90);
}
function looksLikeLon(cells) {
  return cells.length > 0 && cells.every((c) => isFinite(c) && c >= -180 && c <= 180);
}
function looksLikeEasting(cells) {
  return cells.length > 0 && cells.every((c) => isFinite(c) && c >= 100000 && c <= 900000);
}
function looksLikeNorthing(cells) {
  return cells.length > 0 && cells.every((c) => isFinite(c) && c >= 0 && c <= 10000000);
}

/**
 * تحلیل ستون‌ها و ساخت نقاط از ردیف‌های CSV
 * خروجی: { points: [{lat, lon}], utmZone } یا null
 */
export function csvToPoints(csv) {
  if (!csv || !csv.numericRows.length) return null;

  const rows = csv.numericRows;
  const headers = csv.headers;

  const latCol = findColumn(headers, ["lat", "latitude", "عرض", "عرض جغرافیایی"]);
  const lonCol = findColumn(headers, ["lon", "lng", "long", "longitude", "طول", "طول جغرافیایی"]);

  // حالت ۱: ستون lat/lon صریح
  if (latCol !== -1 && lonCol !== -1) {
    const raw = rows
      .map((r) => ({ lat: r[latCol], lon: r[lonCol] }))
      .filter((p) => isFinite(p.lat) && isFinite(p.lon));
    const inRange = raw.filter((p) => p.lat >= -90 && p.lat <= 90 && p.lon >= -180 && p.lon <= 180);
    if (inRange.length) return { points: inRange, utmZone: null };
    // ستون‌ها شاید لیبل اشتباه دارند و مقدار واقعاً UTM است
    const easting = raw.map((p) => p.lon);
    const northing = raw.map((p) => p.lat);
    if (looksLikeEasting(easting) && looksLikeNorthing(northing)) {
      const utmZone = 39;
      const points = [];
      for (const p of raw) {
        const [lon, lat] = proj4(
          `+proj=utm +zone=${utmZone} +datum=WGS84 +units=m +no_defs`,
          "EPSG:4326",
          [p.lon, p.lat],
        );
        if (isFinite(lon) && isFinite(lat)) points.push({ lon, lat });
      }
      return points.length ? { points, utmZone } : null;
    }
    return null;
  }

  // حالت ۲: بدون هدر — تشخیص خودکار ترتیب
  if (!headers) {
    const c0 = rows.map((r) => r[0]);
    const c1 = rows.map((r) => r[1]);
    if (looksLikeLat(c0) && looksLikeLon(c1)) {
      return { points: rows.map((r) => ({ lat: r[0], lon: r[1] })), utmZone: null };
    }
    if (looksLikeLon(c0) && looksLikeLat(c1)) {
      return { points: rows.map((r) => ({ lat: r[1], lon: r[0] })), utmZone: null };
    }
    if (looksLikeEasting(c0) && looksLikeNorthing(c1)) {
      // UTM بدون هدر — تبدیل با زون پیش‌فرض ایران (۳۹)
      const utmZone = 39;
      const points = [];
      for (const r of rows) {
        const [lon, lat] = proj4(
          `+proj=utm +zone=${utmZone} +datum=WGS84 +units=m +no_defs`,
          "EPSG:4326",
          [r[0], r[1]],
        );
        if (isFinite(lon) && isFinite(lat)) points.push({ lon, lat });
      }
      return points.length ? { points, utmZone } : null;
    }
  }

  // حالت ۳: ستون x/y با هدر
  if (headers) {
    const xCol = findColumn(headers, ["x", "easting", "طول", "lon", "lng"]);
    const yCol = findColumn(headers, ["y", "northing", "عرض", "lat"]);
    if (xCol !== -1 && yCol !== -1) {
      const isEasting = looksLikeEasting(rows.map((r) => r[xCol])) && looksLikeNorthing(rows.map((r) => r[yCol]));
      const isLonLat = looksLikeLon(rows.map((r) => r[xCol])) && looksLikeLat(rows.map((r) => r[yCol]));
      if (isLonLat) {
        return {
          points: rows.map((r) => ({ lon: r[xCol], lat: r[yCol] })),
          utmZone: null,
        };
      }
      if (isEasting) {
        const zoneCol = findColumn(headers, ["zone", "زون"]);
        const zone = zoneCol !== -1 ? Math.round(rows[0][zoneCol]) : 39;
        let utmZone = zone >= 1 && zone <= 60 ? zone : 39;
        const points = [];
        for (const r of rows) {
          const [lon, lat] = proj4(
            `+proj=utm +zone=${utmZone} +datum=WGS84 +units=m +no_defs`,
            "EPSG:4326",
            [r[xCol], r[yCol]],
          );
          if (isFinite(lon) && isFinite(lat)) points.push({ lon, lat });
        }
        return { points, utmZone };
      }
    }
  }

  return null;
}

/**
 * ساخت ترسیم‌ها از نقاط CSV
 * خروجی: آرایه‌ای از shapeهای آماده برای pin
 */
export function buildShapeFromPoints(points, opts = {}) {
  const type = opts.type || (points.length >= 3 ? "polygon" : "polyline");
  const positions = points.map((p) => ({ lon: p.lon, lat: p.lat, height: 0 }));
  if (
    type === "polygon" &&
    positions.length > 2 &&
    positions[0].lon === positions[positions.length - 1].lon &&
    positions[0].lat === positions[positions.length - 1].lat
  ) {
    positions.pop();
  }
  return {
    type,
    positions,
    color: opts.color || "#ff0000",
    outlineColor: opts.color || "#ff0000",
    opacity: 0.7,
    width: 3,
    show: true,
  };
}

export function groupCsvRowsBy (csv, key) {
  if (!csv || !csv.headers) return null;
  const idx = findColumn(csv.headers, [key, "name", "نام", "label", "عنوان"]);
  if (idx === -1) return null;
  const groups = new Map();
  for (const r of csv.rows) {
    const name = String(r[idx] || "").trim() || "بی‌نام";
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(r.map((c) => Number(String(c).replace(",", "."))));
  }
  return groups;
}