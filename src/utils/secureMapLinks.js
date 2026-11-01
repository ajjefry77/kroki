import { sharedMapQuery } from "./sharedMapLink.js";

const resolved = new Map();
const pending = new Map();

export function resolvedMapQuery(location) {
  const query = sharedMapQuery(location);
  return query.map ? (resolved.get(query.map) || {}) : query;
}

export async function resolveMapQuery(query, openLink) {
  if (!query.map) return query;
  const token = query.map;
  if (typeof token !== "string" || token.length > 65536 || !/^k1\.[A-Za-z0-9_-]{60,}$/.test(token)) {
    throw new Error("لینک امن نقشه معتبر نیست؛ از مپیق لینک جدید بسازید");
  }
  if (resolved.has(token)) return resolved.get(token);
  if (!pending.has(token)) {
    const promise = Promise.resolve().then(() => openLink(token)).then((result) => {
      if (!result?.query || typeof result.query !== "object" || Array.isArray(result.query) || result.query.map != null) {
        throw new Error("پاسخ سرور برای لینک نقشه معتبر نیست");
      }
      if (resolved.size >= 8) resolved.delete(resolved.keys().next().value);
      resolved.set(token, result.query);
      return result.query;
    }).finally(() => pending.delete(token));
    pending.set(token, promise);
  }
  return pending.get(token);
}
