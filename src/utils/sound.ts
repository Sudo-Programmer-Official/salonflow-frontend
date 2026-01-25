let audioCtx: AudioContext | null = null;
let primed = false;

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

export const playInboxChime = async () => {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch {
      return;
    }
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, audioCtx.currentTime); // gentle glassy ping

  gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, audioCtx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.28);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
};
