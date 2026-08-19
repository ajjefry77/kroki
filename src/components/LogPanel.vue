<template>
  <div class="fixed bottom-4 left-4 z-[3000] flex flex-col items-end gap-2">
    <Transition name="log-panel">
      <div
        v-if="open"
        class="log-panel w-[430px] max-w-[calc(100vw-32px)] max-h-[70vh] flex flex-col rounded-xl shadow-2xl border border-[var(--border-strong)] bg-[var(--surface)] overflow-hidden"
      >
        <!-- هدر -->
        <div class="flex items-center justify-between px-3 py-2.5 bg-[var(--surface2)] border-b border-[var(--border)]">
          <div class="flex items-center gap-2">
            <i class="fas fa-terminal text-[var(--accent)]"></i>
            <span class="text-sm font-semibold">گزارش سیستم</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)]">
              session: {{ sessionId }}
            </span>
          </div>
          <div class="flex items-center gap-1">
            <button class="log-btn" title="دانلود TXT" @click="download('txt')">
              <i class="fas fa-file-lines"></i>
            </button>
            <button class="log-btn" title="دانلود JSON" @click="download('json')">
              <i class="fas fa-code"></i>
            </button>
            <button class="log-btn" title="پاک کردن گزارش" @click="clearLogs">
              <i class="fas fa-trash-alt"></i>
            </button>
            <button class="log-btn" title="بستن" @click="open = false">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>

        <!-- فیلترها -->
        <div class="flex items-center gap-1.5 px-3 py-2 border-b border-[var(--border)] bg-[var(--bg)]">
          <div class="flex items-center gap-1 text-[10px] flex-shrink-0">
            <button
              v-for="lvl in ['all', 'debug', 'info', 'warn', 'error']"
              :key="lvl"
              class="log-filter"
              :class="[filter === lvl ? 'active-' + lvl : '', lvl === 'all' ? 'text-[var(--text-muted)]' : '']"
              @click="filter = lvl"
            >
              {{ filterLabel(lvl) }}
            </button>
          </div>
          <div class="relative flex-1">
            <i class="fas fa-search absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-faint)]"></i>
            <input
              v-model="search"
              type="text"
              class="w-full bg-[var(--surface)] border border-[var(--border)] rounded-md pr-7 pl-2 py-1 text-[11px] outline-none focus:border-[var(--accent)]"
              placeholder="جستجو…"
            />
          </div>
        </div>

        <!-- لیست -->
        <div ref="listRef" class="flex-1 min-h-0 overflow-y-auto px-2 py-1.5 space-y-1 log-list">
          <div
            v-for="e in visibleLogs"
            :key="e.id"
            class="flex items-start gap-2 px-2 py-1.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border)] text-[11px] leading-5"
          >
            <span class="log-dot" :class="'bg-' + e.level"></span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-[10px] text-[var(--text-faint)] flex-shrink-0" dir="ltr">{{ time(e.ts) }}</span>
                <span class="log-level text-[10px] font-bold flex-shrink-0" :class="'text-' + e.level">{{ levelLabel(e.level) }}</span>
                <span class="text-[10px] text-[var(--text-muted)] bg-[var(--surface2)] px-1.5 rounded flex-shrink-0">{{ e.category }}</span>
              </div>
              <div class="text-[var(--text)] break-words">{{ e.message }}</div>
              <div v-if="e.data" class="text-[10px] text-[var(--text-muted)] break-words font-mono mt-0.5 log-data">{{ e.data }}</div>
            </div>
          </div>
          <div v-if="!visibleLogs.length" class="text-center py-8 text-[var(--text-faint)] text-xs">
            <i class="fas fa-inbox text-2xl block mb-2 opacity-40"></i>
            گزارشی یافت نشد
          </div>
        </div>

        <!-- فوتر -->
        <div class="flex items-center justify-between px-3 py-1.5 border-t border-[var(--border)] bg-[var(--surface2)] text-[10px] text-[var(--text-muted)]">
          <span>مجموع: {{ total }} | خطا: {{ stats.error }} | هشدار: {{ stats.warn }}</span>
          <span class="flex items-center gap-1">
            <i class="fas fa-database"></i>
            تا {{ MAX }} ورودی اخیر
          </span>
        </div>
      </div>
    </Transition>

    <!-- دکمه شناور -->
    <button
      class="flex items-center gap-2 px-3 h-10 rounded-full shadow-lg bg-[var(--surface)] border border-[var(--border-strong)] hover:bg-[var(--surface2)] transition"
      title="گزارش سیستم"
      @click="open = !open"
    >
      <span class="relative">
        <i class="fas fa-bug text-[var(--accent)]"></i>
        <span
          v-if="stats.error"
          class="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-[var(--danger)] text-white text-[9px] font-bold flex items-center justify-center"
        >{{ stats.error }}</span>
      </span>
      <span class="text-[11px] font-medium">{{ open ? 'بستن گزارش' : 'گزارش سیستم' }}</span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { logger, downloadLogFile, LOG_LEVELS } from "../utils/logger";

const MAX = 600;
const open = ref(false);
const filter = ref("all");
const search = ref("");
const listRef = ref(null);
const entries = ref([]);
const sessionId = logger.sessionId;

let unsub = null;

onMounted(() => {
  entries.value = [...logger.entries];
  unsub = logger.subscribe((entry) => {
    if (entry === null) {
      entries.value = [];
    } else {
      entries.value.push(entry);
    }
    nextTick(scrollToBottom);
  });
});

onUnmounted(() => {
  if (unsub) unsub();
});

function scrollToBottom() {
  if (open.value && listRef.value) {
    listRef.value.scrollTop = listRef.value.scrollHeight;
  }
}

function time(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function levelLabel(lvl) {
  return { debug: "DEBUG", info: "INFO", warn: "WARN", error: "ERROR" }[lvl] || lvl;
}

function filterLabel(lvl) {
  return { all: "همه", debug: "دیباگ", info: "اطلاعات", warn: "هشدار", error: "خطا" }[lvl] || lvl;
}

const stats = computed(() => logger.getStats());
const total = computed(() => entries.value.length);

const visibleLogs = computed(() => {
  let list = entries.value;
  if (filter.value !== "all") {
    const min = LOG_LEVELS[filter.value];
    list = list.filter((e) => LOG_LEVELS[e.level] >= min);
  }
  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase();
    list = list.filter(
      (e) =>
        e.message.toLowerCase().includes(q) ||
        (e.category || "").toLowerCase().includes(q) ||
        (e.data || "").toLowerCase().includes(q),
    );
  }
  return list.slice().reverse();
});

function clearLogs() {
  if (confirm("پاک کردن تمام گزارش‌ها؟")) {
    logger.clear();
  }
}

function download(format) {
  downloadLogFile(format);
}
</script>

<style scoped>
.log-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--text-muted);
  transition: background 0.15s, color 0.15s;
}
.log-btn:hover {
  background: var(--surface3);
  color: var(--text);
}

.log-filter {
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 10px;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--border);
  transition: all 0.15s;
}
.log-filter:hover {
  border-color: var(--border-strong);
  color: var(--text);
}
.log-filter.active-all {
  background: var(--surface3);
  color: var(--text);
  border-color: var(--border-strong);
}
.log-filter.active-debug {
  background: rgba(139, 147, 167, 0.2);
  color: #c3c9da;
  border-color: #8b93a7;
}
.log-filter.active-info {
  background: rgba(79, 131, 204, 0.22);
  color: #8fbdff;
  border-color: #4f83cc;
}
.log-filter.active-warn {
  background: rgba(201, 162, 39, 0.22);
  color: #f0cf7a;
  border-color: #c9a227;
}
.log-filter.active-error {
  background: rgba(226, 84, 91, 0.22);
  color: #ff9a9e;
  border-color: #e2545b;
}

.log-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}
.bg-debug {
  background: #8b93a7;
}
.bg-info {
  background: #4f83cc;
}
.bg-warn {
  background: #c9a227;
}
.bg-error {
  background: #e2545b;
}
.text-debug {
  color: #8b93a7;
}
.text-info {
  color: #4f83cc;
}
.text-warn {
  color: #c9a227;
}
.text-error {
  color: #ff9a9e;
}

.log-data {
  direction: ltr;
  text-align: left;
  max-height: 60px;
  overflow: hidden;
}

.log-list::-webkit-scrollbar {
  width: 6px;
}
.log-list::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border-radius: 3px;
}

.log-panel-enter-active,
.log-panel-leave-active {
  transition: opacity 0.22s ease, transform 0.22s var(--ease-out);
}
.log-panel-enter-from,
.log-panel-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
</style>
