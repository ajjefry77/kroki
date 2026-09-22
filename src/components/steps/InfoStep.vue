<template>
  <div class="flex-1 min-h-0 overflow-y-auto bg-[var(--bg)]">
    <div class="max-w-6xl mx-auto px-4 md:px-6 py-6">
      <!-- سربرگ مرحله -->
      <div class="flex flex-wrap items-center gap-2 mb-5">
        <div class="flex items-center gap-2 ml-auto">
          <div class="w-9 h-9 rounded-lg bg-[var(--accent-glow)] border border-[var(--accent)]/30 flex items-center justify-center">
            <i class="fas fa-file-signature text-[var(--accent)]"></i>
          </div>
          <div>
            <h2 class="font-extrabold text-base leading-tight">اطلاعات و قالب</h2>
            <p class="text-[11px] text-[var(--text-muted)]">مشخصات متقاضی و ملک + انتخاب قالب کروکی</p>
          </div>
        </div>
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[11px] text-[var(--text-muted)]">
          <i class="fas fa-map-marked-alt text-[var(--accent)]"></i>
          {{ eligibleCount }} ترسیم معتبر ثبت شده است
        </span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
        <!-- ستون اصلی فرم -->
        <div class="space-y-5 min-w-0">
          <!-- مشخصات متقاضی -->
          <section class="card !rounded-2xl">
            <div class="flex items-center gap-2 mb-4">
              <span class="w-7 h-7 rounded-lg bg-[var(--info-glow)] flex items-center justify-center">
                <i class="fas fa-user text-xs text-[var(--info)]"></i>
              </span>
              <h3 class="font-bold text-sm">مشخصات متقاضی</h3>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block mb-1.5 font-medium text-xs">متقاضی *</label>
                <input v-model="form.client" type="text" class="input" placeholder="نام متقاضی" />
              </div>
              <div>
                <label class="block mb-1.5 font-medium text-xs">شماره همراه متقاضی</label>
                <input
                  v-model="form.clientPhone"
                  type="tel"
                  inputmode="numeric"
                  dir="ltr"
                  maxlength="11"
                  autocomplete="tel"
                  class="input text-center"
                  :class="phoneError ? '!border-[var(--danger)]' : ''"
                  placeholder="09123456789"
                  @input="form.clientPhone = faToEn(form.clientPhone).replace(/[^\d]/g, '').slice(0, 11)"
                  @blur="touched.phone = true"
                />
                <p v-if="phoneError" class="text-[10px] text-[var(--danger)] mt-1">{{ phoneError }}</p>
              </div>
              <div>
                <label class="block mb-1.5 font-medium text-xs">کد ملی متقاضی</label>
                <input
                  v-model="form.clientNationalId"
                  type="text"
                  inputmode="numeric"
                  dir="ltr"
                  maxlength="10"
                  autocomplete="off"
                  class="input text-center"
                  :class="nationalError ? '!border-[var(--danger)]' : ''"
                  placeholder="0012345678"
                  @input="form.clientNationalId = faToEn(form.clientNationalId).replace(/[^\d]/g, '').slice(0, 10)"
                  @blur="touched.national = true"
                />
                <p v-if="nationalError" class="text-[10px] text-[var(--danger)] mt-1">{{ nationalError }}</p>
              </div>
            </div>
          </section>

          <!-- مشخصات ملک -->
          <section class="card !rounded-2xl">
            <div class="flex items-center gap-2 mb-4">
              <span class="w-7 h-7 rounded-lg bg-[var(--accent-glow)] flex items-center justify-center">
                <i class="fas fa-house-chimney text-xs text-[var(--accent)]"></i>
              </span>
              <h3 class="font-bold text-sm">مشخصات ملک</h3>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div class="sm:col-span-2">
                <label class="block mb-1.5 font-medium text-xs">عنوان نقشه *</label>
                <input v-model="form.title" type="text" class="input" placeholder="مثلاً پلان وضعیت موجود ملک" />
              </div>
              <div>
                <label class="block mb-1.5 font-medium text-xs">تاریخ برداشت *</label>
                <input
                  v-model="form.date"
                  type="text"
                  class="input text-center"
                  placeholder="1404/01/01"
                  dir="ltr"
                  @input="form.date = form.date.replace(/[^\d/]/g, '')"
                />
              </div>
              <div class="sm:col-span-2">
                <label class="block mb-1.5 font-medium text-xs">نشانی ملک</label>
                <input v-model="form.address" type="text" class="input" placeholder="پس از ثبت، خودکار از روی موقعیت ملک پیشنهاد می‌شود" maxlength="300" />
                <p class="text-[10px] text-[var(--text-faint)] mt-1">به‌صورت خودکار از روی موقعیت ملک پیشنهاد و قابل ویرایش است.</p>
              </div>
              <div>
                <label class="block mb-1.5 font-medium text-xs">کارشناس / نقشه‌بردار</label>
                <input v-model="form.surveyor" type="text" class="input" placeholder="نام کارشناس (اختیاری)" />
              </div>
              <div>
                <label class="block mb-1.5 font-medium text-xs">شماره پلاک ثبتی</label>
                <input v-model="form.plaque" type="text" class="input" placeholder="اصلی / فرعی (اختیاری)" maxlength="32" />
              </div>
              <div>
                <label class="block mb-1.5 font-medium text-xs">عرض معبر</label>
                <input v-model="form.streetWidth" type="text" class="input" placeholder="مثلاً ۱۲ متر" />
              </div>
              <div class="sm:col-span-2 lg:col-span-3">
                <label class="block mb-1.5 font-medium text-xs">توضیحات تکمیلی</label>
                <textarea
                  v-model="form.description"
                  rows="2"
                  class="input resize-none"
                  placeholder="توضیحات اختیاری درباره ملک، عوارض و…"
                ></textarea>
              </div>
            </div>
          </section>

          <!-- لوگو -->
          <section class="card !rounded-2xl">
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface2)] flex items-center justify-center overflow-hidden">
                <img v-if="form.logo" :src="form.logo" class="w-full h-full object-contain" alt="لوگو" />
                <i v-else class="fas fa-image text-xl text-[var(--text-faint)]"></i>
              </div>
              <div class="flex flex-col gap-1.5 min-w-0">
                <div class="font-bold text-sm">لوگوی سربرگ <span class="font-medium text-[var(--text-faint)] text-[11px]">(اختیاری)</span></div>
                <div class="flex items-center gap-2">
                  <input ref="logoInput" type="file" accept="image/*" class="hidden" @change="onLogoChange" />
                  <button type="button" class="btn btn-ghost btn-xs" @click="logoInput?.click()">
                    <i class="fas fa-upload ml-1"></i> بارگذاری لوگو
                  </button>
                  <button v-if="form.logo" type="button" class="btn btn-ghost btn-xs !text-[var(--danger)]" @click="form.logo = ''">
                    <i class="fas fa-trash ml-1"></i> حذف
                  </button>
                </div>
                <span class="text-[10px] text-[var(--text-faint)] leading-4">
                  در سربرگ کروکی و هدر خروجی PDF قرار می‌گیرد. PNG با پس‌زمینه شفاف توصیه می‌شود.
                </span>
              </div>
            </div>
          </section>
        </div>

        <!-- سایدبار: قالب + خلاصه + اقدام -->
        <aside class="space-y-4 lg:sticky lg:top-4 min-w-0">
          <section class="card !rounded-2xl">
            <div class="flex items-center gap-2 mb-3">
              <span class="w-7 h-7 rounded-lg bg-[var(--accent-glow)] flex items-center justify-center">
                <i class="fas fa-layers text-xs text-[var(--accent)]"></i>
              </span>
              <h3 class="font-bold text-sm">قالب کروکی</h3>
            </div>

            <!-- دراپ‌داون قالب -->
            <label class="block mb-1.5 font-medium text-xs text-[var(--text-muted)]">انتخاب قالب</label>
            <div ref="dropRef" class="relative">
              <button
                type="button"
                class="input !py-2 flex items-center gap-2 text-right cursor-pointer"
                :aria-expanded="dropOpen"
                @click.stop="dropOpen = !dropOpen"
              >
                <span class="w-3 h-3 rounded-full shrink-0" :style="{ background: currentTemplate?.headerColor || 'var(--border-strong)' }"></span>
                <span class="flex-1 min-w-0">
                  <span class="block text-[13px] font-bold truncate">{{ currentTemplate?.name || "انتخاب کنید" }}</span>
                  <span v-if="currentTemplate" class="block text-[10px] text-[var(--text-muted)] truncate">{{ currentTemplate.subtitle }}</span>
                </span>
                <i class="fas fa-chevron-down text-[10px] text-[var(--text-faint)] transition-transform shrink-0" :class="dropOpen ? 'rotate-180' : ''"></i>
              </button>
              <Transition name="drop">
                <div
                  v-if="dropOpen"
                  class="absolute z-30 mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl overflow-hidden"
                >
                  <div class="max-h-64 overflow-y-auto py-1">
                    <button
                      v-for="t in templates"
                      :key="t.id"
                      type="button"
                      class="w-full flex items-center gap-2 px-3 py-2 text-right transition hover:bg-[var(--surface2)]"
                      :class="selected === t.id ? 'bg-[var(--accent-glow)]' : ''"
                      @click="select(t.id)"
                    >
                      <span class="w-3 h-3 rounded-full shrink-0" :style="{ background: t.headerColor }"></span>
                      <span class="flex-1 min-w-0">
                        <span class="block text-xs font-bold truncate">{{ t.name }}</span>
                        <span class="block text-[10px] text-[var(--text-muted)] truncate">{{ t.subtitle }}</span>
                      </span>
                      <i v-if="selected === t.id" class="fas fa-check text-[11px] text-[var(--accent)] shrink-0"></i>
                    </button>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- پیش‌نمایش قالب منتخب -->
            <div v-if="currentTemplate" class="mt-3 rounded-xl border border-[var(--border)] overflow-hidden">
              <div class="bg-white p-2" :style="{ background: currentTemplate.paper }">
                <svg viewBox="0 0 200 150" class="w-full h-auto">
                  <rect :x="currentTemplate.frame === 'official' ? 4 : 6" :y="currentTemplate.frame === 'official' ? 4 : 6" :width="currentTemplate.frame === 'official' ? 192 : 188" :height="currentTemplate.frame === 'official' ? 142 : 138" fill="none" :stroke="currentTemplate.headerColor" :stroke-width="currentTemplate.frame === 'bonyad' ? 3 : currentTemplate.frame === 'official' || currentTemplate.frame === 'color' ? 2.5 : 1.5" />
                  <rect v-if="currentTemplate.frame === 'official' || currentTemplate.frame === 'color'" x="9" y="9" width="182" height="132" fill="none" :stroke="currentTemplate.headerColor" stroke-width="0.7" stroke-opacity="0.4" />
                  <rect v-if="currentTemplate.titleBlock === 'official'" x="0" y="0" width="200" height="16" :fill="currentTemplate.headerColor" />
                  <g v-if="currentTemplate.grid" stroke="#1d3a6e" stroke-width="0.4" opacity="0.25">
                    <line v-for="gx in [40, 80, 120, 160]" :key="'gx'+gx" :x1="gx" :y1="22" :x2="gx" :y2="112" />
                    <line v-for="gy in [45, 65, 85]" :key="'gy'+gy" x1="10" :y1="gy" x2="190" :y2="gy" />
                  </g>
                  <polygon
                    :points="polyPts"
                    :fill="currentTemplate.colorful ? 'rgba(194,65,12,0.18)' : 'rgba(122,31,31,0.07)'"
                    :stroke="currentTemplate.polygonColor"
                    stroke-width="1.6"
                  />
                  <circle v-for="(p, i) in polyVerts" :key="'v'+i" :cx="p[0]" :cy="p[1]" r="2" :fill="currentTemplate.polygonColor" />
                  <text
                    v-for="(p, i) in polyVerts"
                    :key="'l'+i"
                    :x="p[0]" :y="p[1] - 6"
                    fill="#333" font-size="7" font-weight="700" font-family="Tahoma" text-anchor="middle"
                  >{{ vertexLabel(currentTemplate.vertexLabels, i) }}</text>
                  <g v-if="currentTemplate.northArrow" stroke="#333" stroke-width="1">
                    <line x1="185" y1="24" x2="185" y2="42" />
                    <path d="M185 40 L182.5 46 L187.5 46 Z" fill="#333" stroke="none" />
                  </g>
                  <g v-if="currentTemplate.scaleBar" stroke="#333" stroke-width="1.2">
                    <line x1="14" y1="122" x2="54" y2="122" />
                    <line x1="14" y1="120" x2="14" y2="124" />
                    <line x1="54" y1="120" x2="54" y2="124" />
                  </g>
                  <rect v-if="currentTemplate.titleBlock === 'official'" x="10" y="128" width="180" height="14" fill="none" :stroke="currentTemplate.headerColor" stroke-width="0.7" />
                  <rect v-if="currentTemplate.titleBlock === 'official'" x="10" y="128" width="180" height="5" :fill="currentTemplate.headerColor" />
                </svg>
              </div>
              <p class="text-[11px] text-[var(--text-muted)] leading-5 px-3 py-2 bg-[var(--surface2)] border-t border-[var(--border)]">{{ currentTemplate.description }}</p>
            </div>
            <p class="text-[10px] text-[var(--text-faint)] mt-2 leading-4">قالب‌های شخصی از پنل کاربری ساخته می‌شوند.</p>
          </section>

          <!-- خلاصه و ثبت -->
          <section class="card !rounded-2xl">
            <dl class="space-y-2 text-xs mb-4">
              <div class="flex items-center justify-between gap-2">
                <dt class="text-[var(--text-muted)]">ترسیم معتبر</dt>
                <dd class="font-bold">{{ eligibleCount }} مورد</dd>
              </div>
              <div class="flex items-center justify-between gap-2">
                <dt class="text-[var(--text-muted)]">مساحت تخمینی</dt>
                <dd class="font-bold">{{ areaPreview }}</dd>
              </div>
              <div class="flex items-center justify-between gap-2">
                <dt class="text-[var(--text-muted)]">هزینه</dt>
                <dd class="font-extrabold text-[var(--accent-soft)]" dir="ltr">{{ fmtMoney(price) }} <span class="text-[10px] font-medium text-[var(--text-muted)]">تومان</span></dd>
              </div>
            </dl>
            <button class="btn btn-primary w-full !py-3" :disabled="!valid" @click="submit">
              <i class="fas fa-eye ml-1"></i>
              ثبت و پیش‌نمایش
            </button>
            <p v-if="!valid" class="text-[10px] text-[var(--warning)] mt-2 leading-4">
              برای ادامه: {{ missingList.join("، ") }}
            </p>
            <button class="btn btn-ghost w-full mt-2" @click="$emit('back')">
              <i class="fas fa-arrow-right ml-1"></i>
              بازگشت به نقشه
            </button>
          </section>
        </aside>
      </div>

      <!-- نوار اقدام موبایل -->
      <div class="lg:hidden sticky bottom-0 -mx-4 px-4 py-3 mt-5 bg-[var(--bg)]/90 backdrop-blur-md border-t border-[var(--border)]">
        <div class="flex items-center gap-2">
          <button class="btn btn-ghost flex-1" @click="$emit('back')">
            <i class="fas fa-arrow-right ml-1"></i>
            بازگشت
          </button>
          <button class="btn btn-primary flex-[2]" :disabled="!valid" @click="submit">
            <i class="fas fa-eye ml-1"></i>
            ثبت و پیش‌نمایش
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted, onBeforeUnmount } from "vue";
import { SKETCH_TEMPLATES, TEMPLATE_ICONS, vertexLabel, getUserTemplates } from "../../utils/templates";
import { faToEn, isValidIranianMobile, isValidNationalCode } from "../../utils/validators";
import { eligiblePinsOf, suggestAddressForPositions } from "../../composables/useKrokiGenerator";
import { logger } from "../../utils/logger";
import { fmtMoney, KROKI_PRICE } from "../../stores/auth";

onMounted(() => {
  document.addEventListener("click", closeDrop);
  document.addEventListener("keydown", onEscapeDrop);
  void suggestAddress();
});

onBeforeUnmount(() => {
  document.removeEventListener("click", closeDrop);
  document.removeEventListener("keydown", onEscapeDrop);
});

// پیشنهاد خودکار نشانی از روی مرکز ترسیم‌ها (فقط اگر کاربر چیزی ننوشته باشد؛
// معمولاً موقع ثبت ترسیم از قبل پر شده و این فقط تور اطمینان است)
async function suggestAddress() {
  try {
    if (String(props.form.address || "").trim()) return;
    const positions = eligiblePinsOf(props.pins).flatMap((p) => p.shape?.positions || []);
    if (!positions.length) return;
    const display = await suggestAddressForPositions(positions);
    if (display && !String(props.form.address || "").trim()) {
      props.form.address = display;
      logger.info("form", "پیشنهاد خودکار نشانی ملک");
    }
  } catch {}
}

const props = defineProps({
  pins: { type: Object, required: true },
  form: { type: Object, required: true },
  modelValue: { type: String, default: "technical" },
});

const emit = defineEmits(["update:modelValue", "submit", "back"]);

const templates = computed(() => {
  const builtin = SKETCH_TEMPLATES.map((t) => ({
    ...t,
    icon: TEMPLATE_ICONS[t.id] || "fa-drafting-compass",
    paper: t.handDrawn ? "#fffdf5" : "#ffffff",
  }));
  const custom = getUserTemplates().map((t) => ({
    ...t,
    icon: "fa-crown",
    paper: t.handDrawn ? "#fffdf5" : "#ffffff",
  }));
  return [...custom, ...builtin];
});

const selected = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const logoInput = ref(null);
const dropOpen = ref(false);
const dropRef = ref(null);

function closeDrop(e) {
  if (!dropOpen.value) return;
  if (dropRef.value && !dropRef.value.contains(e.target)) dropOpen.value = false;
}
function onEscapeDrop(e) {
  if (e.key === "Escape") dropOpen.value = false;
}

// فقط فرمت‌های تصویری شطرنجی مجاز است (SVG مسدود: سطح حمله XXE/اسکریپت در چاپ)
const LOGO_MIME_ALLOW = ["image/png", "image/jpeg", "image/gif", "image/webp"];

function isSafeImageDataUrl(s) {
  return typeof s === "string" && /^data:image\/(png|jpeg|gif|webp);base64,/.test(s);
}

const touched = reactive({ phone: false, national: false });

const phoneError = computed(() => {
  const v = faToEn(props.form.clientPhone).trim();
  if (!v) return "";
  return isValidIranianMobile(v) ? "" : "شماره همراه باید ۱۱ رقم و با 09 شروع شود.";
});

const nationalError = computed(() => {
  const v = faToEn(props.form.clientNationalId).trim();
  if (!v) return "";
  if (!/^\d{10}$/.test(v)) return "کد ملی باید ۱۰ رقم باشد.";
  return isValidNationalCode(v) ? "" : "کد ملی معتبر نیست.";
});

function onLogoChange(e) {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  if (!LOGO_MIME_ALLOW.includes(file.type)) {
    alert("فقط تصویر PNG ،JPG ،GIF یا WebP مجاز است.");
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    alert("حجم تصویر لوگو حداکثر ۲ مگابایت باشد.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    if (!isSafeImageDataUrl(reader.result)) {
      logger.error("form", "قالب فایل لوگو نامعتبر است");
      return;
    }
    props.form.logo = reader.result;
    logger.info("form", "بارگذاری لوگو", { size: Math.round(file.size / 1024) + "KB" });
  };
  reader.onerror = () => logger.error("form", "خطا در خواندن تصویر لوگو");
  reader.readAsDataURL(file);
}

const currentTemplate = computed(() => templates.value.find((t) => t.id === selected.value));

const polyPts = "70,55 110,40 135,70 100,92 60,80";
const polyVerts = [
  [70, 55],
  [110, 40],
  [135, 70],
  [100, 92],
  [60, 80],
];

const price = computed(() => KROKI_PRICE);

const missingList = computed(() => {
  const f = props.form;
  const miss = [];
  if (!f.title.trim()) miss.push("عنوان نقشه");
  if (!f.client.trim()) miss.push("نام متقاضی");
  if (!f.date.trim()) miss.push("تاریخ برداشت");
  if (!eligiblePinsOf(props.pins).length) miss.push("ثبت حداقل یک ترسیم");
  return miss.length ? miss : [""];
});

const valid = computed(() => {
  const f = props.form;
  return Boolean(
    f.title.trim() &&
      f.client.trim() &&
      f.date.trim() &&
      !phoneError.value &&
      !nationalError.value &&
      eligiblePinsOf(props.pins).length,
  );
});

const eligibleCount = computed(() => eligiblePinsOf(props.pins).length);

const areaPreview = computed(() => {
  const sel = eligiblePinsOf(props.pins).filter((p) => p.shape?.type === "polygon");
  return sel.length ? "—" : "۰ متر مربع";
});

function select(id) {
  selected.value = id;
  dropOpen.value = false;
  logger.info("template", "انتخاب قالب", { id });
}

function submit() {
  if (!valid.value) return;
  logger.info("step", "ثبت اطلاعات و انتخاب قالب", { template: selected.value });
  emit("submit");
}
</script>

<style scoped>
.drop-enter-active {
  animation: drop-in 0.18s var(--ease-out);
}
.drop-leave-active {
  animation: drop-out 0.15s ease-in;
}
@keyframes drop-in {
  from { opacity: 0; transform: translateY(-6px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes drop-out {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to { opacity: 0; transform: translateY(-6px) scale(0.98); }
}
</style>
