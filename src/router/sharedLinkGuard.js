import { MAP_QUERY_KEYS, pickMapQuery, sharedMapQuery } from "../utils/sharedMapLink.js";

export function authRedirect(to, legacyQuery = {}) {
  const query = { ...legacyQuery };
  for (const key of MAP_QUERY_KEYS) {
    if (key in to.query) query[key] = to.query[key];
  }
  return { name: "auth", query: { ...pickMapQuery(query), return: to.meta.returnTag ?? "start" } };
}

export function createRouteGuard(auth, readQuery = sharedMapQuery) {
  return (to) => {
    if (to.name === "auth") {
      return auth.isAuthenticated.value ? {
        name: to.query.return === "start" ? "draw" : "landing",
        query: pickMapQuery({ ...readQuery(), ...pickMapQuery(to.query) }),
      } : true;
    }
    if (to.meta.requiresAuth && !auth.isAuthenticated.value) return authRedirect(to, readQuery());
    if (to.name === "admin" && auth.isAuthenticated.value && !auth.isAdmin.value) return { name: "landing" };
    if (to.name === "agency-request" && (auth.isAdmin.value || auth.isAgent.value)) return { name: "landing" };
    return true;
  };
}
