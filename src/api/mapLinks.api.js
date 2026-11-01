import { request } from "./client";

export const MapLinksApi = {
  open: (token) => request("POST", "/map-links/open", { body: { token } }),
};
