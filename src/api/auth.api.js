import { request } from "./client";

/** POST /auth/register ،POST /auth/login ،GET /auth/me */
export const AuthApi = {
  login: (body) => request("POST", "/auth/login", { body, auth: false }),
  register: (body) => request("POST", "/auth/register", { body, auth: false }),
  me: () => request("GET", "/auth/me"),
};
