import test from "node:test";
import assert from "node:assert/strict";
import { createRouter, createMemoryHistory } from "vue-router";
import { createServer } from "vite";
import { parseSharedMapQuery, sharedMapQuery, updateSharedMapUrl } from "../src/utils/sharedMapLink.js";
import { restoreSharedDrawing } from "../src/utils/sharedDrawing.js";
import { createRouteGuard } from "../src/router/sharedLinkGuard.js";
import { readSharedMapState, syncSharedMapState, sanitizePin } from "../src/utils/sessionPersist.js";

const polygon = "51.400000,35.700000;51.401000,35.700000;51.401000,35.701000;51.400000,35.700000";
const mapiqLink = `http://localhost:5174/#/draw?${new URLSearchParams({ lat: "35.7", lng: "51.4", zoom: "17", polygon, tool: "kroki" })}`;
const read = (url) => parseSharedMapQuery(sharedMapQuery(new URL(url)));

test("reads the encoded mapiq URL and removes its closing duplicate vertex", () => {
  const shared = read(mapiqLink);
  assert.equal(shared.polygon.length, 3);
  assert.deepEqual(shared.polygon[0], { lng: 51.4, lat: 35.7 });
  assert.equal(shared.zoom, 17);
});

test("missing and blank parameters remain absent; explicit zeros are valid", () => {
  for (const query of [{}, { lat: "", lng: " ", zoom: "" }]) {
    const shared = parseSharedMapQuery(query);
    assert.equal(shared.lat, null);
    assert.equal(shared.lng, null);
    assert.equal(shared.zoom, null);
  }
  assert.deepEqual(read("http://localhost/#/draw?point=0,0").point, { lng: 0, lat: 0 });
  assert.equal(parseSharedMapQuery({ lat: "0" }).lat, 0);
});

test("rejects invalid coordinates without silently altering a polygon", () => {
  for (const pair of ["51,", "x,35", "181,35", "51,91", "51,35,4", "51,Infinity"]) {
    assert.equal(parseSharedMapQuery({ point: pair }).point, null);
    assert.deepEqual(parseSharedMapQuery({ polygon: `51,35;52,35;52,36;${pair}` }).polygon, []);
  }
  assert.deepEqual(parseSharedMapQuery({ polygon: "51,35;51,35;51,35" }).polygon, []);
});

test("active hash parameters override legacy search; lon/z aliases still work", () => {
  const shared = read("http://localhost/?lat=12&lng=10#/draw?lat=35&lng=51&z=18");
  assert.equal(shared.lat, 35);
  assert.equal(shared.lng, 51);
  assert.equal(shared.zoom, 18);
  assert.equal(read("http://localhost/?lon=51&z=16#/draw").lng, 51);
});

test("viewport updates keep geometry, route, tool and unrelated query parameters", () => {
  let url = new URL(mapiqLink + "&tab=points");
  for (let i = 0; i < 5; i++) url = updateSharedMapUrl(url.href, { lat: 35.8, lng: 51.5, zoom: 18 });
  assert.equal(sharedMapQuery(url).polygon, polygon);
  assert.equal(read(url).tool, "kroki");
  assert.equal(read(url).zoom, 18);
  assert.match(url.hash, /^#\/draw\?/);
  assert.equal(new URLSearchParams(url.hash.split("?")[1]).get("tab"), "points");
});

test("migrates legacy search geometry and allows explicit geometry clearing", () => {
  const url = updateSharedMapUrl(`http://localhost/?campaign=a&polygon=${encodeURIComponent(polygon)}#/draw`, { lng: 52 });
  assert.equal(url.searchParams.get("campaign"), "a");
  assert.equal(url.searchParams.has("polygon"), false);
  assert.equal(read(url).polygon.length, 3);
  assert.deepEqual(read(updateSharedMapUrl(url.href, { polygon: null })), { ...read(url), polygon: [] });
});

function memoryRouter(authed = false, admin = false) {
  const auth = { isAuthenticated: { value: authed }, isAdmin: { value: admin }, isAgent: { value: false } };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ["landing", "draw", "info", "preview", "auth", "admin", "agency-request"].map((name) => ({
      path: name === "landing" ? "/" : `/${name}`, name, component: {},
      meta: { requiresAuth: name !== "landing" && name !== "auth", returnTag: ["draw", "info", "preview"].includes(name) ? "start" : name },
    })),
  });
  router.beforeEach(createRouteGuard(auth, () => ({})));
  return { router, auth };
}

test("guest redirect, login and subsequent wizard steps retain the full mapiq payload", async () => {
  const { router, auth } = memoryRouter();
  await router.push(new URL(mapiqLink).hash.slice(1));
  assert.equal(router.currentRoute.value.name, "auth");
  assert.equal(router.currentRoute.value.query.polygon, polygon);
  assert.equal(router.currentRoute.value.query.return, "start");
  // Simulate refreshing auth: only the URL, not component-local state, remains.
  const resumed = memoryRouter(true).router;
  await resumed.push(router.currentRoute.value.fullPath);
  assert.equal(resumed.currentRoute.value.name, "draw");
  assert.equal(resumed.currentRoute.value.query.polygon, polygon);
  auth.isAuthenticated.value = true;
  for (const name of ["draw", "info", "preview", "draw"]) {
    await router.push({ name, query: router.currentRoute.value.query });
    assert.equal(router.currentRoute.value.query.polygon, polygon);
  }
});

test("signed-in users, including admins, can open draw links directly", async () => {
  for (const admin of [false, true]) {
    const { router } = memoryRouter(true, admin);
    await router.push(new URL(mapiqLink).hash.slice(1));
    assert.equal(router.currentRoute.value.name, "draw");
    assert.equal(router.currentRoute.value.query.polygon, polygon);
  }
});

test("existing admin and agency access restrictions are preserved", async () => {
  const normal = memoryRouter(true).router;
  await normal.push("/admin");
  assert.equal(normal.currentRoute.value.name, "landing");
  const admin = memoryRouter(true, true).router;
  await admin.push("/agency-request");
  assert.equal(admin.currentRoute.value.name, "landing");
});

function mapFixture() {
  const calls = [];
  return { calls, resize: () => calls.push("resize"), fitBounds: (...args) => calls.push(["fitBounds", ...args]),
    setCenter: (center) => calls.push(["center", center]), setZoom: (zoom) => calls.push(["zoom", zoom]), getZoom: () => 5 };
}

test("imports and frames the exact polygon; keeps previous drawings unselected", () => {
  const map = mapFixture();
  const previous = { id: "old", shape: { show: true } };
  const pins = [previous];
  const rendered = [];
  const pin = restoreSharedDrawing({ map, pins, shared: read(mapiqLink), renderPin: (_, pin) => rendered.push(pin) });
  assert.equal(pins.length, 2);
  assert.equal(previous.selected, false);
  assert.equal(previous.shape.show, false);
  assert.equal(pin.selected, true);
  assert.equal(pin.shape.positions.length, 3);
  assert.equal(rendered[0], pin);
  assert.equal(map.calls[0], "resize");
  assert.deepEqual(map.calls[1][1], [[51.4, 35.7], [51.401, 35.701]]);
  assert.equal(map.calls[1][2].duration, 0);
});

test("refresh/remount keeps one imported polygon and preserves subsequent edits", () => {
  const map = mapFixture();
  let pins = [];
  const options = { map, shared: read(mapiqLink), renderPin: () => {} };
  restoreSharedDrawing({ ...options, pins });
  pins[0].shape.positions[0].lon = 51.399;
  pins[0].name = "edited";
  // The real persistence sanitizer must retain the import identity.
  pins = pins.map(sanitizePin);
  restoreSharedDrawing({ ...options, pins });
  assert.equal(pins.length, 1);
  assert.equal(pins[0].name, "edited");
  assert.equal(pins[0].shape.positions[0].lon, 51.399);
  assert.equal(map.calls.at(-1)[1][0][0], 51.399);
});

test("point-only links create a point and zoom to it; empty links do nothing", () => {
  const map = mapFixture();
  const pins = [];
  const options = { map, pins, renderPin: () => {} };
  assert.equal(restoreSharedDrawing({ ...options, shared: read("http://localhost/#/draw") }), null);
  assert.equal(map.calls.length, 0);
  restoreSharedDrawing({ ...options, shared: read("http://localhost/#/draw?point=51.4,35.7") });
  assert.equal(pins[0].shape.type, "point");
  assert.deepEqual(map.calls.slice(1), [["center", [51.4, 35.7]], ["zoom", 16]]);
});

test("failed rendering does not add an incomplete pin; the import can be retried", () => {
  const options = { map: mapFixture(), pins: [], shared: read(mapiqLink) };
  assert.throws(() => restoreSharedDrawing({ ...options, renderPin: () => { throw Error("style not ready"); } }));
  assert.equal(options.pins.length, 0);
  restoreSharedDrawing({ ...options, renderPin: () => {} });
  assert.equal(options.pins.length, 1);
});

test("storage URL synchronization retains Vue Router history state and geometry", () => {
  const savedWindow = globalThis.window;
  let url = new URL(mapiqLink);
  const state = { back: "/", current: "/draw", position: 3 };
  globalThis.window = { location: url, history: { state, replaceState(nextState, _, next) {
    assert.equal(nextState, state);
    url = new URL(next, url);
    globalThis.window.location = url;
  } } };
  try {
    syncSharedMapState({ lng: 51.5, lat: 35.8, zoom: 18 });
    assert.equal(readSharedMapState().polygon.length, 3);
    assert.equal(readSharedMapState().lng, 51.5);
  } finally { globalThis.window = savedWindow; }
});

test("actual renderer creates a visible polygon, vertex labels and the correct camera bounds", async () => {
  const server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: "custom" });
  try {
    const { renderPinOnMap } = await server.ssrLoadModule("/src/utils/pinRenderer.js");
    const sources = new Map();
    const layers = new Map();
    const map = {
      ...mapFixture(),
      getSource: (id) => sources.get(id),
      addSource: (id, source) => { assert.equal(sources.has(id), false); sources.set(id, source); },
      getLayer: (id) => layers.get(id),
      addLayer: (layer) => { assert.equal(layers.has(layer.id), false); layers.set(layer.id, layer); },
      getStyle: () => ({ layers: [...layers.values()] }),
      setLayoutProperty: (id, property, value) => { layers.get(id).layout[property] = value; },
      moveLayer: () => {},
    };
    const pins = [];
    const pin = restoreSharedDrawing({ map, pins, shared: read(mapiqLink), renderPin: renderPinOnMap });
    const id = `draw-pin-${pin.id}`;
    assert.deepEqual(sources.get(id).data.features[0].geometry, {
      type: "Polygon", coordinates: [[[51.4, 35.7], [51.401, 35.7], [51.401, 35.701], [51.4, 35.7]]],
    });
    assert.equal(layers.get(id + "-fill").layout.visibility, "visible");
    assert.equal(layers.get(id + "-line").layout.visibility, "visible");
    assert.equal(sources.get(id + "-labels").data.features.filter((f) => f.properties.kind === "vertex").length, 3);
    restoreSharedDrawing({ map, pins, shared: read(mapiqLink), renderPin: renderPinOnMap });
    assert.equal(pins.length, 1);
    assert.equal(sources.size, 2);
    assert.deepEqual(map.calls.at(-1)[1], [[51.4, 35.7], [51.401, 35.701]]);
  } finally { await server.close(); }
});
