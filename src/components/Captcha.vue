<template>
  <div>
    <label class="block mb-1.5 text-xs font-medium">کد امنیتی *</label>
    <div class="flex items-stretch gap-2">
      <input
        v-model="answer"
        type="text"
        class="input ltr flex-1 text-center tracking-[0.3em]"
        dir="ltr"
        maxlength="6"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="characters"
        spellcheck="false"
        placeholder="·····"
        @keyup.enter="$emit('submit')"
      />
      <button
        type="button"
        class="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-1.5 hover:border-[var(--accent)] transition"
        title="کد جدید"
        @click="refresh"
      >
        <canvas ref="canvasRef" width="150" height="46" class="block rounded-md"></canvas>
      </button>
      <button
        type="button"
        class="shrink-0 w-10 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)] transition"
        title="کد جدید"
        @click="refresh"
      >
        <i class="fas fa-rotate-right text-sm"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
/*
 * کپچای تصویری سمت‌کاربر (canvas).
 * جلوی ربات‌های ساده و ارسال‌های خودکار را می‌گیرد، اما اعتبارسنجی واقعی
 * باید در بک‌اند هم انجام شود (صدور چالش در سرور و بررسی پاسخ)؛
 * کپچای صرفاً فرانت‌اند در برابر مهاجم مصمم کافی نیست.
 */
import { ref, onMounted } from "vue";

defineEmits(["submit"]);

// حروف/ارقام بدون ابهام (بدون 0/O و 1/I/l)
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const CODE_LEN = 5;

const canvasRef = ref(null);
const answer = ref("");
const code = ref("");

function randInt(n) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % n;
}

function genCode() {
  let s = "";
  for (let i = 0; i < CODE_LEN; i++) s += ALPHABET[randInt(ALPHABET.length)];
  code.value = s;
}

function draw() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  // پس‌زمینه روشن با نویز
  ctx.fillStyle = "#f2f4f8";
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 42; i++) {
    ctx.fillStyle = `rgba(${120 + randInt(100)},${130 + randInt(90)},${150 + randInt(80)},0.5)`;
    ctx.fillRect(randInt(W), randInt(H), 2, 2);
  }
  // حروف با چرخش و رنگ تصادفی
  ctx.textBaseline = "middle";
  const step = W / (code.value.length + 1);
  for (let i = 0; i < code.value.length; i++) {
    ctx.save();
    ctx.translate(step * (i + 1), H / 2 + randInt(7) - 3);
    ctx.rotate((randInt(50) - 25) / 100);
    ctx.font = `700 ${24 + randInt(6)}px Tahoma, Arial, sans-serif`;
    ctx.fillStyle = `rgb(${randInt(70)},${randInt(70)},${randInt(70)})`;
    ctx.textAlign = "center";
    ctx.fillText(code.value[i], 0, 0);
    ctx.restore();
  }
  // خطوط اختلال
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(90,110,150,${0.35 + randInt(30) / 100})`;
    ctx.lineWidth = 1 + randInt(2);
    ctx.beginPath();
    ctx.moveTo(randInt(W), randInt(H));
    ctx.bezierCurveTo(randInt(W), randInt(H), randInt(W), randInt(H), randInt(W), randInt(H));
    ctx.stroke();
  }
}

function refresh() {
  answer.value = "";
  genCode();
  draw();
}

/** بررسی پاسخ (غیرحساس به بزرگی/کوچکی)؛ در صورت اشتباه چالش تازه می‌سازد */
function validate() {
  const ok = answer.value.trim().toUpperCase() === code.value.toUpperCase();
  if (!ok) refresh();
  return ok;
}

onMounted(() => {
  refresh();
});

defineExpose({ validate, refresh });
</script>
