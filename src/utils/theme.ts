const DEFAULT_FONT_SCALE = 1.05;
const MIN_FONT_SCALE = 0.8;
const MAX_FONT_SCALE = 1.75;
const FONT_MAP: Record<string, string> = {
  system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  inter: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
  poppins: '"Poppins", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
  montserrat: '"Montserrat", system-ui, -apple-system, "Segoe UI", sans-serif',
  space: '"Space Grotesk", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
};

export type UiPreferences = {
  uiFontScale?: number | null;
  uiGlassEnabled?: boolean | null;
  uiFontFamily?: string | null;
  kioskThemeMode?: 'milky' | 'black-glass' | null;
  kioskPrimaryColor?: 'moneyGreen' | 'lightGreen' | 'gold' | null;
  kioskKeypadStyle?: 'solid' | 'glass' | null;
};

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

type ThemeOpts = {
  boost?: number;
  mode?: string;
  maxScale?: number;
};

export function applyThemeFromSettings(
  settings?: UiPreferences | null,
  opts?: ThemeOpts,
) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const rawScale = settings?.uiFontScale;
  const maxScale = opts?.maxScale ?? MAX_FONT_SCALE;
  const scale =
    typeof rawScale === 'number' && Number.isFinite(rawScale)
      ? clamp(rawScale, MIN_FONT_SCALE, maxScale)
      : DEFAULT_FONT_SCALE;
  const boosted = opts?.boost ? clamp(scale * opts.boost, MIN_FONT_SCALE, maxScale) : scale;

  root.style.setProperty('--font-scale-base', boosted.toFixed(2));
  root.dataset.glass = settings?.uiGlassEnabled === false ? 'off' : 'on';
  if (opts?.mode) {
    root.dataset.mode = opts.mode;
  } else if (!root.dataset.mode) {
    root.dataset.mode = 'app';
  }
  const existingTheme = root.dataset.kioskTheme;
  const resolvedTheme =
    settings?.kioskThemeMode === 'black-glass'
      ? 'black-glass'
      : settings?.kioskThemeMode === 'milky'
        ? 'milky'
        : existingTheme === 'black-glass' || existingTheme === 'milky'
          ? existingTheme
          : 'milky';
  root.dataset.kioskTheme = resolvedTheme;
  const existingPrimary = root.dataset.kioskPrimary;
  if (settings?.kioskPrimaryColor) {
    root.dataset.kioskPrimary = settings.kioskPrimaryColor;
  } else if (!existingPrimary) {
    root.dataset.kioskPrimary = 'moneyGreen';
  }
  const existingKeypad = root.dataset.kioskKeypad;
  if (settings?.kioskKeypadStyle) {
    root.dataset.kioskKeypad = settings.kioskKeypadStyle;
  } else if (!existingKeypad) {
    root.dataset.kioskKeypad = 'solid';
  }
  const familyKey = String(settings?.uiFontFamily ?? 'system').toLowerCase();
  const resolved =
    FONT_MAP[familyKey] ??
    FONT_MAP[familyKey.replace(/\s+/g, '')] ??
    FONT_MAP.system;
  root.style.setProperty('--ui-font-family', (resolved ?? FONT_MAP.system) as string);
}

export function resetThemeToDefault() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--font-scale-base', DEFAULT_FONT_SCALE.toString());
  root.dataset.glass = 'on';
  root.dataset.mode = 'app';
}

export const themeBounds = {
  minScale: MIN_FONT_SCALE,
  maxScale: MAX_FONT_SCALE,
  defaultScale: DEFAULT_FONT_SCALE,
};

export const fontFamilyOptions = [
  { value: 'system', label: 'System UI' },
  { value: 'inter', label: 'Inter' },
  { value: 'poppins', label: 'Poppins' },
  { value: 'montserrat', label: 'Montserrat' },
  { value: 'space', label: 'Space Grotesk' },
];

export const defaultUiPreferences: UiPreferences = {
  uiFontScale: DEFAULT_FONT_SCALE,
  uiGlassEnabled: true,
  uiFontFamily: 'system',
};
