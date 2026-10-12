export function kmlToGeoJSON(doc) {
  const features = [];
  const placemarks = doc.getElementsByTagName("Placemark");

  const processGeometry = (geomEl, name, description, out) => {
    const tag = geomEl.tagName;

    if (tag === "Point") {
      const coordsEl = geomEl.getElementsByTagName("coordinates")[0];
      const coords = parseKMLCoordsText(coordsEl ? coordsEl.textContent : "");
      if (coords.length) {
        out.push({
          type: "Feature",
          properties: { name, description },
          geometry: { type: "Point", coordinates: coords[0] },
        });
      }
    } else if (tag === "LineString") {
      const coordsEl = geomEl.getElementsByTagName("coordinates")[0];
      const coords = parseKMLCoordsText(coordsEl ? coordsEl.textContent : "");
      if (coords.length) {
        out.push({
          type: "Feature",
          properties: { name, description },
          geometry: { type: "LineString", coordinates: coords },
        });
      }
    } else if (tag === "Polygon") {
      const outer = geomEl.getElementsByTagName("outerBoundaryIs")[0];
      const outerText = outer
        ? outer.getElementsByTagName("coordinates")[0]?.textContent
        : "";
      const ring = outerText ? parseKMLCoordsText(outerText) : [];
      if (ring.length >= 3) {
        // حلقه KML معمولاً از قبل بسته است (نقطه اول == آخر)؛ فقط در صورت
        // باز بودن ببند تا نقطه تکراری و یال صفرطول («خط اضافه») ساخته نشود
        const f = ring[0];
        const l = ring[ring.length - 1];
        if (Math.abs(f[0] - l[0]) > 1e-9 || Math.abs(f[1] - l[1]) > 1e-9) {
          ring.push([f[0], f[1]]);
        }
        out.push({
          type: "Feature",
          properties: { name, description },
          geometry: { type: "Polygon", coordinates: [ring] },
        });
      }
    } else if (tag === "MultiGeometry") {
      for (const child of geomEl.children) {
        if (child.tagName && child.getElementsByTagName) {
          processGeometry(child, name, description, out);
        }
      }
    }
  };

  for (let i = 0; i < placemarks.length; i++) {
    const pm = placemarks[i];
    const nameEl = pm.getElementsByTagName("name")[0];
    const descEl = pm.getElementsByTagName("description")[0];
    const name = nameEl ? nameEl.textContent : "";
    const description = descEl ? descEl.textContent : "";

    const geometryNodes = pm.children;
    for (let j = 0; j < geometryNodes.length; j++) {
      const el = geometryNodes[j];
      const tag = el.tagName;
      if (tag === "Point" || tag === "LineString" || tag === "Polygon" || tag === "MultiGeometry") {
        processGeometry(el, name, description, features);
      }
    }
  }

  return { type: "FeatureCollection", features };
}

// استخراج مختصات: هر توکن جدا شده با فاصله شامل "lon,lat[,height]" است
export function parseKMLCoordsText(text) {
  if (!text) return [];
  const out = [];
  let start = -1;
  const n = text.length;

  for (let i = 0; i <= n; i++) {
    const c = i < n ? text.charCodeAt(i) : 32;
    const isSep = c === 32 || c === 9 || c === 10 || c === 13;
    if (!isSep && start < 0) {
      start = i;
    } else if (isSep && start >= 0) {
      let tok = text.slice(start, i);
      start = -1;
      // جدا کردن با کاما
      let comma = -1;
      for (let j = 0; j < tok.length; j++) {
        if (tok.charCodeAt(j) === 44) {
          comma = j;
          break;
        }
      }
      if (comma > 0) {
        const lon = parseFloat(tok.slice(0, comma));
        let k = comma + 1;
        while (k < tok.length && tok.charCodeAt(k) === 44) k++;
        const lat = parseFloat(tok.slice(k, tok.length));
        if (!isNaN(lon) && !isNaN(lat)) out.push([lon, lat]);
      } else {
        tok = null;
      }
    }
  }

  return out;
}

export function parseKMLCoords(el) {
  if (!el) return [];
  return parseKMLCoordsText(el.textContent);
}

const readU16 = (buf, o) => buf[o] | (buf[o + 1] << 8);
const readU32 = (buf, o) =>
  buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16) | (buf[o + 3] << 24);

async function inflateRawZipEntry(data) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("مرورگر شما از فایل KMZ پشتیبانی نمی‌کند");
  }
  const stream = new Blob([data]).stream().pipeThrough(
    new DecompressionStream("deflate-raw"),
  );
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

async function extractKmlFromZip(buf) {
  const decoder = new TextDecoder("latin1");
  let offset = 0;
  while (offset + 30 <= buf.length) {
    const sig = readU32(buf, offset);
    if (sig !== 0x04034b50) break;
    const method = buf[offset + 8];
    const compSize = readU32(buf, offset + 18);
    const nameLen = readU16(buf, offset + 26);
    const extraLen = readU16(buf, offset + 28);
    const name = decoder
      .decode(buf.subarray(offset + 30, offset + 30 + nameLen))
      .toLowerCase();
    const dataStart = offset + 30 + nameLen + extraLen;
    if (name.endsWith(".kml")) {
      const comp = buf.subarray(dataStart, dataStart + compSize);
      if (method === 0) return comp;
      if (method === 8) return await inflateRawZipEntry(comp);
      throw new Error("روش فشرده‌سازی KMZ پشتیبانی نمی‌شود");
    }
    offset = dataStart + compSize;
  }
  throw new Error("فایل doc.kml داخل KMZ یافت نشد");
}

export async function readKmlText(blob, name = "") {
  const isKmz = /\.kmz$/i.test(name);
  if (!isKmz) return await blob.text();
  const buf = new Uint8Array(await blob.arrayBuffer());
  const kmlBytes = await extractKmlFromZip(buf);
  return new TextDecoder().decode(kmlBytes);
}
