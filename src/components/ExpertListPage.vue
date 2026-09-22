<template>
  <div class="min-h-screen flex flex-col bg-[var(--bg)]">
    <header class="sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--border)] backdrop-blur-md">
      <div class="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-soft)] flex items-center justify-center shadow-lg shadow-[var(--accent-glow-strong)]">
            <i class="fas fa-user-tie text-[#241a05] text-lg"></i>
          </div>
          <div>
            <div class="font-extrabold text-sm leading-tight">کارشناسان سامانه</div>
            <div class="text-[11px] text-[var(--text-muted)]">{{ experts.length }} کارشناس تأییدشده</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-primary btn-sm" @click="$emit('request')">
            <i class="fas fa-handshake ml-1"></i> درخواست همکاری
          </button>
          <button class="btn btn-ghost btn-sm" @click="$emit('home')">
            <i class="fas fa-house ml-1"></i> صفحه اصلی
          </button>
        </div>
      </div>
    </header>

    <main class="flex-1 max-w-7xl w-full mx-auto px-5 py-10">
      <div class="text-center mb-8">
        <h1 class="text-2xl md:text-3xl font-extrabold mb-2">لیست کارشناسان</h1>
        <p class="text-sm text-[var(--text-muted)] leading-7 max-w-xl mx-auto">
          کارشناسان زیر مدارکشان توسط مدیر سامانه تأیید شده است.
          برای امور نقشه‌برداری، تفسیر و صدور سند می‌توانید با آن‌ها تماس بگیرید.
        </p>
      </div>

      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-6">
        <div class="relative flex-1">
          <i class="fas fa-magnifying-glass absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-faint)]"></i>
          <input v-model="q" type="text" class="input !pr-9" placeholder="جستجوی نام، تخصص یا عنوان..." />
        </div>
        <div class="flex gap-2 overflow-x-auto">
          <button
            class="px-3 py-2 rounded-lg border text-xs font-semibold whitespace-nowrap transition"
            :class="!titleFilter ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface2)] text-[var(--text-muted)]'"
            @click="titleFilter = ''"
          >
            همه
          </button>
          <button
            v-for="t in titles"
            :key="t"
            class="px-3 py-2 rounded-lg border text-xs font-semibold whitespace-nowrap transition"
            :class="titleFilter === t ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface2)] text-[var(--text-muted)]'"
            @click="titleFilter = titleFilter === t ? '' : t"
          >
            {{ t }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="text-center text-[var(--text-faint)] text-sm py-16">
        <i class="fas fa-circle-notch fa-spin ml-1"></i> در حال دریافت لیست کارشناسان...
      </div>

      <div v-else-if="filtered.length === 0" class="max-w-xl mx-auto rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-8 text-center">
        <div class="w-14 h-14 rounded-2xl bg-[var(--accent-glow)] border border-[var(--accent)]/30 flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-user-tie text-xl text-[var(--accent)]"></i>
        </div>
        <div class="font-bold text-sm mb-1">{{ experts.length === 0 ? "هنوز کارشناسی ثبت نشده است" : "موردی یافت نشد" }}</div>
        <p class="text-xs text-[var(--text-muted)] leading-6 mb-5">
          {{ experts.length === 0 ? "اگر کارشناس هستید، درخواست همکاری ثبت کنید تا پس از تأیید مدیر در این لیست نمایش داده شوید." : "عبارت جستجو یا فیلتر عنوان را تغییر دهید." }}
        </p>
        <button class="btn btn-primary" @click="$emit('request')">
          <i class="fas fa-handshake ml-1"></i> ثبت درخواست همکاری
        </button>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div v-for="ex in filtered" :key="ex.id" class="card !rounded-2xl p-5">
          <div class="flex items-center gap-3 mb-4">
            <span class="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-soft)] flex items-center justify-center font-extrabold text-[#241a05] text-lg shadow-md shadow-[var(--accent-glow)] shrink-0">
              {{ expertInitials(ex.fullName || ex.name) }}
            </span>
            <div class="min-w-0">
              <div class="font-bold text-sm truncate">{{ ex.fullName || ex.name }}</div>
              <div class="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                <i class="fas fa-circle-check text-[var(--success)] text-[10px]"></i> تأییدشده توسط سامانه
              </div>
            </div>
          </div>
          <div class="flex flex-wrap gap-1.5 mb-3">
            <span
              v-for="t in (ex.titles || [])"
              :key="t"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
              :style="{ background: expertTitleMeta(t).bg, color: expertTitleMeta(t).color }"
            >
              <i class="fas text-[10px]" :class="expertTitleMeta(t).icon"></i> {{ t }}
            </span>
          </div>
          <div v-if="(ex.specialties || []).length" class="flex flex-wrap gap-1.5 mb-4">
            <span v-for="s in ex.specialties" :key="s" class="px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface2)] text-[10px] text-[var(--text-muted)] font-semibold">{{ s }}</span>
          </div>
          <a v-if="ex.phone" :href="'tel:' + ex.phone" class="btn btn-ghost w-full !rounded-xl !text-[13px]" dir="ltr">
            <i class="fas fa-phone ml-1 text-[var(--success)]"></i> {{ ex.phone }}
          </a>
        </div>
      </div>

    </main>

    <footer class="border-t border-[var(--border)] py-4 text-center text-[11px] text-[var(--text-faint)] bg-[var(--bg-elevated)]/60">
      سامانه تولید کروکی نقشه — کارشناسان
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { auth } from "../stores/auth";
import { EXPERT_TITLES, expertTitleMeta, expertInitials } from "../utils/experts";

defineEmits(["home", "request"]);

const titles = EXPERT_TITLES;
const q = ref("");
const titleFilter = ref("");
const loading = ref(false);

const experts = computed(() => auth.state.experts || []);

const filtered = computed(() => {
  const needle = q.value.trim().toLowerCase();
  return experts.value.filter((ex) => {
    if (titleFilter.value && !(ex.titles || []).includes(titleFilter.value)) return false;
    if (!needle) return true;
    const hay = [ex.fullName || ex.name || "", ex.phone || "", ...((ex.titles || [])), ...((ex.specialties || []))].join(" ").toLowerCase();
    return hay.includes(needle);
  });
});

onMounted(() => {
  loading.value = true;
  auth.loadExperts().finally(() => {
    loading.value = false;
  });
});
</script>
