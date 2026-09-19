import { request } from "./client";

/** کاربران (ادمین): GET /users ،PATCH /users/:id ،POST /users/:id/credit */
export const UsersApi = {
  list: () => request("GET", "/users"),
  update: (id, body) => request("PATCH", `/users/${id}`, { body }),
  credit: (id, amount) => request("POST", `/users/${id}/credit`, { body: { amount } }),
};
