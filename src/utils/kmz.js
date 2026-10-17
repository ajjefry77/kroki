// ─────────────────────────────────────────────────────────────────────────
//  KMZ Builder
//  ساخت فایل KMZ (در واقع ZIP) با پوشه‌بندی داخلی، کاملاً client-side.
//  مرورگرهای مدرن از CompressionStream("deflate-raw") پشتیبانی می‌کنند؛
//  برای مرورگرهای قدیمی fallback به STORE (بدون فشرده‌سازی) استفاده می‌شود.
// ─────────────────────────────────────────────────────────────────────────

const enc = new TextEncoder();

// CRC32 با جدول از پیش محاسبه‌شده (استاندارد ZIP)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// فشرده‌سازی با deflate-raw در صورت وجود CompressionStream
async function deflateRaw(bytes) {
  if (typeof CompressionStream === "undefined") return null;
  try {
    const cs = new CompressionStream("deflate-raw");
    const stream = new Blob([bytes]).stream().pipeThrough(cs);
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  } catch (e) {
    return null;
  }
}

// ساخت یک رکورد ZIP (Local File Header + data)
// خروجی: { localHeader, data, centralEntry }
async function buildZipEntry(name, contentBytes) {
  const nameBytes = enc.encode(name);
  const crc = crc32(contentBytes);
  const compressed = await deflateRaw(contentBytes);
  const useDeflate = compressed && compressed.length < contentBytes.length;
  const storedData = useDeflate ? compressed : contentBytes;
  const method = useDeflate ? 8 : 0; // 8 = deflate, 0 = store
  const compSize = storedData.length;
  const uncompSize = contentBytes.length;

  const lfhTime = dosTime(new Date());

  // Local File Header (30 bytes + name)
  const lfh = new Uint8Array(30 + nameBytes.length);
  const dv = new DataView(lfh.buffer);
  dv.setUint32(0, 0x04034b50, true); // signature
  dv.setUint16(4, 20, true); // version needed
  dv.setUint16(6, 0, true); // flags
  dv.setUint16(8, method, true); // compression
  dv.setUint16(10, lfhTime.time, true); // mod time
  dv.setUint16(12, lfhTime.date, true); // mod date
  dv.setUint32(14, crc, true); // crc32
  dv.setUint32(18, compSize, true); // compressed size
  dv.setUint32(22, uncompSize, true); // uncompressed size
  dv.setUint16(26, nameBytes.length, true); // filename length
  dv.setUint16(28, 0, true); // extra length
  lfh.set(nameBytes, 30);

  // Central Directory File Header (46 bytes + name)
  const cdh = new Uint8Array(46 + nameBytes.length);
  const dv2 = new DataView(cdh.buffer);
  dv2.setUint32(0, 0x02014b50, true); // signature
  dv2.setUint16(4, 20, true); // version made by
  dv2.setUint16(6, 20, true); // version needed
  dv2.setUint16(8, 0, true); // flags
  dv2.setUint16(10, method, true); // compression
  dv2.setUint16(12, lfhTime.time, true);
  dv2.setUint16(14, lfhTime.date, true);
  dv2.setUint32(16, crc, true);
  dv2.setUint32(20, compSize, true);
  dv2.setUint32(24, uncompSize, true);
  dv2.setUint16(28, nameBytes.length, true);
  dv2.setUint16(30, 0, true); // extra length
  dv2.setUint16(32, 0, true); // comment length
  dv2.setUint16(34, 0, true); // disk number start
  dv2.setUint16(36, 0, true); // internal attrs
  dv2.setUint32(38, 0, true); // external attrs
  // local header offset پر می‌شود بعد از محاسبه
  cdh.set(nameBytes, 46);

  return {
    name,
    nameBytes,
    lfh,
    data: storedData,
    cdh,
    crc,
    compSize,
    uncompSize,
    localOffset: 0, // پر می‌شود در assembleZip
  };
}

function dosTime(d) {
  return {
    time:
      ((d.getHours() & 0x1f) << 11) |
      ((d.getMinutes() & 0x3f) << 5) |
      ((d.getSeconds() / 2) & 0x1f),
    date:
      ((((d.getFullYear() - 1980) & 0x7f) << 9)) |
      (((d.getMonth() + 1) & 0xf) << 5) |
      (d.getDate() & 0x1f),
  };
}

// سرهم کردن همه entry ها + central directory + EOCD
function assembleZip(entries) {
  // محاسبه offset هر entry
  let offset = 0;
  for (const e of entries) {
    e.localOffset = offset;
    offset += e.lfh.length + e.data.length;
  }

  // ساخت central directory
  const cdChunks = [];
  for (const e of entries) {
    // ست کردن local header offset در CDH
    const dv = new DataView(e.cdh.buffer);
    dv.setUint32(42, e.localOffset, true);
    cdChunks.push(e.cdh);
  }
  const cdBytes = concatBytes(cdChunks);
  const cdSize = cdBytes.length;
  const cdOffset = offset;

  // End of Central Directory (22 bytes)
  const eocd = new Uint8Array(22);
  const dvE = new DataView(eocd.buffer);
  dvE.setUint32(0, 0x06054b50, true); // signature
  dvE.setUint16(4, 0, true); // disk number
  dvE.setUint16(6, 0, true); // disk with CD
  dvE.setUint16(8, entries.length, true); // entries on this disk
  dvE.setUint16(10, entries.length, true); // total entries
  dvE.setUint32(12, cdSize, true); // CD size
  dvE.setUint32(16, cdOffset, true); // CD offset
  dvE.setUint16(20, 0, true); // comment length

  // سرهم کردن نهایی
  const fileChunks = [];
  for (const e of entries) {
    fileChunks.push(e.lfh, e.data);
  }
  return concatBytes([...fileChunks, cdBytes, eocd]);
}

function concatBytes(chunks) {
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
//  KMZ Builder API
// ─────────────────────────────────────────────────────────────────────────

/**
 * ساخت فایل KMZ از روی فایل‌های ورودی.
 * @param {Object} opts
 * @param {Array<{path: string, content: Uint8Array|string}>} opts.files
 *        لیست فایل‌ها با مسیر نسبی (مثلاً "doc.kml", "images/map.png")
 * @param {string} opts.filename نام فایل خروجی (مثلاً "kroki.kmz")
 * @returns {Promise<void>} دانلود خودکار فایل
 */
export async function buildKmz({ files, filename }) {
  const entries = [];
  for (const f of files) {
    const contentBytes =
      f.content instanceof Uint8Array
        ? f.content
        : enc.encode(String(f.content));
    const entry = await buildZipEntry(f.path, contentBytes);
    entries.push(entry);
  }
  const zipBytes = assembleZip(entries);
  const blob = new Blob([zipBytes], {
    type: "application/vnd.google-earth.kmz",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// تبدیل dataURL به Uint8Array (برای تصاویر کروکی و نقشه)
export function dataUrlToBytes(dataUrl) {
  if (!dataUrl) return null;
  try {
    const comma = dataUrl.indexOf(",");
    if (comma < 0) return null;
    const meta = dataUrl.slice(0, comma);
    const data = dataUrl.slice(comma + 1);
    if (meta.includes(";base64")) {
      const bin = atob(data);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }
    return enc.encode(decodeURIComponent(data));
  } catch (e) {
    return null;
  }
}

// escape برای XML
function esc(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[c]);
}

/**
 * ساخت doc.kml با ارجاع به فایل‌های کناری (overlays، images و غیره).
 * @param {Object} ctx
 * @param {Array} ctx.metas       state.selectedShapesMeta
 * @param {Array} ctx.utmPoints   state.utmPoints
 * @param {Object} ctx.form       last.form
 * @param {number} ctx.areaM2     state.areaM2
 * @param {string|null} ctx.mapImagePath  اگر تصویر نقشه موجود است، در overlay قرار می‌گیرد
 * @param {Object} ctx.bounds     {north, south, east, west} برای ground overlay
 */
export function buildDocKml({
  metas,
  utmPoints,
  form,
  areaM2,
  mapImagePath,
  bounds,
}) {
  const lines = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<kml xmlns="http://www.opengis.net/kml/2.2">`);
  lines.push(`  <Document>`);
  lines.push(
    `    <name>${esc(form?.title || "کروکی")}</name>`,
  );
  lines.push(
    `    <description>سامانه کروکی — مساحت: ${Number(areaM2 || 0).toFixed(2)} متر مربع</description>`,
  );

  // ─── Style مشترک ───
  lines.push(`    <Style id="kroki-polygon">`);
  lines.push(
    `      <LineStyle><color>ff0000ff</color><width>2</width></LineStyle>`,
  );
  lines.push(
    `      <PolyStyle><color>330000ff</color></PolyStyle>`,
  );
  lines.push(`    </Style>`);
  lines.push(`    <Style id="kroki-line">`);
  lines.push(
    `      <LineStyle><color>ff0000ff</color><width>3</width></LineStyle>`,
  );
  lines.push(`    </Style>`);

  // ─── پوشه: ترسیمات (اشکال پلی‌گان/خط) ───
  lines.push(`    <Folder>`);
  lines.push(`      <name>ترسیمات</name>`);
  for (let m = 0; m < metas.length; m++) {
    const meta = metas[m];
    const slice = utmPoints.slice(meta.startIdx, meta.startIdx + meta.count);
    if (slice.length < 2) continue;
    const coords = slice
      .map((p) => `${Number(p.lon).toFixed(8)},${Number(p.lat).toFixed(8)},0`)
      .join(" ");
    const coordsText = meta.isClosed
      ? `${coords} ${slice[0].lon.toFixed(8)},${slice[0].lat.toFixed(8)},0`
      : coords;

    lines.push(`      <Placemark>`);
    lines.push(
      `        <name>${esc(form?.title || "کروکی")} — ترسیم ${m + 1}</name>`,
    );
    lines.push(
      `        <styleUrl>#${meta.isClosed ? "kroki-polygon" : "kroki-line"}</styleUrl>`,
    );
    if (meta.isClosed) {
      lines.push(`        <Polygon>`);
      lines.push(`          <outerBoundaryIs>`);
      lines.push(`            <LinearRing>`);
      lines.push(
        `              <coordinates>${coordsText}</coordinates>`,
      );
      lines.push(`            </LinearRing>`);
      lines.push(`          </outerBoundaryIs>`);
      lines.push(`        </Polygon>`);
    } else {
      lines.push(`        <LineString>`);
      lines.push(`          <coordinates>${coordsText}</coordinates>`);
      lines.push(`        </LineString>`);
    }
    lines.push(`      </Placemark>`);
  }
  lines.push(`    </Folder>`);

  // ─── پوشه: نقاط رئوس (به‌صور Placemark نقطه‌ای) ───
  lines.push(`    <Folder>`);
  lines.push(`      <name>نقاط رئوس</name>`);
  for (let i = 0; i < utmPoints.length; i++) {
    const p = utmPoints[i];
    if (!p || !Number.isFinite(p.lon) || !Number.isFinite(p.lat)) continue;
    lines.push(`      <Placemark>`);
    lines.push(`        <name>نقطه ${i + 1}</name>`);
    lines.push(
      `        <description>شماره: ${i + 1}\nX: ${Number(p.x || 0).toFixed(2)}\nY: ${Number(p.y || 0).toFixed(2)}\nZone: ${esc(String(p.zone || ""))}</description>`,
    );
    lines.push(`        <Point>`);
    lines.push(
      `          <coordinates>${Number(p.lon).toFixed(8)},${Number(p.lat).toFixed(8)},0</coordinates>`,
    );
    lines.push(`        </Point>`);
    lines.push(`      </Placemark>`);
  }
  lines.push(`    </Folder>`);

  // ─── Ground Overlay تصویر نقشه ماهواره‌ای ───
  if (mapImagePath && bounds && bounds.north != null) {
    lines.push(`    <Folder>`);
    lines.push(`      <name>تصاویر نقشه</name>`);
    lines.push(`      <GroundOverlay>`);
    lines.push(`        <name>تصویر ماهواره‌ای محدوده</name>`);
    lines.push(`        <Icon>`);
    lines.push(`          <href>${esc(mapImagePath)}</href>`);
    lines.push(`        </Icon>`);
    lines.push(`        <LatLonBox>`);
    lines.push(`          <north>${Number(bounds.north).toFixed(8)}</north>`);
    lines.push(`          <south>${Number(bounds.south).toFixed(8)}</south>`);
    lines.push(`          <east>${Number(bounds.east).toFixed(8)}</east>`);
    lines.push(`          <west>${Number(bounds.west).toFixed(8)}</west>`);
    lines.push(`        </LatLonBox>`);
    lines.push(`      </GroundOverlay>`);
    lines.push(`    </Folder>`);
  }

  // ─── Screen Overlay تصویر کروکی (به‌عنوان تصویر بالای صفحه در Google Earth) ───
  // این بخش اختیاری است؛ تصویر کروکی در پوشه images/ قرار می‌گیرد و کاربر می‌تواند
  // به‌صورت دستی آن را باز کند. برای جلوگیری از اشغال صفحه در Google Earth،
  // به‌صورت پیش‌فرض آن را فعال نمی‌کنیم.

  lines.push(`  </Document>`);
  lines.push(`</kml>`);
  return lines.join("\n");
}

/**
 * ساخت فایل متنی info شامل مشخصات کروکی.
 */
export function buildInfoText({ form, areaM2, utmPoints, utmZone, templateName, trackingCode }) {
  const lines = [];
  lines.push("═══════════════════════════════════════════════");
  lines.push("  مشخصات کروکی — سامانه کروکی");
  lines.push("═══════════════════════════════════════════════");
  lines.push("");
  lines.push(`عنوان: ${form?.title || "—"}`);
  lines.push(`متقاضی: ${form?.client || "—"}`);
  lines.push(`کد ملی متقاضی: ${form?.clientNationalId || "—"}`);
  lines.push(`شماره همراه: ${form?.clientPhone || "—"}`);
  lines.push(`کارشناس: ${form?.surveyor || "—"}`);
  lines.push(`تاریخ برداشت: ${form?.date || "—"}`);
  lines.push(`نشانی: ${form?.address || "—"}`);
  lines.push(`شهر: ${form?.city || "—"}`);
  lines.push(`پلاک ثبتی: ${form?.plaque || "—"}`);
  lines.push(`عرض معبر: ${form?.streetWidth || "—"}`);
  lines.push(`نوع برداشت اولیه: ${form?.initialSurveyType || "—"}`);
  lines.push(`قالب: ${templateName || "—"}`);
  lines.push(`کد پیگیری: ${trackingCode || "—"}`);
  lines.push(`مساحت: ${Number(areaM2 || 0).toFixed(2)} متر مربع`);
  lines.push(`زون UTM: ${utmZone || "—"}`);
  lines.push(`تعداد نقاط: ${(utmPoints || []).length}`);
  lines.push("");
  lines.push("توضیحات:");
  lines.push(form?.description || "—");
  lines.push("");
  lines.push("═══════════════════════════════════════════════");
  return lines.join("\n");
}
