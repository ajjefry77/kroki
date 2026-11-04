<template>
  <section>
    <div class="card !rounded-2xl p-4 mb-4">
      <div class="font-bold text-sm mb-3 flex items-center gap-2">
        <i class="fas fa-ticket text-[var(--accent)]"></i> ساخت کد معرف جدید
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
        <div>
          <label class="block mb-1 text-[11px] font-medium text-[var(--text-muted)]">کد (خالی = تصادفی)</label>
          <input v-model="referralForm.code" type="text" class="input" dir="ltr" placeholder="A1B2C3" />
        </div>
        <div>
          <label class="block mb-1 text-[11px] font-medium text-[var(--text-muted)]">تعداد کروکی رایگان</label>
          <input v-model.number="referralForm.free_kroki_amount" type="number" min="0" class="input" dir="ltr" />
        </div>
        <div>
          <label class="block mb-1 text-[11px] font-medium text-[var(--text-muted)]">روز استفاده رایگان</label>
          <input v-model.number="referralForm.free_access_days" type="number" min="0" class="input" dir="ltr" placeholder="۰ = بدون زمان" />
        </div>
        <div>
          <label class="block mb-1 text-[11px] font-medium text-[var(--text-muted)]">سقف استفاده (خالی = نامحدود)</label>
          <input v-model="referralForm.max_uses" type="number" min="1" class="input" dir="ltr" placeholder="نامحدود" />
        </div>
        <div>
          <label class="block mb-1 text-[11px] font-medium text-[var(--text-muted)]">انقضا</label>
          <input v-model="referralForm.expires_at" type="text" class="input" dir="ltr" placeholder="خالی = بدون انقضا" />
        </div>
      </div>
      <p class="text-[11px] text-[var(--text-muted)] leading-5 mb-3">
        برای یک ماه، ۳۰ روز وارد کنید. کدهای شخصی کاربران هم در جدول پایین همین صفحه قابل ویرایش‌اند.
      </p>
      <div class="flex items-center gap-2">
        <button class="btn btn-primary btn-sm" :disabled="referralSaving" @click="createReferral">
          <i v-if="referralSaving" class="fas fa-circle-notch fa-spin ml-1"></i>
          <i v-else class="fas fa-plus ml-1"></i>
          ساخت کد
        </button>
        <span v-if="referralMsg" class="text-xs" :class="referralMsgOk ? 'text-[var(--success)]' : 'text-[var(--danger)]'">{{ referralMsg }}</span>
      </div>
    </div>

    <div class="font-bold text-sm mb-3 flex items-center gap-2">
      <i class="fas fa-ticket text-[var(--accent)]"></i> کدهای عمومی
    </div>
    <div class="card !rounded-2xl overflow-hidden mb-6">
      <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>کد</th>
              <th>کروکی رایگان</th>
              <th>روز رایگان</th>
              <th>مصرف / سقف</th>
              <th>انقضا</th>
              <th>وضعیت</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="referrals.length === 0">
              <td colspan="7" class="text-center text-[var(--text-faint)] py-10">کد معرفی ثبت نشده است</td>
            </tr>
            <tr v-for="r in referrals" :key="r.id">
              <td>
                <input
                  type="text"
                  class="input !w-32 !py-1.5 !text-xs text-center tracking-widest"
                  dir="ltr"
                  :value="referralEditDrafts[r.id]?.code ?? r.code"
                  @input="setReferralDraft(r.id, 'code', $event.target.value)"
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  class="input !w-20 !py-1.5 !text-xs text-center"
                  dir="ltr"
                  :value="referralEditDrafts[r.id]?.free_kroki_amount ?? r.free_kroki_amount"
                  @input="setReferralDraft(r.id, 'free_kroki_amount', $event.target.value)"
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  max="36500"
                  class="input !w-20 !py-1.5 !text-xs text-center"
                  dir="ltr"
                  :value="referralEditDrafts[r.id]?.free_access_days ?? r.free_access_days ?? 0"
                  @input="setReferralDraft(r.id, 'free_access_days', $event.target.value)"
                />
              </td>
              <td class="text-xs whitespace-nowrap" dir="ltr">
                {{ r.used_count }} / {{ r.max_uses == null ? "نامحدود" : r.max_uses }}
                <input
                  type="number"
                  min="1"
                  class="input !w-20 !py-1.5 !text-xs text-center inline-block"
                  dir="ltr"
                  placeholder="نامحدود"
                  :value="referralEditDrafts[r.id]?.max_uses ?? r.max_uses ?? ''"
                  @input="setReferralDraft(r.id, 'max_uses', $event.target.value)"
                />
              </td>
              <td>
                <input
                  type="text"
                  class="input !w-32 !py-1.5 !text-xs text-center"
                  dir="ltr"
                  placeholder="بدون انقضا"
                  :value="referralEditDrafts[r.id]?.expires_at ?? r.expires_at ?? ''"
                  @input="setReferralDraft(r.id, 'expires_at', $event.target.value)"
                />
              </td>
              <td>
                <button
                  class="px-2 py-1 rounded-full text-[10px] font-semibold transition"
                  :class="r.is_active ? 'bg-[var(--success-glow)] text-[var(--success)]' : 'bg-[var(--danger-glow)] text-[var(--danger)]'"
                  :disabled="busy"
                  @click="toggleReferral(r)"
                >
                  {{ r.is_active ? "فعال" : "غیرفعال" }}
                </button>
              </td>
              <td>
                <div class="flex items-center gap-1">
                  <button class="btn btn-secondary btn-xs" :disabled="busy" title="ذخیره ویرایش" @click="saveReferralEdit(r)">
                    <i class="fas fa-floppy-disk text-xs"></i>
                  </button>
                  <button class="btn btn-ghost btn-xs !text-[var(--danger)]" :disabled="busy" @click="removeReferral(r)">
                    <i class="fas fa-trash text-xs"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="font-bold text-sm mb-3 flex items-center gap-2">
      <i class="fas fa-id-badge text-[var(--accent)]"></i> کدهای شخصی کاربران
      <span class="text-[11px] text-[var(--text-muted)] font-semibold">({{ personalReferralCodes.length }})</span>
    </div>
    <div class="card !rounded-2xl overflow-hidden">
      <div class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>کاربر</th>
              <th>کد معرف شخصی</th>
              <th>کروکی رایگان</th>
              <th>زیرمجموعه</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="personalReferralCodes.length === 0">
              <td colspan="5" class="text-center text-[var(--text-faint)] py-10">هنوز کد شخصی برای کاربران ثبت نشده است — از تب کاربران ستون «کد معرف شخصی» ثبت کنید</td>
            </tr>
            <tr v-for="p in personalReferralCodes" :key="p.id">
              <td>
                <div class="text-xs font-semibold">{{ p.full_name || p.name || p.username }}</div>
                <div class="text-[10px] text-[var(--text-muted)]" dir="ltr">{{ p.phone || p.username }}</div>
              </td>
              <td>
                <div class="flex items-center gap-1">
                  <input
                    type="text"
                    class="input !w-32 !py-1.5 !text-xs text-center tracking-widest"
                    dir="ltr"
                    :value="personalCodeDrafts[p.id] ?? p.code ?? p.referral_code ?? ''"
                    @input="personalCodeDrafts[p.id] = $event.target.value"
                    @keyup.enter="savePersonalCode(p)"
                  />
                  <button class="btn btn-secondary btn-xs" :disabled="busy" title="ذخیره ویرایش کد شخصی" @click="savePersonalCode(p)">
                    <i class="fas fa-check text-xs"></i>
                  </button>
                </div>
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  class="input !w-20 !py-1.5 !text-xs text-center"
                  dir="ltr"
                  :value="personalFreeDrafts[p.id] ?? p.free_kroki_amount ?? 1"
                  @input="personalFreeDrafts[p.id] = $event.target.value"
                  @keyup.enter="savePersonalCode(p)"
                />
              </td>
              <td class="text-xs" dir="ltr">{{ p.subordinate_count ?? "—" }}</td>
              <td>
                <div class="flex items-center gap-1">
                  <button class="btn btn-ghost btn-xs" title="رفتن به کاربر" @click="goToUser(p.id)">
                    <i class="fas fa-user text-xs"></i>
                  </button>
                  <button class="btn btn-ghost btn-xs !text-[var(--danger)]" :disabled="busy" title="حذف کد شخصی" @click="deletePersonalCode(p)">
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
import { computed, inject, reactive, ref } from "vue";
import { auth } from "../../stores/auth";

const emit = defineEmits(["go-to-user"]);

const notify = inject("notify", () => {});

const busy = ref(false);
const referrals = computed(() => auth.state.referrals);
const personalReferralCodes = computed(() => auth.state.personalReferralCodes?.length ? auth.state.personalReferralCodes : auth.state.users.filter((u) => u.referralCode).map((u) => ({ id: u.id, username: u.username, full_name: u.name, phone: u.phone, code: u.referralCode, free_kroki_amount: Number(u.personalFreeKroki ?? 1) })));

const referralForm = reactive({ code: "", free_kroki_amount: 1, free_access_days: 0, max_uses: "", expires_at: "" });
const referralSaving = ref(false);
const referralMsg = ref("");
const referralMsgOk = ref(true);
const referralEditDrafts = reactive({});
const personalCodeDrafts = reactive({});
const personalFreeDrafts = reactive({});

async function createReferral() {
  referralMsg.value = "";
  referralSaving.value = true;
  const res = await auth.createReferral({
    code: referralForm.code,
    free_kroki_amount: referralForm.free_kroki_amount,
    free_access_days: referralForm.free_access_days,
    max_uses: referralForm.max_uses,
    expires_at: referralForm.expires_at,
  });
  referralSaving.value = false;
  referralMsgOk.value = res.success;
  referralMsg.value = res.success ? "کد معرف ساخته شد." : res.error;
  if (res.success) {
    referralForm.code = "";
    referralForm.free_kroki_amount = 1;
    referralForm.free_access_days = 0;
    referralForm.max_uses = "";
    referralForm.expires_at = "";
  }
}

async function toggleReferral(r) {
  busy.value = true;
  const res = await auth.updateReferral(r.id, { is_active: !r.is_active });
  busy.value = false;
  if (!res.success) notify(res.error || "خطا در تغییر وضعیت کد", "error");
}

function setReferralDraft(id, field, value) {
  if (!referralEditDrafts[id]) referralEditDrafts[id] = {};
  referralEditDrafts[id][field] = value;
}

async function saveReferralEdit(r) {
  const d = referralEditDrafts[r.id] || {};
  const patch = {};
  if (d.code !== undefined && String(d.code).trim() && String(d.code).trim().toUpperCase() !== r.code) patch.code = String(d.code).trim();
  if (d.free_kroki_amount !== undefined && d.free_kroki_amount !== "" && Number(d.free_kroki_amount) !== Number(r.free_kroki_amount)) patch.free_kroki_amount = Number(d.free_kroki_amount);
  if (d.free_access_days !== undefined && d.free_access_days !== "" && Number(d.free_access_days) !== Number(r.free_access_days ?? 0)) patch.free_access_days = Number(d.free_access_days);
  // سقف خالی = نامحدود (چندبارمصرف)
  if (d.max_uses !== undefined) {
    const cur = r.max_uses == null ? "" : String(r.max_uses);
    const nxt = String(d.max_uses ?? "").trim();
    if (nxt !== cur) patch.max_uses = nxt === "" ? null : Number(nxt);
  }
  if (d.expires_at !== undefined && (d.expires_at || "") !== (r.expires_at || "")) patch.expires_at = d.expires_at || "";
  if (!Object.keys(patch).length) {
    notify("تغییری برای ذخیره وجود ندارد");
    return;
  }
  busy.value = true;
  const res = await auth.updateReferral(r.id, patch);
  busy.value = false;
  if (res.success) {
    delete referralEditDrafts[r.id];
    notify("کد معرف ویرایش شد.");
  } else {
    notify(res.error || "خطا در ویرایش کد", "error");
  }
}

async function savePersonalCode(p) {
  const draft = personalCodeDrafts[p.id] ?? p.code ?? "";
  if (!String(draft || "").trim()) {
    notify("کد معرف را وارد کنید", "error");
    return;
  }
  const freeDraft = personalFreeDrafts[p.id] ?? p.free_kroki_amount ?? 1;
  busy.value = true;
  const res = await auth.adminSetUserReferralCode(p.id, draft, freeDraft);
  busy.value = false;
  if (res.success) {
    delete personalCodeDrafts[p.id];
    delete personalFreeDrafts[p.id];
    notify(`کد معرف ${p.full_name || p.username} به‌روزرسانی شد: ${res.code}`);
  } else {
    notify(res.error || "خطا در ویرایش کد شخصی", "error");
  }
}

async function deletePersonalCode(p) {
  if (!confirm(`کد شخصی «${p.code}» حذف شود؟ زیرمجموعه‌های قبلی حفظ می‌شوند.`)) return;
  busy.value = true;
  const res = await auth.adminDeleteUserReferralCode(p.id);
  busy.value = false;
  if (res.success) {
    delete personalCodeDrafts[p.id];
    delete personalFreeDrafts[p.id];
    notify("کد شخصی حذف شد.");
  } else {
    notify(res.error || "خطا در حذف کد شخصی", "error");
  }
}

function goToUser(id) {
  emit("go-to-user", id);
}

async function removeReferral(r) {
  busy.value = true;
  const res = await auth.deleteReferral(r.id);
  busy.value = false;
  if (res.success) notify("کد معرف حذف شد.");
  else notify(res.error || "خطا در حذف کد", "error");
}
</script>
