import proj4 from "proj4";

export function measureDistance([lng1, lat1], [lng2, lat2]) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(meters) {
  if (meters < 1) return (meters * 100).toFixed(0) + " cm";
  if (meters >= 1000) return (meters / 1000).toFixed(2) + " km";
  return meters.toFixed(2) + " m";
}

export function formatArea(squareMeters) {
  return squareMeters.toFixed(2) + " متر مربع";
}

export function formatVertexLabel(lng, lat, coordinateSystem) {
  if (coordinateSystem === "utm") {
    const zone = Math.floor((lng + 180) / 6) + 1;
    const hemisphere = lat >= 0 ? "" : "+south";
    const [x, y] = proj4(
      "EPSG:4326",
      `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs${hemisphere}`,
      [lng, lat],
    );
    return `${x.toFixed(2)}, ${y.toFixed(2)}`;
  }
  return `${lng.toFixed(6)}, ${lat.toFixed(6)}`;
}

export function fromUTM(easting, northing, zone, northern = true) {
  const hemisphere = northern ? "" : "+south";
  const [lng, lat] = proj4(
    `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs${hemisphere}`,
    "EPSG:4326",
    [Number(easting), Number(northing)],
  );
  return { lng, lat };
}

export function computeCentroid(positions) {
  if (!positions || positions.length < 3) return null;

  const valid = positions
    .map((p) => ({
      lon: Number(p.lon ?? p.lng),
      lat: Number(p.lat),
    }))
    .filter((p) => Number.isFinite(p.lon) && Number.isFinite(p.lat));

  if (valid.length < 3) return null;

  // Use one local UTM zone and translate the projected coordinates so the
  // shoelace calculation does not subtract very large, nearly equal numbers.
  const meanLon = valid.reduce((s, p) => s + p.lon, 0) / valid.length;
  const meanLat = valid.reduce((s, p) => s + p.lat, 0) / valid.length;
  const zone = Math.floor((meanLon + 180) / 6) + 1;
  const hemisphere = meanLat >= 0 ? "" : "+south";
  const proj = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs${hemisphere}`;

  const projected = valid.map((p) => {
    const [x, y] = proj4("EPSG:4326", proj, [p.lon, p.lat]);
    return { x, y };
  });

  const origin = projected[0];
  const pts = projected.map((p) => ({
    x: p.x - origin.x,
    y: p.y - origin.y,
  }));

  let twiceArea = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const cross = a.x * b.y - b.x * a.y;
    twiceArea += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }

  if (Math.abs(twiceArea) < 1e-9) return null;

  const x = origin.x + cx / (3 * twiceArea);
  const y = origin.y + cy / (3 * twiceArea);
  const [lon, lat] = proj4(proj, "EPSG:4326", [x, y]);

  return { lon, lat, lng: lon };
}

export function getDrawTypeName(type, isEditing) {
  if (isEditing) {
    const names = {
      polygon: "ویرایش پلیگن",
      polyline: "ویرایش خط",
      multi_point: "ویرایش چند نقطه",
      point: "ویرایش نقطه",
      rectangle: "ویرایش مستطیل",
    };
    return names[type] || "ویرایش ترسیم";
  }
  const names = {
    polygon: "ترسیم پلیگن جدید",
    polyline: "ترسیم خط جدید",
    multi_point: "ترسیم چند نقطه جدید",
    rectangle: "ترسیم مستطیل جدید",
  };
  return names[type] || "ترسیم جدید";
}

export function toUTM(lon, lat) {
  const zone = Math.floor((lon + 180) / 6) + 1;
  const [x, y] = proj4(
    "EPSG:4326",
    `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`,
    [lon, lat],
  );
  return { x, y, zone };
}

export function toUTMInZone(lon, lat, zone, northern = true) {
  const hemisphere = northern ? "" : "+south";
  const [x, y] = proj4(
    "EPSG:4326",
    `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs${hemisphere}`,
    [lon, lat],
  );
  return { x, y };
}

export function computeCircleCoords(center, radius) {
  const coords = [];
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * 2 * Math.PI;
    const rLat = center.lat + (radius / 110540) * Math.sin(angle);
    const rLng =
      center.lng +
      (radius / (111319.9 * Math.cos((center.lat * Math.PI) / 180))) *
        Math.cos(angle);
    coords.push([rLng, rLat]);
  }
  coords.push(coords[0]);
  return coords;
}
