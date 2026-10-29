import { vertexLabel } from "../utils/templates";
import {
  zoneLabel,
  effectiveLogoSrc,
  truncateText,
  canvasPolygonCentroid,
  niceScaleLength,
  niceScaleDen,
  loadLogoImage,
  logoImageCache,
} from "./krokiGeometry";

/*
 * توابع رندر بوم کروکی.
 * این توابع به state و last و template از کپوزابل اصلی وابسته‌اند،
 * بنابراین از طریق factory ساخته می‌شوند تا همان رفتار closure حفظ شود.
 */
export function createRenderFunctions(state, last, template) {
  function drawFrame(ctx, W, H, t) {
    ctx.save();
    const f = t.frame;
    if (f === "official") {
      ctx.strokeStyle = t.headerColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, W - 20, H - 20);
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1;
      ctx.strokeRect(18, 18, W - 36, H - 36);
      ctx.fillStyle = t.headerColor;
      ctx.fillRect(10, 10, 42, 5);
      ctx.fillRect(W - 52, 10, 42, 5);
      ctx.fillRect(10, H - 15, 42, 5);
      ctx.fillRect(W - 52, H - 15, 42, 5);
    } else if (f === "bargh") {
      // قاب اختصاصی شرکت برق: کادر مشکی دولایه + زبانه‌های زرد در گوشه‌ها
      ctx.strokeStyle = "#161616";
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, W - 20, H - 20);
      ctx.strokeStyle = "rgba(22, 22, 22, 0.35)";
      ctx.lineWidth = 1;
      ctx.strokeRect(18, 18, W - 36, H - 36);
      ctx.fillStyle = "#f5c518";
      ctx.fillRect(10, 10, 42, 5);
      ctx.fillRect(W - 52, 10, 42, 5);
      ctx.fillRect(10, H - 15, 42, 5);
      ctx.fillRect(W - 52, H - 15, 42, 5);
    } else if (f === "bonyad") {
      ctx.strokeStyle = t.headerColor;
      ctx.lineWidth = 4;
      ctx.strokeRect(12, 12, W - 24, H - 24);
      ctx.fillStyle = t.headerColor;
      ctx.fillRect(12, 12, W - 24, 7);
    } else if (f === "color") {
      ctx.strokeStyle = t.polygonColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(12, 12, W - 24, H - 24);
      ctx.strokeStyle = t.polygonColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(19, 19, W - 38, H - 38);
    } else if (f === "hand") {
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(12, 12, W - 24, H - 24);
    } else {
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(14, 14, W - 28, H - 28);
      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.lineWidth = 0.8;
      ctx.strokeRect(20, 20, W - 40, H - 40);
    }
    ctx.restore();
  }

  function drawHeaderBand(ctx, W, t, form, FS) {
    if (t.titleBlock !== "official") return;
    const k = FS || 1;
    const h = Math.round(46 * k);
    const hasLogo = !!logoImageCache?.img && !!effectiveLogoSrc(form, t);
    const textW = hasLogo ? W - Math.round(132 * k) : W - Math.round(24 * k);
    ctx.fillStyle = t.headerColor;
    ctx.fillRect(0, 0, W, h);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(0, h - 2, W, 2);
    ctx.fillStyle = "#fff";
    ctx.font = `700 ${Math.round(15 * k)}px Vazirmatn, Tahoma, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(truncateText(ctx, t.org, textW), W / 2, Math.round(16 * k));
    ctx.font = `500 ${Math.round(11 * k)}px Vazirmatn, Tahoma, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(
      truncateText(
        ctx,
        (form.title || "کروکی") + " — تاریخ برداشت: " + (form.date || "—"),
        textW,
      ),
      W / 2,
      Math.round(34 * k),
    );
    if (hasLogo) {
      const s = Math.round(38 * k);
      try {
        ctx.drawImage(logoImageCache.img, Math.round(16 * k), (h - s) / 2, s, s);
      } catch (e) {}
    }
  }

  function drawTitleBlock(ctx, W, H, t, form, extra, FS) {
    const k = FS || 1;
    if (t.titleBlock === "technical") {
      const bh = Math.round(30 * k);
      const bx = Math.round(22 * k),
        by = H - bh - Math.round(24 * k),
        bw = W - bx * 2;
      ctx.fillStyle = "#f4f6fa";
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = "#b9c2d0";
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = "#444";
      ctx.font = `600 ${Math.round(13 * k)}px Vazirmatn, Tahoma, sans-serif`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "right";
      ctx.fillText(
        truncateText(ctx, "متقاضی: " + (form.client || "—"), bw * 0.4),
        bx + bw - Math.round(8 * k),
        by + bh / 2,
      );
      ctx.textAlign = "center";
      ctx.fillText("مقیاس: " + extra.scaleText, bx + bw / 2, by + bh / 2);
      ctx.textAlign = "left";
      ctx.fillText(
        truncateText(ctx, "تاریخ: " + (form.date || "—"), bw * 0.34),
        bx + Math.round(8 * k),
        by + bh / 2,
      );
      return;
    }
    if (t.titleBlock === "hand") {
      ctx.fillStyle = "#555";
      ctx.font = `${Math.round(13 * k)}px Vazirmatn, Tahoma, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        truncateText(ctx, "کروکی توصیفی دستی — " + (form.title || ""), W - Math.round(28 * k)),
        W / 2,
        H - Math.round(28 * k),
      );
      return;
    }
    if (t.titleBlock !== "official") return;

    const bh = Math.round(120 * k);
    const bx = Math.round(24 * k),
      by = H - bh - Math.round(22 * k),
      bw = W - bx * 2;
    const half = bw / 2;
    const mid = bx + half;
    const headH2 = Math.round(24 * k);
    const fHead = Math.round(14 * k);
    const fRow = Math.round(13 * k);
    const padX = Math.round(6 * k);
    ctx.strokeStyle = t.headerColor;
    ctx.lineWidth = Math.max(1.5, Math.round(1.5 * k));
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = t.headerColor;
    ctx.fillRect(bx, by, bw, headH2);
    ctx.fillStyle = "#fff";
    ctx.font = `600 ${fHead}px Vazirmatn, Tahoma, sans-serif`;
    ctx.textBaseline = "middle";
    // سطر عنوان سه ستون مساوی دارد تا متقاضی/مقیاس/تاریخ روی هم نیفتند
    const colW = bw / 3;
    const colPad = Math.round(10 * k);
    ctx.textAlign = "right";
    ctx.fillText(
      truncateText(ctx, "متقاضی: " + (form.client || "—"), colW - colPad * 2),
      bx + bw - colPad,
      by + headH2 / 2,
    );
    ctx.textAlign = "center";
    ctx.fillText(
      truncateText(ctx, "مقیاس: " + extra.scaleText, colW - colPad * 2),
      bx + colW * 1.5,
      by + headH2 / 2,
    );
    ctx.textAlign = "left";
    ctx.fillText(
      truncateText(ctx, "تاریخ: " + (form.date || "—"), colW - colPad * 2),
      bx + colPad,
      by + headH2 / 2,
    );

    const rowH = (bh - headH2) / 4;
    ctx.fillStyle = "#333";
    ctx.font = `600 ${fRow}px Vazirmatn, Tahoma, sans-serif`;
    // ردیف دوم: سیستم مختصات (راست) / مساحت (چپ)
    ctx.textAlign = "right";
    ctx.fillText(
      truncateText(
        ctx,
        "سیستم مختصات: WGS84 / UTM — Zone " + zoneLabel(extra.zone),
        half - Math.round(16 * k),
      ),
      mid - padX,
      by + headH2 + rowH * 0.5,
    );
    ctx.textAlign = "left";
    // عدد مساحت بولد (وزن بیشتر) so در خروجی برجسته دیده شود
    ctx.save();
    ctx.font = `800 ${fRow}px Vazirmatn, Tahoma, sans-serif`;
    ctx.fillText(
      truncateText(ctx, "مساحت: " + extra.area, half - Math.round(16 * k)),
      mid + padX,
      by + headH2 + rowH * 0.5,
    );
    ctx.restore();
    // ردیف سوم: کارشناس (راست) / پلاک ثبتی (چپ)
    ctx.textAlign = "right";
    ctx.fillText(
      truncateText(ctx, "کارشناس: " + (form.surveyor || "———"), half - Math.round(16 * k)),
      mid - padX,
      by + headH2 + rowH * 1.5,
    );
    ctx.textAlign = "left";
    ctx.fillText(
      truncateText(ctx, "پلاک ثبتی: " + (form.plaque || "—"), half - Math.round(16 * k)),
      mid + padX,
      by + headH2 + rowH * 1.5,
    );
    // ردیف چهارم: کد ملی (راست) / شماره همراه (چپ)
    ctx.textAlign = "right";
    ctx.fillText(
      truncateText(ctx, "کد ملی: " + (form.clientNationalId || "—"), half - Math.round(16 * k)),
      mid - padX,
      by + headH2 + rowH * 2.5,
    );
    ctx.textAlign = "left";
    ctx.fillText(
      truncateText(ctx, "همراه: " + (form.clientPhone || "—"), half - Math.round(16 * k)),
      mid + padX,
      by + headH2 + rowH * 2.5,
    );
    // ردیف پنجم: نشانی (راست، پرعرض) / عرض معبر (چپ)
    ctx.fillStyle = "#555";
    ctx.textAlign = "right";
    ctx.fillText(
      truncateText(ctx, "نشانی: " + (form.address || "—"), bw * 0.7 - Math.round(20 * k)),
      bx + bw - Math.round(10 * k),
      by + headH2 + rowH * 3.5,
    );
    ctx.textAlign = "left";
    ctx.fillText(
      truncateText(
        ctx,
        "عرض معبر: " + (form.streetWidth || "—"),
        bw * 0.26 - Math.round(12 * k),
      ),
      bx + Math.round(10 * k),
      by + headH2 + rowH * 3.5,
    );
  }

  function drawGrid(
    ctx,
    minX,
    minY,
    maxX,
    maxY,
    effScale,
    pad,
    drawTop,
    drawBottom,
    W,
  ) {
    const spanX = Math.max(maxX - minX, 0.001);
    const gx = niceScaleLength(spanX) / 4;
    ctx.save();
    ctx.strokeStyle = "rgba(30, 58, 110, 0.12)";
    ctx.lineWidth = 0.6;
    for (let x = Math.floor(minX / gx) * gx; x <= maxX; x += gx) {
      const px = pad + (x - minX) * effScale;
      ctx.beginPath();
      ctx.moveTo(px, drawTop);
      ctx.lineTo(px, drawBottom);
      ctx.stroke();
    }
    for (let y = Math.floor(minY / gx) * gx; y <= maxY; y += gx) {
      const py = drawBottom - (y - minY) * effScale;
      ctx.beginPath();
      ctx.moveTo(pad, py);
      ctx.lineTo(W - pad, py);
      ctx.stroke();
    }
    ctx.restore();
  }

  function renderSketch(canvas) {
    if (!canvas) return;
    const t = template();
    // اگر لوگوی موثر (مثلاً لوگوی پیش‌فرض قالب برق) هنوز در حافظه نیست،
    // بارگذاری را شروع کن تا رندر بعدی آن را بکشد (رندر فعلی بدون لوگو می‌ماند)
    try {
      const wantLogo = effectiveLogoSrc(last.form, t) || "";
      if (wantLogo && logoImageCache.src !== wantLogo) loadLogoImage(wantLogo);
    } catch (e) {}
    const W = canvas.width;
    const H = canvas.height;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    const pts = state.utmPoints;
    if (!pts.length) return;

    // ضریب مقیاس فونت/لیبل نسبت به اندازه بوم تا متن‌ها در چاپ خوانا بمانند
    const FS = Math.max(0.8, Math.min(2, Math.min(W, H) / 800));
    const headerH = t.titleBlock === "official" ? Math.round(46 * FS) : 0;
    // حاشیه کمتر اطراف کروکی تا ترسیم به قاب بچسبد؛ لیبل‌ها با clamp داخل بوم نگه داشته می‌شوند
    const pad = Math.min(64, Math.floor(Math.min(W, H) * 0.09));
    const fLen = Math.round(14 * FS);
    const fStreet = Math.round(15 * FS);
    const fVertex = Math.round((t.labelFontSize ?? 16) * FS);
    const offIn = Math.round(24 * FS);
    const offOut = Math.round(38 * FS);
    const offVx = Math.round(24 * FS);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs);
    const minY = Math.min(...ys),
      maxY = Math.max(...ys);
    const spanX = Math.max(maxX - minX, 0.001);
    const spanY = Math.max(maxY - minY, 0.001);

    const titleBlockH =
      t.titleBlock === "official"
        ? Math.round(142 * FS)
        : t.titleBlock === "technical"
          ? Math.round(54 * FS)
          : Math.round(30 * FS);
    const drawTop = headerH + pad + Math.round(30 * FS);
    const drawBottom = H - pad - titleBlockH - 14;
    const effScale = Math.min(
      (W - 2 * pad) / spanX,
      (drawBottom - drawTop) / spanY,
    );

    // ترسیم وسط ناحیه قابل‌رسم می‌افتد تا به یک سمت (چپ/پایین) نچسبد
    const usedW = spanX * effScale;
    const usedH = spanY * effScale;
    const offX = pad + Math.max(0, (W - 2 * pad - usedW) / 2);
    const baseY = drawBottom - Math.max(0, (drawBottom - drawTop - usedH) / 2);

    const toCanvas = (p) => ({
      x: offX + (p.x - minX) * effScale,
      y: baseY - (p.y - minY) * effScale,
    });

    const cpts = pts.map(toCanvas);
    const cx = cpts.reduce((s, p) => s + p.x, 0) / cpts.length;
    const cy = cpts.reduce((s, p) => s + p.y, 0) / cpts.length;

    const metas = state.selectedShapesMeta.length
      ? state.selectedShapesMeta
      : [{ type: "polygon", isClosed: true, startIdx: 0, count: pts.length }];

    const form = last.form || {};

    const metersPerCm = spanX / (((W - 2 * pad) / 96) * 2.54);
    const den = niceScaleDen(Math.round(metersPerCm * 100) / 1);
    const scaleText = den ? "1:" + den.toLocaleString("fa-IR") : "—";

    // کادر
    drawFrame(ctx, W, H, t);
    // هدر
    drawHeaderBand(ctx, W, t, form, FS);
    // شبکه
    if (t.grid)
      drawGrid(
        ctx,
        minX,
        minY,
        maxX,
        maxY,
        effScale,
        pad,
        drawTop,
        drawBottom,
        W,
      );

    const tableIndices = Array.isArray(state.outputTableIndices) && state.outputTableIndices.length
      ? state.outputTableIndices
      : pts.map((_, index) => index);
    const selectedPoints = tableIndices.map((index) => pts[index]).filter(Boolean);
    const selectedLabelIndexes = new Map(
      tableIndices.map((pointIndex, labelIndex) => [pointIndex, labelIndex]),
    );
    let nwIndex = 0;
    for (let i = 1; i < selectedPoints.length; i++) {
      if (
        selectedPoints[i].y > selectedPoints[nwIndex].y ||
        (selectedPoints[i].y === selectedPoints[nwIndex].y &&
          selectedPoints[i].x < selectedPoints[nwIndex].x)
      ) {
        nwIndex = i;
      }
    }

    for (let m = 0; m < metas.length; m++) {
      const meta = metas[m];
      const slice = cpts.slice(meta.startIdx, meta.startIdx + meta.count);
      const utmSlice = pts.slice(meta.startIdx, meta.startIdx + meta.count);
      if (slice.length < 2) continue;
      const isClosed = meta.isClosed;

      ctx.beginPath();
      slice.forEach((p, i) =>
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
      );
      if (isClosed) ctx.closePath();
      if (isClosed) {
        ctx.fillStyle = t.colorful
          ? "rgba(194, 65, 12, 0.18)"
          : "rgba(122, 31, 31, 0.05)";
        ctx.fill();
      }
      ctx.lineWidth = t.lineWidth ?? (t.handDrawn ? 2 : 2.5);
      ctx.strokeStyle = t.polygonColor;
      ctx.stroke();

      // مرکز همین ترسیم (نه میانگین کل ترسیم‌ها) تا جهت داخل/بیرون و
      // جای لیبل گوشه‌ها برای هر شکل مستقل و مرتب باشد
      let scx = 0,
        scy = 0;
      if (isClosed) {
        const cpc = canvasPolygonCentroid(slice);
        if (cpc) {
          scx = cpc.x;
          scy = cpc.y;
        } else {
          scx = slice.reduce((s, p) => s + p.x, 0) / slice.length;
          scy = slice.reduce((s, p) => s + p.y, 0) / slice.length;
        }
      } else {
        scx = slice.reduce((s, p) => s + p.x, 0) / slice.length;
        scy = slice.reduce((s, p) => s + p.y, 0) / slice.length;
      }

      const edgeCount = isClosed ? slice.length : slice.length - 1;
      for (let i = 0; i < edgeCount; i++) {
        const a = slice[i];
        const b = slice[(i + 1) % slice.length];
        const aUtm = utmSlice[i];
        const bUtm = utmSlice[(i + 1) % utmSlice.length];
        const dx = bUtm.x - aUtm.x;
        const dy = bUtm.y - aUtm.y;
        const lenM = Math.sqrt(dx * dx + dy * dy);

        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;

        let nx = -(b.y - a.y);
        let ny = b.x - a.x;
        const nlen = Math.sqrt(nx * nx + ny * ny) || 1;
        nx /= nlen;
        ny /= nlen;

        const toCx = mx - scx,
          toCy = my - scy;
        if (nx * toCx + ny * toCy < 0) {
          nx = -nx;
          ny = -ny;
        }

        let angle = Math.atan2(b.y - a.y, b.x - a.x);
        if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI;

        // اندازه ضلع داخل کروکی می‌افتد تا با متن مجاورت (بیرون ضلع) تداخل نداشته باشد
        const inX = Math.max(30, Math.min(mx - nx * offIn, W - 30));
        const inY = Math.max(drawTop + 14, Math.min(my - ny * offIn, drawBottom - 14));

        ctx.save();
        ctx.translate(inX, inY);
        ctx.rotate(angle);
        ctx.font = `700 ${fLen}px Vazirmatn, Tahoma, sans-serif`;
        const lenTxt = lenM.toFixed(2);
        const lenW = ctx.measureText(lenTxt).width;
        const lenBw = Math.round(4 * FS);
        const lenBh = Math.round(12 * FS);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillRect(-lenW / 2 - lenBw, -lenBh, lenW + lenBw * 2, lenBh * 2);
        ctx.fillStyle = t.textColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(lenTxt, 0, 0);
        ctx.restore();

        // مجاورت بیرون ضلع و در امتداد آن
        const street = state.edgeTexts[m]?.[i] || "";
        if (street) {
          ctx.font = `500 ${fStreet}px Vazirmatn, Tahoma, sans-serif`;
          const sw = ctx.measureText(street).width;
          const edgePx = Math.hypot(b.x - a.x, b.y - a.y) || 1;
          const ex = (b.x - a.x) / edgePx;
          const ey = (b.y - a.y) / edgePx;
          // مرکز متن روی خط موازی ضلع؛ اگر متن از ضلع بلندتر باشد وسط‌چین می‌شود
          const half = sw / 2 + 6;
          let proj = edgePx / 2;
          if (edgePx > 2 * half + 8) {
            proj = Math.max(half + 4, Math.min(proj, edgePx - half - 4));
          }
          let sx = a.x + ex * proj + nx * offOut;
          let sy = a.y + ey * proj + ny * offOut;
          sx = Math.max(40, Math.min(sx, W - 40));
          sy = Math.max(drawTop + 12, Math.min(sy, drawBottom - 12));
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(angle);
          const stBw = Math.round(5 * FS);
          const stBh = Math.round(12 * FS);
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.fillRect(-sw / 2 - stBw, -stBh, sw + stBw * 2, stBh * 2);
          ctx.fillStyle = t.textColor;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(street, 0, 0);
          ctx.restore();
        }
      }

      const startIdx = meta.startIdx;
      const vRadius = (t.vertexRadius ?? 4) * FS;
      slice.forEach((p, i) => {
        const labelIndex = selectedLabelIndexes.get(startIdx + i);
        if (labelIndex === undefined) return;

        ctx.beginPath();
        ctx.arc(p.x, p.y, vRadius, 0, Math.PI * 2);
        ctx.fillStyle = t.polygonColor;
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = Math.max(1.5, Math.round(2 * FS));
        ctx.stroke();

        // جهت لیبل: از مرکز همین ترسیم به سمت گوشه (نه مرکز کل نقشه)
        const toCx = p.x - scx,
          toCy = p.y - scy;
        const dlen = Math.sqrt(toCx * toCx + toCy * toCy) || 1;
        const label = String(vertexLabel(t.vertexLabels, labelIndex, nwIndex));
        ctx.font = `800 ${fVertex}px Vazirmatn, Tahoma, sans-serif`;
        const tw = ctx.measureText(label).width;
        const padX = Math.round(5 * FS);
        const padY = Math.round(7 * FS);
        const boxW = tw + padX * 2;
        const boxH = fVertex + padY;
        let lx = p.x + (toCx / dlen) * offVx;
        let ly = p.y + (toCy / dlen) * offVx;
        // کل جعبه لیبل داخل ناحیه ترسیم نگه داشته می‌شود تا برش نخورد
        lx = Math.max(pad + boxW / 2, Math.min(lx, W - pad - boxW / 2));
        ly = Math.max(
          drawTop + boxH / 2 + 2,
          Math.min(ly, drawBottom - boxH / 2 - 2),
        );

        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.strokeStyle = t.polygonColor;
        ctx.lineWidth = Math.max(1, FS);
        ctx.fillRect(lx - boxW / 2, ly - boxH / 2, boxW, boxH);
        ctx.strokeRect(lx - boxW / 2, ly - boxH / 2, boxW, boxH);
        ctx.fillStyle = t.textColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, lx, ly + 1);
      });
    }

    // مرکز هر ترسیم + نشانی
    for (let m = 0; m < metas.length; m++) {
      const meta = metas[m];
      const slice = cpts.slice(meta.startIdx, meta.startIdx + meta.count);
      if (!slice.length) continue;

      let cp = null;
      if (meta.isClosed) {
        cp = canvasPolygonCentroid(slice);
      }
      if (!cp) {
        cp = {
          x: slice.reduce((sum, p) => sum + p.x, 0) / slice.length,
          y: slice.reduce((sum, p) => sum + p.y, 0) / slice.length,
        };
      }

      ctx.beginPath();
      ctx.arc(cp.x, cp.y, 5 * FS, 0, Math.PI * 2);
      ctx.fillStyle = t.centerColor;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // شمال
    if (t.northArrow) {
      const nax = W - Math.round(50 * FS),
        nay = drawTop - Math.round(12 * FS);
      const aLen = Math.round(22 * FS),
        aTip = Math.round(14 * FS),
        aHead = Math.round(20 * FS),
        aHalf = Math.round(6 * FS);
      ctx.save();
      ctx.strokeStyle = "#333";
      ctx.fillStyle = "#333";
      ctx.lineWidth = Math.max(2, Math.round(2 * FS));
      ctx.beginPath();
      ctx.moveTo(nax, nay + aLen);
      ctx.lineTo(nax, nay - aTip);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(nax, nay - aHead);
      ctx.lineTo(nax - aHalf, nay - Math.round(10 * FS));
      ctx.lineTo(nax + aHalf, nay - Math.round(10 * FS));
      ctx.closePath();
      ctx.fill();
      ctx.font = `700 ${Math.round(13 * FS)}px Tahoma`;
      ctx.textAlign = "center";
      ctx.fillText("N", nax, nay + Math.round(36 * FS));
      ctx.restore();
    }

    // مقیاس خطی
    if (t.scaleBar) {
      const barM = niceScaleLength(spanX);
      const barPx = barM * effScale;
      const bx0 = pad,
        by0 = drawBottom - Math.round(14 * FS);
      const tick = Math.round(5 * FS);
      ctx.save();
      ctx.strokeStyle = "#333";
      ctx.lineWidth = Math.max(2, Math.round(2 * FS));
      ctx.beginPath();
      ctx.moveTo(bx0, by0);
      ctx.lineTo(bx0 + barPx, by0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx0, by0 - tick);
      ctx.lineTo(bx0, by0 + tick);
      ctx.moveTo(bx0 + barPx, by0 - tick);
      ctx.lineTo(bx0 + barPx, by0 + tick);
      ctx.stroke();
      ctx.font = `${Math.round(12 * FS)}px Tahoma`;
      ctx.textAlign = "center";
      ctx.fillStyle = "#333";
      ctx.fillText(barM + " m", bx0 + barPx / 2, by0 - Math.round(10 * FS));
      ctx.restore();
    }

    // کتیبه پایین
    drawTitleBlock(ctx, W, H, t, form, {
      scaleText,
      zone: state.utmZone || "—",
      area: state.areaM2.toFixed(2) + " متر مربع",
    }, FS);
  }

  return { drawFrame, drawHeaderBand, drawTitleBlock, drawGrid, renderSketch };
}
