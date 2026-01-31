import { createRouter, createWebHistory, type RouteLocationRaw } from "vue-router";
import PublicLayout from "../layouts/PublicLayout.vue";
import KioskLayout from "../layouts/KioskLayout.vue";
import CheckInPage from "../pages/public/CheckIn.vue";
import KioskStepperPage from "../pages/public/KioskStepper.vue";
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
import PlatformNumbersPage from "../pages/platform/Numbers.vue";
import PlatformFeatureFlagsPage from "../pages/platform/PlatformFeatureFlags.vue";
import PlatformUsagePage from "../pages/platform/PlatformUsage.vue";
import PlatformPlansPage from "../pages/platform/PlatformPlans.vue";
import PlatformUpgradeRequestsPage from "../pages/platform/PlatformUpgradeRequests.vue";
import PlatformSettingsAlertsPage from "../pages/platform/PlatformSettingsAlerts.vue";
import PlatformInvoicePreviewPage from "../pages/platform/PlatformInvoicePreview.vue";
import CustomerProfilePage from "../pages/admin/CustomerProfile.vue";
import AdminOnboardingPage from "../pages/admin/Onboarding.vue";
import AdminDemoRequestsPage from "../pages/admin/DemoRequests.vue";
import AdminCustomersPage from "../pages/admin/Customers.vue";
import AdminQueuePage from "../pages/admin/Queue.vue";
import AdminBillingSuccessPage from "../pages/admin/BillingSuccess.vue";
import AdminSettingsPage from "../pages/admin/Settings.vue";
import AdminCategoriesPage from "../pages/admin/Categories.vue";
import AdminAnalyticsPage from "../pages/admin/Analytics.vue";
import AdminGiftCardsPage from "../pages/admin/GiftCards.vue";
import AdminPromotionsPage from "../pages/admin/Promotions.vue";
import AdminInboxPage from "../pages/admin/Inbox.vue";
import AdminSmartRemindersPage from "../pages/admin/SmartReminders.vue";
import AdminNotificationsPage from "../pages/admin/Notifications.vue";
import AdminWebsiteOverviewPage from "../pages/admin/Website/AdminWebsiteOverview.vue";
import AdminWebsitePagesPage from "../pages/admin/Website/AdminWebsitePages.vue";
import AdminWebsitePageEditorPage from "../pages/admin/Website/AdminWebsitePageEditor.vue";
import AdminWebsiteDomainsPage from "../pages/admin/Website/AdminWebsiteDomains.vue";
import AdminWebsiteLeadsPage from "../pages/admin/Website/AdminWebsiteLeads.vue";
import AdminWebsiteAnalyticsPage from "../pages/admin/Website/AdminWebsiteAnalytics.vue";
import AdminWebsiteNavigationPage from "../pages/admin/Website/AdminWebsiteNavigation.vue";
import AdminWebsiteFooterPage from "../pages/admin/Website/AdminWebsiteFooter.vue";
import AdminReviewsSettingsPage from "../pages/admin/Reviews/AdminReviewsSettings.vue";
import AdminReviewsRequestsPage from "../pages/admin/Reviews/AdminReviewsRequests.vue";
import AdminReviewsFeedbackPage from "../pages/admin/Reviews/AdminReviewsFeedback.vue";
import AdminSocialPostsPage from "../pages/admin/Social/AdminSocialPosts.vue";
import AdminGoogleBusinessPage from "../pages/admin/Integrations/AdminGoogleBusiness.vue";
import AdminGrowthPage from "../pages/admin/Growth/AdminGrowth.vue";
import AdminCheckoutPage from "../pages/admin/Checkout.vue";
import WebsitePage from "../pages/website/WebsitePage.vue";
import MarketingLayout from "../layouts/MarketingLayout.vue";
import MarketingHome from "../pages/MarketingHome.vue";
import SalonLoginPage from "../pages/SalonLogin.vue";
import StartPage from "../pages/Start.vue";
import LoginPage from "../pages/Login.vue";
import MagicLoginPage from "../pages/MagicLogin.vue";
import PrivacyPage from "../pages/Privacy.vue";
import TermsPage from "../pages/Terms.vue";
import DataDeletionPage from "../pages/DataDeletion.vue";
import { clearAuthState } from "../utils/auth";
import { defaultRouteForRole } from "../utils/navigation";
import { isPlatformHost } from "../api/client";

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

const isWebsiteHost = (() => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  const preview = window.location.search.includes("websitePreview=1");
  const hasToken = Boolean(localStorage.getItem("token"));
  if (preview && hasToken) return true;
  if (host.includes("localhost")) return false;
  return !isPlatformHost();
})();

const websiteRoutes = [
  { path: "/", name: "website-home", component: WebsitePage },
  { path: "/services", name: "website-services", component: WebsitePage },
  { path: "/about", name: "website-about", component: WebsitePage },
  { path: "/contact", name: "website-contact", component: WebsitePage },
  { path: "/es", name: "website-home-es", component: WebsitePage },
  { path: "/es/services", name: "website-services-es", component: WebsitePage },
  { path: "/es/about", name: "website-about-es", component: WebsitePage },
  { path: "/es/contact", name: "website-contact-es", component: WebsitePage },
];

const appRoutes = [
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
        path: "salon-login",
        name: "salon-login",
        component: SalonLoginPage,
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
    path: "/data-deletion",
    name: "data-deletion",
    component: DataDeletionPage,
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
    path: "/book",
    component: PublicLayout,
    children: [
      {
        path: "",
        name: "book-standalone",
        component: PublicBookPage,
      },
    ],
  },
  {
    path: "/check-in/kiosk",
    component: KioskLayout,
    children: [
      {
        path: "",
        name: "check-in-kiosk",
        component: KioskStepperPage,
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
        path: "messaging/numbers",
        name: "platform-numbers",
        component: PlatformNumbersPage,
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
        path: "features",
        name: "platform-features",
        component: PlatformFeatureFlagsPage,
        meta: { requiresAuth: true, roles: ["SUPER_ADMIN"] },
      },
      {
        path: "usage",
        name: "platform-usage",
        component: PlatformUsagePage,
        meta: { requiresAuth: true, roles: ["SUPER_ADMIN"] },
      },
      {
        path: "plans",
        name: "platform-plans",
        component: PlatformPlansPage,
        meta: { requiresAuth: true, roles: ["SUPER_ADMIN"] },
      },
      {
        path: "invoice-preview",
        name: "platform-invoice-preview",
        component: PlatformInvoicePreviewPage,
        meta: { requiresAuth: true, roles: ["SUPER_ADMIN"] },
      },
      {
        path: "upgrade-requests",
        name: "platform-upgrade-requests",
        component: PlatformUpgradeRequestsPage,
        meta: { requiresAuth: true, roles: ["SUPER_ADMIN"] },
      },
      {
        path: "settings/alerts",
        name: "platform-settings-alerts",
        component: PlatformSettingsAlertsPage,
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
        path: "categories",
        name: "admin-categories",
        component: AdminCategoriesPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "analytics",
        name: "admin-analytics",
        component: AdminAnalyticsPage,
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
        path: "gift-cards",
        name: "admin-gift-cards",
        component: AdminGiftCardsPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "promotions",
        name: "admin-promotions",
        component: AdminPromotionsPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "smart-reminders",
        name: "admin-smart-reminders",
        component: AdminSmartRemindersPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "notifications",
        name: "admin-notifications",
        component: AdminNotificationsPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "website",
        name: "admin-website",
        component: AdminWebsiteOverviewPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "website/pages",
        name: "admin-website-pages",
        component: AdminWebsitePagesPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "website/navigation",
        name: "admin-website-navigation",
        component: AdminWebsiteNavigationPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "website/footer",
        name: "admin-website-footer",
        component: AdminWebsiteFooterPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "website/pages/:slug",
        name: "admin-website-page-editor",
        component: AdminWebsitePageEditorPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "website/domains",
        name: "admin-website-domains",
        component: AdminWebsiteDomainsPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "website/leads",
        name: "admin-website-leads",
        component: AdminWebsiteLeadsPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "website/analytics",
        name: "admin-website-analytics",
        component: AdminWebsiteAnalyticsPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "reviews",
        name: "admin-reviews-settings",
        component: AdminReviewsSettingsPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "reviews/requests",
        name: "admin-reviews-requests",
        component: AdminReviewsRequestsPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "reviews/feedback",
        name: "admin-reviews-feedback",
        component: AdminReviewsFeedbackPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "social",
        name: "admin-social-posts",
        component: AdminSocialPostsPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "integrations/google-business",
        name: "admin-google-business",
        component: AdminGoogleBusinessPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "growth",
        name: "admin-growth",
        component: AdminGrowthPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "inbox",
        name: "admin-inbox",
        component: AdminInboxPage,
        meta: { requiresAuth: true, roles: ["OWNER", "STAFF"] },
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
        path: "settings",
        name: "admin-settings",
        component: AdminSettingsPage,
        meta: { requiresAuth: true, roles: ["OWNER"] },
      },
      {
        path: "queue",
        name: "admin-queue",
        component: AdminQueuePage,
        meta: { requiresAuth: true, roles: ["OWNER", "STAFF"] },
      },
      {
        path: "checkout/:checkinId",
        name: "admin-checkout",
        component: AdminCheckoutPage,
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
  routes: isWebsiteHost ? [...websiteRoutes, ...appRoutes] : appRoutes,
});

router.beforeEach(async (to, _from, next) => {
  // Reserved app routes should always hit the app, even on tenant hosts
  const APP_ROUTE_PREFIXES = ["/login", "/check-in", "/kiosk", "/staff", "/admin", "/platform"];
  if (isWebsiteHost && APP_ROUTE_PREFIXES.some((p) => to.path.startsWith(p))) {
    return next();
  }

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
