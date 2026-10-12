// کمک‌توابع مشترک کار با لیست ترسیم‌ها (pins).
// قانون: در هر لحظه فقط «یک» ترسیم برای کروکی انتخاب است (رادیو، نه چک‌باکس).
// عمداً بدون import از ماژول‌های دیگر تا چرخه import یا کش قدیمی dev-server
// خطای export ندهد.

export function flattenPins(list) {
  const out = [];
  for (const p of list || []) {
    if (p && p.type === "group" && Array.isArray(p.children)) out.push(...flattenPins(p.children));
    else if (p) out.push(p);
  }
  return out;
}

// نمایش/مخفی‌سازی همه لایه‌های یک ترسیم (شکل + لیبل‌های شماره/طول/مجاورت) روی نقشه
export function setPinVisibleOnMap(map, pin, visible) {
  if (!map || typeof map.getStyle !== "function" || !pin?.shape) return;
  const sids = new Set(Array.isArray(pin.shape._sourceIds) ? pin.shape._sourceIds : []);
  if (!sids.size) {
    sids.add("draw-pin-" + pin.id);
    sids.add("file-" + pin.id);
  }
  for (const s of [...sids]) sids.add(s + "-labels");
  let layers = [];
  try {
    layers = map.getStyle().layers || [];
  } catch (e) {}
  for (const l of layers) {
    if (!sids.has(l.source)) continue;
    try {
      map.setLayoutProperty(l.id, "visibility", visible ? "visible" : "none");
    } catch (e) {}
  }
}

/**
 * فقط ترسیم با شناسه داده‌شده انتخاب می‌ماند؛ بقیه غیرفعال و از نقشه مخفی می‌شوند.
 * اگر map داده شود، نمایش لایه‌ها هم همگام می‌شود.
 */
export function selectOnlyPin(pins, id, map = null) {
  const flat = flattenPins(pins);
  for (const p of flat) {
    const on = String(p.id) === String(id);
    p.selected = on;
    if (p.shape) p.shape.show = on;
    if (map) {
      try {
        setPinVisibleOnMap(map, p, on);
      } catch (e) {}
    }
  }
}

/** نرمال‌سازی: اگر چند ترسیم انتخاب‌اند، فقط آخری می‌ماند (اگر هیچ‌کدام، اولی) */
export function normalizeSingleSelection(pins) {
  const flat = flattenPins(pins);
  if (!flat.length) return;
  let keep = null;
  for (let i = flat.length - 1; i >= 0; i--) {
    if (flat[i].selected !== false) {
      keep = flat[i];
      break;
    }
  }
  if (!keep) keep = flat[0];
  for (const p of flat) {
    const on = p === keep;
    p.selected = on;
    if (p.shape) p.shape.show = on;
  }
}
