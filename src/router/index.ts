import { createRouter, createWebHistory, type RouteLocationRaw } from "vue-router";
import PublicLayout from "../layouts/PublicLayout.vue";
import CheckInPage from "../pages/public/CheckIn.vue";
import AdminLayout from "../layouts/AdminLayout.vue";
import PlatformLayout from "../layouts/PlatformLayout.vue";
import AdminQRCodePage from "../pages/admin/QRCode.vue";
import AdminDashboardPage from "../pages/admin/Dashboard.vue";
import AdminServicesPage from "../pages/admin/Services.vue";
import AdminStaffPage from "../pages/admin/Staff.vue";
import AdminAppointmentsPage from "../pages/admin/Appointments.vue";
import AdminSMSPage from "../pages/admin/SMS.vue";
import AdminBillingPage from "../pages/admin/Billing.vue";
import AdminReviewSMSPage from "../pages/admin/ReviewSMS.vue";
import PublicBookPage from "../pages/public/Book.vue";
import AdminAppointmentRemindersPage from "../pages/admin/AppointmentReminders.vue";
import PlatformDashboardPage from "../pages/platform/Dashboard.vue";
import PlatformTenantDetailPage from "../pages/platform/TenantDetail.vue";
import PlatformCreateTenantPage from "../pages/platform/CreateTenant.vue";
import PlatformDemoRequestsPage from "../pages/platform/DemoRequests.vue";
import CustomerProfilePage from "../pages/admin/CustomerProfile.vue";
import AdminOnboardingPage from "../pages/admin/Onboarding.vue";
import AdminDemoRequestsPage from "../pages/admin/DemoRequests.vue";
import AdminCustomersPage from "../pages/admin/Customers.vue";
import AdminQueuePage from "../pages/admin/Queue.vue";
import AdminBillingSuccessPage from "../pages/admin/BillingSuccess.vue";
import MarketingLayout from "../layouts/MarketingLayout.vue";
import MarketingHome from "../pages/MarketingHome.vue";
import StartPage from "../pages/Start.vue";
import LoginPage from "../pages/Login.vue";
import MagicLoginPage from "../pages/MagicLogin.vue";
import PrivacyPage from "../pages/Privacy.vue";
import TermsPage from "../pages/Terms.vue";
import { clearAuthState } from "../utils/auth";
import { defaultRouteForRole } from "../utils/navigation";

const LOGIN_ROUTE: RouteLocationRaw = { name: "login" };

const isBrowser = typeof window !== "undefined";

const decodeJwtExpiry = (token: string): number | null => {
  try {
    const base64 = token.split(".")[1];
    if (!base64) return null;
    const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch (_err) {
    return null;
  }
};

const isTokenExpired = (token: string | null) => {
  const exp = token ? decodeJwtExpiry(token) : null;
  if (!exp) return false;
  return exp * 1000 < Date.now();
};

const getStoredRole = () => (isBrowser ? localStorage.getItem("role") : null);

const hasValidSession = () => {
  if (!isBrowser) return false;
  const token = localStorage.getItem("token");
  const role = getStoredRole();
  if (!token || !role) return false;
  if (isTokenExpired(token)) {
    clearAuthState();
    return false;
  }
  return true;
};

const routes = [
  {
    path: "/",
    component: MarketingLayout,
    children: [
      {
        path: "",
        name: "marketing-home",
        component: MarketingHome,
      },
      {
        path: "start",
        name: "start",
        component: StartPage,
      },
    ],
  },
  {
    path: "/app",
    name: "pwa-entry",
    redirect: () => {
      const role = getStoredRole();
      return hasValidSession() ? defaultRouteForRole(role) : LOGIN_ROUTE;
    },
  },
  {
    path: "/app/login",
    name: "login",
    alias: "/login",
    component: LoginPage,
  },
  {
    path: "/privacy",
    name: "privacy",
    component: PrivacyPage,
  },
  {
    path: "/terms",
    name: "terms",
    component: TermsPage,
  },
  {
    path: "/magic-login",
    name: "magic-login",
    component: MagicLoginPage,
  },
  {
    path: "/check-in",
    component: PublicLayout,
    children: [
      {
        path: "",
        name: "check-in",
        component: CheckInPage,
      },
      {
        path: "book",
        name: "book",
        component: PublicBookPage,
      },
    ],
  },
  {
    path: "/platform",
    component: PlatformLayout,
    children: [
      {
        path: "",
        name: "platform-dashboard",
        component: PlatformDashboardPage,
        meta: { requiresAuth: true, roles: ["SUPER_ADMIN"] },
      },
      {
        path: "create-tenant",
        name: "platform-create-tenant",
        component: PlatformCreateTenantPage,
        meta: { requiresAuth: true, roles: ["SUPER_ADMIN"] },
      },
      {
        path: "demo-requests",
        name: "platform-demo-requests",
        component: PlatformDemoRequestsPage,
        meta: { requiresAuth: true, roles: ["SUPER_ADMIN"] },
      },
      {
        path: ":businessId",
        name: "platform-tenant",
        component: PlatformTenantDetailPage,
        meta: { requiresAuth: true, roles: ["SUPER_ADMIN"] },
      },
    ],
  },
  {
    path: "/admin",
    component: AdminLayout,
    children: [
      {
        path: "",
        name: "admin-dashboard",
        component: AdminDashboardPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "services",
        name: "admin-services",
        component: AdminServicesPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "onboarding",
        name: "admin-onboarding",
        component: AdminOnboardingPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "demo-requests",
        name: "admin-demo-requests",
        component: AdminDemoRequestsPage,
        meta: { requiresAuth: true, roles: ["SUPER_ADMIN"] },
      },
      {
        path: "staff",
        name: "admin-staff",
        component: AdminStaffPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "customers/:customerId",
        name: "admin-customer-profile",
        component: CustomerProfilePage,
        meta: { requiresAuth: true, roles: ["OWNER", "STAFF"] },
      },
      {
        path: "customers",
        name: "admin-customers",
        component: AdminCustomersPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "appointments",
        name: "admin-appointments",
        component: AdminAppointmentsPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "billing",
        name: "admin-billing",
        component: AdminBillingPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "billing/success",
        name: "admin-billing-success",
        component: AdminBillingSuccessPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "review-sms",
        name: "admin-review-sms",
        component: AdminReviewSMSPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "queue",
        name: "admin-queue",
        component: AdminQueuePage,
        meta: { requiresAuth: true, roles: ["OWNER", "STAFF"] },
      },
      {
        path: "appointment-reminders",
        name: "admin-appointment-reminders",
        component: AdminAppointmentRemindersPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "sms",
        name: "admin-sms",
        component: AdminSMSPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "qr",
        name: "admin-qr",
        component: AdminQRCodePage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/check-in",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, _from, next) => {
  const authed = hasValidSession();
  const storedRole = getStoredRole();

  if (to.name === "login" && authed && storedRole) {
    return next(defaultRouteForRole(storedRole));
  }

  if (to.meta.requiresAuth) {
    if (!authed) {
      return next(LOGIN_ROUTE);
    }

    const roles = (to.meta.roles as string[] | undefined) ?? [];
    if (roles.length > 0) {
      if (!storedRole || !roles.includes(storedRole)) {
        return next(LOGIN_ROUTE);
      }

      // Owners can navigate freely; onboarding is guided via banner/CTA, not hard redirects
    }
  }
  return next();
});

export default router;
