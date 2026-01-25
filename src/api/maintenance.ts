import { ref } from 'vue';

export const maintenanceActive = ref(false);
export const maintenanceMessage = ref<string | null>(null);

const alreadyPatched = typeof window !== 'undefined' && (window as any).__maintenanceInterceptor;

export const setupMaintenanceInterceptor = () => {
  if (typeof window === 'undefined') return;
  if (alreadyPatched) return;

  const originalFetch = window.fetch.bind(window);
  (window as any).__maintenanceInterceptor = true;

  window.fetch = async (...args) => {
    const res = await originalFetch(...args);

    if (res.status === 503) {
      try {
        const clone = res.clone();
        const body = await clone.json();
        if (body?.maintenance) {
          maintenanceActive.value = true;
          maintenanceMessage.value = body?.message || 'Maintenance in progress';
        }
      } catch {
        maintenanceActive.value = true;
        maintenanceMessage.value = 'Maintenance in progress';
      }
    }

    return res;
  };
};

export const clearMaintenanceBanner = () => {
  maintenanceActive.value = false;
  maintenanceMessage.value = null;
};
