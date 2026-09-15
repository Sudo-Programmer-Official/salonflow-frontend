import type { RouteLocationRaw } from "vue-router";

export const defaultRouteForRole = (
  role?: string | null,
  options: { preferAdminQueue?: boolean } = {},
): RouteLocationRaw => {
  if (role === "SUPER_ADMIN") return { name: "platform-dashboard" };
  if (role === "OWNER" && options.preferAdminQueue) return { name: "admin-queue" };
  if (role === "OWNER") return { name: "admin-dashboard" };
  if (role === "STAFF") return { name: "admin-queue" };
  return { name: "check-in" };
};
