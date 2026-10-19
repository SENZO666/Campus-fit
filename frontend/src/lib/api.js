import axios from "axios";

export const api = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`,
  withCredentials: true,
});

const NO_REFRESH = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];
let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config || {};
    const skip = NO_REFRESH.some((p) => original.url?.includes(p));
    if (error.response?.status === 401 && !original._retry && !skip) {
      original._retry = true;
      try {
        refreshing = refreshing || api.post("/auth/refresh").finally(() => { refreshing = null; });
        await refreshing;
        return api(original);
      } catch {
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export function errorMessage(error, fallback = "Something went wrong. Please try again.") {
  const detail = error?.response?.data?.detail;
  if (detail == null) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg.replace(/^Value error, /, "") : JSON.stringify(e))).join(" ");
  }
  if (typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
