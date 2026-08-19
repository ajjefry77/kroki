export const SKETCH_TEMPLATES = [
  {
    id: "technical",
    name: "فنی مهندسی",
    subtitle: "کروکی وضعیت موجود",
    org: "نقشه‌برداری — وضعیت موجود",
    tagline: "مناسب امور فنی، نظام مهندسی و اخذ جواز",
    description:
      "کروکی استاندارد مهندسی همراه با جدول مختصات UTM، مقیاس، شمال جغرافیایی و طول ضلع‌ها. قالب پیش‌فرض سامانه.",
    frame: "technical",
    titleBlock: "technical",
    headerColor: "#7a1f1f",
    polygonColor: "#7a1f1f",
    centerColor: "#2563eb",
    textColor: "#222",
    vertexLabels: "numbers",
    grid: false,
    scaleBar: true,
    northArrow: true,
    coordinateTable: "html",
    handDrawn: false,
    colorful: false,
  },
  {
    id: "sabt",
    name: "ثبتی",
    subtitle: "کروکی سازمان ثبت اسناد و املاک",
    org: "سازمان ثبت اسناد و املاک کشور",
    tagline: "مناسب جانمایی پلاک ثبتی و اسناد",
    description:
      "قالب رسمی ثبت‌اسناد با نام‌گذاری گوشه‌ها (A, B, C…) از شمال‌غربی، جدول مختصات UTM و شبکه مختصاتی زمینه.",
    frame: "official",
    titleBlock: "official",
    headerColor: "#1d3a6e",
    polygonColor: "#1d4ed8",
    centerColor: "#b91c1c",
    textColor: "#111",
    vertexLabels: "letters",
    grid: true,
    scaleBar: true,
    northArrow: true,
    coordinateTable: "html",
    handDrawn: false,
    colorful: false,
  },
  {
    id: "shahrdari",
    name: "شهرداری (دولاین)",
    subtitle: "نقشه یوتی‌ام دولاین",
    org: "شهرداری — امور شهرسازی",
    tagline: "مناسب پرونده جواز ساخت و طرح‌های شهرداری",
    description:
      "نقشه دولاین شهرداری با ترسیم وضع موجود، جدول مختصات گوشه‌ها با حروف لاتین و شبکه مختصات.",
    frame: "official",
    titleBlock: "official",
    headerColor: "#0f5f3d",
    polygonColor: "#0f5f3d",
    centerColor: "#8a5a00",
    textColor: "#111",
    vertexLabels: "letters",
    grid: true,
    scaleBar: true,
    northArrow: true,
    coordinateTable: "html",
    handDrawn: false,
    colorful: false,
  },
  {
    id: "bonyad",
    name: "بنیاد مسکن",
    subtitle: "کروکی بنیاد مسکن انقلاب اسلامی",
    org: "بنیاد مسکن انقلاب اسلامی",
    tagline: "مناسب املاک روستایی و مسکن",
    description:
      "قالب مصوب بنیاد مسکن با کتیبه رسمی سبز، مقیاس و مختصات گوشه‌های ملک.",
    frame: "bonyad",
    titleBlock: "official",
    headerColor: "#166534",
    polygonColor: "#166534",
    centerColor: "#92400e",
    textColor: "#111",
    vertexLabels: "letters",
    grid: false,
    scaleBar: true,
    northArrow: true,
    coordinateTable: "html",
    handDrawn: false,
    colorful: false,
  },
  {
    id: "color",
    name: "رنگی ارائه",
    subtitle: "کروکی رنگی گزارش‌گیری",
    org: "گزارش و ارائه",
    tagline: "مناسب ارائه به مشتری و گزارش",
    description:
      "نقشه رنگی با قاب دوجداره و پرکردن رنگی محدوده‌ها برای ارائه‌های شکیل و گزارش‌های مشتری.",
    frame: "color",
    titleBlock: "official",
    headerColor: "#b45309",
    polygonColor: "#c2410c",
    centerColor: "#7c3aed",
    textColor: "#111",
    vertexLabels: "numbers",
    grid: false,
    scaleBar: true,
    northArrow: true,
    coordinateTable: "html",
    handDrawn: false,
    colorful: true,
  },
  {
    id: "hand",
    name: "دستی / بیمه",
    subtitle: "کروکی توصیفی دستی",
    org: "گزارش حادثه / بیمه",
    tagline: "مناسب گزارش خسارت و حادثه",
    description:
      "کروکی ساده و توصیفی بدون جدول مختصات، مناسب گزارش حادثه، تصادف و پرونده‌های بیمه.",
    frame: "hand",
    titleBlock: "hand",
    headerColor: "#334155",
    polygonColor: "#334155",
    centerColor: "#0f766e",
    textColor: "#1f2937",
    vertexLabels: "numbers",
    grid: false,
    scaleBar: false,
    northArrow: true,
    coordinateTable: "none",
    handDrawn: true,
    colorful: false,
  },
];

export function getTemplate(id) {
  return SKETCH_TEMPLATES.find((t) => t.id === id) || SKETCH_TEMPLATES[0];
}

export const TEMPLATE_ICONS = {
  technical: "fa-drafting-compass",
  sabt: "fa-landmark",
  shahrdari: "fa-city",
  bonyad: "fa-house",
  color: "fa-palette",
  hand: "fa-pen-ruler",
};

export const TEMPLATE_IDS = SKETCH_TEMPLATES.map((t) => t.id);

export const VERTEX_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function vertexLabel(labelStyle, index, northWestIndex) {
  if (labelStyle === "letters") {
    const idx = (index - northWestIndex + 100) % 26;
    return VERTEX_LETTERS[idx];
  }
  return String(index + 1);
}
