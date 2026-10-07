import { request } from "./client";

/** POST /auth/register ،POST /auth/login ،GET /auth/me ،OTP */
export const AuthApi = {
  login: (body) => request("POST", "/auth/login", { body, auth: false }),
  register: (body) => request("POST", "/auth/register", { body, auth: false }),
  me: () => request("GET", "/auth/me"),
  requestOtp: (body) => request("POST", "/auth/otp/request", { body, auth: false }),
  verifyOtp: (body) => request("POST", "/auth/otp/verify", { body, auth: false }),
};
