// راوتر رسمی برنامه (hash history — سازگار با لینک‌های قبلی مانند #/preview).
// گاردهای نقش (auth/admin/agent) اینجا متمرکز شده‌اند تا دیگر در
// کامپوننت‌ها تکرار نشود. حافظه‌ی hash که درگاه بانکی به آن برمی‌گرداند
// (#/payment-result?...) عیناً پشتیبانی می‌شود.
import { createRouter, createWebHashHistory } from "vue-router";
import { auth } from "../stores/auth";
import { createRouteGuard } from "./sharedLinkGuard.js";
import RouteShell from "./RouteShell.vue";

export const routes = [
  // ویزارد کروکی
  { path: "/", name: "landing", meta: { wizard: true, step: "landing" }, component: RouteShell },
  { path: "/draw", name: "draw", meta: { wizard: true, step: "draw", requiresAuth: true, returnTag: "start" }, component: RouteShell },
  { path: "/info", name: "info", meta: { wizard: true, step: "info", requiresAuth: true, returnTag: "start" }, component: RouteShell },
  { path: "/preview", name: "preview", meta: { wizard: true, step: "preview", requiresAuth: true, returnTag: "start" }, component: RouteShell },
  { path: "/done", name: "done", meta: { wizard: true, step: "done", requiresAuth: true, returnTag: "start" }, component: RouteShell },

  // صفحات مستقل
  { path: "/auth", name: "auth", component: RouteShell },
  { path: "/admin", name: "admin", meta: { requiresAuth: true, returnTag: "admin" }, component: RouteShell },
  { path: "/userpanel", name: "userpanel", meta: { requiresAuth: true, returnTag: "userpanel" }, component: RouteShell },
  { path: "/expert-request", name: "expert-request", component: RouteShell },
  { path: "/experts", name: "experts", component: RouteShell },
  { path: "/agency-request", name: "agency-request", meta: { requiresAuth: true, requiresNormalUser: true, returnTag: "agency-request" }, component: RouteShell },
  { path: "/payment-result", name: "payment-result", component: RouteShell },

  // سازگاری با لینک‌های قدیمی و مسیرهای ناشناخته
  { path: "/payment", redirect: { name: "preview" } },
  { path: "/:pathMatch(.*)*", redirect: { name: "landing" } },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// گاردهای اعتبارسنجی — رفتار دقیقاً مطابق منطق قبلی:
// • ورود بدون لاگین → صفحه‌ی ورود
// • admin بدون نقش admin → مسدود بی‌صدا (مطابق openAdmin قبلی)
// • درخواست نمایندگی برای admin/agent غیرفعال است
router.beforeEach(createRouteGuard(auth));
