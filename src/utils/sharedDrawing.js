import { flattenPins, selectOnlyPin } from "./pins.js";
import { sharedDrawingKey } from "./sharedMapLink.js";

// Called only after the map style and drawing API are ready. The persistent
// import key prevents duplicates after reload/remount while keeping user edits.
export function restoreSharedDrawing({ map, pins, shared, renderPin }) {
  const key = sharedDrawingKey(shared);
  if (!key) return null;
  const polygon = shared.polygon.length >= 3;
  let pin = flattenPins(pins).find((p) => p.sharedLinkKey === key);
  const created = !pin;
  if (!pin) {
    const positions = (polygon ? shared.polygon : [shared.point]).map((p) => ({ lon: p.lng, lat: p.lat, color: "#ff0000" }));
    pin = {
      id: "shared-link-" + crypto.randomUUID(),
      sharedLinkKey: key,
      name: "ترسیم ارسال‌شده", date: new Date(), save: -1, type: "draw", selected: true,
      shape: {
        type: polygon ? "polygon" : "point", positions,
        ...(polygon ? {} : { lon: shared.point.lng, lat: shared.point.lat }),
        color: "#ff0000", outlineColor: "#ff0000", opacity: 0.7, width: 3, show: true,
      },
    };
  }
  renderPin(map, pin);
  if (created) pins.push(pin);
  selectOnlyPin(pins, pin.id, map);
  // Bounds use the current geometry, including edits made since import.
  const positions = pin.shape.positions;
  map.resize();
  if (polygon) {
    const bounds = positions.reduce(([min, max], p) => [
      [Math.min(min[0], p.lon), Math.min(min[1], p.lat)],
      [Math.max(max[0], p.lon), Math.max(max[1], p.lat)],
    ], [[Infinity, Infinity], [-Infinity, -Infinity]]);
    map.fitBounds(bounds, { padding: 60, maxZoom: 19.5, duration: 0 });
  } else {
    map.setCenter([pin.shape.lon, pin.shape.lat]);
    map.setZoom(Math.max(map.getZoom(), 16));
  }
  return pin;
}
