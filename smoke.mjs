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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto("http://localhost:5174/", { waitUntil: "networkidle2", timeout: 30000 });
await sleep(1500);

const clickByText = async (tag, text, root = "body") => {
  const clicked = await page.evaluate(
    ({ sel, txt, rootSel }) => {
      const scope = rootSel === "body" ? document : document.querySelector(rootSel);
      if (!scope) return false;
      const els = Array.from(scope.querySelectorAll(sel));
      const el = els.find((e) => e.textContent.trim().includes(txt));
      if (el) {
        el.click();
        return true;
      }
      return false;
    },
    { sel: tag, txt: text, rootSel: root },
  );
  await sleep(500);
  return clicked;
};

const clickCanvas = async (relX, relY) => {
  const box = await page.evaluate(() => {
    const c = document.querySelector(".mapboxgl-canvas");
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.click(box.x + box.w * relX, box.y + box.h * relY);
  await sleep(350);
};

console.log("== 1) Landing ==");
const landing = await page.evaluate(() => {
  const bg = getComputedStyle(document.body).backgroundColor;
  const isLightish =
    (bg.match(/rgb\((\d+)/) === null ? false : Number(bg.match(/rgb\((\d+)/)[1])) > 200;
  return {
    hero: document.body.innerText.includes("کروکی نقشه ملک"),
    reportBtn: !!Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent.includes("گزارش"),
    ),
    isLight: isLightish,
  };
});
console.log("landing state:", JSON.stringify(landing));
await clickByText("button", "ساخت کروکی");
const onDraw = await page.evaluate(() => document.body.innerText.includes("ترسیم‌های روی نقشه"));
console.log("draw step reached:", onDraw);

await page.waitForSelector(".mapboxgl-canvas", { timeout: 20000 });
await sleep(2500);

console.log("== 2) Draw polygon ==");
await page.click('button[title="پلی‌گان"]');
await sleep(1000);
await clickCanvas(0.4, 0.4);
await clickCanvas(0.55, 0.38);
await clickCanvas(0.58, 0.52);
await clickCanvas(0.4, 0.55);
await sleep(500);
await page.type('input[placeholder="مثلاً زمین ملک"]', "زمین آزمایشی");
await sleep(300);
await clickByText("button", "ذخیره");
await sleep(1200);

const saved = await page.evaluate(() => document.body.innerText.includes("زمین آزمایشی"));
console.log("pin saved:", saved);

console.log("== 3) Submit to info ==");
await clickByText("button", "ثبت و ادامه");
await page.waitForFunction(() => document.body.innerText.includes("قالب کروکی"), {
  timeout: 20000,
});
const onInfo = true;
console.log("info step reached:", onInfo);

await page.type('input[placeholder="نام کارفرما"]', "شرکت نمونه");
await sleep(300);
await clickByText("button", "ثبت و پیش‌نمایش");

console.log("== 4) Preview ==");
await page.waitForFunction(
  () => document.body.innerText.includes("پیش‌نمایش کروکی") && !document.body.innerText.includes("در حال تولید کروکی"),
  { timeout: 30000 },
);
await sleep(2500);
const preview = await page.evaluate(() => {
  const canvases = Array.from(document.querySelectorAll("canvas")).filter((c) => c.width > 300);
  return {
    canvasCount: canvases.length,
    hasUtmTable: document.body.innerText.includes("مختصات UTM"),
    hasArea: document.body.innerText.includes("مساحت کل"),
    hasMapImg: !!document.querySelector('img[alt="تصویر نقشه"]'),
  };
});
console.log("preview state:", JSON.stringify(preview));

console.log("== 5) Payment ==");
await clickByText("button", "ادامه به پرداخت");
const onPay = await page.evaluate(() => document.body.innerText.includes("پرداخت هزینه کروکی"));
console.log("payment step reached:", onPay);

// تست تب کارت به کارت
await clickByText("button", "کارت به کارت");
await sleep(400);
const cardTab = await page.evaluate(() => ({
  bankCard: document.body.innerText.includes("6037-9977-1234-5678"),
  paymentIdField: !!Array.from(document.querySelectorAll("input")).find((i) =>
    i.placeholder.includes("شناسه"),
  ),
}));
console.log("card-to-card tab:", JSON.stringify(cardTab));

await page.evaluate(() => {
  const inputs = Array.from(document.querySelectorAll("input"));
  const target = inputs.find((i) => i.placeholder.includes("شناسه"));
  if (target) {
    const proto = Object.getPrototypeOf(target);
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    desc.set.call(target, "1234567890123456");
    target.dispatchEvent(new Event("input", { bubbles: true }));
  }
});
await sleep(400);
const clickRes = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll("button")).find((x) =>
    x.textContent.includes("تومان"),
  );
  if (!b) return { clicked: false };
  b.click();
  return { clicked: true, disabled: b.disabled, text: b.textContent.trim() };
});
console.log("pay click:", JSON.stringify(clickRes));
await sleep(800);
console.log("processing shown:", await page.evaluate(() => document.body.innerText.includes("در حال اتصال")));
await page.waitForFunction(() => document.body.innerText.includes("پرداخت با موفقیت انجام شد"), {
  timeout: 15000,
});
console.log("payment success shown: true");

console.log("== 6) Download ==");
await clickByText("button", "مشاهده و دانلود کروکی");
await page.waitForFunction(() => document.body.innerText.includes("کروکی شما آماده دانلود است"), {
  timeout: 10000,
});
await sleep(1200);
const downloadPage = await page.evaluate(() => document.body.innerText);
const hiddenCanvasCheck = await page.evaluate(() => {
  const c = document.querySelector('canvas[class*="hidden"]');
  if (!c) return { ok: false, err: "no hidden canvas" };
  return {
    ok: c.width > 300 && c.height > 300,
    width: c.width,
    height: c.height,
  };
});
console.log("download page:", {
  hasTitle: downloadPage.includes("مشخصات سفارش"),
  hasPng: downloadPage.includes("دانلود PNG"),
  hasPdf: downloadPage.includes("PDF / چاپ"),
  hasNew: downloadPage.includes("سفارش جدید"),
});
console.log("hidden sketch canvas:", JSON.stringify(hiddenCanvasCheck));

console.log("== 7) Console errors ==");
const errors = logs.filter(
  (l) => l.startsWith("[console.error]") || l.startsWith("[pageerror]"),
);
console.log(errors.length ? errors.join("\n") : "(no console errors)");

await browser.close();
