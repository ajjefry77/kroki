export function kmlToGeoJSON(doc) {
  const features = [];

  const processPlacemark = (pm) => {
    const nameEl = pm.querySelector("name");
    const descEl = pm.querySelector("description");
    const name = nameEl ? nameEl.textContent : "";
    const description = descEl ? descEl.textContent : "";

    const point = pm.querySelector("Point");
    const lineString = pm.querySelector("LineString");
    const polygon = pm.querySelector("Polygon");

    let geometry = null;

    if (point) {
      const coords = parseKMLCoords(point.querySelector("coordinates"));
      if (coords.length) geometry = { type: "Point", coordinates: coords[0] };
    } else if (lineString) {
      const coords = parseKMLCoords(lineString.querySelector("coordinates"));
      if (coords.length)
        geometry = { type: "LineString", coordinates: coords };
    } else if (polygon) {
      const outer = polygon.querySelector("outerBoundaryIs coordinates");
      const coords = parseKMLCoords(outer);
      if (coords.length) {
        coords.push(coords[0]);
        geometry = { type: "Polygon", coordinates: [coords] };
      }
    }

    if (geometry)
      features.push({
        type: "Feature",
        properties: { name, description },
        geometry,
      });
  };

  doc.querySelectorAll("Placemark").forEach(processPlacemark);
  return { type: "FeatureCollection", features };
}

export function parseKMLCoords(el) {
  if (!el) return [];
  return el.textContent
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [lon, lat] = pair.split(",").map(Number);
      return [lon, lat];
    })
    .filter((c) => !isNaN(c[0]) && !isNaN(c[1]));
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
