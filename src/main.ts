import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import './style.css';
import App from './App.vue';
import router from './router';
import { setupTrialInterceptor } from './api/trialBanner';
import { setupMaintenanceInterceptor } from './api/maintenance';
import { setupAuthInterceptor } from './api/authInterceptor';
import { fetchOnboardingStatus } from './api/onboarding';
import { setBusinessTimezone } from './utils/dates';
import { applyThemeFromSettings } from './utils/theme';

const app = createApp(App);

setupAuthInterceptor();
setupTrialInterceptor();
setupMaintenanceInterceptor();
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
  const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;
  let reloadPending = false;

  const removeUpdateBanner = () => {
    const existing = document.getElementById('sf-update-banner');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  };

  const showUpdateBanner = (onRefresh: () => void) => {
    if (document.getElementById('sf-update-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'sf-update-banner';
    banner.style.cssText = [
      'position:fixed',
      'bottom:20px',
      'left:50%',
      'transform:translateX(-50%)',
      'z-index:9999',
      'background:#0f172a',
      'color:#f8fafc',
      'padding:14px 16px',
      'border-radius:12px',
      'box-shadow:0 12px 30px rgba(0,0,0,0.22)',
      'display:flex',
      'align-items:center',
      'gap:12px',
      'flex-wrap:wrap',
      'max-width:90vw',
    ].join(';');

    const text = document.createElement('div');
    text.style.cssText = 'font-weight:600;font-size:14px';
    text.textContent = 'A new version of SalonFlow is ready.';

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';

    const refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.style.cssText = [
      'background:#22c55e',
      'color:#0f172a',
      'border:none',
      'padding:8px 12px',
      'border-radius:10px',
      'font-weight:700',
      'cursor:pointer',
    ].join(';');
    refreshBtn.textContent = 'Refresh now';
    refreshBtn.onclick = () => {
      removeUpdateBanner();
      onRefresh();
    };

    const dismissBtn = document.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.style.cssText = [
      'background:transparent',
      'color:#e2e8f0',
      'border:1px solid rgba(248,250,252,0.25)',
      'padding:8px 10px',
      'border-radius:10px',
      'font-weight:600',
      'cursor:pointer',
    ].join(';');
    dismissBtn.textContent = 'Later';
    dismissBtn.onclick = removeUpdateBanner;

    actions.appendChild(refreshBtn);
    actions.appendChild(dismissBtn);
    banner.appendChild(text);
    banner.appendChild(actions);
    document.body.appendChild(banner);
  };

  const promptForRefresh = (registration: ServiceWorkerRegistration) => {
    showUpdateBanner(() => {
      reloadPending = true;
      const waiting = registration.waiting || registration.installing;
      if (waiting) {
        waiting.postMessage({ type: 'SKIP_WAITING' });
      } else if (registration.update) {
        registration.update();
      }
    });
  };

  const monitorRegistration = (registration: ServiceWorkerRegistration) => {
    if (registration.waiting && navigator.serviceWorker.controller) {
      promptForRefresh(registration);
    }
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          promptForRefresh(registration);
        }
      });
    });
  };

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadPending) {
      window.location.reload();
    }
  });

  const registerSw = () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        monitorRegistration(registration);
        if (registration.update) {
          registration.update();
          window.setInterval(() => registration.update().catch(() => {}), UPDATE_CHECK_INTERVAL_MS);
        }
      })
      .catch(() => {
        // Fail silently; app still works without SW.
      });
  };

  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        if (registration.update) registration.update();
        monitorRegistration(registration);
      });
    });
    registerSw();
  });
}

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}
