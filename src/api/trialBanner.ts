import { ref } from 'vue';

export const trialExpired = ref(false);
export const trialEndedAt = ref<string | null>(null);
export const trialDaysRemaining = ref<number | null>(null);

const updateFromIso = (iso?: string | null) => {
  trialEndedAt.value = iso ?? null;
  if (!iso) {
    trialDaysRemaining.value = null;
    trialExpired.value = false;
    return;
  }
  const end = new Date(iso).getTime();
  const now = Date.now();
  const diff = end - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) {
    trialExpired.value = true;
    trialDaysRemaining.value = 0;
  } else {
    trialExpired.value = false;
    trialDaysRemaining.value = days;
  }
};

const alreadyPatched = typeof window !== 'undefined' && (window as any).__trialInterceptor;

export const setupTrialInterceptor = () => {
  if (typeof window === 'undefined') return;
  if (alreadyPatched) return;
  const originalFetch = window.fetch.bind(window);
  (window as any).__trialInterceptor = true;

  window.fetch = async (...args) => {
    const res = await originalFetch(...args);

    if (res.status === 402) {
      try {
        const clone = res.clone();
        const body = await clone.json();
        if (body?.action === 'upgrade') {
          updateFromIso(body?.trialEndedAt ?? null);
          trialExpired.value = true;
        }
      } catch {
        // ignore parse errors
      }
    }

    return res;
  };
};

export const resetTrialState = () => {
  trialExpired.value = false;
  trialEndedAt.value = null;
  trialDaysRemaining.value = null;
};

export const setTrialEndsAt = (iso?: string | null) => {
  updateFromIso(iso ?? null);
};
