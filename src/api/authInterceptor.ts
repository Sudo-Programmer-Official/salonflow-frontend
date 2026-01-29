import { clearAuthState } from "../utils/auth";

let installed = false;

export const setupAuthInterceptor = () => {
  if (installed || typeof window === "undefined" || typeof window.fetch !== "function") return;
  installed = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await originalFetch(input, init);

    if (response.status === 401) {
      const isLoginPage = window.location.pathname.startsWith("/login");
      if (isLoginPage) {
        return response;
      }

      let errorCode: string | undefined;
      try {
        const clone = response.clone();
        const data = await clone.json().catch(() => null);
        errorCode = (data as any)?.error || (data as any)?.code;
      } catch {
        // ignore parse errors
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
