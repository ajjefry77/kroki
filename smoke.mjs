import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
  defaultViewport: { width: 1500, height: 950 },
});

const page = await browser.newPage();
const logs = [];
page.on("console", (msg) => logs.push(`[console.${msg.type()}] ${msg.text()}`));
page.on("pageerror", (err) => logs.push(`[pageerror] ${err.message}`));

await page.goto("http://localhost:5174/", { waitUntil: "networkidle2", timeout: 30000 });
await page.waitForSelector(".mapboxgl-canvas", { timeout: 20000 });
await new Promise((r) => setTimeout(r, 3000));

const layoutInfo = await page.evaluate(() => {
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const section = document.querySelector("section");
  const info = document.querySelector(".mapboxgl-canvas");
  const canvases = Array.from(document.querySelectorAll("canvas")).map((c, i) => ({
    i,
    cls: c.className,
    rect: rect(c),
    pe: getComputedStyle(c).pointerEvents,
    vis: getComputedStyle(c).visibility,
  }));
  const mapContainer = document.querySelector("section .relative > div");
  const cs = mapContainer ? getComputedStyle(mapContainer) : null;
  const cls = mapContainer ? mapContainer.className : null;
  const absRule = Array.from(document.styleSheets)
    .flatMap((s) => {
      try {
        return Array.from(s.cssRules || []);
      } catch (e) {
        return [];
      }
    })
    .filter((r) => r.selectorText === ".absolute")
    .map((r) => r.cssText);
  return {
    mapContainerClass: cls,
    absRule,
    section: rect(section),
    mapContainer: mapContainer ? rect(mapContainer) : null,
    mapContainerStyle: cs
      ? {
          position: cs.position,
          top: cs.top,
          bottom: cs.bottom,
          left: cs.left,
          right: cs.right,
          height: cs.height,
          width: cs.width,
        }
      : null,
    firstCanvasRect: rect(info),
    canvases,
  };
});
console.log("LAYOUT:", JSON.stringify(layoutInfo, null, 2));

// آزمون: تغییر سایز پنجره آیا کانواس را به‌روز می‌کند؟
await page.evaluate(() => window.dispatchEvent(new Event("resize")));
await new Promise((r) => setTimeout(r, 1500));
const afterResize = await page.evaluate(() => {
  const c = document.querySelector(".mapboxgl-canvas");
  const r = c.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height) };
});
console.log("canvas after window resize:", JSON.stringify(afterResize));

const clickCanvas = async (relX, relY) => {
  const box = await page.evaluate(() => {
    const c = document.querySelector(".mapboxgl-canvas");
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, top: c.style.top };
  });
  const cx = box.x + box.w * relX;
  const cy = box.y + box.h * relY;
  const elAt = await page.evaluate(
    (pt) => {
      const el = document.elementFromPoint(pt.x, pt.y);
      return el ? el.tagName + "." + el.className : "NONE";
    },
    { x: cx, y: cy },
  );
  console.log(
    `click at (${cx.toFixed(0)}, ${cy.toFixed(0)}) rect=${JSON.stringify(box)} -> element: ${elAt}`,
  );
  await page.mouse.click(cx, cy);
  await new Promise((r) => setTimeout(r, 350));
};

const clickByText = async (selector, text) => {
  await page.evaluate(
    ({ sel, txt }) => {
      const els = Array.from(document.querySelectorAll(sel));
      const el = els.find((e) => e.textContent.trim().includes(txt));
      if (el) el.click();
    },
    { sel: selector, txt: text },
  );
  await new Promise((r) => setTimeout(r, 400));
};

// 1) فعال کردن ترسیم پلی‌گان
await page.click('button[title="پلی‌گان"]');
await new Promise((r) => setTimeout(r, 1200));

const hintShown = await page.evaluate(() =>
  document.body.innerText.includes("در حال ترسیم پلی‌گان"),
);
console.log("draw hint banner shown:", hintShown);

// نظارت بر کلیک روی کانواس
await page.evaluate(() => {
  const c = document.querySelector(".mapboxgl-canvas");
  window.__clicks = 0;
  c.addEventListener("click", () => {
    window.__clicks += 1;
  });
});
console.log(
  "cursor during draw:",
  await page.evaluate(() => document.querySelector(".mapboxgl-canvas").style.cursor),
);

// 2) کلیک روی نقشه برای ۴ نقطه
await clickCanvas(0.45, 0.45);
await clickCanvas(0.6, 0.4);
await clickCanvas(0.62, 0.55);
await clickCanvas(0.45, 0.6);

const canvasClicks = await page.evaluate(() => window.__clicks);
console.log("raw canvas click events received:", canvasClicks);

const formState = await page.evaluate(() => {
  const app = document.getElementById("app");
  const text = app ? app.innerText : "";
  const m = text.match(/تعداد نقاط\s*([^\n]*)/);
  return {
    pointCount: m ? m[1].trim() : "NOT FOUND",
    hasSaveBtn: text.includes("ذخیره"),
  };
});
console.log("form state after clicks:", JSON.stringify(formState));

// 3) وارد کردن نام و ذخیره
await page.type('input[placeholder="مثلاً زمین ملک"]', "زمین آزمایشی");
await new Promise((r) => setTimeout(r, 300));
await clickByText("button", "ذخیره");
await new Promise((r) => setTimeout(r, 1500));

const afterSave = await page.evaluate(() => {
  const app = document.getElementById("app");
  return app ? app.innerText.includes("زمین آزمایشی") : false;
});
console.log("pin saved & listed:", afterSave);

// 4) باز کردن مودال کروکی
await clickByText("button", "تولید کروکی");
await new Promise((r) => setTimeout(r, 800));

const modalOpened = await page.evaluate(() =>
  document.body.innerText.includes("کروکی وضعیت موجود"),
);
console.log("kroki modal opened:", modalOpened);

// 5) تولید کروکی داخل مودال (دکمه داخل پنل کروکی)
await page.evaluate(() => {
  const panel = document.querySelector(".kroki-panel");
  const btn = Array.from(panel.querySelectorAll("button")).find((b) =>
    b.textContent.trim().includes("تولید کروکی"),
  );
  if (btn) btn.click();
});
await new Promise((r) => setTimeout(r, 7000));

const preview = await page.evaluate(() => {
  const canvas = document.querySelector(".kroki-box canvas");
  const img = document.querySelector('img[alt="تصویر نقشه"]');
  return {
    hasCanvas: !!canvas,
    canvasSize: canvas ? `${canvas.width}x${canvas.height}` : null,
    hasMapImage: !!(img && img.src && img.src.length > 100),
    hasUtmTable: document.body.innerText.includes("مختصات UTM"),
    hasArea: document.body.innerText.includes("مساحت کل"),
    hasPrintBtn: document.body.innerText.includes("چاپ / PDF"),
  };
});
console.log("preview:", JSON.stringify(preview, null, 2));

// 6) آپلود فایل KML
await page.click('button[title*="آپلود KML"]').catch(() => {});
await new Promise((r) => setTimeout(r, 300));
const fp = await page.$('input[type="file"]');
if (fp) {
  await fp.uploadFile("C:/Working/kroki/sample.kml");
  await new Promise((r) => setTimeout(r, 3500));
}
const kmlState = await page.evaluate(() => {
  const text = document.getElementById("app").innerText;
  return {
    fileListed: text.includes("sample.kml") || text.includes("نمونه"),
    hasFileHint: text.includes("فایل KML"),
  };
});
console.log("kml upload:", JSON.stringify(kmlState));

console.log("=== LOGS (filtered) ===");
const relevant = logs.filter(
  (l) =>
    !l.startsWith("[console.debug]") &&
    !l.startsWith("[console.info]") &&
    !l.includes("favicon") &&
    !l.includes("DevTools"),
);
console.log(relevant.length ? relevant.join("\n") : "(no relevant logs)");

await browser.close();
