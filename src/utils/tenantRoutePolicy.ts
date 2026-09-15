type RouteWithPath = { path: string };

const TENANT_PRIORITY_ROUTE_PATHS = new Set([
  '/demo/access',
  '/demo/access/:token',
  '/app',
  '/app/login',
  '/reset-password',
  '/magic-login',
  '/platform',
  '/admin',
  '/check-in',
  '/book',
  '/check-in/kiosk',
  '/kiosk',
]);

const TENANT_APP_ROUTE_PREFIXES = [
  '/demo/access',
  '/app',
  '/login',
  '/reset-password',
  '/forgot-password',
  '/magic-login',
  '/platform',
  '/admin',
  '/check-in',
  '/book',
  '/check-in/kiosk',
  '/kiosk',
  '/staff',
];

const matchesPath = (path: string, prefix: string): boolean =>
  path === prefix || path.startsWith(`${prefix}/`);

/**
 * Tenant hosts have both website and application routes. These explicit
 * application/public routes must be considered before the website homepage
 * and catch-all fallback routes.
 */
export const orderTenantHostRoutes = <W extends RouteWithPath, A extends RouteWithPath>(
  websiteRoutes: W[],
  appRoutes: A[],
): Array<W | A> => {
  const priorityRoutes = appRoutes.filter(({ path }) => TENANT_PRIORITY_ROUTE_PATHS.has(path));
  const remainingAppRoutes = appRoutes.filter(({ path }) => !TENANT_PRIORITY_ROUTE_PATHS.has(path));
  return [...priorityRoutes, ...websiteRoutes, ...remainingAppRoutes];
};

export const isExplicitTenantAppRoute = (path: string): boolean =>
  TENANT_APP_ROUTE_PREFIXES.some((prefix) => matchesPath(path, prefix));
