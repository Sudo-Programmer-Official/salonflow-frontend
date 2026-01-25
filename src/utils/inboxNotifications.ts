import { reactive, type Ref } from 'vue';
import { fetchUnreadCount } from '../api/inbox';
import { playInboxChime, primeAudio } from './sound';

type UnreadState = {
  unreadCount: number;
  initialized: boolean;
  polling: boolean;
  pollId: number | null;
};

const state = reactive<UnreadState>({
  unreadCount: 0,
  initialized: false,
  polling: false,
  pollId: null,
});

const refreshUnread = async (opts: { silent?: boolean; routeName?: string | null } = {}) => {
  const previous = state.unreadCount;
  const count = await fetchUnreadCount().catch(() => previous);
  state.unreadCount = count;

  if (!state.initialized) {
    state.initialized = true;
    return;
  }

  const delta = count - previous;
  if (delta > 0 && !opts.silent) {
    await playInboxChime();
  }
};

const startPolling = (routeNameRef?: Ref<string | null | undefined>, intervalMs = 5000) => {
  if (state.polling) return;
  state.polling = true;
  refreshUnread({ silent: true, routeName: routeNameRef?.value ?? null });
  state.pollId = window.setInterval(() => {
    refreshUnread({ routeName: routeNameRef?.value ?? null });
  }, intervalMs);
};

const stopPolling = () => {
  if (state.pollId) {
    window.clearInterval(state.pollId);
    state.pollId = null;
  }
  state.polling = false;
};

const ensureAudioPrimed = () => {
  // Must be called in response to a user gesture to satisfy autoplay policies.
  primeAudio();
};

export const useInboxNotifications = () => ({
  state,
  startPolling,
  stopPolling,
  refreshUnread,
  ensureAudioPrimed,
});
