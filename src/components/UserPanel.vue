<template>
  <div class="min-h-screen flex flex-col bg-[var(--bg)]">
    <!-- سربرگ -->
    <header class="sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--border)] backdrop-blur-md">
      <div class="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-soft)] flex items-center justify-center shadow-lg shadow-[var(--accent-glow-strong)]">
            <i class="fas fa-drafting-compass text-[#241a05] text-lg"></i>
          </div>
          <div>
            <div class="font-extrabold text-sm leading-tight">پنل کاربری</div>
            <div class="text-[11px] text-[var(--text-muted)]">{{ user?.name }} — {{ user?.username }}</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-ghost btn-sm" @click="$emit('home')">
            <i class="fas fa-house ml-1"></i> صفحه اصلی
          </button>
          <button class="btn btn-ghost btn-sm" @click="logout">
            <i class="fas fa-right-from-bracket ml-1"></i> خروج
          </button>
        </div>
      </div>
    </header>

    <main class="flex-1 max-w-5xl w-full mx-auto px-5 py-6">
      <!-- آمار -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div class="card !rounded-2xl flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-[var(--accent-glow)] border border-[var(--accent)]/30 flex items-center justify-center">
            <i class="fas fa-wallet text-[var(--accent)]"></i>
          </div>
          <div>
            <div class="text-[11px] text-[var(--text-muted)]">موجودی کیف پول</div>
            <div class="font-extrabold text-lg" dir="ltr">{{ fmtMoney(wallet) }} <span class="text-[11px] font-medium text-[var(--text-muted)]">تومان</span></div>
          </div>
        </div>
        <div class="card !rounded-2xl flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-[var(--info-glow)] border border-[var(--info)]/30 flex items-center justify-center">
            <i class="fas fa-gift text-[var(--info)]"></i>
          </div>
          <div>
            <div class="text-[11px] text-[var(--text-muted)]">کروکی رایگان</div>
            <div class="font-extrabold text-lg">{{ freeKroki }} عدد</div>
          </div>
        </div>
        <div class="card !rounded-2xl flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl bg-[var(--warning-glow)] border border-[var(--warning)]/30 flex items-center justify-center">
            <i class="fas fa-hourglass-half text-[var(--warning)]"></i>
          </div>
          <div>
            <div class="text-[11px] text-[var(--text-muted)]">شارژ در انتظار تأیید</div>
            <div class="font-extrabold text-lg">{{ pending.length }} مورد</div>
          </div>
        </div>
      </div>

      <!-- تب‌ها -->
      <div class="tabs-container mb-6">
        <div class="tabs-wrapper tabs-scroll">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="tab-btn"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <span class="tab-icon-wrap">
              <i class="fas" :class="tab.icon"></i>
            </span>
            <span class="tab-label">{{ tab.label }}</span>
          </button>
        </div>
      </div>

      <!-- شارژ / تاریخچه -->
      <section v-if="activeTab === 'wallet'" class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div class="card !rounded-2xl">
          <div class="font-bold text-sm mb-4 flex items-center gap-2">
            <i class="fas fa-money-bill-wave text-[var(--accent)]"></i> افزایش موجودی
          </div>

          <div class="rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-4 mb-4">
            <div class="text-xs font-semibold text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
              <i class="fas fa-money-bill-transfer text-[var(--accent)]"></i>
              مبلغ را به این کارت واریز کنید
            </div>
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-lg font-extrabold tracking-widest text-center" dir="ltr">{{ bankCard }}</div>
                <div class="text-[11px] text-[var(--text-muted)] mt-1 text-center">{{ cardOwner }}</div>
              </div>
              <button class="btn btn-ghost btn-xs shrink-0" @click="copyCard">
                <i class="fas mr-0.5" :class="copied ? 'fa-check' : 'fa-copy'"></i>
                {{ copied ? "کپی شد" : "کپی" }}
              </button>
            </div>
          </div>

          <label class="block mb-1.5 text-xs font-medium">مبلغ (تومان)</label>
          <div class="flex flex-wrap gap-1.5 mb-2">
            <button
              v-for="p in presets"
              :key="p"
              class="px-3 py-1.5 rounded-lg border text-xs font-medium transition"
              :class="amount === p ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface2)] text-[var(--text-muted)]'"
              @click="amount = p"
            >
              {{ fmtMoney(p) }}
            </button>
          </div>
          <input v-model.number="amount" type="number" min="1000" step="5000" class="input mb-4" dir="ltr" placeholder="مبلغ دلخواه" />

          <label class="block mb-1.5 text-xs font-medium">شناسه پرداخت *</label>
          <input v-model="paymentId" type="text" class="input mb-4 text-center tracking-widest" dir="ltr" placeholder="شناسه ۱۶ رقمی پیامک شده" maxlength="16" @input="formatPaymentId" />

          <label class="block mb-1.5 text-xs font-medium">شماره کارت واریزکننده *</label>
          <input v-model="card" type="text" class="input mb-4 text-center tracking-widest" dir="ltr" placeholder="شماره کارت مبدا شما" maxlength="16" @input="formatCard" />

          <label class="block mb-1.5 text-xs font-medium">توضیحات (اختیاری)</label>
          <input v-model="note" type="text" class="input mb-4" placeholder="کد پیگیری یا توضیحات" />

          <button class="btn btn-primary w-full !py-3" :disabled="!validCharge || chargeSaving" @click="submitCharge">
            <i v-if="chargeSaving" class="fas fa-circle-notch fa-spin ml-1"></i>
            <i v-else class="fas fa-paper-plane ml-1"></i>
            {{ chargeSaving ? "در حال ارسال..." : "ثبت درخواست شارژ" }}
          </button>
          <p class="text-[11px] text-[var(--text-faint)] mt-3 leading-5 text-center">
            پس از واریز، درخواست شما برای مدیر ارسال می‌شود و پس از تأیید بلافاصله به کیف پول شما افزوده می‌شود.
          </p>

          <Transition name="modal">
            <div v-if="msg" class="mt-4 rounded-xl px-4 py-3 text-sm font-medium" :class="msgOk ? 'bg-[var(--success-glow)] border border-[var(--success)]/30 text-[var(--success)]' : 'bg-[var(--danger-glow)] border border-[var(--danger)]/30 text-[var(--danger)]'">
              <i class="fas ml-1" :class="msgOk ? 'fa-circle-check' : 'fa-circle-xmark'"></i>{{ msg }}
            </div>
          </Transition>

          <!-- درخواست‌های شارژ من -->
          <div class="mt-6 pt-4 border-t border-[var(--border)]">
            <div class="font-bold text-sm mb-3 flex items-center gap-2">
              <i class="fas fa-clock-rotate-left text-[var(--accent)]"></i> درخواست‌های شارژ من
            </div>
            <ul v-if="myCharges.length" class="space-y-2.5">
              <li v-for="c in myCharges" :key="c.id" class="rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-3">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-semibold" dir="ltr">{{ fmtMoney(c.amount) }} تومان</span>
                  <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold" :class="chargeStatusClass(c.status)">{{ chargeStatusLabel(c.status) }}</span>
                </div>
                <div class="flex items-center justify-between gap-2 mt-1.5">
                  <span class="text-[10px] text-[var(--text-faint)]">{{ fmtDate(c.at) }}</span>
                  <span class="text-[10px] text-[var(--text-faint)]" dir="ltr">{{ c.card || "—" }}</span>
                </div>
              </li>
            </ul>
            <p v-else class="text-[var(--text-faint)] text-xs text-center py-4">درخواست شارژی ثبت نشده است</p>
          </div>
        </div>

        <div class="card !rounded-2xl h-fit">
          <div class="font-bold text-sm mb-4 flex items-center gap-2">
            <i class="fas fa-clock-rotate-left text-[var(--accent)]"></i> تاریخچه کیف پول
          </div>
          <div v-if="!transactions.length" class="text-center text-[var(--text-faint)] text-sm py-10">
            هنوز تراکنشی ثبت نشده است
          </div>
          <ul v-else class="space-y-3">
            <li v-for="tx in transactions" :key="tx.id" class="rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-3">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-semibold">{{ tx.typeLabel }}</span>
                <span class="text-xs font-extrabold" :class="txColor(tx)">{{ txSign(tx) }} {{ fmtMoney(tx.amount) }}</span>
              </div>
              <div class="flex items-center justify-between gap-2 mt-1.5">
                <span class="text-[10px] text-[var(--text-faint)]">{{ fmtDate(tx.at) }}</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold" :class="statusClass(tx.status)">{{ statusLabel(tx.status) }}</span>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <!-- قالب‌ها -->
      <section v-else-if="activeTab === 'templates'">
        <div v-if="designing" class="card !rounded-2xl">
          <TemplateDesigner :model-value="editingTpl" :is-new="isNewTpl" @save="onTplSave" @cancel="designing = false" @update:model-value="editingTpl = $event" />
        </div>

        <template v-else>
          <div class="flex items-center justify-between mb-4">
            <div class="font-bold text-sm flex items-center gap-2">
              <i class="fas fa-layers text-[var(--accent)]"></i> قالب‌های من
            </div>
            <button class="btn btn-primary btn-sm" @click="startNew">
              <i class="fas fa-plus ml-1"></i> ساخت قالب شخصی
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- قالب شخصی -->
            <div v-for="t in customTemplates" :key="t.id" class="card !rounded-2xl p-4 relative border-2" :style="{ borderColor: t.headerColor + '55' }">
              <div class="absolute top-3 left-3 flex items-center gap-1">
                <button class="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition" title="ویرایش" @click="edit(t)">
                  <i class="fas fa-pen text-xs"></i>
                </button>
                <button class="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-[var(--danger)] transition" title="حذف" @click="remove(t.id)">
                  <i class="fas fa-trash text-xs"></i>
                </button>
              </div>
              <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-soft)] flex items-center justify-center mb-3">
                <i class="fas fa-crown text-[#241a05] text-sm"></i>
              </div>
              <div class="font-bold text-sm">{{ t.name }}</div>
              <div class="text-[11px] text-[var(--accent-soft)] font-medium mt-0.5">{{ t.subtitle }}</div>
              <p class="text-[11px] text-[var(--text-muted)] leading-5 mt-1.5">{{ t.description }}</p>
            </div>

            <!-- قالب استاندارد -->
            <div v-for="t in builtinCards" :key="t.id" class="card !rounded-2xl p-4">
              <div class="w-9 h-9 rounded-lg mb-3 flex items-center justify-center" :style="{ background: 'rgba(' + hexToRgb(t.headerColor) + ',0.14)', color: t.headerColor }">
                <i class="fas" :class="t.icon"></i>
              </div>
              <div class="font-bold text-sm">{{ t.name }}</div>
              <div class="text-[11px] text-[var(--text-muted)] font-medium mt-0.5">{{ t.subtitle }}</div>
              <p class="text-[11px] text-[var(--text-muted)] leading-5 mt-1.5">{{ t.description }}</p>
              <span class="inline-block mt-2.5 px-2 py-0.5 rounded-full bg-[var(--surface3)] border border-[var(--border)] text-[10px] text-[var(--text-faint)]">استاندارد سامانه</span>
            </div>
          </div>
        </template>
      </section>

      <!-- کروکی‌های من -->
      <section v-else-if="activeTab === 'krokis'">
        <div class="card !rounded-2xl p-4 mb-4">
          <div class="font-bold text-sm mb-3 flex items-center gap-2">
            <i class="fas fa-magnifying-glass text-[var(--accent)]"></i> پیگیری کروکی با کد
          </div>
          <div class="flex items-center gap-2">
            <input v-model="trackQuery" type="text" class="input" dir="ltr" placeholder="کد پیگیری، مانند KRK-XXXX" @keyup.enter="track" />
            <button class="btn btn-primary btn-sm shrink-0" :disabled="!trackQuery" @click="track">
              <i class="fas fa-search ml-1"></i> پیگیری
            </button>
          </div>
          <Transition name="modal">
            <div v-if="trackMsg" class="mt-3 rounded-xl px-4 py-3 text-sm font-medium" :class="trackMsgOk ? 'bg-[var(--success-glow)] border border-[var(--success)]/30 text-[var(--success)]' : 'bg-[var(--danger-glow)] border border-[var(--danger)]/30 text-[var(--danger)]'">
              <i class="fas ml-1" :class="trackMsgOk ? 'fa-circle-check' : 'fa-circle-xmark'"></i>{{ trackMsg }}
            </div>
          </Transition>
          <div v-if="tracked" class="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-4 text-xs">
            <div class="flex items-center justify-between gap-2">
              <span class="font-bold text-[var(--accent-soft)]" dir="ltr">{{ tracked.tracking_code }}</span>
              <span class="px-2 py-1 rounded-full text-[10px] font-semibold" :class="krokiStatusClass(tracked.status)">{{ krokiStatusLabel(tracked.status) }}</span>
            </div>
            <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
              <div class="flex justify-between"><span class="text-[var(--text-muted)]">عنوان</span><span class="font-semibold">{{ tracked.title }}</span></div>
              <div class="flex justify-between"><span class="text-[var(--text-muted)]">متقاضی</span><span class="font-semibold">{{ tracked.client_name }}</span></div>
              <div class="flex justify-between"><span class="text-[var(--text-muted)]">تاریخ</span><span class="font-semibold">{{ fmtDate(tracked.created_at) }}</span></div>
              <div class="flex justify-between"><span class="text-[var(--text-muted)]">مبلغ</span><span class="font-semibold" dir="ltr">{{ fmtMoney(tracked.price_paid) }} تومان</span></div>
            </div>
          </div>
        </div>

        <div class="font-bold text-sm mb-3 flex items-center gap-2">
          <i class="fas fa-drafting-compass text-[var(--accent)]"></i> کروکی‌های من
        </div>
        <div class="card !rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>کد پیگیری</th>
                  <th>عنوان</th>
                  <th>متقاضی</th>
                  <th>تاریخ</th>
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="myKrokis.length === 0">
                  <td colspan="5" class="text-center text-[var(--text-faint)] py-10">کروکی‌ای ثبت نشده است</td>
                </tr>
                <tr v-for="k in myKrokis" :key="k.id">
                  <td class="text-xs font-bold text-[var(--accent-soft)]" dir="ltr">{{ k.tracking_code }}</td>
                  <td class="text-xs font-semibold">{{ k.title }}</td>
                  <td class="text-xs">{{ k.client_name }}</td>
                  <td class="text-xs text-[var(--text-muted)]">{{ fmtDate(k.created_at) }}</td>
                  <td>
                    <span class="px-2 py-1 rounded-full text-[10px] font-semibold" :class="krokiStatusClass(k.status)">{{ krokiStatusLabel(k.status) }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- معرفی -->
      <section v-else-if="activeTab === 'referrals'">
        <div class="card !rounded-2xl p-4 mb-4">
          <div class="font-bold text-sm mb-3 flex items-center gap-2">
            <i class="fas fa-ticket text-[var(--accent)]"></i> فعال‌سازی کد معرف
          </div>
          <div class="flex items-center gap-2">
            <input v-model="referralCode" type="text" class="input" dir="ltr" placeholder="کد معرف دوستان خود" @keyup.enter="redeem" />
            <button class="btn btn-primary btn-sm shrink-0" :disabled="!referralCode" @click="redeem">
              <i class="fas fa-gift ml-1"></i> فعال‌سازی
            </button>
          </div>
          <Transition name="modal">
            <div v-if="referralMsg" class="mt-3 rounded-xl px-4 py-3 text-sm font-medium" :class="referralMsgOk ? 'bg-[var(--success-glow)] border border-[var(--success)]/30 text-[var(--success)]' : 'bg-[var(--danger-glow)] border border-[var(--danger)]/30 text-[var(--danger)]'">
              <i class="fas ml-1" :class="referralMsgOk ? 'fa-circle-check' : 'fa-circle-xmark'"></i>{{ referralMsg }}
            </div>
          </Transition>
        </div>

        <div class="font-bold text-sm mb-3 flex items-center gap-2">
          <i class="fas fa-clock-rotate-left text-[var(--accent)]"></i> معرفی‌های من
        </div>
        <div class="card !rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>کد</th>
                  <th>کروکی هدیه</th>
                  <th>تاریخ</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="myReferrals.length === 0">
                  <td colspan="3" class="text-center text-[var(--text-faint)] py-10">هنوز کد معرفی فعال نکرده‌اید</td>
                </tr>
                <tr v-for="r in myReferrals" :key="r.id">
                  <td class="text-xs font-bold tracking-widest" dir="ltr">{{ r.code }}</td>
                  <td class="text-xs">{{ r.free_kroki_granted }} عدد</td>
                  <td class="text-xs text-[var(--text-muted)]">{{ fmtDate(r.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- زیرمجموعه‌های نمایندگی -->
      <section v-else-if="activeTab === 'agent'">
        <div class="card !rounded-2xl p-4 mb-4">
          <div class="font-bold text-sm mb-2 flex items-center gap-2">
            <i class="fas fa-user-tie text-[var(--accent)]"></i> کد معرف نمایندگی من
          </div>
          <div class="flex items-center gap-2">
            <span class="font-bold tracking-widest text-lg" dir="ltr">{{ myAgent?.code || "—" }}</span>
          </div>
          <p class="text-[11px] text-[var(--text-muted)] mt-2">هر کس با این کد ثبت‌نام کند، زیرمجموعه شما محسوب می‌شود.</p>
        </div>

        <div class="font-bold text-sm mb-3 flex items-center gap-2">
          <i class="fas fa-sitemap text-[var(--accent)]"></i> زیرمجموعه‌های من
        </div>
        <div class="card !rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>نام</th>
                  <th>شماره همراه</th>
                  <th>تاریخ عضویت</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="subordinates.length === 0">
                  <td colspan="3" class="text-center text-[var(--text-faint)] py-10">هنوز زیرمجموعه‌ای ندارید</td>
                </tr>
                <tr v-for="s in subordinates" :key="s.id">
                  <td class="text-xs font-semibold">{{ s.full_name || s.name || s.username }}</td>
                  <td class="text-xs" dir="ltr">{{ s.phone || s.username }}</td>
                  <td class="text-xs text-[var(--text-muted)]">{{ fmtDate(s.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>

    <footer class="border-t border-[var(--border)] py-4 text-center text-[11px] text-[var(--text-faint)] bg-[var(--bg-elevated)]/60">
      سامانه تولید کروکی نقشه — پنل کاربری
    </footer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from "vue";
import { auth, fmtMoney, fmtDate } from "../stores/auth";
import { SKETCH_TEMPLATES, TEMPLATE_ICONS } from "../utils/templates";
import TemplateDesigner from "./TemplateDesigner.vue";

defineEmits(["home"]);

const user = computed(() => auth.state.user);
const wallet = computed(() => auth.walletOf());
const freeKroki = computed(() => auth.freeOf());
const transactions = ref([]);
const pending = computed(() => auth.pendingOf(user.value?.id || "none"));

const activeTab = ref("wallet");
const tabs = computed(() => {
  const t = [
    { id: "wallet", label: "کیف پول", icon: "fa-wallet" },
    { id: "templates", label: "قالب‌های من", icon: "fa-layers" },
    { id: "krokis", label: "کروکی‌های من", icon: "fa-drafting-compass" },
    { id: "referrals", label: "معرفی", icon: "fa-ticket" },
  ];
  if (auth.isAgent.value) t.push({ id: "agent", label: "زیرمجموعه‌ها", icon: "fa-sitemap" });
  return t;
});
const myAgent = computed(() => auth.state.myAgent);
const subordinates = computed(() => auth.state.subordinates);

const bankCard = auth.WALLET_CARD;
const cardOwner = auth.CARD_OWNER;
const copied = ref(false);
const presets = [50000, 100000, 200000, 500000, 1000000];

const amount = ref(100000);
const paymentId = ref("");
const card = ref("");
const note = ref("");
const msg = ref("");
const msgOk = ref(true);
const chargeSaving = ref(false);

const validCharge = computed(() => Number(amount.value) >= 1000 && String(paymentId.value).replace(/\D/g, "").length >= 8 && /^\d{16}$/.test(String(card.value).replace(/\D/g, "")));

const myCharges = computed(() => auth.requestsOf(user.value?.id || "none").slice(0, 20));

function formatPaymentId() {
  paymentId.value = paymentId.value.replace(/[^\d]/g, "").slice(0, 16);
}

function formatCard() {
  card.value = card.value.replace(/[^\d]/g, "").slice(0, 16);
}

async function copyCard() {
  try {
    await navigator.clipboard.writeText(bankCard);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1800);
  } catch {}
}

async function submitCharge() {
  msg.value = "";
  msgOk.value = true;
  chargeSaving.value = true;
  const res = await auth.requestCharge({ amount: amount.value, paymentId: paymentId.value, card: card.value, note: note.value });
  chargeSaving.value = false;
  msgOk.value = res.success;
  msg.value = res.success ? "درخواست شارژ ثبت شد و در انتظار تأیید مدیر است." : res.error;
  if (res.success) {
    amount.value = 100000;
    paymentId.value = "";
    card.value = "";
    note.value = "";
  }
}

function txSign(tx) {
  if (tx.status === "rejected") return "—";
  if (tx.type === "charge_request") return "";
  if (tx.type === "spend") return "−";
  if (tx.type === "free" || tx.type === "referral") return "0";
  return "+";
}
function txColor(tx) {
  if (tx.status === "rejected") return "text-[var(--danger)]";
  if (tx.type === "spend") return "text-[var(--danger)]";
  if (tx.type === "free" || tx.type === "referral") return "text-[var(--info)]";
  if (tx.type === "charge_request") return "text-[var(--warning)]";
  return "text-[var(--success)]";
}
function statusClass(s) {
  if (s === "success" || s === "approved") return "bg-[var(--success-glow)] text-[var(--success)]";
  if (s === "pending") return "bg-[var(--warning-glow)] text-[var(--warning)]";
  if (s === "rejected") return "bg-[var(--danger-glow)] text-[var(--danger)]";
  return "bg-[var(--surface3)] text-[var(--text-muted)]";
}
function statusLabel(s) {
  if (s === "success" || s === "approved") return "موفق";
  if (s === "pending") return "در انتظار";
  if (s === "rejected") return "رد شده";
  return s || "موفق";
}

function chargeStatusClass(s) {
  if (s === "approved") return "bg-[var(--success-glow)] text-[var(--success)]";
  if (s === "pending") return "bg-[var(--warning-glow)] text-[var(--warning)]";
  return "bg-[var(--danger-glow)] text-[var(--danger)]";
}
function chargeStatusLabel(s) {
  if (s === "approved") return "تأیید شد";
  if (s === "pending") return "در انتظار";
  return "رد شده";
}

function loadTx() {
  auth.loadTransactions().then((res) => {
    if (res.success) transactions.value = auth.txList();
  });
}

// قالب‌ها
const customTemplates = computed(() => auth.userTemplates());
const builtinCards = computed(() => SKETCH_TEMPLATES.map((t) => ({ ...t, icon: TEMPLATE_ICONS[t.id] || "fa-drafting-compass" })));

const designing = ref(false);
const isNewTpl = ref(true);
const editingTpl = ref(null);

function startNew() {
  isNewTpl.value = true;
  designing.value = true;
}
function edit(t) {
  editingTpl.value = { ...t };
  isNewTpl.value = false;
  designing.value = true;
}
async function onTplSave(t) {
  const res = await auth.saveUserTemplate(t, user.value?.id);
  if (res.success) {
    designing.value = false;
    editingTpl.value = null;
  } else {
    alert(res.error || "خطا در ذخیره قالب");
  }
}
async function remove(id) {
  const res = await auth.deleteUserTemplate(id);
  if (!res.success) alert(res.error || "خطا در حذف قالب");
}

// کروکی‌های من
const myKrokis = computed(() => auth.state.myKrokis);
const trackQuery = ref("");
const trackMsg = ref("");
const trackMsgOk = ref(true);
const tracked = ref(null);

async function track() {
  trackMsg.value = "";
  tracked.value = null;
  const res = await auth.trackKroki(String(trackQuery.value).trim());
  trackMsgOk.value = res.success;
  if (res.success) {
    tracked.value = res.kroki;
    trackMsg.value = "کروکی یافت شد.";
  } else {
    trackMsg.value = res.error || "کروکی یافت نشد";
  }
}

function krokiStatusClass(s) {
  if (s === "issued") return "bg-[var(--success-glow)] text-[var(--success)]";
  if (s === "paid") return "bg-[var(--info-glow)] text-[var(--info)]";
  return "bg-[var(--warning-glow)] text-[var(--warning)]";
}
function krokiStatusLabel(s) {
  if (s === "issued") return "صادر شده";
  if (s === "paid") return "پرداخت شده";
  return "پیش‌نویس";
}

// معرفی
const referralCode = ref("");
const referralMsg = ref("");
const referralMsgOk = ref(true);
const myReferrals = computed(() => auth.state.myReferrals);

async function redeem() {
  referralMsg.value = "";
  const res = await auth.redeemReferral(String(referralCode.value).trim());
  referralMsgOk.value = res.success;
  referralMsg.value = res.success
    ? `کد معرف فعال شد؛ ${res.freeKroki ?? ""} عدد کروکی رایگان دریافت کردید.`
    : res.error;
  if (res.success) referralCode.value = "";
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function logout() {
  auth.logout();
  location.reload();
}

watch(activeTab, (tab) => {
  if (tab === "wallet") {
    loadTx();
    auth.loadMyCharges();
  } else if (tab === "templates") {
    auth.loadTemplates();
  } else if (tab === "krokis") {
    auth.myKrokis();
  } else if (tab === "referrals") {
    auth.loadMyReferrals();
  } else if (tab === "agent") {
    auth.loadMyAgent();
    auth.loadSubordinates();
  }
});

onMounted(() => {
  loadTx();
  auth.loadMyCharges();
  auth.loadTemplates();
  auth.myKrokis();
  auth.loadMyReferrals();
});
</script>

<style scoped>
.tabs-container {
  position: relative;
}

.tabs-wrapper {
  display: flex;
  gap: 6px;
  padding: 5px;
  border-radius: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}

.tabs-scroll {
  flex-wrap: wrap;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font);
  cursor: pointer;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  transition: all 0.25s var(--ease-out);
  user-select: none;
}

.tab-btn:hover:not(.active) {
  color: var(--text);
  background: var(--surface2);
}

.tab-btn.active {
  background: var(--accent);
  color: #241a05;
  box-shadow: 0 4px 16px var(--accent-glow-strong), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.tab-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

.tab-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  font-size: 12px;
  transition: all 0.25s var(--ease-out);
}

.tab-btn.active .tab-icon-wrap {
  background: rgba(36, 26, 5, 0.15);
}

.tab-label {
  line-height: 1;
}

/* انیمیشن بخش‌ها */
section {
  animation: fadeSlideIn 0.35s var(--ease-out);
}

@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>