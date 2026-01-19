const DEFAULT_FONT_SCALE = 1.05;
const MIN_FONT_SCALE = 0.8;
const MAX_FONT_SCALE = 1.6;

export type UiPreferences = {
  uiFontScale?: number | null;
  uiGlassEnabled?: boolean | null;
};

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

export function applyThemeFromSettings(
  settings?: UiPreferences | null,
  opts?: { boost?: number },
) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const rawScale = settings?.uiFontScale;
  const scale =
    typeof rawScale === 'number' && Number.isFinite(rawScale)
      ? clamp(rawScale, MIN_FONT_SCALE, MAX_FONT_SCALE)
      : DEFAULT_FONT_SCALE;
  const boosted = opts?.boost ? clamp(scale * opts.boost, MIN_FONT_SCALE, MAX_FONT_SCALE) : scale;

  root.style.setProperty('--font-scale-base', boosted.toFixed(2));
  root.dataset.glass = settings?.uiGlassEnabled === false ? 'off' : 'on';
}

export function resetThemeToDefault() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--font-scale-base', DEFAULT_FONT_SCALE.toString());
  root.dataset.glass = 'on';
}

export const themeBounds = {
  minScale: MIN_FONT_SCALE,
  maxScale: MAX_FONT_SCALE,
  defaultScale: DEFAULT_FONT_SCALE,
};
