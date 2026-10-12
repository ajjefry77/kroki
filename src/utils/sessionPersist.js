// ذخیره‌سازی محلی وضعیت ترسیم تا با رفرش صفحه اطلاعات پاک نشود.
// شامل: ترسیم‌های ذخیره‌شده (pins)، پیش‌نویس در حال ترسیم (حتی ناقص)، فرم و مرحله ویزارد.

const PINS_KEY = "kroki.pins.v1";
const DRAFT_KEY = "kroki.draft.v1";
const WIZARD_KEY = "kroki.wizard.v1";
const VIEW_KEY = "kroki.mapview.v1";
const GEN_KEY = "kroki.gen.v1";

function safeGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function safeSet(key, value) {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {}
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {}
}

// _sourceIds شناسه لایه‌های mapbox است و نباید ذخیره شود
function sanitizeShape(shape) {
  if (!shape) return null;
  try {
    const raw = JSON.parse(JSON.stringify(shape));
    delete raw._sourceIds;
    return raw;
  } catch (e) {
    return null;
  }
}

export function sanitizePin(pin) {
  if (!pin) return null;
  try {
    const copy = JSON.parse(
      JSON.stringify(pin, (k, v) => (k === "_sourceIds" ? undefined : v)),
    );
    return copy;
  } catch (e) {
    return null;
  }
}

// ---------- pins ----------
export function loadPins() {
  const arr = safeGet(PINS_KEY);
  if (!Array.isArray(arr)) return [];
  // فقط ترسیم‌های معتبر را برگردان
  return arr.filter((p) => p && p.id && p.shape);
}

export function savePins(pins) {
  try {
    const arr = (Array.isArray(pins) ? pins : []).map(sanitizePin).filter(Boolean);
    safeSet(PINS_KEY, arr);
  } catch (e) {}
}

export function clearPins() {
  safeRemove(PINS_KEY);
}

// ---------- draft (پیش‌نویس در حال ترسیم، حتی ناقص) ----------
export function loadDraft() {
  const d = safeGet(DRAFT_KEY);
  if (!d || typeof d !== "object") return null;
  const hasPositions = Array.isArray(d.positions) && d.positions.length > 0;
  const hasShape =
    d.shape && typeof d.shape === "object" && d.shape.type;
  if (!hasPositions && !hasShape) return null;
  return {
    drawMode: typeof d.drawMode === "string" ? d.drawMode : "",
    positions: Array.isArray(d.positions) ? d.positions : [],
    shape: d.shape || null,
    formData: d.formData || null,
    color: typeof d.color === "string" ? d.color : "#ff0000",
    showForm: !!d.showForm,
    savedAt: d.savedAt || 0,
  };
}

export function saveDraft(draft) {
  try {
    if (
      !draft ||
      ((!(draft.positions && draft.positions.length)) && !draft.shape)
    ) {
      safeRemove(DRAFT_KEY);
      return;
    }
    safeSet(DRAFT_KEY, {
      drawMode: draft.drawMode || "",
      positions: draft.positions || [],
      shape: sanitizeShape(draft.shape),
      formData: draft.formData || null,
      color: draft.color || "#ff0000",
      showForm: !!draft.showForm,
      savedAt: Date.now(),
    });
  } catch (e) {}
}

export function clearDraft() {
  safeRemove(DRAFT_KEY);
}

// ---------- wizard (فرم اطلاعات + قالب + مرحله) ----------
export function loadWizard() {
  const w = safeGet(WIZARD_KEY);
  if (!w || typeof w !== "object") return null;
  return w;
}

export function saveWizard(wizard) {
  try {
    if (!wizard) {
      safeRemove(WIZARD_KEY);
      return;
    }
    safeSet(WIZARD_KEY, { ...wizard, savedAt: Date.now() });
  } catch (e) {}
}

export function clearWizard() {
  safeRemove(WIZARD_KEY);
}

// ---------- map viewport ----------
export function loadMapView() {
  const v = safeGet(VIEW_KEY);
  if (!v || typeof v !== "object") return null;
  const lng = Number(v.lng);
  const lat = Number(v.lat);
  const zoom = Number(v.zoom);
  if (!isFinite(lng) || !isFinite(lat) || !isFinite(zoom)) return null;
  return { lng, lat, zoom };
}

export function saveMapView(view) {
  try {
    if (!view) return;
    safeSet(VIEW_KEY, view);
  } catch (e) {}
}

export function clearAllSession() {
  clearPins();
  clearDraft();
  clearWizard();
  clearGen();
}

// ---------- gen (نتیجه محاسبه‌شده پیش‌نمایش) ----------
// state محاسبه‌شده کروکی را نگه می‌داریم تا رفرش در مرحله پیش‌نمایش/پرداخت
// صفحه را خالی نکند. mapImage (دیتاURL تصویر ماهواره) ممکن است حجیم باشد؛
// اگر جا نشد، بدون آن ذخیره می‌کنیم تا بقیه پیش‌نمایش برگردد.
export function loadGen() {
  const g = safeGet(GEN_KEY);
  if (!g || typeof g !== "object") return null;
  if (!g.state || typeof g.state !== "object") return null;
  if (!g.state.ready) return null;
  const pts = g.state.utmPoints;
  if (!Array.isArray(pts) || pts.length < 2) return null;
  return g;
}

export function saveGenSnapshot(snap) {
  if (!snap || !snap.state || !snap.state.ready) return;
  const st = snap.state;
  const base = {
    state: {
      utmPoints: st.utmPoints || [],
      areaM2: st.areaM2 || 0,
      utmZone: st.utmZone ?? null,
      centerUtm: st.centerUtm || null,
      shapeCentroids: st.shapeCentroids || [],
      edgeTexts: st.edgeTexts || [],
      selectedShapesMeta: st.selectedShapesMeta || [],
      templateId: st.templateId || "technical",
      orientation: st.orientation || "portrait",
      styleOverrides: st.styleOverrides || {},
      mapImage: st.mapImage || "",
      ready: true,
      errorMsg: "",
    },
    form: snap.form ? { ...snap.form } : {},
    templateId: snap.templateId || st.templateId || "technical",
    savedAt: Date.now(),
  };
  try {
    safeSet(GEN_KEY, base);
    return;
  } catch (e) {}
  // اگر جا نشد (سهمیه localStorage)، بدون تصویر ماهواره دوباره تلاش کن
  try {
    base.state.mapImage = "";
    safeSet(GEN_KEY, base);
  } catch (e2) {}
}

export function clearGen() {
  safeRemove(GEN_KEY);
}
