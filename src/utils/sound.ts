const AUDIO_ENABLED_STORAGE_KEY = 'sf_audio_enabled';

let audioCtx: AudioContext | null = null;
let primed = false;
let audioPreferenceEnabled = false;

const readPersistedAudioPreference = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(AUDIO_ENABLED_STORAGE_KEY) === 'true';
};

const persistAudioPreference = (enabled: boolean) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (enabled) {
    window.localStorage.setItem(AUDIO_ENABLED_STORAGE_KEY, 'true');
    return;
  }

  window.localStorage.removeItem(AUDIO_ENABLED_STORAGE_KEY);
};

const syncAudioPreference = () => {
  audioPreferenceEnabled = readPersistedAudioPreference();
  return audioPreferenceEnabled;
};

const isAudioContextRunning = () => audioCtx?.state === 'running';

export const primeAudio = () => {
  if (primed) return;
  try {
    audioCtx = audioCtx ?? new AudioContext();
    primed = true;
  } catch {
    // Audio context failed to init (very old browser); degrade silently.
    primed = false;
  }
};

const resumeAudioContext = async () => {
  if (!audioCtx) {
    primeAudio();
  }

  if (!audioCtx) {
    return null;
  }

  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch {
      return null;
    }
  }

  return audioCtx;
};

export const enableAudio = async () => {
  syncAudioPreference();

  const ctx = await resumeAudioContext();
  const enabled = Boolean(ctx) && isAudioContextRunning();

  if (enabled) {
    audioPreferenceEnabled = true;
    persistAudioPreference(true);
  }

  return enabled;
};

export const hasAudioPreference = () => syncAudioPreference();

export const isAudioEnabled = () => {
  syncAudioPreference();
  return audioPreferenceEnabled && isAudioContextRunning();
};

const playTone = async (steps: Array<{ frequency: number; start: number; duration: number; volume: number; type?: OscillatorType }>) => {
  if (!isAudioEnabled()) {
    return false;
  }

  const ctx = await resumeAudioContext();

  if (!ctx) {
    return false;
  }

  for (const step of steps) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = step.type ?? 'sine';
    osc.frequency.setValueAtTime(step.frequency, ctx.currentTime + step.start);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime + step.start);
    gain.gain.exponentialRampToValueAtTime(step.volume, ctx.currentTime + step.start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + step.start + step.duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + step.start);
    osc.stop(ctx.currentTime + step.start + step.duration + 0.02);
  }

  return true;
};

export const playInboxChime = async () =>
  playTone([
    {
      frequency: 880,
      start: 0,
      duration: 0.28,
      volume: 0.18,
      type: 'sine',
    },
  ]);

export const playAppointmentAlertTone = async () =>
  playTone([
    {
      frequency: 1046,
      start: 0,
      duration: 0.22,
      volume: 0.28,
      type: 'square',
    },
    {
      frequency: 880,
      start: 0.28,
      duration: 0.22,
      volume: 0.24,
      type: 'square',
    },
    {
      frequency: 1046,
      start: 0.56,
      duration: 0.3,
      volume: 0.3,
      type: 'square',
    },
  ]);
