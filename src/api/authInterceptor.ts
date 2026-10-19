import { clearAuthState } from "../utils/auth";
import { isNativeRuntime } from "../utils/nativeRuntime";
import { refreshNativeSession } from "./auth";

let installed = false;
let nativeRefreshPromise: Promise<unknown> | null = null;

const isAuthEndpoint = (input: RequestInfo | URL) => {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  return raw.includes('/api/auth/login') || raw.includes('/api/auth/refresh') || raw.includes('/api/auth/logout');
};

export const setupAuthInterceptor = () => {
  if (installed || typeof window === "undefined" || typeof window.fetch !== "function") return;
  installed = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init);

    if (response.status === 401) {
      if (isNativeRuntime() && !isAuthEndpoint(input)) {
        nativeRefreshPromise ??= refreshNativeSession().finally(() => {
          nativeRefreshPromise = null;
        });
        const refreshed = await nativeRefreshPromise;
        if (refreshed) {
          const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
          const token = localStorage.getItem('token');
          if (token) {
            headers.set('Authorization', `Bearer ${token}`);
            return originalFetch(input, { ...init, headers });
          }
        }
      }
      const isLoginPage =
        window.location.pathname === "/app/login" ||
        window.location.pathname.startsWith("/login");
      if (isLoginPage) {
        return response;
      }

      // Treat every 401 as session expired (idle-safe, no banners)
      clearAuthState();
      const params = new URLSearchParams(window.location.search);
      if (!params.has("reason")) params.set("reason", "expired");
      window.location.href = `/login?${params.toString()}`;
      // Prevent downstream handlers from acting on the expired response
      return Promise.reject(response);
    }

    return response;
  };
};
