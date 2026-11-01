import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryHistory, createRouter } from "vue-router";
import { pickMapQuery, sharedMapQuery, updateSharedMapUrl } from "../src/utils/sharedMapLink.js";
import { resolveMapQuery, resolvedMapQuery } from "../src/utils/secureMapLinks.js";
import { createRouteGuard } from "../src/router/sharedLinkGuard.js";

const token = (char) => "k1." + char.repeat(100);
const raw = { lat: "35.7", lng: "51.4", zoom: "18", polygon: "51.4,35.7;51.401,35.7;51.401,35.701" };

test("encrypted URL query carries only the opaque map parameter, even with mixed legacy input", () => {
  const url = new URL(`http://localhost/?lat=12&lng=10#/draw?map=${token("a")}&polygon=51,35&zoom=5`);
  assert.deepEqual(sharedMapQuery(url), { map: token("a") });
  assert.deepEqual(pickMapQuery({ ...raw, map: token("a") }), { map: token("a") });
});

test("panning and zooming never reintroduce raw coordinates into an encrypted link", () => {
  let url = new URL(`http://localhost/?lat=12&lng=10&campaign=a#/draw?map=${token("a")}&polygon=51,35&tab=points`);
  for (let i = 0; i < 4; i++) url = updateSharedMapUrl(url.href, raw);
  assert.equal(url.searchParams.has("lat"), false);
  assert.equal(url.searchParams.get("campaign"), "a");
  const params = new URLSearchParams(url.hash.split("?")[1]);
  assert.deepEqual([...params.keys()], ["map", "tab"]);
  assert.equal(url.href.includes("51.4"), false);
});

test("secure links survive guest login, auth refresh and wizard navigation without exposing geometry", async () => {
  const router = createRouter({ history: createMemoryHistory(), routes: ["auth", "draw", "info"].map((name) => ({
    path: "/" + name, name, component: {}, meta: { requiresAuth: name !== "auth", returnTag: "start" },
  })) });
  const auth = { isAuthenticated: { value: false }, isAdmin: { value: false }, isAgent: { value: false } };
  router.beforeEach(createRouteGuard(auth, () => ({})));
  await router.push({ name: "draw", query: { ...raw, map: token("b") } });
  assert.equal(router.currentRoute.value.name, "auth");
  assert.deepEqual(router.currentRoute.value.query, { map: token("b"), return: "start" });
  auth.isAuthenticated.value = true;
  await router.replace({ name: "auth", query: { map: token("b"), return: "start", retry: "1" } });
  assert.equal(router.currentRoute.value.name, "draw");
  assert.deepEqual(router.currentRoute.value.query, { map: token("b") });
  for (const name of ["info", "draw"]) {
    await router.push({ name, query: router.currentRoute.value.query });
    assert.deepEqual(router.currentRoute.value.query, { map: token("b") });
  }
});

test("decrypts once after readiness and shares concurrent requests without rewriting the URL", async () => {
  const map = token("c");
  const location = new URL(`http://localhost/#/draw?map=${map}`);
  let calls = 0;
  const open = async (received) => { calls++; assert.equal(received, map); return { query: raw }; };
  assert.deepEqual(resolvedMapQuery(location), {});
  const results = await Promise.all([resolveMapQuery({ map }, open), resolveMapQuery({ map }, open)]);
  assert.equal(calls, 1);
  assert.deepEqual(results, [raw, raw]);
  assert.deepEqual(resolvedMapQuery(location), raw);
  await resolveMapQuery({ map }, open);
  assert.equal(calls, 1);
  assert.equal(location.href.includes("polygon"), false);
});

test("failed decryptions can be retried and never fall back to raw URL geometry", async () => {
  const query = { map: token("d"), ...raw };
  await assert.rejects(resolveMapQuery(query, async () => { throw Error("expired"); }), /expired/);
  assert.deepEqual(resolvedMapQuery(new URL(`http://localhost/#/draw?map=${query.map}&polygon=51,35`)), {});
  assert.deepEqual(await resolveMapQuery(query, async () => ({ query: raw })), raw);
});

test("invalid encrypted links and invalid server responses fail before map initialization", async () => {
  await assert.rejects(resolveMapQuery({ map: "bad" }, () => { throw Error("must not call"); }), /لینک امن/);
  await assert.rejects(resolveMapQuery({ map: token("e") }, async () => ({ query: { map: "nested" } })), /پاسخ سرور/);
  await assert.rejects(resolveMapQuery({ map: token("f") }, async () => ({})), /پاسخ سرور/);
});

test("legacy plaintext links remain supported independently of secure link resolution", async () => {
  const url = new URL(`http://localhost/#/draw?${new URLSearchParams(raw)}`);
  assert.deepEqual(resolvedMapQuery(url), raw);
  assert.deepEqual(await resolveMapQuery(raw, () => { throw Error("must not call"); }), raw);
});
