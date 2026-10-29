<template>
  <div class="flex-1 min-h-0 overflow-y-auto bg-[var(--bg)]">
    <div class="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-5">
      <!-- سربرگ -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="font-bold text-lg flex items-center gap-2">
            <i class="fas fa-eye text-[var(--accent)]"></i>
            پیش‌نمایش کروکی
          </h2>
          <p class="text-xs text-[var(--text-muted)] mt-1">بررسی نهایی پیش از دریافت کروکی</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-muted)]">
            <i class="fas fa-layers text-[var(--accent)]"></i>
            {{ currentTemplate?.name }} — {{ currentTemplate?.subtitle }}
          </span>
        </div>
      </div>

      <!-- جهت خروجی PDF -->
      <div v-if="gen.state.ready" class="card !rounded-2xl !py-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="text-xs font-semibold flex items-center gap-2">
            <i class="fas fa-file-pdf text-[var(--accent)]"></i>
            جهت خروجی PDF
          </div>
          <div class="flex items-center gap-1.5 bg-[var(--surface2)] p-1 rounded-lg border border-[var(--border)]">
            <button
              type="button"
              class="px-3 py-1.5 rounded-md text-xs font-medium transition"
              :class="gen.state.orientation === 'portrait' ? 'bg-[var(--accent)] text-[#241a05]' : 'text-[var(--text-muted)]'"
              @click="gen.setOrientation('portrait')"
            >
              <i class="fas fa-mobile-screen ml-1"></i> عمودی
            </button>
            <button
              type="button"
              class="px-3 py-1.5 rounded-md text-xs font-medium transition"
              :class="gen.state.orientation === 'landscape' ? 'bg-[var(--accent)] text-[#241a05]' : 'text-[var(--text-muted)]'"
              @click="gen.setOrientation('landscape')"
            >
              <i class="fas fa-tablet-screen-button fa-rotate-90 ml-1"></i> افقی
            </button>
          </div>
        </div>
        <p class="text-[10px] text-[var(--text-faint)] mt-2 leading-5">
          در حالت عمودی، کروکی بزرگ در بالا و تصویر نقشه با جدول‌های مختصات و مجاورت به‌صورت فشرده زیر آن چاپ می‌شود (تک‌صفحه).
          در حالت افقی، کروکی بزرگ در وسط صفحه و سایر اطلاعات در دو طرف آن چیده می‌شوند.
        </p>
      </div>

      <!-- حالت تولید -->
      <div v-if="gen.state.generating" class="card !rounded-2xl py-16 flex flex-col items-center gap-3 text-[var(--text-muted)]">
        <i class="fas fa-sync-alt fa-spin text-2xl text-[var(--accent)]"></i>
        <span class="text-sm">در حال تولید کروکی…</span>
      </div>

      <div v-else-if="gen.state.errorMsg" class="card !rounded-2xl py-10 text-center">
        <i class="fas fa-triangle-exclamation text-3xl text-[var(--danger)] mb-3"></i>
        <p class="text-sm text-[var(--danger)]">{{ gen.state.errorMsg }}</p>
        <button class="btn btn-secondary btn-sm mt-4" @click="$emit('back')">
          <i class="fas fa-arrow-right ml-1"></i>
          بازگشت
        </button>
      </div>

      <template v-else-if="gen.state.ready">
        <!-- خروجی اصلی — کمی تار -->
        <div class="card !rounded-2xl !p-3">
          <div class="flex items-center justify-between px-1 mb-2">
            <span class="text-xs font-semibold flex items-center gap-1.5">
              <i class="fas fa-file-lines text-[var(--accent)]"></i>
              پیش‌نمایش خروجی نهایی ({{ gen.state.orientation === 'landscape' ? 'افقی' : 'عمودی' }})
            </span>
            <span class="text-[10px] text-[var(--text-faint)] flex items-center gap-1">
              <i class="fas fa-lock"></i>
              نسخه نهایی پس از صدور با کیفیت کامل
            </span>
          </div>
          <div class="relative select-none">
            <iframe
              v-if="previewDoc"
              :srcdoc="previewDoc"
              class="preview-sheet-frame preview-blur"
              :class="gen.state.orientation === 'landscape' ? 'is-landscape' : 'is-portrait preview-blur-more'"
              tabindex="-1"
              title="پیش‌نمایش خروجی نهایی"
              @load="fitPreview"
            ></iframe>
            <div v-else class="preview-fallback">
              <canvas
                ref="fallbackCanvasRef"
                class="w-full h-auto border border-[var(--border)] rounded-lg bg-white preview-blur"
                :width="canvasW"
                :height="canvasH"
              ></canvas>
              <p class="text-[11px] text-[var(--text-faint)] text-center mt-2">در حال آماده‌سازی پیش‌نمایش…</p>
            </div>
            <div class="preview-watermark">
              <span>پیش‌نمایش</span>
            </div>
          </div>
          <p class="text-[10px] text-[var(--text-faint)] text-center mt-2 leading-5">
            خروجی اصلی با کمی تاری نمایش داده شده است
          </p>
        </div>

        <!-- کانواس مخفی برای تولید تصویر کروکی (خارج از دید ولی قابل رندر) -->
        <canvas ref="sketchCanvasRef" class="preview-offscreen" :width="canvasW" :height="canvasH"></canvas>

        <!-- مجاورت‌ها: برای ترسیم‌های KML که مودال «ترسیم جدید» را ندیده‌اند هم اینجا قابل تکمیل است -->
        <div v-if="adjacencyShapes.length" class="card !rounded-2xl">
          <div class="font-semibold text-sm flex items-center gap-2 mb-1">
            <i class="fas fa-font text-[var(--accent)]"></i>
            مجاورت‌ها
            <span class="text-[11px] font-normal text-[var(--text-muted)]">({{ totalEdges }} ضلع)</span>
          </div>
          <p class="text-[11px] text-[var(--text-muted)] leading-5 mb-3">
            عنوان هر فیلد همان شماره ضلع روی کروکی است؛ متن تایپ‌شده در کروکی و جدول مجاورت‌های خروجی نمایش داده می‌شود.
          </p>
          <div v-for="shape in adjacencyShapes" :key="'adj-' + shape.shapeIndex" class="mb-3 last:mb-0">
            <div v-if="adjacencyShapes.length > 1" class="text-[11px] font-bold text-[var(--text-muted)] mb-1.5">
              ترسیم {{ shape.shapeIndex + 1 }}
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div
                v-for="edge in shape.edges"
                :key="`adj-${shape.shapeIndex}-${edge.edgeIndex}`"
                class="flex items-center gap-1.5"
              >
                <span class="shrink-0 text-[10px] font-semibold text-[var(--text-muted)] min-w-[3.2rem] text-center bg-[var(--surface2)] border border-[var(--border)] rounded px-1 py-1.5">ضلع {{ edge.name }}</span>
                <input
                  type="text"
                  class="input !py-1.5 !text-xs flex-1 min-w-0"
                  :value="edge.value"
                  :placeholder="`مجاورت ضلع ${edge.name}`"
                  @input="setAdjacency(shape.shapeIndex, edge.edgeIndex, $event.target.value)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- شخصی‌سازی ظاهر کروکی -->
        <div class="card !rounded-2xl">
          <button type="button" class="w-full flex items-center justify-between" @click="customizeOpen = !customizeOpen">
            <div class="font-semibold text-sm flex items-center gap-2">
              <i class="fas fa-palette text-[var(--accent)]"></i>
              شخصی‌سازی ظاهر کروکی
            </div>
            <i class="fas text-xs text-[var(--text-muted)]" :class="customizeOpen ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
          </button>

          <div v-if="customizeOpen" class="mt-4 space-y-4">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div v-for="c in colorFields" :key="c.key" class="flex items-center gap-2">
                <input
                  type="color"
                  :value="styleVal(c.key, currentTemplate?.[c.key])"
                  class="w-8 h-8 rounded border border-[var(--border)] cursor-pointer shrink-0"
                  @input="setStyle(c.key, $event.target.value)"
                />
                <label class="text-[10px] text-[var(--text-muted)]">{{ c.label }}</label>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label class="block mb-1 text-[11px] font-medium">ضخامت خطوط: {{ styleVal('lineWidth', 2.5) }}</label>
                <input type="range" min="1" max="6" step="0.5" :value="styleVal('lineWidth', 2.5)" class="w-full" @input="setStyle('lineWidth', +$event.target.value)" />
              </div>
              <div>
                <label class="block mb-1 text-[11px] font-medium">اندازه نقطه رئوس: {{ styleVal('vertexRadius', 4) }}</label>
                <input type="range" min="2" max="9" step="1" :value="styleVal('vertexRadius', 4)" class="w-full" @input="setStyle('vertexRadius', +$event.target.value)" />
              </div>
              <div>
                <label class="block mb-1 text-[11px] font-medium">اندازه فونت برچسب رئوس: {{ styleVal('labelFontSize', 16) }}</label>
                <input type="range" min="12" max="36" step="1" :value="styleVal('labelFontSize', 16)" class="w-full" @input="setStyle('labelFontSize', +$event.target.value)" />
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label class="block mb-1 text-[11px] font-medium">نام‌گذاری رئوس</label>
                <select class="input !py-1.5 !text-xs" :value="styleVal('vertexLabels', currentTemplate?.vertexLabels)" @change="setStyle('vertexLabels', $event.target.value)">
                  <option value="numbers">شماره (۱،۲،۳)</option>
                  <option value="letters">حروف (A,B,C)</option>
                </select>
              </div>
              <label class="flex items-center gap-2 text-xs cursor-pointer mt-4">
                <input type="checkbox" :checked="styleVal('grid', currentTemplate?.grid)" @change="setStyle('grid', $event.target.checked)" />
                شبکه مختصات
              </label>
              <label class="flex items-center gap-2 text-xs cursor-pointer mt-4">
                <input type="checkbox" :checked="styleVal('scaleBar', currentTemplate?.scaleBar)" @change="setStyle('scaleBar', $event.target.checked)" />
                نوار مقیاس
              </label>
              <label class="flex items-center gap-2 text-xs cursor-pointer mt-4">
                <input type="checkbox" :checked="styleVal('northArrow', currentTemplate?.northArrow)" @change="setStyle('northArrow', $event.target.checked)" />
                فلش شمال
              </label>
            </div>

            <div class="flex justify-end">
              <button type="button" class="btn btn-ghost btn-xs" @click="resetStyles">
                <i class="fas fa-rotate-left ml-1"></i>
                بازگشت به تنظیمات قالب
              </button>
            </div>
          </div>
        </div>

      </template>
    </div>

    <!-- نوار پیمایش -->
    <div class="sticky bottom-0 px-4 md:px-6 py-3 bg-[var(--bg)]/90 backdrop-blur-md border-t border-[var(--border)]">
      <div class="max-w-6xl mx-auto flex flex-col gap-2">
        <Transition name="modal">
          <div v-if="consumeError" class="rounded-xl px-4 py-2.5 text-xs font-medium bg-[var(--danger-glow)] border border-[var(--danger)]/30 text-[var(--danger)]">
            <i class="fas fa-circle-xmark ml-1"></i>{{ consumeError }}
          </div>
        </Transition>
        <div class="flex items-center justify-between gap-3">
          <button class="btn btn-ghost" :disabled="processing" @click="$emit('back')">
            <i class="fas fa-arrow-right ml-1"></i>
            ویرایش اطلاعات
          </button>
          <button class="btn btn-primary" :disabled="!gen.state.ready || processing" @click="confirmAndIssue">
            <i v-if="processing" class="fas fa-circle-notch fa-spin ml-1"></i>
            <i v-else class="fas fa-download ml-1"></i>
            {{ processing ? "در حال صدور کروکی…" : confirmLabel }}
          </button>
        </div>
      </div>
    </div>

    <!-- مودال کمبود موجودی -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="insufficientOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(11, 21, 36, 0.5)" @click.self="insufficientOpen = false">
          <div class="card !rounded-2xl max-w-sm w-full text-center py-8">
            <div class="w-16 h-16 mx-auto rounded-full bg-[var(--danger-glow)] border-2 border-[var(--danger)] flex items-center justify-center mb-4">
              <i class="fas fa-wallet text-2xl text-[var(--danger)]"></i>
            </div>
            <h3 class="font-extrabold text-base mb-2">موجودی حساب شما کافی نیست</h3>
            <p class="text-xs text-[var(--text-muted)] leading-6 mb-1">
              هزینه صدور کروکی <strong class="text-[var(--accent-soft)]" dir="ltr">{{ formatPrice(price) }}</strong> است
              و موجودی کیف پول شما <strong dir="ltr">{{ formatPrice(wallet) }}</strong> می‌باشد.
            </p>
            <p class="text-xs text-[var(--text-muted)] leading-6 mb-6">
              کمبود <strong class="text-[var(--danger)]" dir="ltr">{{ formatPrice(price - wallet) }}</strong> — لطفاً حساب خود را شارژ کنید.
            </p>
            <div class="flex flex-col gap-2">
              <button class="btn btn-primary w-full !py-3" @click="$emit('charge')">
                <i class="fas fa-credit-card ml-2"></i>
                شارژ حساب
              </button>
              <button class="btn btn-ghost w-full" @click="insufficientOpen = false">انصراف</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from "vue";
import { getTemplate, vertexLabel } from "../../utils/templates";
import { canvasSizeForPoints, findNorthWestIndex } from "../../utils/canvas";
import { logger } from "../../utils/logger";
import { auth, fmtMoney, KROKI_PRICE } from "../../stores/auth";
import { eligiblePinsOf } from "../../composables/useKrokiGenerator";
import { faToEn, isValidIranianMobile, isValidNationalCode } from "../../utils/validators";

const props = defineProps({
  gen: { type: Object, required: true },
  templateId: { type: String, default: "technical" },
  pins: { type: [Array, Object], default: () => [] },
  form: { type: Object, default: () => ({}) },
  // اگر در حال ادامه یک پیش‌نویسِ ذخیره‌شده در سرور باشیم
  editingKrokiId: { type: [Number, String, null], default: null },
});

const emit = defineEmits(["back", "done", "charge"]);

const sketchCanvasRef = ref(null);
const fallbackCanvasRef = ref(null);
const canvasW = ref(700);
const canvasH = ref(700);
const customizeOpen = ref(false);
const previewDoc = ref("");

const currentTemplate = computed(() => getTemplate(props.templateId));

// ── اعتبار و صدور مستقیم (بدون صفحه پرداخت؛ اولویت با کروکی رایگان) ──
const price = computed(() => KROKI_PRICE);
const freeKroki = computed(() => auth.freeOf());
const wallet = computed(() => auth.walletOf());
const isAdmin = computed(() => auth.isAdmin.value);
const processing = ref(false);
const consumeError = ref("");
const insufficientOpen = ref(false);

const confirmLabel = computed(() => {
  if (isAdmin.value) return "تأیید و دانلود کروکی";
  return "دریافت و دانلود کروکی";
});

function formatPrice(v) {
  return fmtMoney(v) + " تومان";
}

function geometryPoints() {
  const geom = props.gen.buildGeometry(props.pins);
  if (!geom || !geom.allPositions || geom.allPositions.length < 3) return null;
  return geom.allPositions.map((p) => ({ lat: Number(p.lat), lon: Number(p.lon ?? p.lng) }));
}

function drawingData() {
  try {
    const flat = [];
    const walk = (arr) => {
      for (const p of arr || []) {
        if (p && p.type === "group" && Array.isArray(p.children)) walk(p.children);
        else if (p) flat.push(p);
      }
    };
    walk(props.pins);
    return flat
      .filter((p) => p && p.shape && p.selected !== false)
      .map((p) => {
        try {
          return JSON.parse(JSON.stringify(p, (k, v) => (k === "_sourceIds" ? undefined : v)));
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);
  } catch (e) {
    return [];
  }
}

async function confirmAndIssue() {
  if (processing.value) return;
  consumeError.value = "";
  if (!props.form?.client?.trim()) {
    consumeError.value = "ابتدا نام متقاضی را در مرحله اطلاعات وارد کنید.";
    return;
  }
  const phone = faToEn(props.form.clientPhone || "").trim();
  if (phone && !isValidIranianMobile(phone)) {
    consumeError.value = "شماره همراه متقاضی معتبر نیست (۱۱ رقم با 09).";
    return;
  }
  const nationalId = faToEn(props.form.clientNationalId || "").trim();
  if (nationalId && !isValidNationalCode(nationalId)) {
    consumeError.value = "کد ملی متقاضی معتبر نیست.";
    return;
  }
  // اولویت مصرف: کروکی رایگان، بعد موجودی کیف پول
  const mode = freeKroki.value > 0 ? "free" : "wallet";
  if (!isAdmin.value && mode === "wallet" && wallet.value < price.value) {
    insufficientOpen.value = true;
    return;
  }
  const pts = geometryPoints();
  if (!pts) {
    consumeError.value = "ترسیم معتبری ثبت نشده است؛ لطفاً به مرحله ترسیم برگردید.";
    return;
  }
  processing.value = true;
  try {
    const payload = {
      title: props.form.title || "پلان وضعیت موجود",
      survey_date: props.form.date || "",
      client_name: props.form.client,
      client_phone: props.form.clientPhone || "",
      client_national_id: props.form.clientNationalId || "",
      surveyor: props.form.surveyor || "",
      plaque: props.form.plaque || "",
      address: props.form.address || props.gen.last?.form?.address || "",
      city: props.form.city || "",
      street_width: props.form.streetWidth || "",
      initial_survey_type: props.form.initialSurveyType || "",
      description: props.form.description || "",
      logo_url: props.form.logo || "",
      geometry_points: pts,
      template_key: props.templateId || "technical",
      drawing_data: drawingData(),
      map_image: props.gen.state?.mapImage || "",
      orientation: props.gen.state?.orientation || "portrait",
      style_overrides: { ...(props.gen.state?.styleOverrides || {}) },
      edge_texts: JSON.parse(JSON.stringify(props.gen.state?.edgeTexts || [])),
    };
    let id = props.editingKrokiId || null;
    if (id) {
      const updated = await auth.updateKroki(id, payload);
      if (!updated.success) throw new Error(updated.error);
      id = updated.kroki?.id || id;
    } else {
      const created = await auth.createKroki(payload, props.templateId);
      if (!created.success) throw new Error(created.error);
      id = created.kroki?.id;
      if (!id) throw new Error("پاسخ سرور نامعتبر است");
    }
    let kroki;
    if (isAdmin.value) {
      const issued = await auth.issueKroki(id);
      if (!issued.success) throw new Error(issued.error);
      kroki = issued.kroki;
    } else {
      const paid = await auth.payKroki(id, mode);
      if (!paid.success) throw new Error(paid.error);
      const issued = await auth.issueKroki(id);
      if (!issued.success) throw new Error(issued.error);
      kroki = issued.kroki;
    }
    logger.info("kroki", "صدور مستقیم کروکی از پیش‌نمایش", {
      id,
      mode: isAdmin.value ? "admin" : mode,
      code: kroki?.tracking_code,
    });
    await auth.myKrokis().catch(() => {});
    emit("done", { trackingCode: kroki?.tracking_code || "", kroki });
  } catch (e) {
    const msg = e?.message || "خطا در صدور کروکی";
    logger.error("kroki", "خطا در صدور مستقیم کروکی", msg);
    if (/موجودی|سهمیه/.test(msg) && !isAdmin.value) {
      insufficientOpen.value = true;
    } else {
      consumeError.value = msg;
    }
    if (/وارد|نشست/.test(msg)) window.location.reload();
  } finally {
    processing.value = false;
  }
}

// ── مجاورت‌ها در پیش‌نمایش ──
// ترسیم‌های KML مودال «ترسیم جدید» (تنها جای قبلی ورود مجاورت) را ندیده‌اند و
// pin.shape.adjacents ندارند؛ این فیلدها همان مقادیر state.edgeTexts را ویرایش
// می‌کنند تا در کروکی، جدول مجاورت‌ها و خروجی چاپ بیاید.
function flattenPinList(list) {
  const out = [];
  for (const p of list || []) {
    if (p && p.type === "group" && Array.isArray(p.children)) out.push(...flattenPinList(p.children));
    else if (p) out.push(p);
  }
  return out;
}

function adjacencyEdgeName(shapeIndex, edgeIndex) {
  try {
    const style = props.gen.template?.()?.vertexLabels ?? currentTemplate.value?.vertexLabels;
    const tableEdges = props.gen.state.tableEdges || [];
    const edge = tableEdges[edgeIndex];
    const outputIndices = props.gen.state.outputTableIndices || [];
    const tablePoints = outputIndices.map((index) => props.gen.state.utmPoints[index]).filter(Boolean);
    const nwIndex = findNorthWestIndex(tablePoints);
    const pointLabels = new Map(
      outputIndices.map((pointIndex, index) => [
        pointIndex,
        String(vertexLabel(style, index, nwIndex)),
      ]),
    );
    let edgeName = `${edgeIndex + 1}`;
    if (edge) {
      const start = pointLabels.get(edge.startIndex);
      const end = pointLabels.get(edge.endIndex);
      if (start && end) edgeName = `${start}-${end}`;
    }
    if ((props.gen.state.selectedShapesMeta || []).length > 1) {
      edgeName += ` (ترسیم ${shapeIndex + 1})`;
    }
    return edgeName;
  } catch (e) {
    return `${edgeIndex + 1}`;
  }
}

const adjacencyShapes = computed(() => {
  const tableEdges = props.gen.state.tableEdges || [];
  if (tableEdges.length) {
    const grouped = new Map();
    tableEdges.forEach((edge, tableEdgeIndex) => {
      if (!grouped.has(edge.shapeIndex)) grouped.set(edge.shapeIndex, []);
      grouped.get(edge.shapeIndex).push({
        edgeIndex: tableEdgeIndex,
        name: adjacencyEdgeName(edge.shapeIndex, tableEdgeIndex),
        value: edge.text ?? "",
      });
    });
    return [...grouped].map(([shapeIndex, edges]) => ({
      shapeIndex,
      edges,
    }));
  }
  const texts = props.gen.state.edgeTexts || [];
  return texts
    .map((arr, s) => ({
      shapeIndex: s,
      edges: (arr || []).map((v, i) => ({
        edgeIndex: i,
        name: adjacencyEdgeName(s, i),
        value: v ?? "",
      })),
    }))
    .filter((sh) => sh.edges.length > 0);
});

const totalEdges = computed(() => adjacencyShapes.value.reduce((n, sh) => n + sh.edges.length, 0));

function setAdjacency(shapeIndex, edgeIndex, value) {
  const v = String(value ?? "");
  try {
    const tableEdge = props.gen.state.tableEdges?.[edgeIndex];
    if (tableEdge) {
      tableEdge.text = v;
      if (
        Number.isInteger(tableEdge.sourceAdjacencyIndex) &&
        tableEdge.sourceAdjacencyIndex >= 0 &&
        props.gen.state.edgeTexts?.[shapeIndex]
      ) {
        props.gen.state.edgeTexts[shapeIndex][tableEdge.sourceAdjacencyIndex] = v;
      }
    } else if (props.gen.state.edgeTexts?.[shapeIndex]?.[edgeIndex] !== undefined) {
      props.gen.state.edgeTexts[shapeIndex][edgeIndex] = v;
    }
  } catch (e) {}
  try {
    const pinId = props.gen.state.selectedShapesMeta?.[shapeIndex]?.pinId;
    const pins = flattenPinList(props.gen.last?.pins || []);
    const pin = pins.find((p) => p.id === pinId);
    if (pin) {
      if (!pin.shape) pin.shape = {};
      const shapeEdges = (props.gen.state.tableEdges || [])
        .map((edge, index) => ({ edge, index }))
        .filter(({ edge }) => edge.shapeIndex === shapeIndex);
      const selectedEdgeIndex = shapeEdges.findIndex(({ index }) => index === edgeIndex);
      if (Array.isArray(pin.shape.tablePositionIndices)) {
        const adjacents = Array.isArray(pin.shape.tableAdjacents)
          ? [...pin.shape.tableAdjacents]
          : [];
        while (adjacents.length < shapeEdges.length) adjacents.push("");
        if (selectedEdgeIndex >= 0) adjacents[selectedEdgeIndex] = v;
        pin.shape.tableAdjacents = adjacents;
        const sourceIndex = props.gen.state.tableEdges?.[edgeIndex]?.sourceAdjacencyIndex;
        if (Number.isInteger(sourceIndex) && sourceIndex >= 0) {
          const sourceAdjacents = Array.isArray(pin.shape.adjacents)
            ? [...pin.shape.adjacents]
            : [];
          while (sourceAdjacents.length <= sourceIndex) sourceAdjacents.push("");
          sourceAdjacents[sourceIndex] = v;
          pin.shape.adjacents = sourceAdjacents;
        }
      } else {
        const sourceIndex = props.gen.state.tableEdges?.[edgeIndex]?.sourceAdjacencyIndex;
        if (Number.isInteger(sourceIndex) && sourceIndex >= 0) {
          const adjacents = Array.isArray(pin.shape.adjacents)
            ? [...pin.shape.adjacents]
            : [];
          while (adjacents.length <= sourceIndex) adjacents.push("");
          adjacents[sourceIndex] = v;
          pin.shape.adjacents = adjacents;
          pin.shape.adjacentsEnabled = adjacents.some((text) => String(text || "").trim());
          if (props.gen.state.edgeTexts?.[shapeIndex]) {
            props.gen.state.edgeTexts[shapeIndex][sourceIndex] = v;
          }
        }
      }
    }
  } catch (e) {}
  rerender();
}

const colorFields = [
  { key: "headerColor", label: "سربرگ / قاب" },
  { key: "polygonColor", label: "خط ترسیم" },
  { key: "centerColor", label: "نقطه مرکز" },
  { key: "textColor", label: "متن" },
];

function styleVal(key, fallback) {
  const v = props.gen.state.styleOverrides[key];
  return v === undefined || v === null ? fallback : v;
}

function setStyle(key, value) {
  props.gen.setStyleOverride(key, value);
  rerender();
}

function resetStyles() {
  props.gen.resetStyleOverrides();
  rerender();
}

function rerender() {
  updatePreview();
}

// ارتفاع iframe پیش‌نمایش را با ارتفاع واقعی محتوا هماهنگ می‌کند تا
// برش نخورد و دقیقاً هم‌شکل خروجی چاپ باشد.
// نکته: ارتفاع قبلی دست نمی‌خورد تا هنگام تایپ، صفحه بالا/پایین نپرد.
function fitPreview(e) {
  try {
    const f = e?.target;
    const doc = f?.contentDocument;
    if (!f || !doc || !doc.body) return;
    const h = doc.body.scrollHeight || 0;
    if (h > 10) {
      f.style.aspectRatio = "auto";
      f.style.height = Math.ceil(h + 4) + "px";
    }
  } catch {}
}

function sizeCanvas() {
  const size = canvasSizeForPoints(props.gen.state.utmPoints);
  if (!size) return;
  canvasW.value = size.w;
  canvasH.value = size.h;
}

function updatePreview() {
  nextTick(() => {
    nextTick(() => {
      const canvas = sketchCanvasRef.value;
      if (!canvas) return;
      try {
        props.gen.renderSketch(canvas);
      } catch (e) {
        logger.error("preview", "خطا در رندر کروکی", e?.message);
        return;
      }
      // رندر فالبک هم تا اگر iframe آماده نشد صفحه خالی نماند
      try {
        if (fallbackCanvasRef.value) props.gen.renderSketch(fallbackCanvasRef.value);
      } catch (e) {}
      try {
        const sketchImg = canvas.toDataURL("image/jpeg", 0.85) || "";
        const { html } = props.gen.buildPrintHtml();
        const landscape = props.gen.state.orientation === "landscape";
        const css =
          typeof props.gen.printCss === "function"
            ? props.gen.printCss(landscape)
            : "";
        const finalHtml = html.replace("__SKETCH__", sketchImg);
        previewDoc.value = `<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><style>${css}html,body{margin:0;padding:0;background:#fff;}.sheet{width:100% !important;height:auto !important;min-height:100%;}</style></head><body>${finalHtml}</body></html>`;
      } catch (e) {
        logger.error("preview", "خطا در ساخت پیش‌نمایش", e?.message);
      }
    });
  });
}

onMounted(async () => {
  sizeCanvas();
  await nextTick();
  try {
    await document.fonts?.ready;
  } catch (e) {}
  updatePreview();
  try {
    await auth.loadWallet();
  } catch (e) {}
  try {
    const n = eligiblePinsOf(props.pins || props.gen.last?.pins || []).length;
    logger.info("step", "مشاهده پیش‌نمایش کروکی", { template: props.templateId, shapes: n, free: auth.freeOf(), wallet: auth.walletOf() });
  } catch (e) {
    logger.info("step", "مشاهده پیش‌نمایش کروکی", { template: props.templateId });
  }
});

watch(
  () => props.templateId,
  () => {
    updatePreview();
  },
);

watch(
  () => props.gen.state.orientation,
  () => {
    updatePreview();
  },
);

watch(
  () => props.gen.state.styleOverrides,
  () => {
    updatePreview();
  },
  { deep: true },
);

watch(
  () => props.gen.state.mapImage,
  () => {
    updatePreview();
  },
);
</script>

<style scoped>
.preview-offscreen {
  position: fixed;
  right: -10000px;
  bottom: 0;
  width: 10px;
  height: 10px;
  opacity: 0;
  pointer-events: none;
}
.preview-fallback {
  width: 100%;
}
.preview-sheet-frame {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  pointer-events: none;
  user-select: none;
}
.preview-sheet-frame.is-portrait {
  aspect-ratio: 210 / 297;
  /* عرض برابر چاپ (A4) تا پیش‌نمایش دقیقاً هم‌شکل خروجی شود */
  max-width: 794px;
  margin-inline: auto;
  display: block;
}
.preview-sheet-frame.is-landscape {
  aspect-ratio: 297 / 210;
}
.preview-blur {
  filter: blur(0.9px) saturate(0.92);
  opacity: 0.98;
}
.preview-blur-more {
  filter: blur(2px) saturate(0.9);
}
.preview-watermark {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.preview-watermark span {
  transform: rotate(-18deg);
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 700;
  padding: 8px 18px;
  border-radius: 10px;
  white-space: nowrap;
}
</style>
