/*
 * کمک‌توابع مشترک بوم کروکی: اندازه بوم و ایندکس شمال‌غربی.
 * قبلاً همین منطق در چند فایل تکرار شده بود (PreviewStep ،DownloadStep و جدول مجاورت‌ها).
 */

/** ابعاد بوم بر اساس گستره افقی/عمودی (متر)؛ حداکثر 1400، حداقل 400 */
export function computeCanvasSize(spanX, spanY) {
  const ratio = spanX / spanY;
  const MAX = 1400,
    MIN = 400;
  let cw = MAX,
    ch = Math.round(MAX / ratio);
  if (spanX < spanY) {
    ch = MAX;
    cw = Math.round(MAX * ratio);
  }
  cw = Math.max(MIN, Math.min(cw, MAX));
  ch = Math.max(MIN, Math.min(ch, MAX));
  return { w: cw, h: ch };
}

/** گستره نقاط UTM */
export function spansOf(points) {
  if (!points?.length) return { spanX: 1, spanY: 1 };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    spanX: Math.max(Math.max(...xs) - Math.min(...xs), 1),
    spanY: Math.max(Math.max(...ys) - Math.min(...ys), 1),
  };
}

/** ابعاد بوم برای آرایه نقاط UTM (null اگر نقطه‌ای نباشد) */
export function canvasSizeForPoints(points) {
  if (!points?.length) return null;
  const { spanX, spanY } = spansOf(points);
  return computeCanvasSize(spanX, spanY);
}

/**
 * ایندکس شمال‌غربی روی نقاط {x, y}: بیشترین y و در صورت تساوی کمترین x.
 * مبنای نام‌گذاری رئوس A,B,C… یا 1,2,3… در کروکی و جدول مجاورت‌ها.
 */
export function findNorthWestIndex(points) {
  if (!points?.length) return 0;
  let best = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].y > points[best].y || (points[i].y === points[best].y && points[i].x < points[best].x)) {
      best = i;
    }
  }
  return best;
}
