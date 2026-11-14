<template>
  <section>
    <!-- تنظیم هدیه ثبت‌نام -->
    <div class="card !rounded-2xl p-4 mb-5">
      <div class="font-bold text-sm mb-3 flex items-center gap-2">
        <i class="fas fa-gift text-[var(--accent)]"></i> هدیه ثبت‌نام کاربران جدید
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <div>
          <label class="block mb-1 text-[11px] font-medium text-[var(--text-muted)]">نوع هدیه</label>
          <select v-model="giftType" class="input">
            <option value="days">مدت استفاده رایگان (روز)</option>
            <option value="krokis">تعداد کروکی رایگان</option>
          </select>
        </div>
        <div>
          <label class="block mb-1 text-[11px] font-medium text-[var(--text-muted)]">
            {{ giftType === "days" ? "تعداد روز" : "تعداد کروکی" }}
          </label>
          <input
            v-model.number="giftValue"
            type="number"
            min="0"
            :max="giftType === 'days' ? 36500 : 100000"
            class="input text-center"
            dir="ltr"
          />
        </div>
        <button class="btn btn-primary btn-sm" :disabled="giftSaving" @click="saveGift">
          <i v-if="giftSaving" class="fas fa-circle-notch fa-spin ml-1"></i>
          <i v-else class="fas fa-floppy-disk ml-1"></i>
          ذخیره تنظیمات
        </button>
      </div>
      <p class="text-[11px] text-[var(--text-muted)] leading-5 mt-3">
        هر کاربر جدید هنگام ثبت‌نام (یا اولین ورود با رمز یکبار مصرف) این هدیه را دریافت می‌کند. برای یک ماه، ۳۰ روز وارد کنید.
        <span v-if="currentGiftLabel">تنظیم فعلی: <b class="text-[var(--accent-soft)]">{{ currentGiftLabel }}</b></span>
      </p>
    </div>

    <!-- تقویم روزهای رایگان -->
    <div class="card !rounded-2xl p-4 mb-5">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div class="font-bold text-sm flex items-center gap-2">
          <i class="fas fa-calendar-days text-[var(--accent)]"></i> تقویم روزهای رایگان سامانه
        </div>
        <div class="flex items-center gap-1">
          <button class="btn btn-ghost btn-xs" title="ماه قبل" @click="shiftMonth(-1)">
            <i class="fas fa-chevron-right"></i>
          </button>
          <span class="text-xs font-bold min-w-[7rem] text-center">{{ monthLabel }}</span>
          <button class="btn btn-ghost btn-xs" title="ماه بعد" @click="shiftMonth(1)">
            <i class="fas fa-chevron-left"></i>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-7 gap-1 text-center mb-1">
        <span v-for="w in JALALI_WEEKDAYS_SHORT" :key="w" class="text-[10px] text-[var(--text-muted)]">{{ w }}</span>
      </div>
      <div class="grid grid-cols-7 gap-1">
        <template v-for="(cell, i) in cells" :key="i">
          <div v-if="!cell"></div>
          <button
            v-else
            type="button"
            class="cal-day"
            :class="{
              free: !!cell.free,
              off: !!cell.free && !cell.free.active,
              today: cell.iso === todayIso,
              selected: cell.iso === selectedIso,
            }"
            :title="cell.free ? (cell.free.occasion || 'رایگان') : 'انتخاب به‌عنوان روز رایگان'"
            @click="pickDay(cell)"
          >
            {{ fa(cell.d) }}
            <span v-if="cell.free" class="cal-dot"></span>
          </button>
        </template>
      </div>

      <!-- ویرایش روز انتخاب‌شده -->
      <div v-if="selectedIso" class="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-3">
        <div class="flex flex-wrap items-center gap-2 mb-2">
          <span class="text-xs font-bold">روز انتخاب‌شده: {{ selectedJalaliLabel }}</span>
          <span class="text-[10px] text-[var(--text-muted)]" dir="ltr">{{ selectedIso }}</span>
          <span
            v-if="selectedExisting"
            class="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            :class="selectedExisting.active ? 'bg-[var(--success-glow)] text-[var(--success)]' : 'bg-[var(--danger-glow)] text-[var(--danger)]'"
          >
            {{ selectedExisting.active ? "ثبت‌شده" : "غیرفعال" }}
          </span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
          <input
            v-model="occasion"
            type="text"
            class="input"
            maxlength="200"
            placeholder="مناسبت (مثلاً عید نوروز، سالگرد تأسیس سامانه...)"
          />
          <label class="flex items-center gap-1.5 text-[11px] px-1 select-none">
            <input v-model="active" type="checkbox" />
            فعال
          </label>
          <button class="btn btn-primary btn-sm" :disabled="saving" @click="saveSelected">
            <i v-if="saving" class="fas fa-circle-notch fa-spin ml-1"></i>
            {{ selectedExisting ? "ویرایش" : "ثبت روز رایگان" }}
          </button>
          <button
            v-if="selectedExisting"
            class="btn btn-ghost btn-sm !text-[var(--danger)]"
            :disabled="saving"
            @click="deleteSelected"
          >
            <i class="fas fa-trash ml-1"></i>
            حذف
          </button>
        </div>
      </div>
    </div>

    <!-- فهرست روزهای ثبت‌شده -->
    <div class="font-bold text-sm mb-3 flex items-center gap-2">
      <i class="fas fa-list text-[var(--accent)]"></i> روزهای ثبت‌شده
      <span class="text-[11px] text-[var(--text-muted)] font-semibold">({{ sortedFreeDays.length }})</span>
    </div>
    <div class="card !rounded-2xl overflow-hidden">
      <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>تاریخ شمسی</th>
              <th>تاریخ میلادی</th>
              <th>مناسبت</th>
              <th>وضعیت</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="sortedFreeDays.length === 0">
              <td colspan="5" class="text-center text-[var(--text-faint)] py-10">
                هنوز روزی به‌عنوان روز رایگان ثبت نشده است — از تقویم بالا یک روز را انتخاب کنید
              </td>
            </tr>
            <tr v-for="row in sortedFreeDays" :key="row.id">
              <td class="text-xs font-semibold whitespace-nowrap">{{ formatJalaliLabel(row.day) }}</td>
              <td class="text-xs text-[var(--text-muted)] whitespace-nowrap" dir="ltr">{{ row.day }}</td>
              <td class="text-xs">{{ row.occasion || "—" }}</td>
              <td>
                <span
                  class="px-2 py-1 rounded-full text-[10px] font-semibold"
                  :class="row.active ? 'bg-[var(--success-glow)] text-[var(--success)]' : 'bg-[var(--danger-glow)] text-[var(--danger)]'"
                >
                  {{ row.active ? "فعال" : "غیرفعال" }}
                </span>
              </td>
              <td>
                <div class="flex items-center gap-1">
                  <button class="btn btn-ghost btn-xs" title="انتخاب در تقویم" @click="selectRow(row)">
                    <i class="fas fa-pen text-xs"></i>
                  </button>
                  <button class="btn btn-ghost btn-xs !text-[var(--danger)]" :disabled="saving" title="حذف" @click="removeRow(row)">
                    <i class="fas fa-trash text-xs"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, inject, onMounted, ref } from "vue";
import { auth } from "../../stores/auth";
import {
  JALALI_MONTHS,
  JALALI_WEEKDAYS_SHORT,
  formatJalaliLabel,
  isoToJalali,
  jalaliMonthLength,
  jalaliMonthStartOffset,
  jalaliToISO,
  todayJalaliParts,
} from "../../utils/jalaliDate";

const notify = inject("notify", () => {});

const giftType = ref("days");
const giftValue = ref(30);
const giftSaving = ref(false);

const saving = ref(false);
const occasion = ref("");
const active = ref(true);

const freeDays = computed(() => auth.state.freeDays || []);
const sortedFreeDays = computed(() => [...freeDays.value].sort((a, b) => (a.day < b.day ? -1 : 1)));
const freeByDay = computed(() => Object.fromEntries(freeDays.value.map((d) => [d.day, d])));

const today = todayJalaliParts();
const todayIso = jalaliToISO(today.jy, today.jm, today.jd);
const viewYear = ref(today.jy);
const viewMonth = ref(today.jm);

const monthLabel = computed(() => `${JALALI_MONTHS[viewMonth.value - 1]} ${fa(viewYear.value)}`);

const cells = computed(() => {
  const out = [];
  const offset = jalaliMonthStartOffset(viewYear.value, viewMonth.value);
  for (let i = 0; i < offset; i += 1) out.push(null);
  const len = jalaliMonthLength(viewYear.value, viewMonth.value);
  for (let d = 1; d <= len; d += 1) {
    const iso = jalaliToISO(viewYear.value, viewMonth.value, d);
    out.push({ d, iso, free: freeByDay.value[iso] || null });
  }
  return out;
});

const selectedIso = ref("");
const selectedExisting = computed(() => freeByDay.value[selectedIso.value] || null);
const selectedJalaliLabel = computed(() => (selectedIso.value ? formatJalaliLabel(selectedIso.value) : ""));

const currentGiftLabel = computed(() => {
  const g = auth.state.signupGift;
  if (!g) return "";
  return g.type === "days" ? `${fa(g.value)} روز استفاده رایگان` : `${fa(g.value)} کروکی رایگان`;
});

function fa(n) {
  return Number(n || 0).toLocaleString("fa-IR", { useGrouping: false });
}

function pickDay(cell) {
  selectedIso.value = cell.iso;
  occasion.value = cell.free?.occasion || "";
  active.value = cell.free ? cell.free.active !== false : true;
}

function selectRow(row) {
  selectedIso.value = row.day;
  occasion.value = row.occasion || "";
  active.value = row.active !== false;
  const j = isoToJalali(row.day);
  if (j) {
    viewYear.value = j.jy;
    viewMonth.value = j.jm;
  }
}

function shiftMonth(delta) {
  let m = viewMonth.value + delta;
  let y = viewYear.value;
  if (m < 1) {
    m = 12;
    y -= 1;
  } else if (m > 12) {
    m = 1;
    y += 1;
  }
  viewMonth.value = m;
  viewYear.value = y;
}

async function saveSelected() {
  if (!selectedIso.value) return;
  saving.value = true;
  const res = await auth.saveFreeDay({
    day: selectedIso.value,
    occasion: occasion.value.trim(),
    isActive: active.value,
  });
  saving.value = false;
  if (res.success) notify("روز رایگان ذخیره شد.");
  else notify(res.error || "خطا در ثبت روز رایگان", "error");
}

async function deleteSelected() {
  const row = selectedExisting.value;
  if (!row) return;
  if (!confirm("این روز رایگان حذف شود؟")) return;
  saving.value = true;
  const res = await auth.removeFreeDay(row.id);
  saving.value = false;
  if (res.success) {
    notify("روز رایگان حذف شد.");
    occasion.value = "";
    active.value = true;
  } else {
    notify(res.error || "خطا در حذف روز رایگان", "error");
  }
}

async function removeRow(row) {
  if (!confirm(`روز «${formatJalaliLabel(row.day)}» از روزهای رایگان حذف شود؟`)) return;
  saving.value = true;
  const res = await auth.removeFreeDay(row.id);
  saving.value = false;
  if (res.success) {
    notify("روز رایگان حذف شد.");
    if (selectedIso.value === row.day) {
      occasion.value = "";
      active.value = true;
    }
  } else {
    notify(res.error || "خطا در حذف روز رایگان", "error");
  }
}

async function saveGift() {
  giftSaving.value = true;
  const res = await auth.saveSignupGift(giftType.value, giftValue.value);
  giftSaving.value = false;
  if (res.success) notify("تنظیمات هدیه ثبت‌نام ذخیره شد.");
  else notify(res.error || "خطا در ذخیره تنظیمات هدیه ثبت‌نام", "error");
}

onMounted(async () => {
  const days = await auth.loadFreeDays();
  if (!days.success) notify(days.error || "خطا در دریافت روزهای رایگان", "error");
  const gift = await auth.loadSignupGift();
  if (gift.success && auth.state.signupGift) {
    giftType.value = auth.state.signupGift.type;
    giftValue.value = auth.state.signupGift.value;
  }
});
</script>

<style scoped>
.cal-day {
  position: relative;
  height: 44px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font);
  cursor: pointer;
  transition: all 0.18s var(--ease-out);
}

.cal-day:hover {
  border-color: var(--accent);
}

.cal-day.today {
  box-shadow: inset 0 0 0 1.5px var(--accent);
}

.cal-day.free {
  background: var(--success-glow);
  border-color: var(--success);
  color: var(--success);
}

.cal-day.off {
  background: var(--surface2);
  border-style: dashed;
  color: var(--text-faint);
  text-decoration: line-through;
}

.cal-day.selected {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.cal-dot {
  position: absolute;
  bottom: 5px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
}
</style>
