// Shared URL contract with mapiq: lng,lat pairs separated by semicolons.
// Keep this module independent of components, authentication and storage.
export const MAP_QUERY_KEYS = ["lat", "lng", "lon", "zoom", "z", "point", "polygon", "tool", "map"];

export function pickMapQuery(query) {
  if (query.map != null) return { map: query.map };
  return Object.fromEntries(MAP_QUERY_KEYS.filter((key) => key in query).map((key) => [key, query[key]]));
}

export function sharedMapQuery(location = window.location) {
  const params = new URLSearchParams(location.search || "");
  const hash = location.hash || "";
  const index = hash.indexOf("?");
  // The active hash route takes precedence over legacy search parameters.
  if (index >= 0) {
    for (const [key, value] of new URLSearchParams(hash.slice(index + 1))) params.set(key, value);
  }
  return pickMapQuery(Object.fromEntries(params));
}

function number(value, min, max) {
  if (value == null || String(value).trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

function coordinate(value) {
  if (typeof value !== "string") return null;
  const parts = value.split(",");
  if (parts.length !== 2) return null;
  const lng = number(parts[0], -180, 180);
  const lat = number(parts[1], -90, 90);
  return lng == null || lat == null ? null : { lng, lat };
}

export function parseSharedMapQuery(query) {
  const raw = query.polygon;
  let polygon = typeof raw === "string" && raw ? raw.split(";").map(coordinate) : [];
  // Reject the entire malformed polygon instead of silently changing its boundary.
  if (polygon.some((p) => !p)) polygon = [];
  if (polygon.length > 1 && JSON.stringify(polygon[0]) === JSON.stringify(polygon.at(-1))) polygon.pop();
  if (new Set(polygon.map((p) => `${p.lng},${p.lat}`)).size < 3) polygon = [];
  return {
    lat: number(query.lat, -90, 90),
    lng: number(query.lng ?? query.lon, -180, 180),
    zoom: number(query.zoom ?? query.z, 0, 24),
    point: coordinate(query.point),
    polygon,
    tool: typeof query.tool === "string" ? query.tool : "",
  };
}

export function sharedDrawingKey(shared) {
  if (shared.polygon.length >= 3) return JSON.stringify(["polygon", shared.polygon]);
  return shared.point ? JSON.stringify(["point", shared.point]) : "";
}

export function updateSharedMapUrl(href, state = {}) {
  const url = new URL(href);
  const index = url.hash.indexOf("?");
  const base = (index >= 0 ? url.hash.slice(0, index) : url.hash) || "#/";
  const params = new URLSearchParams(index >= 0 ? url.hash.slice(index + 1) : "");
  // A viewport update must never erase incoming geometry. Explicit null clears it.
  for (const [key, value] of Object.entries(sharedMapQuery(url))) if (!params.has(key)) params.set(key, value);
  if (params.has("map")) {
    // An encrypted handoff must never leak the camera or geometry back into URL.
    for (const key of MAP_QUERY_KEYS) if (key !== "map") params.delete(key);
    for (const key of MAP_QUERY_KEYS) url.searchParams.delete(key);
    url.hash = base + `?${params}`;
    return url;
  }
  for (const key of ["lat", "lng", "zoom"]) {
    if (!(key in state)) continue;
    params.delete(key === "lng" ? "lon" : key === "zoom" ? "z" : key);
    params.delete(key);
    if (Number.isFinite(state[key])) params.set(key, state[key].toFixed(key === "zoom" ? 2 : 6));
  }
  for (const key of ["point", "polygon", "tool"]) {
    if (!(key in state)) continue;
    params.delete(key);
    const value = state[key];
    if (key === "tool" && value) params.set(key, value);
    if (key === "point" && value) params.set(key, `${value.lng},${value.lat}`);
    if (key === "polygon" && value?.length) params.set(key, value.map((p) => `${p.lng},${p.lat}`).join(";"));
  }
  // Migrate legacy search map parameters so they cannot override later updates.
  for (const key of MAP_QUERY_KEYS) url.searchParams.delete(key);
  url.hash = base + (params.size ? `?${params}` : "");
  return url;
}
