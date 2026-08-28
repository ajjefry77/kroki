import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
  defaultViewport: { width: 1500, height: 950 },
});
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const clickByText = async (tag, txt) => {
  const clicked = await page.evaluate(
    ({ sel, t }) => {
      const n = (s) => (s || "").replace(/\u200c/g, "");
      const el = Array.from(document.querySelectorAll(sel)).find((e) => n(e.textContent.trim()).includes(n(t)));
      if (el) { el.click(); return true; }
      return false;
    },
    { sel: tag, t: txt },
  );
  await sleep(400);
  return clicked;
};

const clickEnabledPay = () =>
  page.evaluate(() => {
    const n = (s) => (s || "").replace(/\u200c/g, "");
    const pick = Array.from(document.querySelectorAll("button")).find((b) => !b.disabled && n(b.textContent).includes("ادامه به پرداخت"));
    if (pick) { pick.click(); return true; }
    const pay = Array.from(document.querySelectorAll("button.btn-primary")).find((b) => !b.disabled && n(b.textContent).includes("پرداخت"));
    if (pay) { pay.click(); return true; }
    return false;
  });

const clickByTitle = async (title) => {
  const clicked = await page.evaluate(
    ({ t }) => {
      const n = (s) => (s || "").replace(/\u200c/g, "");
      const el = Array.from(document.querySelectorAll("button")).find((b) => n(b.title || "").includes(n(t)));
      if (el) { el.click(); return true; }
      return false;
    },
    { t: title },
  );
  await sleep(400);
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

const bodyHas = (txt) =>
  page.evaluate((t) => {
    const n = (s) => (s || "").replace(/\u200c/g, "");
    return n(document.body.innerText).includes(n(t));
  }, txt);

const waitText = (txt, ms) =>
  page.waitForFunction(
    (t) => {
      const n = (s) => (s || "").replace(/\u200c/g, "");
      return n(document.body.innerText).includes(n(t));
    },
    { timeout: ms },
    txt,
  );

const waitAny = (a, b, ms) =>
  page.waitForFunction(
    (x, y) => {
      const n = (s) => (s || "").replace(/\u200c/g, "");
      const t = n(document.body.innerText);
      return t.includes(n(x)) || t.includes(n(y));
    },
    { timeout: ms },
    a,
    b,
  );

const waitBoth = (a, b, ms) =>
  page.waitForFunction(
    (x, y) => {
      const n = (s) => (s || "").replace(/\u200c/g, "");
      const t = n(document.body.innerText);
      return t.includes(n(x)) && t.includes(n(y));
    },
    { timeout: ms },
    a,
    b,
  );

const status = (name, ok, extra = "") => console.log(`${ok ? "PASS" : "FAIL"} | ${name}${extra ? " | " + extra : ""}`);

const results = [];
const section = async (name, fn) => {
  try {
    await fn();
    results.push(["PASS", name]);
    console.log(`PASS | ${name}`);
  } catch (e) {
    results.push(["FAIL", name]);
    console.log(`FAIL | ${name} | ${e.message.split("\n")[0].slice(0, 90)}`);
  }
};

async function drawPolygon(pinName) {
  await page.waitForSelector(".mapboxgl-canvas", { timeout: 30000 });
  await sleep(6000);
  const tools = await page.evaluate(() =>
    Array.from(document.querySelectorAll("button[title]"))
      .map((b) => b.title)
      .filter((t) => t && (t.includes("پل") || t.includes("گام") || t.includes("نقطه") || t.includes("خط") || t.includes("دایره")))
      .slice(0, 8),
  );
  console.log("  tool buttons:", JSON.stringify(tools));
  const clickedTool = await clickByTitle("پلیگان");
  if (!clickedTool) {
    const ok = await page.evaluate(() => {
      const n = (s) => (s || "").replace(/\u200c/g, "");
      const b = Array.from(document.querySelectorAll("button")).find((x) => n(x.title || x.textContent).includes(n("پلیگان")));
      if (b) { b.click(); return true; }
      return false;
    });
    if (!ok) throw new Error("polygon tool not found");
  }
  await sleep(1200);
  await clickCanvas(0.4, 0.4);
  await clickCanvas(0.55, 0.38);
  await clickCanvas(0.58, 0.52);
  await clickCanvas(0.4, 0.55);
  await sleep(900);
  await page.waitForSelector('input[placeholder="مثلاً زمین ملک"]', { timeout: 20000 });
  await page.type('input[placeholder="مثلاً زمین ملک"]', pinName);
  await sleep(300);
  await clickByText("button", "ذخیره");
  await waitText(pinName, 15000);
}

async function loginAs(username, password) {
  await clickByText("button", "ورود / ثبتنام");
  await waitText("خوش آمدید", 10000);
  await page.waitForSelector('input[placeholder="شماره همراه یا ایمیل"]', { timeout: 10000 });
  await page.type('input[placeholder="شماره همراه یا ایمیل"]', username);
  await page.type('input[placeholder="رمز عبور"]', password);
  await clickByText("button", "ورود به سامانه");
}

async function logoutToLanding() {
  await clickByTitle("خروج");
  await waitText("ساخت کروکی", 10000);
}

async function goToInfoAndPreview(clientName) {
  await clickByText("button", "ثبت و ادامه");
  await waitText("مشخصات ملک و کارفرما", 20000);
  await page.waitForSelector('input[placeholder="نام کارفرما"]', { timeout: 10000 });
  await page.type('input[placeholder="نام کارفرما"]', clientName);
  await sleep(300);
  await clickByText("button", "ثبت و پیشنمایش");
  await waitText("پیش‌نمایش کروکی", 30000);
}

// ───────────── reset ─────────────
await page.goto("http://localhost:5174/", { waitUntil: "networkidle2", timeout: 30000 });
await page.evaluate(() => localStorage.clear());
await sleep(300);
await page.reload({ waitUntil: "networkidle2", timeout: 30000 });
await sleep(1500);

await section("1 guest landing (ورود/ثبتnam)", () => bodyHas("ورود / ثبت").then((ok) => { if (!ok) throw new Error("missing"); }));
await section("2 guest landing (ساخت کروکی)", () => bodyHas("ساخت کروکی").then((ok) => { if (!ok) throw new Error("missing"); }));

await section("3 start → auth view", async () => {
  await clickByText("button", "ساخت کروکی");
  await waitText("خوش آمدید", 10000);
});

await section("4 login user/user123 → draw step", async () => {
  await loginAs("user", "user123");
  await waitText("ترسیم نقشه", 15000);
});

await section("5 draw polygon + save", () => drawPolygon("زمین تست کیف پول"));

await section("6 info + preview", () => goToInfoAndPreview(" شرکت تست"));

await section("7 free payment (سهمیه ۲)", async () => {
  await page.waitForSelector('img[alt="تصویر نقشه"]', { timeout: 30000 });
  await sleep(600);
  const clicked = await clickEnabledPay();
  if (!clicked) throw new Error("pay button not found");
  await waitText("پرداخت هزینه کروکی", 15000);
  await waitText("استفاده از کروکی رایگان", 5000);
  await clickByText("button", "استفاده از کروکی رایگان");
  await waitText("پرداخت با موفقیت انجام شد", 20000);
});

await section("8 download step", async () => {
  await clickByText("button", "مشاهده و دانلود کروکی");
  await waitText("کروکی شما آماده دانلود است", 20000);
});

await section("9 free decremented to 1", async () => {
  await clickByText("button", "سفارش جدید");
  await waitText("ساخت کروکی", 15000);
  await clickByTitle("پنل کاربری");
  await waitText("پنل کاربری", 15000);
  const userFree = await page.evaluate(() => {
    const n = (s) => (s || "").replace(/\u200c/g, "");
    const t = n(document.body.innerText);
    const m = t.match(/کروکی رایگان\s*([\d۰-۹]+)\s*عدد/);
    return m ? m[1] : "?";
  });
  if (userFree !== "1") throw new Error("free=" + userFree);
});

await section("10 custom template saved", async () => {
  await clickByText("button", "قالبهای من");
  await waitText("ساخت قالب شخصی", 10000);
  await clickByText("button", "ساخت قالب شخصی");
  await sleep(1200);
  await page.evaluate(() => {
    const input = Array.from(document.querySelectorAll("input")).find((i) => i.getAttribute("placeholder") === "مثلاً قالب اختصاصی دفتر من");
    if (input) input.focus();
  });
  await page.keyboard.type("قالب تست من");
  await sleep(300);
  const state1 = await page.evaluate(() => {
    const input = Array.from(document.querySelectorAll("input")).find((i) => i.getAttribute("placeholder") === "مثلاً قالب اختصاصی دفتر من");
    return { val: input ? input.value : "no-input", svgCount: document.querySelectorAll("svg").length };
  });
  console.log("  designer state:", JSON.stringify(state1));
  const saveClicked = await clickByText("button", "ذخیره قالب");
  console.log("  saveClicked:", saveClicked);
  await sleep(1200);
  console.log("  screen:", (await page.evaluate(() => document.body.innerText.replace(/\n+/g, " | ").slice(0, 220))));
  await waitText("قالب تست من", 10000);
});

await section("11 register new user", async () => {
  await logoutToLanding();
  await clickByText("button", "ورود / ثبتنام");
  await waitText("ثبت‌نام در سامانه", 10000);
  await clickByText("button", "ثبت‌نام");
  await sleep(300);
  await page.type('input[placeholder="مثلاً علی رضایی"]', "کاربر شارژ");
  await page.type('input[placeholder="شماره همراه یا ایمیل"]', "newuser");
  await page.type('input[placeholder="09xxxxxxxxx"]', "09123334455");
  await page.type('input[placeholder="رمز عبور"]', "pass1234");
  await clickByText("button", "ساخت حساب و ورود");
  await waitText("کاربر شارژ", 15000);
});

await section("12 charge request submitted (۲۰۰k)", async () => {
  await clickByTitle("پنل کاربری");
  await waitText("افزایش موجودی", 10000);
  await page.type('input[placeholder="0000-0000-0000-0000"]', "6037997712345678");
  await page.type('input[placeholder="شناسه ۱۶ رقمی پیامک شده"]', "1234567890123456");
  await clickByText("button", "ثبت درخواست شارژ");
  await waitText("درخواست شارژ ثبت شد", 10000);
});

await section("13 admin approves charge", async () => {
  await logoutToLanding();
  await loginAs("admin", "admin123");
  await waitText("ساخت کروکی", 15000);
  await clickByTitle("پنل مدیریت");
  await waitText("پنل مدیریت", 15000);
  if (!(await bodyHas("در انتظار"))) throw new Error("pending not visible");
  await clickByText("button", "تأیید");
  await waitText("شارژ تأیید شد", 15000);
});

await section("14 wallet ۲۰۰٬۰۰۰ after approval", async () => {
  await logoutToLanding();
  await loginAs("newuser", "pass1234");
  await waitText("ساخت کروکی", 15000);
  await clickByTitle("پنل کاربری");
  await waitText("افزایش موجودی", 10000);
  const walletText = await page.evaluate(() => {
    const n = (s) => (s || "").replace(/\u200c/g, "");
    const el = Array.from(document.querySelectorAll("div")).find((d) => n(d.textContent).includes("موجودی کیف پول"));
    return el ? n(el.parentElement.textContent) : "";
  });
  if (!walletText.includes("۲۰۰٬۰۰۰")) throw new Error("wallet=" + walletText.slice(0, 50));
});

await section("15 wallet payment (no free)", async () => {
  await clickByTitle("صفحه اصلی");
  await waitText("ساخت کروکی", 10000);
  await clickByText("button", "ساخت کروکی");
  await waitText("ترسیم نقشه", 15000);
  await drawPolygon("دیگر زمین");
  await goToInfoAndPreview(" شرکت تست ۲");
  await page.waitForSelector('img[alt="تصویر نقشه"]', { timeout: 30000 });
  await sleep(600);
  const clicked = await clickEnabledPay();
  if (!clicked) throw new Error("pay button not found");
  await waitText("پرداخت هزینه کروکی", 15000);
  const ok = await page.evaluate(() => {
    const n = (s) => (s || "").replace(/\u200c/g, "");
    const btn = Array.from(document.querySelectorAll("button.btn-primary")).find((b) => n(b.textContent).includes("تومان") && n(b.textContent).includes("پرداخت"));
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!ok) throw new Error("no wallet pay button");
  await waitText("پرداخت با موفقیت انجام شد", 20000);
});

const passCount = results.filter((r) => r[0] === "PASS").length;
console.log(`\n== RESULT: ${passCount}/${results.length} passed ==`);
await browser.close();