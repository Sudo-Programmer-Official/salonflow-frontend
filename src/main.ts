import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import './style.css';
import App from './App.vue';
import router from './router';
import { setupTrialInterceptor } from './api/trialBanner';
import { fetchOnboardingStatus } from './api/onboarding';
import { setBusinessTimezone } from './utils/dates';
import { applyThemeFromSettings } from './utils/theme';

const app = createApp(App);

setupTrialInterceptor();
app.use(router);
app.use(ElementPlus);

applyThemeFromSettings();

app.mount('#app');

// Refresh business timezone from API on app bootstrap to avoid stale localStorage.
(async () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) return;
  try {
    const status = await fetchOnboardingStatus(true);
    if (status?.timezone) {
      setBusinessTimezone(status.timezone);
    }
  } catch {
    // best-effort only; ignore errors on bootstrap
  }
})();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Fail silently; app still works without SW.
    });
  });
}

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}
