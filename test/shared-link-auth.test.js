import test from "node:test";
import assert from "node:assert/strict";
import { createRouteGuard } from "../src/router/sharedLinkGuard.js";

test("secure drawing links remain available without login", () => {
  const auth = { isAuthenticated: { value: false }, isAdmin: { value: false }, isAgent: { value: false } };
  const guard = createRouteGuard(auth, () => ({}));
  const link = { name: "draw", query: { map: "secure-token" }, meta: {} };
  assert.equal(guard(link), true);
});

test("ordinary drawing links remain available without login", () => {
  const auth = { isAuthenticated: { value: false }, isAdmin: { value: false }, isAgent: { value: false } };
  const guard = createRouteGuard(auth, () => ({}));
  assert.equal(guard({ name: "draw", query: { point: "51,35" }, meta: {} }), true);
});
