<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6" style="background: rgba(11, 21, 36, 0.55)" @click.self="$emit('close')">
    <div class="card !rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
      <!-- سربرگ -->
      <div class="flex items-start justify-between gap-3 mb-4">
        <div class="min-w-0">
          <div class="font-extrabold text-base truncate">{{ full?.title || kroki?.title || "کروکی" }}</div>
          <div class="flex flex-wrap items-center gap-2 mt-1.5">
            <span class="text-[11px] font-bold text-[var(--accent-soft)]" dir="ltr">{{ full?.tracking_code || kroki?.tracking_code }}</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold" :class="statusClass">{{ statusLabel }}</span>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm shrink-0" @click="$emit('close')">
          <i class="fas fa-xmark"></i>
        </button>
      </div>

      <!-- تب‌ها -->
      <div class="flex gap-1 bg-[var(--surface2)] rounded-lg p-1 border border-[var(--border)] mb-4">
        <button
          type="button"
          class="flex-1 py-1.5 rounded-md text-xs font-semibold transition flex items-center justify-center gap-1.5"
          :class="tab === 'download'
            ? 'bg-[var(--surface)] text-[var(--accent)] shadow-sm border border-[var(--border)]'
            : 'text-[var(--text-muted)] hover:text-[var(--text)]'"
          @click="tab = 'download'"
        >
          <i class="fas fa-download"></i>
          دانلود مجدد
        </button>
        <button
          type="button"
          class="flex-1 py-1.5 rounded-md text-xs font-semibold transition flex items-center justify-center gap-1.5"
          :class="tab === 'edit'
            ? 'bg-[var(--surface)] text-[var(--accent)] shadow-sm border border-[var(--border)]'
            : 'text-[var(--text-muted)] hover:text-[var(--text)]'"
          @click="tab = 'edit'"
        >
          <i class="fas fa-pen"></i>
          ویرایش اطلاعات
        </button>
      </div>

      <!-- حالت بارگذاری / خطا -->
      <div v-if="loading" class="py-14 flex flex-col items-center gap-3 text-[var(--text-muted)]">
        <i class="fas fa-circle-notch fa-spin text-2xl text-[var(--accent)]"></i>
        <span class="text-sm">در حال بازیابی کروکی...</span>
      </div>
      <div v-else-if="loadError" class="py-10 text-center">
        <i class="fas fa-triangle-exclamation text-3xl text-[var(--danger)] mb-3"></i>
        <p class="text-sm text-[var(--danger)]">{{ loadError }}</p>
        <button class="btn btn-secondary btn-sm mt-4" @click="reload">
          <i class="fas fa-rotate-right ml-1"></i>
          تلاش مجدد
        </button>
      </div>

      <template v-else>
        <!-- تب دانلود -->
        <div v-show="tab === 'download'">
          <div v-if="!genReady" class="py-10 flex flex-col items-center gap-3 text-[var(--text-muted)]">
            <i class="fas fa-circle-notch fa-spin text-2xl text-[var(--accent)]"></i>
            <span class="text-sm">در حال آماده‌سازی پیش‌نمایش...</span>
          </div>
          <template v-else>
            <div class="rounded-xl overflow-hidden border border-[var(--border)] bg-white mb-3">
              <canvas ref="sketchRef" class="w-full h-auto block" :width="canvasW" :height="canvasH"></canvas>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] mb-4">
              <div class="rounded-lg bg-[var(--surface2)] border border-[var(--border)] px-3 py-2 text-center">
                <div class="text-[var(--text-faint)]">مساحت</div>
                <div class="font-bold mt-0.5">{{ areaText }}</div>
              </div>
              <div class="rounded-lg bg-[var(--surface2)] border border-[var(--border)] px-3 py-2 text-center">
                <div class="text-[var(--text-faint)]">نقاط</div>
                <div class="font-bold mt-0.5">{{ pointsCount }}</div>
              </div>
              <div class="rounded-lg bg-[var(--surface2)] border border-[var(--border)] px-3 py-2 text-center">
                <div class="text-[var(--text-faint)]">قالب</div>
                <div class="font-bold mt-0.5 truncate">{{ templateName }}</div>
              </div>
              <div class="rounded-lg bg-[var(--surface2)] border border-[var(--border)] px-3 py-2 text-center">
                <div class="text-[var(--text-faint)]">تاریخ</div>
                <div class="font-bold mt-0.5">{{ full?.survey_date || "—" }}</div>
              </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button class="btn btn-secondary btn-sm" @click="dlSketch">
                <i class="fas fa-drafting-compass ml-1"></i> کروکی PNG
              </button>
              <button class="btn btn-secondary btn-sm" :disabled="!hasMapImage" @click="dlMap">
                <i class="fas fa-satellite ml-1"></i> نقشه PNG
              </button>
              <button class="btn btn-secondary btn-sm" @click="dlPdf">
                <i class="fas fa-file-pdf ml-1"></i> PDF / چاپ
              </button>
              <button class="btn btn-secondary btn-sm" @click="dlKml">
                <i class="fas fa-globe ml-1"></i> KML
              </button>
              <button class="btn btn-secondary btn-sm" @click="dlDxf">
                <i class="fas fa-draw-polygon ml-1"></i> DXF
              </button>
              <button v-if="isDraft" class="btn btn-primary btn-sm" @click="$emit('editDrawing', full)">
                <i class="fas fa-pen ml-1"></i> ویرایش ترسیم
              </button>
            </div>
            <p v-if="!isDraft" class="text-[10px] text-[var(--text-faint)] mt-3 leading-5">
              این کروکی پرداخت و صادر شده است؛ ترسیم آن قفل است ولی اطلاعات متنی از تب «ویرایش اطلاعات» قابل تغییر است.
            </p>
            <p v-if="!hasMapImage" class="text-[10px] text-[var(--warning)] mt-2 leading-5">
              <i class="fas fa-circle-info ml-1"></i>
              تصویر ماهواره‌ای برای این کروکی ذخیره نشده است (کروکی‌های ثبت‌شده قبل از این به‌روزرسانی عکس ندارند)؛ بقیه خروجی‌ها کامل است.
            </p>
          </template>
        </div>

        <!-- تب ویرایش -->
        <div v-show="tab === 'edit'">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block mb-1 text-[11px] font-medium">عنوان *</label>
              <input v-model="editForm.title" type="text" class="input !py-2 !text-xs" />
            </div>
            <div>
              <label class="block mb-1 text-[11px] font-medium">تاریخ برداشت</label>
              <input v-model="editForm.survey_date" type="text" class="input !py-2 !text-xs" dir="ltr" />
            </div>
            <div>
              <label class="block mb-1 text-[11px] font-medium">متقاضی *</label>
              <input v-model="editForm.client_name" type="text" class="input !py-2 !text-xs" />
            </div>
            <div>
              <label class="block mb-1 text-[11px] font-medium">شماره همراه</label>
              <input v-model="editForm.client_phone" type="text" class="input !py-2 !text-xs text-center" dir="ltr" maxlength="11" />
            </div>
            <div>
              <label class="block mb-1 text-[11px] font-medium">کد ملی</label>
              <input v-model="editForm.client_national_id" type="text" class="input !py-2 !text-xs text-center" dir="ltr" maxlength="10" />
            </div>
            <div>
              <label class="block mb-1 text-[11px] font-medium">کارشناس</label>
              <input v-model="editForm.surveyor" type="text" class="input !py-2 !text-xs" />
            </div>
            <div>
              <label class="block mb-1 text-[11px] font-medium">پلاک ثبتی</label>
              <input v-model="editForm.plaque" type="text" class="input !py-2 !text-xs" />
            </div>
            <div>
              <label class="block mb-1 text-[11px] font-medium">شهر</label>
              <input v-model="editForm.city" type="text" class="input !py-2 !text-xs" />
            </div>
            <div class="sm:col-span-2">
              <label class="block mb-1 text-[11px] font-medium">نشانی</label>
              <input v-model="editForm.address" type="text" class="input !py-2 !text-xs" />
            </div>
            <div>
              <label class="block mb-1 text-[11px] font-medium">عرض معبر</label>
              <input v-model="editForm.street_width" type="text" class="input !py-2 !text-xs" />
            </div>
            <div>
              <label class="block mb-1 text-[11px] font-medium">نوع برداشت اولیه</label>
              <input v-model="editForm.initial_survey_type" type="text" class="input !py-2 !text-xs" />
            </div>
            <div class="sm:col-span-2">
              <label class="block mb-1 text-[11px] font-medium">توضیحات</label>
              <textarea v-model="editForm.description" rows="2" class="input !py-2 !text-xs resize-none"></textarea>
            </div>
          </div>
          <div v-if="saveMsg" class="mt-3 rounded-xl px-4 py-2.5 text-xs font-medium" :class="saveOk ? 'bg-[var(--success-glow)] border border-[var(--success)]/30 text-[var(--success)]' : 'bg-[var(--danger-glow)] border border-[var(--danger)]/30 text-[var(--danger)]'">
            {{ saveMsg }}
          </div>
          <div class="flex items-center justify-end gap-2 mt-4">
            <button v-if="isDraft" class="btn btn-ghost btn-sm" @click="$emit('editDrawing', full)">
              <i class="fas fa-draw-polygon ml-1"></i>
              ویرایش ترسیم روی نقشه
            </button>
            <button class="btn btn-primary btn-sm" :disabled="saving || !editForm.title?.trim() || !editForm.client_name?.trim()" @click="saveEdit">
              <i v-if="saving" class="fas fa-circle-notch fa-spin ml-1"></i>
              <i v-else class="fas fa-save ml-1"></i>
              {{ saving ? "در حال ذخیره..." : "ذخیره تغییرات" }}
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from "vue";
import { auth } from "../stores/auth";
import { useKrokiGenerator } from "../composables/useKrokiGenerator";
import { getTemplate } from "../utils/templates";
import { canvasSizeForPoints } from "../utils/canvas";
import { makeExportFilename } from "../utils/jalali";
import { logger } from "../utils/logger";

const props = defineProps({
  kroki: { type: Object, required: true },
});
const emit = defineEmits(["close", "updated", "editDrawing"]);

const tab = ref("download");
const loading = ref(true);
const loadError = ref("");
const full = ref(null);
const genReady = ref(false);
const sketchRef = ref(null);
const canvasW = ref(700);
const canvasH = ref(700);
const saving = ref(false);
const saveMsg = ref("");
const saveOk = ref(true);

let gen = null;
let pinsArr = [];
let genForm = {};

const isDraft = computed(() => (full.value?.status || props.kroki?.status) === "draft");
const statusLabel = computed(() => {
  const s = full.value?.status || props.kroki?.status;
  if (s === "issued") return "صادر شده";
  if (s === "paid") return "پرداخت شده";
  return "پیش‌نویس";
});
const statusClass = computed(() => {
  const s = full.value?.status || props.kroki?.status;
  if (s === "issued") return "bg-[var(--success-glow)] text-[var(--success)]";
  if (s === "paid") return "bg-[var(--info-glow)] text-[var(--info)]";
  return "bg-[var(--warning-glow)] text-[var(--warning)]";
});
const areaText = computed(() => {
  const a = Number(full.value?.area_m2 ?? gen?.state?.areaM2 ?? 0);
  return (Number.isFinite(a) ? a.toFixed(2) : "0.00") + " متر مربع";
});
const pointsCount = computed(() => {
  try {
    return (gen?.state?.utmPoints || []).length || (full.value?.geometry_points || []).length;
  } catch (e) {
    return 0;
  }
});
const templateName = computed(() => {
  try {
    return getTemplate(full.value?.template_key || "technical")?.name || "";
  } catch (e) {
    return "";
  }
});
const hasMapImage = computed(() => !!(gen?.state?.mapImage || full.value?.map_image));

const editForm = reactive({
  title: "",
  survey_date: "",
  client_name: "",
  client_phone: "",
  client_national_id: "",
  surveyor: "",
  plaque: "",
  city: "",
  address: "",
  street_width: "",
  initial_survey_type: "",
  description: "",
});

function normalizePins(k) {
  const out = [];
  try {
    const dd = k?.drawing_data;
    if (Array.isArray(dd) && dd.length) {
      for (const p of dd) {
        if (!p || !p.shape) continue;
        const copy = JSON.parse(JSON.stringify(p));
        if (copy.shape) delete copy.shape._sourceIds;
        copy.selected = copy.selected !== false;
        if (!copy.id) copy.id = crypto.randomUUID();
        if (!copy.type) copy.type = "draw";
        if (Array.isArray(copy.shape?.positions)) {
          copy.shape.positions = copy.shape.positions
            .map((pt) => ({
              lon: Number(pt.lon ?? pt.lng ?? pt.x),
              lat: Number(pt.lat ?? pt.y),
              height: 0,
              ...(pt.color ? { color: pt.color } : {}),
            }))
            .filter((pt) => Number.isFinite(pt.lon) && Number.isFinite(pt.lat));
        }
        out.push(copy);
      }
      if (out.length) return out;
    }
    const pts = Array.isArray(k?.geometry_points) ? k.geometry_points : [];
    const positions = pts
      .map((p) => ({ lon: Number(p.lon ?? p.lng ?? p.x), lat: Number(p.lat ?? p.y), height: 0 }))
      .filter((p) => Number.isFinite(p.lon) && Number.isFinite(p.lat));
    if (positions.length >= 2) {
      out.push({
        id: crypto.randomUUID(),
        name: k?.title || "کروکی",
        descr: "",
        shape: { type: "polygon", positions, color: "#ff0000", outlineColor: "#ff0000", opacity: 0.7, width: 3, show: true },
        date: new Date(),
        save: -1,
        type: "draw",
        selected: true,
      });
    }
  } catch (e) {}
  return out;
}

function formForGen(k) {
  return {
    title: k?.title || "کروکی",
    client: k?.client_name || "",
    clientPhone: k?.client_phone || "",
    clientNationalId: k?.client_national_id || "",
    address: k?.address || "",
    city: k?.city || "",
    date: k?.survey_date || "",
    surveyor: k?.surveyor || "",
    plaque: k?.plaque || "",
    streetWidth: k?.street_width || "",
    initialSurveyType: k?.initial_survey_type || "",
    logo: k?.logo_url || "",
    description: k?.description || "",
  };
}

function fillEditForm(k) {
  editForm.title = k?.title || "";
  editForm.survey_date = k?.survey_date || "";
  editForm.client_name = k?.client_name || "";
  editForm.client_phone = k?.client_phone || "";
  editForm.client_national_id = k?.client_national_id || "";
  editForm.surveyor = k?.surveyor || "";
  editForm.plaque = k?.plaque || "";
  editForm.city = k?.city || "";
  editForm.address = k?.address || "";
  editForm.street_width = k?.street_width || "";
  editForm.initial_survey_type = k?.initial_survey_type || "";
  editForm.description = k?.description || "";
}

async function buildPreview() {
  genReady.value = false;
  try {
    gen = useKrokiGenerator();
    const key = full.value?.template_key || "technical";
    try {
      gen.setTemplate(key);
    } catch (e) {}
    if (full.value?.orientation === "landscape") {
      try {
        gen.setOrientation("landscape");
      } catch (e) {}
    }
    const so = full.value?.style_overrides;
    if (so && typeof so === "object") {
      for (const [kk, vv] of Object.entries(so)) {
        try {
          gen.setStyleOverride(kk, vv);
        } catch (e) {}
      }
    }
    const ok = await gen.computeGeometry(pinsArr, genForm);
    if (!ok) throw new Error(gen.state.errorMsg || "ترسیم معتبری یافت نشد");
    // مقادیر ذخیره‌شده (مجاورت‌های ویرایش‌شده در پیش‌نمایش + تصویر ماهواره)
    try {
      if (Array.isArray(full.value?.edge_texts) && full.value.edge_texts.length) {
        gen.state.edgeTexts = JSON.parse(JSON.stringify(full.value.edge_texts));
      }
    } catch (e) {}
    try {
      if (full.value?.map_image) gen.state.mapImage = full.value.map_image;
    } catch (e) {}
    const size = canvasSizeForPoints(gen.state.utmPoints);
    if (size) {
      canvasW.value = size.w;
      canvasH.value = size.h;
    }
    genReady.value = true;
    await nextTick();
    try {
      await document.fonts?.ready;
    } catch (e) {}
    try {
      if (sketchRef.value) gen.renderSketch(sketchRef.value);
    } catch (e) {}
  } catch (e) {
    loadError.value = e?.message || "خطا در بازیابی کروکی";
  }
}

async function reload() {
  loading.value = true;
  loadError.value = "";
  try {
    const res = await auth.getKroki(props.kroki?.id);
    if (!res.success) throw new Error(res.error);
    full.value = res.kroki;
    pinsArr = normalizePins(full.value);
    genForm = formForGen(full.value);
    fillEditForm(full.value);
    loading.value = false;
    await buildPreview();
  } catch (e) {
    loading.value = false;
    loadError.value = e?.message || "خطا در دریافت کروکی";
  }
}

async function saveEdit() {
  saveMsg.value = "";
  saving.value = true;
  try {
    const payload = {
      title: String(editForm.title || "").trim(),
      survey_date: String(editForm.survey_date || "").trim(),
      client_name: String(editForm.client_name || "").trim(),
      client_phone: String(editForm.client_phone || "").trim(),
      client_national_id: String(editForm.client_national_id || "").trim(),
      surveyor: String(editForm.surveyor || "").trim(),
      plaque: String(editForm.plaque || "").trim(),
      city: String(editForm.city || "").trim(),
      address: String(editForm.address || "").trim(),
      street_width: String(editForm.street_width || "").trim(),
      initial_survey_type: String(editForm.initial_survey_type || "").trim(),
      description: String(editForm.description || "").trim(),
    };
    const res = await auth.updateKroki(full.value.id, payload);
    if (!res.success) throw new Error(res.error);
    full.value = res.kroki;
    genForm = formForGen(full.value);
    saveOk.value = true;
    saveMsg.value = "تغییرات با موفقیت ذخیره شد.";
    logger.info("kroki", "ویرایش اطلاعات کروکی ذخیره‌شده", { id: full.value.id });
    emit("updated", res.kroki);
  } catch (e) {
    saveOk.value = false;
    saveMsg.value = e?.message || "خطا در ذخیره تغییرات";
  } finally {
    saving.value = false;
  }
}

function fname(suffix) {
  try {
    return makeExportFilename("mapiq", 1) + suffix;
  } catch (e) {
    return "kroki" + suffix;
  }
}
function dlSketch() {
  try {
    if (sketchRef.value) gen.renderSketch(sketchRef.value);
    gen.downloadCanvasImage(sketchRef.value, fname(".png"));
  } catch (e) {}
}
function dlMap() {
  try {
    const url = gen?.state?.mapImage;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = fname("_map.png");
    a.click();
  } catch (e) {}
}
function dlPdf() {
  try {
    gen.openPrint(sketchRef.value);
  } catch (e) {}
}
function dlKml() {
  try {
    gen.exportKml();
  } catch (e) {}
}
function dlDxf() {
  try {
    gen.exportDxf();
  } catch (e) {}
}

onMounted(() => {
  reload();
});
</script>
