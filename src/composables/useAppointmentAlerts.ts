import { computed, reactive } from 'vue';
import type { Router } from 'vue-router';

import { fetchAppointments, type Appointment } from '../api/appointments';
import { getBusinessTimezone, toBusinessDayKey } from '../utils/dates';
import { enableAudio, isAudioEnabled, playAppointmentAlertTone } from '../utils/sound';

type PersistedAlertState = {
  handledIds: string[];
  queuedIds: string[];
};

type AlertBroadcastMessage = {
  type: 'claim' | 'release';
  sourceTabId: string;
  sessionKey: string;
  appointmentId: string;
};

type AlertState = {
  sessionKey: string | null;
  hydrated: boolean;
  polling: boolean;
  pollId: number | null;
  cueId: number | null;
  queuedIds: string[];
  handledIds: string[];
  appointmentsById: Record<string, Appointment>;
  monitorError: string | null;
  actionError: string | null;
  resolving: boolean;
  activeAlertId: string | null;
  alertStartedAt: number | null;
  audioEnabled: boolean;
  audioBlocked: boolean;
};

const storagePrefix = 'sf:new-appointment-alerts';
const alertPollIntervalMs = 5000;
const handledLimit = 250;
const alertableStatuses = new Set(['PENDING', 'BOOKED']);
const alertChannelName = 'sf-alert';

const state = reactive<AlertState>({
  sessionKey: null,
  hydrated: false,
  polling: false,
  pollId: null,
  cueId: null,
  queuedIds: [],
  handledIds: [],
  appointmentsById: {},
  monitorError: null,
  actionError: null,
  resolving: false,
  activeAlertId: null,
  alertStartedAt: null,
  audioEnabled: isAudioEnabled(),
  audioBlocked: false,
});

let pollInFlight = false;
let cueLoopToken = 0;
let localClaimedAlertId: string | null = null;
let localClaimedSessionKey: string | null = null;
let peerClaimedTabId: string | null = null;
let mutedByPeer = false;
let reclaimId: number | null = null;

const alertTabId =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `sf-alert-${Math.random().toString(36).slice(2)}-${Date.now()}`;

let alertChannel: BroadcastChannel | null = null;

const dedupeIds = (values: string[]) => {
  const seen = new Set<string>();

  return values.filter((value) => {
    if (!value || seen.has(value)) {
      return false;
    }

    seen.add(value);
    return true;
  });
};

const trimHandledIds = (values: string[]) => {
  const unique = dedupeIds(values);
  return unique.slice(Math.max(unique.length - handledLimit, 0));
};

const currentRole = () => (typeof window !== 'undefined' ? localStorage.getItem('role') || '' : '');
const isStaffSession = () => currentRole() === 'STAFF';

const buildSessionKey = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    return null;
  }

  const tenant =
    localStorage.getItem('tenantSubdomain') ||
    localStorage.getItem('tenantId') ||
    window.location.hostname.split('.')[0] ||
    'unknown';
  const role = currentRole() || 'UNKNOWN';
  const scope = isStaffSession() ? 'mine' : 'all';

  return `${storagePrefix}:${tenant}:${role}:${scope}:${token.slice(-16)}`;
};

const readPersistedState = (sessionKey: string): PersistedAlertState => {
  if (typeof window === 'undefined') {
    return { handledIds: [], queuedIds: [] };
  }

  try {
    const raw = localStorage.getItem(sessionKey);
    if (!raw) {
      return { handledIds: [], queuedIds: [] };
    }

    const parsed = JSON.parse(raw) as Partial<PersistedAlertState>;

    return {
      handledIds: trimHandledIds(Array.isArray(parsed.handledIds) ? parsed.handledIds : []),
      queuedIds: dedupeIds(Array.isArray(parsed.queuedIds) ? parsed.queuedIds : []),
    };
  } catch {
    return { handledIds: [], queuedIds: [] };
  }
};

const persistState = () => {
  if (typeof window === 'undefined' || !state.sessionKey) {
    return;
  }

  localStorage.setItem(
    state.sessionKey,
    JSON.stringify({
      handledIds: trimHandledIds(state.handledIds),
      queuedIds: dedupeIds(state.queuedIds),
    } satisfies PersistedAlertState),
  );
};

const hydrateSession = (sessionKey: string | null) => {
  if (state.sessionKey && state.sessionKey !== sessionKey) {
    releaseLocalClaim();
  }

  if (!sessionKey) {
    state.sessionKey = null;
    state.hydrated = false;
    state.queuedIds = [];
    state.handledIds = [];
    state.appointmentsById = {};
    state.monitorError = null;
    state.actionError = null;
    state.resolving = false;
    state.activeAlertId = null;
    state.alertStartedAt = null;
    state.audioEnabled = isAudioEnabled();
    state.audioBlocked = false;
    mutedByPeer = false;
    peerClaimedTabId = null;
    return;
  }

  if (state.sessionKey === sessionKey && state.hydrated) {
    return;
  }

  const persisted = readPersistedState(sessionKey);
  state.sessionKey = sessionKey;
  state.hydrated = true;
  state.queuedIds = persisted.queuedIds;
  state.handledIds = persisted.handledIds;
  state.appointmentsById = {};
  state.monitorError = null;
  state.actionError = null;
  state.resolving = false;
  state.activeAlertId = null;
  state.alertStartedAt = null;
  state.audioEnabled = isAudioEnabled();
  state.audioBlocked = false;
  mutedByPeer = false;
  peerClaimedTabId = null;
};

const currentAlert = computed(() =>
  state.queuedIds
    .map((appointmentId) => state.appointmentsById[appointmentId] ?? null)
    .find((appointment): appointment is Appointment => appointment !== null) ?? null,
);

const pendingCount = computed(() => state.queuedIds.length);
const hasActiveAlert = computed(() => currentAlert.value !== null);

const clearReclaimAttempt = () => {
  if (reclaimId !== null) {
    window.clearTimeout(reclaimId);
    reclaimId = null;
  }
};

const invalidateCueLoop = () => {
  cueLoopToken += 1;
};

const ensureAlertChannel = () => {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return null;
  }

  if (!alertChannel) {
    alertChannel = new BroadcastChannel(alertChannelName);
  }

  return alertChannel;
};

const postAlertMessage = (message: AlertBroadcastMessage) => {
  ensureAlertChannel()?.postMessage(message);
};

const releaseLocalClaim = () => {
  if (!localClaimedAlertId || !localClaimedSessionKey) {
    localClaimedAlertId = null;
    localClaimedSessionKey = null;
    return;
  }

  postAlertMessage({
    type: 'release',
    sourceTabId: alertTabId,
    sessionKey: localClaimedSessionKey,
    appointmentId: localClaimedAlertId,
  });

  localClaimedAlertId = null;
  localClaimedSessionKey = null;
};

const claimActiveAlert = (appointmentId: string) => {
  if (!state.sessionKey || localClaimedAlertId === appointmentId) {
    return;
  }

  releaseLocalClaim();
  localClaimedAlertId = appointmentId;
  localClaimedSessionKey = state.sessionKey;

  postAlertMessage({
    type: 'claim',
    sourceTabId: alertTabId,
    sessionKey: state.sessionKey,
    appointmentId,
  });
};

const getEscalatedCueDelayMs = () => {
  if (!state.alertStartedAt) {
    return 3000;
  }

  const elapsedMs = Date.now() - state.alertStartedAt;
  const elapsedSeconds = elapsedMs / 1000;
  const intervalMs =
    elapsedSeconds < 10
      ? 3000
      : elapsedSeconds < 30
        ? 2000
        : 1000;

  if (elapsedSeconds < 10) {
    return Math.min(intervalMs, 10000 - elapsedMs);
  }

  if (elapsedSeconds < 30) {
    return Math.min(intervalMs, 30000 - elapsedMs);
  }

  return intervalMs;
};

const triggerVibration = () => {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }

  try {
    navigator.vibrate([260, 120, 260]);
  } catch {
    // Ignore devices that block vibration.
  }
};

const clearVibration = () => {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }

  try {
    navigator.vibrate(0);
  } catch {
    // Ignore devices that block vibration.
  }
};

const playCue = async () => {
  state.audioEnabled = isAudioEnabled();
  if (!state.audioEnabled) {
    state.audioBlocked = false;
    triggerVibration();
    return false;
  }

  const played = await playAppointmentAlertTone();
  state.audioEnabled = isAudioEnabled();
  state.audioBlocked = state.audioEnabled && !played;
  triggerVibration();
  return played;
};

const clearCueTimeout = () => {
  if (state.cueId !== null) {
    window.clearTimeout(state.cueId);
    state.cueId = null;
  }
};

const pauseLocalAlerts = () => {
  clearCueTimeout();
  clearReclaimAttempt();
  invalidateCueLoop();
  clearVibration();
};

const scheduleReclaimAttempt = () => {
  if (typeof window === 'undefined' || mutedByPeer || !hasActiveAlert.value) {
    return;
  }

  clearReclaimAttempt();
  reclaimId = window.setTimeout(() => {
    reclaimId = null;
    if (mutedByPeer || !hasActiveAlert.value) {
      return;
    }

    syncCueLoop({ restart: true });
  }, 250 + Math.floor(Math.random() * 250));
};

const scheduleNextCue = (token: number) => {
  if (!hasActiveAlert.value || mutedByPeer || token !== cueLoopToken) {
    return;
  }

  state.cueId = window.setTimeout(() => {
    state.cueId = null;

    if (token !== cueLoopToken) {
      return;
    }

    void runCueLoop(token);
  }, getEscalatedCueDelayMs());
};

const runCueLoop = async (token: number) => {
  if (!hasActiveAlert.value || mutedByPeer || token !== cueLoopToken) {
    return;
  }

  await playCue();

  if (!hasActiveAlert.value || mutedByPeer || token !== cueLoopToken) {
    return;
  }

  scheduleNextCue(token);
};

const syncCueLoop = (options: { restart?: boolean } = {}) => {
  const appointmentId = currentAlert.value?.id ?? null;

  state.audioEnabled = isAudioEnabled();

  if (!appointmentId) {
    releaseLocalClaim();
    pauseLocalAlerts();
    mutedByPeer = false;
    peerClaimedTabId = null;
    state.activeAlertId = null;
    state.alertStartedAt = null;
    state.audioBlocked = false;
    return;
  }

  if (state.activeAlertId !== appointmentId) {
    state.activeAlertId = appointmentId;
    state.alertStartedAt = Date.now();
    if (!mutedByPeer) {
      pauseLocalAlerts();
      claimActiveAlert(appointmentId);
    }
  }

  if (mutedByPeer) {
    pauseLocalAlerts();
    state.audioBlocked = false;
    return;
  }

  if (options.restart) {
    pauseLocalAlerts();
    claimActiveAlert(appointmentId);
  }

  if (state.cueId !== null) {
    return;
  }

  claimActiveAlert(appointmentId);
  const token = cueLoopToken;
  void runCueLoop(token);
};

const clearCueState = () => {
  releaseLocalClaim();
  pauseLocalAlerts();
  mutedByPeer = false;
  peerClaimedTabId = null;
  state.activeAlertId = null;
  state.alertStartedAt = null;
  state.audioBlocked = false;
  state.audioEnabled = isAudioEnabled();
};

const enableAudioAlerts = async () => {
  const enabled = await enableAudio();
  state.audioEnabled = isAudioEnabled();

  if (enabled) {
    state.audioBlocked = false;
    syncCueLoop({ restart: true });
  }

  return enabled;
};

const reconcileCueState = () => {
  if (!hasActiveAlert.value) {
    clearCueState();
    return;
  }

  syncCueLoop();
};

const handleAlertBroadcast = (event: MessageEvent<AlertBroadcastMessage>) => {
  const message = event.data;

  if (!message || typeof message !== 'object') {
    return;
  }

  if (message.sourceTabId === alertTabId) {
    return;
  }

  if (!state.sessionKey || message.sessionKey !== state.sessionKey) {
    return;
  }

  if (message.type === 'claim') {
    peerClaimedTabId = message.sourceTabId;
    mutedByPeer = true;
    localClaimedAlertId = null;
    localClaimedSessionKey = null;
    pauseLocalAlerts();
    state.audioBlocked = false;
    return;
  }

  if (message.type === 'release' && peerClaimedTabId === message.sourceTabId) {
    peerClaimedTabId = null;
    mutedByPeer = false;
    scheduleReclaimAttempt();
  }
};

if (typeof window !== 'undefined') {
  ensureAlertChannel()?.addEventListener('message', handleAlertBroadcast as EventListener);
  window.addEventListener('beforeunload', () => {
    releaseLocalClaim();
  });
}

const sortByCreationTime = (appointments: Appointment[]) =>
  [...appointments].sort((left, right) =>
    (left.createdAt || left.scheduledAt).localeCompare(right.createdAt || right.scheduledAt),
  );

const alertableAppointments = (appointments: Appointment[]) =>
  sortByCreationTime(
    appointments.filter((appointment) => alertableStatuses.has(appointment.status)),
  );

const reconcileAppointments = (appointments: Appointment[]) => {
  const candidates = alertableAppointments(appointments);
  const nextAppointmentsById = Object.fromEntries(candidates.map((appointment) => [appointment.id, appointment]));
  const handledIds = new Set(state.handledIds);
  const candidateIds = new Set(candidates.map((appointment) => appointment.id));
  const nextQueuedIds = state.queuedIds.filter((appointmentId) => candidateIds.has(appointmentId));

  for (const appointment of candidates) {
    if (handledIds.has(appointment.id) || nextQueuedIds.includes(appointment.id)) {
      continue;
    }

    nextQueuedIds.push(appointment.id);
  }

  state.appointmentsById = nextAppointmentsById;
  state.queuedIds = dedupeIds(nextQueuedIds);
  persistState();
  reconcileCueState();
};

const clearPoll = () => {
  if (state.pollId !== null) {
    window.clearInterval(state.pollId);
    state.pollId = null;
  }
};

const resolveAlertByAppointmentId = (appointmentId: string | null | undefined) => {
  if (!appointmentId) {
    return;
  }

  state.queuedIds = state.queuedIds.filter((queuedId) => queuedId !== appointmentId);
  state.handledIds = trimHandledIds([...state.handledIds, appointmentId]);
  state.actionError = null;
  persistState();
  reconcileCueState();
};

const resolveCurrentAlert = () => {
  resolveAlertByAppointmentId(currentAlert.value?.id);
};

const refreshAlerts = async () => {
  if (pollInFlight) {
    return;
  }

  pollInFlight = true;

  try {
    const sessionKey = buildSessionKey();
    hydrateSession(sessionKey);

    if (!sessionKey) {
      clearPoll();
      reconcileCueState();
      return;
    }

    const appointments = await fetchAppointments(isStaffSession() ? { mine: true } : undefined);
    reconcileAppointments(appointments);
    state.monitorError = null;
  } catch (error) {
    state.monitorError = error instanceof Error ? error.message : 'Failed to monitor appointments';
  } finally {
    pollInFlight = false;
  }
};

const startPolling = () => {
  if (state.polling) {
    return;
  }

  state.polling = true;
  void refreshAlerts();
  state.pollId = window.setInterval(() => {
    void refreshAlerts();
  }, alertPollIntervalMs);
};

const stopPolling = () => {
  state.polling = false;
  clearPoll();
  clearCueState();
};

const confirmCurrentAlert = () => {
  resolveCurrentAlert();
};

const viewCurrentAlert = async (router: Router) => {
  const appointment = currentAlert.value;

  if (!appointment || state.resolving) {
    return false;
  }

  state.resolving = true;
  state.actionError = null;

  try {
    const appointmentDate = toBusinessDayKey(appointment.scheduledAt, getBusinessTimezone());

    await router.push({
      name: 'admin-appointments',
      query: {
        appointmentId: appointment.id,
        appointmentAt: appointment.scheduledAt,
        appointmentDate,
        alert: '1',
      },
    });

    return true;
  } catch (error) {
    state.actionError = error instanceof Error ? error.message : 'Failed to open appointment';
    return false;
  } finally {
    state.resolving = false;
  }
};

export const useAppointmentAlerts = () => ({
  state,
  currentAlert,
  pendingCount,
  hasActiveAlert,
  refreshAlerts,
  startPolling,
  stopPolling,
  confirmCurrentAlert,
  resolveAlertByAppointmentId,
  enableAudioAlerts,
  viewCurrentAlert,
});
