// فرم پیش‌فرض و بازگردانی پیش‌نویس کروکی ذخیره‌شده در سرور.
// (خارج‌شده از App.vue تا واحد test‌پذیر و قابل استفاده‌ی مجدد باشد)
import { getTodayJalali } from "./jalali";
import { normalizeSingleSelection } from "./pins";

// فرم خالی پیش‌فرض برای پاک‌سازی حافظه بعد پرداخت
export function defaultKrokiForm() {
  return {
    title: "پلان وضعیت موجود",
    client: "",
    clientPhone: "",
    clientNationalId: "",
    address: "",
    city: "",
    date: getTodayJalali(),
    surveyor: "",
    plaque: "",
    streetWidth: "",
    initialSurveyType: "",
    logo: "",
    description: "",
  };
}

// ادغام ایمن فرم ذخیره‌شده با مقادیر پیش‌فرض (فیلد missing یا undefined را
// با پیش‌فرض پر می‌کند — همان رفتار `??` قبلی)
export function mergeForm(savedForm) {
  const base = defaultKrokiForm();
  if (!savedForm || typeof savedForm !== "object") return base;
  for (const key of Object.keys(base)) {
    if (savedForm[key] !== undefined && savedForm[key] !== null) {
      base[key] = savedForm[key];
    }
  }
  return base;
}

// فرم اطلاعات از روی کروکی سرور
export function formFromSavedKroki(k) {
  return {
    title: k?.title ?? "پلان وضعیت موجود",
    client: k?.client_name ?? "",
    clientPhone: k?.client_phone ?? "",
    clientNationalId: k?.client_national_id ?? "",
    address: k?.address ?? "",
    city: k?.city ?? "",
    date: k?.survey_date || getTodayJalali(),
    surveyor: k?.surveyor ?? "",
    plaque: k?.plaque ?? "",
    streetWidth: k?.street_width ?? "",
    initialSurveyType: k?.initial_survey_type ?? "",
    logo: k?.logo_url ?? "",
    description: k?.description ?? "",
  };
}

// ترسیم‌های یک کروکی ذخیره‌شده را برای ویزارد بازمی‌گرداند
export function pinsFromSavedKroki(k) {
  const out = [];
  try {
    const dd = k?.drawing_data;
    if (Array.isArray(dd) && dd.length) {
      for (const p of dd) {
        if (!p || !p.shape) continue;
        let copy = null;
        try {
          copy = JSON.parse(JSON.stringify(p));
        } catch {
          continue;
        }
        if (copy.shape) delete copy.shape._sourceIds;
        copy.selected = copy.selected !== false;
        if (!copy.id) copy.id = crypto.randomUUID();
        if (!copy.type) copy.type = "draw";
        out.push(copy);
      }
      if (out.length) {
        // تک‌انتخابی
        try {
          normalizeSingleSelection(out);
        } catch {}
        return out;
      }
    }
    // fallback قدیمی: فقط مختصات تخت
    const pts = Array.isArray(k?.geometry_points) ? k.geometry_points : [];
    const positions = pts
      .map((p) => ({
        lon: Number(p.lon ?? p.lng ?? p.x),
        lat: Number(p.lat ?? p.y),
        height: 0,
      }))
      .filter((p) => Number.isFinite(p.lon) && Number.isFinite(p.lat));
    if (positions.length >= 2) {
      out.push({
        id: crypto.randomUUID(),
        name: k?.title || "کروکی بازیابی‌شده",
        descr: "",
        shape: {
          type: "polygon",
          positions,
          color: "#ff0000",
          outlineColor: "#ff0000",
          opacity: 0.7,
          width: 3,
          show: true,
        },
        date: new Date(),
        save: -1,
        type: "draw",
        selected: true,
      });
    }
  } catch {}
  return out;
}
