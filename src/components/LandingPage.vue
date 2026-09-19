<template>
  <div class="landing min-h-screen flex flex-col overflow-x-hidden">
    <!-- نوار بالا -->
    <header class="sticky top-0 z-50 backdrop-blur-md bg-[var(--bg)]/85 border-b border-[var(--border)]">
      <div class="max-w-7xl mx-auto px-5 h-16 grid grid-cols-[1fr_auto_1fr] items-center">
        <div class="flex items-center gap-3 justify-self-start">
          <img src="/favicon.png" alt="لوگوی سامانه کروکی" class="w-10 h-10 rounded-xl object-contain shadow-lg shadow-[var(--accent-glow-strong)]" />
          <div>
            <div class="font-extrabold text-lg leading-tight">سامانه کروکی</div>
            <div class="text-[11px] text-[var(--text-muted)]">تولید حرفه‌ای کروکی نقشه ملک</div>
          </div>
        </div>
        <div class="hidden md:flex items-center gap-6 text-sm text-[var(--text-muted)] justify-self-center">
          <a href="#features" class="hover:text-[var(--text)] transition">امکانات</a>
          <a href="#how" class="hover:text-[var(--text)] transition">مراحل کار</a>
          <a href="#templates" class="hover:text-[var(--text)] transition">قالب‌ها</a>
          <button v-if="authed && !isAdmin" class="hover:text-[var(--text)] transition font-semibold text-sm" @click="$emit('agencyRequest')">
            <i class="fas fa-user-tie ml-1"></i> درخواست نمایندگی
          </button>
        </div>
        <div class="flex items-center gap-2 justify-self-end">
          <button v-if="!authed" class="btn btn-ghost h-9" @click="$emit('login')">
            <i class="fas fa-right-to-bracket ml-1"></i>
            ورود / ثبت‌نام
          </button>

          <div v-if="authed" class="relative order-last">
            <button
              class="w-9 h-9 rounded-full border border-[var(--border)] bg-[var(--surface2)] hover:bg-[var(--surface3)] hover:border-[var(--border-strong)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition"
              title="حساب کاربری"
              @click.stop="menuOpen = !menuOpen"
            >
              <i class="fas fa-user text-sm"></i>
            </button>

            <Transition name="drop">
              <div
                v-if="menuOpen"
                class="absolute left-0 mt-2 w-64 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden profile-menu"
              >
                <div class="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]/50">
                  <div class="flex items-center gap-3">
                    <span class="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--surface2)] border border-[var(--border)] text-[var(--accent)]">
                      <i class="fas fa-user"></i>
                    </span>
                    <div class="min-w-0">
                      <div class="text-sm font-bold truncate">{{ userName }}</div>
                      <div class="text-[11px] text-[var(--text-muted)] mt-0.5">اعتبار حساب</div>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div class="rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-3 py-2">
                      <div class="text-[10px] text-[var(--text-muted)] mb-0.5 flex items-center gap-1">
                        <i class="fas fa-wallet text-[var(--success)]"></i> کیف پول
                      </div>
                      <div class="font-extrabold text-[var(--success)]" dir="ltr">{{ fmtMoney(wallet) }} <span class="text-[10px] font-medium text-[var(--text-muted)]">تومان</span></div>
                    </div>
                    <div class="rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-3 py-2">
                      <div class="text-[10px] text-[var(--text-muted)] mb-0.5 flex items-center gap-1">
                        <i class="fas fa-gift text-[var(--info)]"></i> رایگان
                      </div>
                      <div class="font-extrabold text-[var(--info)]">{{ free }} <span class="text-[10px] font-medium text-[var(--text-muted)]">کروکی</span></div>
                    </div>
                  </div>
                </div>

                <button v-if="!isAdmin" class="menu-item" @click="$emit('profile'); menuOpen = false">
                  <i class="fas fa-user-gear text-[var(--accent)]"></i>
                  پنل کاربری
                </button>
                <button v-if="isAdmin" class="menu-item" @click="$emit('admin'); menuOpen = false">
                  <i class="fas fa-shield-halved text-[var(--accent)]"></i>
                  پنل مدیریت
                </button>

                <div class="border-t border-[var(--border)]"></div>
                <button class="menu-item !text-[var(--danger)]" @click="$emit('logout')">
                  <i class="fas fa-right-from-bracket"></i>
                  خروج
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </header>

    <!-- دکمه گزارش (شناور پایین-چپ) -->
    <button
      class="fixed bottom-5 left-5 z-40 w-10 h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] shadow-lg hover:bg-[var(--surface3)] hover:border-[var(--border-strong)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition"
      title="گزارش سیستم"
      @click="$emit('toggleLog')"
    >
      <i class="fas fa-bug text-[var(--accent)]"></i>
    </button>

    <!-- هیرو -->
    <section class="relative flex-1 flex items-center justify-center py-16 md:py-24">
      <div class="hero-bg absolute inset-0 pointer-events-none"></div>
      <div class="relative max-w-7xl mx-auto px-5 text-center">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--accent)]/40 bg-[var(--accent-glow)] text-[var(--accent-soft)] text-xs font-medium mb-6 reveal">
          <i class="fas fa-certificate"></i>
          رسمی، سازمانی و با استانداردهای فنی
        </div>

        <h1 class="text-4xl md:text-6xl font-black leading-tight mb-5 reveal">
          کروکی نقشه ملک خود را
          <span class="text-transparent bg-clip-text bg-gradient-to-l from-[var(--accent-soft)] to-[var(--accent)]">حرفه‌ای</span>
          بسازید
        </h1>

        <p class="max-w-2xl mx-auto text-base md:text-lg text-[var(--text-muted)] leading-8 mb-8 reveal">
          از روی نقشه هوایی، مرز ملک خود را ترسیم کنید، اطلاعات فنی و قالب موردنظر را انتخاب نمایید
          و خروجی استاندارد کروکی با مختصات UTM، طول ضلع‌ها و مساحت را در چند مرحله ساده دریافت کنید.
        </p>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12 reveal">
          <button class="btn btn-primary !px-8 !py-3 !text-base !rounded-xl" @click="$emit('start')">
            <i class="fas fa-drafting-compass ml-2"></i>
            ساخت کروکی
          </button>
          <a href="#how" class="btn btn-ghost !px-8 !py-3 !text-base !rounded-xl">
            مشاهده مراحل
            <i class="fas fa-chevron-down mr-1"></i>
          </a>
        </div>

        <!-- موکاپ -->
        <div class="relative mx-auto max-w-3xl reveal">
          <div class="absolute -inset-6 bg-[var(--accent-glow)] blur-3xl rounded-full"></div>
          <div class="relative bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl shadow-2xl overflow-hidden">
            <div class="flex items-center gap-2 px-4 py-2.5 bg-[var(--surface2)] border-b border-[var(--border)]">
              <span class="w-3 h-3 rounded-full bg-[var(--danger)]/70"></span>
              <span class="w-3 h-3 rounded-full bg-[var(--warning)]/70"></span>
              <span class="w-3 h-3 rounded-full bg-[var(--success)]/70"></span>
              <span class="mx-auto text-[11px] text-[var(--text-muted)]">پیش‌نمایش کروکی</span>
            </div>
            <div class="p-6 bg-white">
              <!-- کروکی نمونه -->
              <svg viewBox="0 0 900 520" class="w-full">
                <rect x="8" y="8" width="884" height="504" fill="none" stroke="#1d3a6e" stroke-width="3" />
                <rect x="16" y="16" width="868" height="496" fill="none" stroke="#1d3a6e" stroke-width="1" />
                <rect x="0" y="0" width="900" height="42" fill="#1d3a6e" />
                <text x="450" y="27" text-anchor="middle" fill="#fff" font-size="15" font-weight="700" font-family="Vazirmatn, Tahoma">سازمان ثبت اسناد و املاک کشور — کروکی ثبتی</text>
                <g>
                  <polygon
                    points="300,140 520,110 560,300 360,350 250,250"
                    fill="rgba(29,78,216,0.12)"
                    stroke="#1d4ed8"
                    stroke-width="2.5"
                  />
                  <circle cx="300" cy="140" r="4" fill="#1d4ed8" />
                  <circle cx="520" cy="110" r="4" fill="#1d4ed8" />
                  <circle cx="560" cy="300" r="4" fill="#1d4ed8" />
                  <circle cx="360" cy="350" r="4" fill="#1d4ed8" />
                  <circle cx="250" cy="250" r="4" fill="#1d4ed8" />
                  <text x="292" y="128" fill="#111" font-size="14" font-weight="700" font-family="Tahoma">A</text>
                  <text x="514" y="98" fill="#111" font-size="14" font-weight="700" font-family="Tahoma">B</text>
                  <text x="556" y="290" fill="#111" font-size="14" font-weight="700" font-family="Tahoma">C</text>
                  <text x="352" y="362" fill="#111" font-size="14" font-weight="700" font-family="Tahoma">D</text>
                  <text x="240" y="262" fill="#111" font-size="14" font-weight="700" font-family="Tahoma">E</text>
                </g>
                <g stroke="#7a7a7a" stroke-width="1.4" opacity="0.35">
                  <line x1="90" y1="180" x2="840" y2="180" />
                  <line x1="90" y1="220" x2="840" y2="220" />
                  <line x1="90" y1="260" x2="840" y2="260" />
                  <line x1="90" y1="300" x2="840" y2="300" />
                  <line x1="140" y1="90" x2="140" y2="390" />
                  <line x1="240" y1="90" x2="240" y2="390" />
                  <line x1="340" y1="90" x2="340" y2="390" />
                  <line x1="440" y1="90" x2="440" y2="390" />
                  <line x1="540" y1="90" x2="540" y2="390" />
                  <line x1="640" y1="90" x2="640" y2="390" />
                  <line x1="740" y1="90" x2="740" y2="390" />
                </g>
                <g stroke="#333" stroke-width="2">
                  <line x1="830" y1="70" x2="830" y2="116" />
                  <path d="M830 112 L824 124 L836 124 Z" fill="#333" stroke="none" />
                </g>
                <text x="830" y="140" fill="#333" font-size="13" font-weight="700" font-family="Tahoma" text-anchor="middle">N</text>
                <g stroke="#333" stroke-width="2">
                  <line x1="70" y1="360" x2="210" y2="360" />
                  <line x1="70" y1="355" x2="70" y2="365" />
                  <line x1="210" y1="355" x2="210" y2="365" />
                </g>
                <text x="140" y="352" fill="#333" font-size="12" font-family="Tahoma" text-anchor="middle">50 m</text>
                <rect x="70" y="410" width="760" height="78" fill="none" stroke="#1d3a6e" stroke-width="1.5" />
                <rect x="70" y="410" width="760" height="22" fill="#1d3a6e" />
                <text x="820" y="425" fill="#fff" font-size="11" font-family="Vazirmatn, Tahoma" text-anchor="start">متقاضی: مثال</text>
                <text x="450" y="425" fill="#fff" font-size="11" font-family="Vazirmatn, Tahoma" text-anchor="middle">مقیاس: ۱:۵۰۰</text>
                <text x="80" y="425" fill="#fff" font-size="11" font-family="Vazirmatn, Tahoma" text-anchor="end">تاریخ: ۱۴۰۳</text>
                <text x="820" y="450" fill="#333" font-size="10" font-family="Vazirmatn, Tahoma" text-anchor="start">سیستم مختصات: WGS84 / UTM</text>
                <text x="450" y="450" fill="#333" font-size="10" font-family="Vazirmatn, Tahoma" text-anchor="middle">مساحت: ۱۲۵۴٫۳۵ متر مربع</text>
                <text x="80" y="450" fill="#333" font-size="10" font-family="Vazirmatn, Tahoma" text-anchor="end">کارشناس: ______</text>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- امکانات -->
    <section id="features" class="py-16 md:py-20 border-t border-[var(--border)] bg-[var(--bg-elevated)]/50">
      <div class="max-w-7xl mx-auto px-5">
        <div class="text-center mb-12 reveal">
          <div class="text-xs text-[var(--accent-soft)] font-semibold mb-2">امکانات سامانه</div>
          <h2 class="text-2xl md:text-4xl font-extrabold">همه‌چیز برای یک کروکی دقیق</h2>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div v-for="f in features" :key="f.title" class="feature-card reveal">
            <div class="w-12 h-12 rounded-xl bg-[var(--accent-glow)] border border-[var(--accent)]/30 flex items-center justify-center mb-4">
              <i class="fas" :class="f.icon + ' text-[var(--accent)]'"></i>
            </div>
            <h3 class="font-bold mb-2">{{ f.title }}</h3>
            <p class="text-sm text-[var(--text-muted)] leading-6">{{ f.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- قالب‌ها -->
    <section id="templates" class="py-16 md:py-20 border-t border-[var(--border)]">
      <div class="max-w-7xl mx-auto px-5">
        <div class="text-center mb-12 reveal">
          <div class="text-xs text-[var(--accent-soft)] font-semibold mb-2">قالب‌های آماده</div>
          <h2 class="text-2xl md:text-4xl font-extrabold">قالب استاندارد کروکی را انتخاب کنید</h2>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div
            v-for="t in customCards"
            :key="t.id"
            class="rounded-xl border-2 p-4 text-center transition reveal"
            :style="{ borderColor: t.headerColor + '66' }"
            title="قالب شخصی شما"
          >
            <div class="w-10 h-10 mx-auto rounded-lg mb-3 flex items-center justify-center" style="background: rgba(250, 108, 4, 0.14); color: var(--accent)">
              <i class="fas fa-crown"></i>
            </div>
            <div class="text-sm font-bold">{{ t.name }}</div>
            <div class="text-[10px] text-[var(--text-muted)] mt-1">{{ t.subtitle }}</div>
          </div>
          <div
            v-for="t in templates"
            :key="t.id"
            class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center hover:border-[var(--accent)]/50 transition reveal"
          >
            <div class="w-10 h-10 mx-auto rounded-lg mb-3 flex items-center justify-center" :style="{ background: 'rgba(' + hexToRgb(t.headerColor) + ',0.14)', color: t.headerColor }">
              <i class="fas" :class="t.icon"></i>
            </div>
            <div class="text-sm font-bold">{{ t.name }}</div>
            <div class="text-[10px] text-[var(--text-muted)] mt-1">{{ t.subtitle }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- مراحل -->
    <section id="how" class="py-16 md:py-20 border-t border-[var(--border)] bg-[var(--bg-elevated)]/50">
      <div class="max-w-7xl mx-auto px-5">
        <div class="text-center mb-12 reveal">
          <div class="text-xs text-[var(--accent-soft)] font-semibold mb-2">مراحل کار</div>
          <h2 class="text-2xl md:text-4xl font-extrabold">در ۵ گام ساده</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div v-for="(s, i) in steps" :key="s.title" class="relative reveal">
            <div class="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 h-full">
              <div class="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-soft)] text-[#241a05] font-extrabold flex items-center justify-center mb-3 shadow-md shadow-[var(--accent-glow)]">
                {{ i + 1 }}
              </div>
              <div class="font-bold text-sm mb-1.5">{{ s.title }}</div>
              <p class="text-xs text-[var(--text-muted)] leading-5">{{ s.desc }}</p>
            </div>
            <i v-if="i < steps.length - 1" class="fas fa-arrow-left absolute -left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] text-sm hidden lg:block"></i>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA پایانی -->
    <section class="py-16 md:py-24 border-t border-[var(--border)] relative overflow-hidden">
      <div class="absolute inset-0 hero-bg pointer-events-none"></div>
      <div class="relative max-w-7xl mx-auto px-5 text-center reveal">
        <h2 class="text-2xl md:text-4xl font-extrabold mb-4">آماده ساخت کروکی هستید؟</h2>
        <p class="text-[var(--text-muted)] mb-8">همین حالا شروع کنید و در چند دقیقه کروکی استاندارد خود را دریافت کنید.</p>
        <button class="btn btn-primary !px-10 !py-3.5 !text-lg !rounded-xl" @click="$emit('start')">
          <i class="fas fa-play ml-2"></i>
          شروع ساخت کروکی
        </button>
      </div>
    </section>

    <footer class="border-t border-[var(--border)] py-6 bg-[var(--bg-elevated)]/70">
      <div class="max-w-7xl mx-auto px-5 text-center text-sm md:text-base font-semibold text-[var(--text-muted)]">
        کلیه حقوق مادی و معنوی متعلق به شرکت ساج گستر کاسپین می‌باشد
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from "vue";
import { SKETCH_TEMPLATES, TEMPLATE_ICONS, getUserTemplates } from "../utils/templates";
import { fmtMoney, auth } from "../stores/auth";

const props = defineProps({
  authed: { type: Boolean, default: false },
  userName: { type: String, default: "" },
  isAdmin: { type: Boolean, default: false },
  wallet: { type: Number, default: 0 },
  free: { type: Number, default: 0 },
});

defineEmits(["start", "toggleLog", "login", "admin", "logout", "profile", "agencyRequest"]);

const features = [
  { icon: "fa-map-marked-alt", title: "ترسیم تعاملی روی نقشه", desc: "خط، پلی‌گان، دایره و نقاط چندگانه را مستقیم روی تصویر ماهواره‌ای ترسیم کنید." },
  { icon: "fa-file-import", title: "آپلود KML / KMZ", desc: "فایل KML یا KMZ خود را بارگذاری کنید و بلافاصله روی نقشه مشاهده نمایید." },
  { icon: "fa-ruler-combined", title: "اندازه‌گیری دقیق", desc: "طول ضلع‌ها، مساحت و مختصات UTM به‌صورت خودکار محاسبه می‌شود." },
  { icon: "fa-layers", title: "قالب‌های استاندارد", desc: "بین قالب‌های فنی، ثبتی، شهرداری، بنیاد مسکن و بیمه انتخاب کنید." },
  { icon: "fa-eye", title: "پیش‌نمایش زنده", desc: "پیش از پرداخت، خروجی کروکی و تصویر نقشه را به‌طور کامل بررسی کنید." },
  { icon: "fa-file-download", title: "دانلود PNG و PDF", desc: "خروجی نهایی را با کیفیت بالا به صورت تصویر یا PDF دریافت کنید." },
];

const steps = [
  { title: "ترسیم نقشه", desc: "مرز ملک را روی نقشه هوایی رسم کنید یا فایل KML بارگذاری کنید." },
  { title: "ثبت اطلاعات", desc: "مشخصات ملک، متقاضی و قالب کروکی را وارد کنید." },
  { title: "پیش‌نمایش", desc: "خروجی نهایی را بررسی و ویرایش مجاورت‌ها را انجام دهید." },
  { title: "پرداخت", desc: "به‌صورت امن و آنی هزینه سرویس را پرداخت کنید." },
  { title: "دانلود", desc: "فایل کروکی را در قالب PNG یا PDF دانلود کنید." },
];

const templates = SKETCH_TEMPLATES.map((t) => ({
  id: t.id,
  name: t.name,
  subtitle: t.subtitle,
  headerColor: t.headerColor,
  icon: TEMPLATE_ICONS[t.id] || "fa-drafting-compass",
}));

const customCards = computed(() => getUserTemplates());

const menuOpen = ref(false);

function onDocClick() {
  menuOpen.value = false;
}
function onEscape(e) {
  if (e.key === "Escape") menuOpen.value = false;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

onMounted(() => {
  document.addEventListener("click", onDocClick);
  document.addEventListener("keydown", onEscape);
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("visible");
      });
    },
    { threshold: 0.12 },
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocClick);
  document.removeEventListener("keydown", onEscape);
});
</script>

<style scoped>
.hero-bg {
  background:
    radial-gradient(circle at 20% 20%, rgba(250, 108, 4, 0.1), transparent 45%),
    radial-gradient(circle at 80% 30%, rgba(29, 58, 110, 0.07), transparent 50%),
    radial-gradient(circle at 50% 90%, rgba(250, 108, 4, 0.07), transparent 45%);
}

.feature-card {
  background: linear-gradient(180deg, var(--surface), var(--bg-elevated));
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  transition: transform 0.25s var(--ease-out), border-color 0.25s, box-shadow 0.25s;
}
.feature-card:hover {
  transform: translateY(-4px);
  border-color: rgb(var(--accent-rgb) / 0.45);
  box-shadow: 0 12px 36px rgba(23, 43, 77, 0.1);
}

.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s var(--ease-out), transform 0.7s var(--ease-out);
}
.reveal.visible {
  opacity: 1;
  transform: none;
}

.landing {
  animation: pageIn 0.4s var(--ease-out);
}

@keyframes pageIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.7rem 1rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text);
  background: transparent;
  border: 0;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  text-align: right;
}
.menu-item i {
  width: 1rem;
  text-align: center;
}
.menu-item:hover {
  background: var(--surface2);
}

.profile-menu {
  animation: menu-in 0.18s var(--ease-out);
}
@keyframes menu-in {
  from { opacity: 0; transform: translateY(-6px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.drop-enter-active {
  animation: menu-in 0.18s var(--ease-out);
}
.drop-leave-active {
  animation: menu-out 0.15s ease-in;
}
@keyframes menu-out {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to { opacity: 0; transform: translateY(-6px) scale(0.98); }
}
</style>
