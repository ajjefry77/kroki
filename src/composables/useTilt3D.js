import { ref, onBeforeUnmount } from "vue";

/**
 * کامپوزبل افکت‌های سه‌بعدی (Tilt, Parallax, Glare)
 * برای استفاده در کارت‌ها، هیرو و موکاپ‌ها
 */
export function useTilt3D() {
  let rafId = 0;

  /**
   * افکت پارالاکس عناصر با data-depth
   */
  function onParallaxMove(container, e) {
    if (!container) return;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const dx = (e.clientX - cx) / cx;
    const dy = (e.clientY - cy) / cy;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      container.querySelectorAll("[data-depth]").forEach((el) => {
        const depth = parseFloat(el.getAttribute("data-depth") || "30");
        el.style.translate = `${-dx * depth}px ${-dy * depth}px`;
      });
    });
  }

  function onParallaxLeave(container) {
    if (!container) return;
    container.querySelectorAll("[data-depth]").forEach((el) => {
      el.style.translate = "0px 0px";
    });
  }

  /**
   * افکت چرخش سه‌بعدی کارت با گرادیان نور (Glare)
   */
  function onTiltMove(el, e) {
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${py * -8}deg) rotateY(${px * 10}deg) translateY(-5px)`;
    el.style.setProperty("--mx", `${(px + 0.5) * 100}%`);
    el.style.setProperty("--my", `${(py + 0.5) * 100}%`);
  }

  function onTiltLeave(el) {
    if (!el) return;
    el.style.transform = "";
  }

  /**
   * افکت سه‌بعدی موکاپ با سایه و گرادیان نور سینمایی
   */
  function onMockupMove(el, glareEl, e) {
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    const ry = px * -14;
    const rx = py * 12;
    el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
    el.style.boxShadow = `${-px * 30}px ${24 + Math.abs(py) * 20}px 70px rgba(23,43,77,0.18), 0 8px 28px rgba(250,108,4,0.12)`;
    if (glareEl) {
      glareEl.style.opacity = "1";
      glareEl.style.background = `radial-gradient(circle at ${(px + 0.5) * 100}% ${(py + 0.5) * 100}%, rgba(255,255,255,0.35), transparent 55%)`;
    }
  }

  function onMockupLeave(el, glareEl) {
    if (!el) return;
    el.style.transform = "rotateX(0deg) rotateY(0deg)";
    el.style.boxShadow = "";
    if (glareEl) glareEl.style.opacity = "0";
  }

  /**
   * تبدیل hex به rgb (برای استایل‌های داینامیک)
   */
  function hexToRgb(hex) {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }

  onBeforeUnmount(() => {
    cancelAnimationFrame(rafId);
  });

  return {
    onParallaxMove,
    onParallaxLeave,
    onTiltMove,
    onTiltLeave,
    onMockupMove,
    onMockupLeave,
    hexToRgb,
  };
}
