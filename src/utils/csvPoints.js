import { fromUTM } from "./useDrawingHelpers";

const ALIASES = {
  lat: ["lat", "latitude", "عرض", "y"],
  lng: ["lng", "lon", "long", "longitude", "طول", "x"],
  name: ["name", "نام", "point", "code"],
  utmX: ["x", "easting", "east", "شرقی"],
  utmY: ["y", "northing", "north", "شمالی"],
  utmZone: ["zone", "zon", "z", "utm zone", "منطقه"],
  hrms: ["hrms", "h_rms"],
  vrms: ["vrms", "v_rms"],
  pdop: ["pdop"],
  age: ["age"],
  stat: ["stat", "status", "fix"],
};

function detectDelimiter(line) {
  if (line.includes(";")) return ";";
  if (line.includes("\t")) return "\t";
  return ",";
}

function splitLine(line, delim) {
  return line.split(delim).map((c) => c.trim().replace(/^"|"$/g, ""));
}

function rowLooksLikeHeader(cols) {
  if (!cols.length) return false;
  const numeric = cols.filter((c) => c !== "" && !Number.isNaN(Number(c))).length;
  return numeric < cols.length * 0.6;
}

/** @returns {{ columns: string[], rows: Record<string, string>[], delimiter: string }} */
export function parseCsvToTable(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return { columns: [], rows: [], delimiter: "," };

  const delimiter = detectDelimiter(lines[0]);
  const first = splitLine(lines[0], delimiter);
  const hasHeader = rowLooksLikeHeader(first);
  const columns = hasHeader
    ? first
    : first.map((_, i) => `Column${i + 1}`);
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const rows = dataLines.map((line) => {
    const cols = splitLine(line, delimiter);
    const row = {};
    columns.forEach((col, i) => {
      row[col] = cols[i] ?? "";
    });
    return row;
  });

  return { columns, rows, delimiter };
}

function findColumn(columns, keys) {
  const lower = keys.map((k) => k.toLowerCase());
  return columns.find((col) => lower.includes(String(col).trim().toLowerCase())) || "";
}

/** @returns {Record<string, string>} */
export function autoDetectCsvMapping(columns) {
  return {
    lat: findColumn(columns, ALIASES.lat),
    lng: findColumn(columns, ALIASES.lng),
    name: findColumn(columns, ALIASES.name),
    utmX: findColumn(columns, ALIASES.utmX),
    utmY: findColumn(columns, ALIASES.utmY),
    utmZone: findColumn(columns, ALIASES.utmZone),
    hrms: findColumn(columns, ALIASES.hrms),
    vrms: findColumn(columns, ALIASES.vrms),
    pdop: findColumn(columns, ALIASES.pdop),
    age: findColumn(columns, ALIASES.age),
    stat: findColumn(columns, ALIASES.stat),
  };
}

export function validateLatLon(lat, lng) {
  const errors = [];
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.push("Latitude");
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) errors.push("Longitude");
  return { valid: errors.length === 0, errors };
}

/**
 * @param {Record<string, string>[]} rows
 * @param {{
 *   mode: 'latlon' | 'utm',
 *   lat: string, lng: string, name: string,
 *   utmX: string, utmY: string, utmZone: string,
 *   validateGps: boolean,
 * }} opts
 */
export function mapCsvRowsToPoints(rows, opts) {
  const invalidRows = [];
  const points = [];

  rows.forEach((row, index) => {
    let lat;
    let lng;
    let name = opts.name ? String(row[opts.name] || "").trim() : "";

    if (opts.mode === "utm") {
      const easting = parseFloat(row[opts.utmX]);
      const northing = parseFloat(row[opts.utmY]);
      const zone = parseInt(row[opts.utmZone], 10);
      if (
        !Number.isFinite(easting) ||
        !Number.isFinite(northing) ||
        !Number.isFinite(zone) ||
        zone < 1 ||
        zone > 60
      ) {
        invalidRows.push({ rowIndex: index + 1, errors: ["UTM"] });
        return;
      }
      const ll = fromUTM(easting, northing, zone, true);
      lat = ll.lat;
      lng = ll.lng;
    } else {
      lat = Number(row[opts.lat]);
      lng = Number(row[opts.lng]);
    }

    let result = validateLatLon(lat, lng);
    if (!result.valid) {
      invalidRows.push({ rowIndex: index + 1, errors: result.errors });
      if (opts.validateGps) return;
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    points.push({
      lat,
      lon: lng,
      name,
      valid: result.valid,
      gps: {
        hrms: opts.hrms ? row[opts.hrms] : "",
        vrms: opts.vrms ? row[opts.vrms] : "",
        pdop: opts.pdop ? row[opts.pdop] : "",
        age: opts.age ? row[opts.age] : "",
        stat: opts.stat ? row[opts.stat] : "",
      },
    });
  });

  return { points, invalidRows };
}

/** Legacy one-shot parser (fixed headers) — kept for tests / fallback */
export function parseCsv(text) {
  const { columns, rows } = parseCsvToTable(text);
  const m = autoDetectCsvMapping(columns);
  const utmReady = m.utmX && m.utmY && m.utmZone;
  const latlonReady = m.lat && m.lng;
  if (!utmReady && !latlonReady) return [];
  const { points } = mapCsvRowsToPoints(rows, {
    mode: utmReady && !latlonReady ? "utm" : "latlon",
    lat: m.lat,
    lng: m.lng,
    name: m.name,
    utmX: m.utmX,
    utmY: m.utmY,
    utmZone: m.utmZone,
    validateGps: false,
    hrms: "",
    vrms: "",
    pdop: "",
    age: "",
    stat: "",
  });
  return points.map((p) => ({ lat: p.lat, lon: p.lon, name: p.name }));
}
