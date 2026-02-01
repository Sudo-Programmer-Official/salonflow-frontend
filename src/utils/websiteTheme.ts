import type { ThemeTokens } from '../api/settings';

export const DEFAULT_WEBSITE_THEME: ThemeTokens = {
  colors: {
    primary: '#0ea5e9',
    secondary: '#22c55e',
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceMuted: '#f1f5f9',
    textPrimary: '#0f172a',
    textMuted: '#475569',
    accent: '#f59e0b',
    border: '#e2e8f0',
  },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
    baseSize: 16,
    headingWeight: 700,
    bodyWeight: 500,
  },
  radii: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 22,
    full: 9999,
  },
  shadows: {
    card: '0 12px 30px rgba(15, 23, 42, 0.12)',
    overlay: '0 24px 68px rgba(15, 23, 42, 0.25)',
  },
  spacing: {
    sectionDesktop: 80,
    sectionTablet: 64,
    sectionMobile: 40,
  },
  gradients: {
    hero: 'linear-gradient(135deg, rgba(12, 18, 32, 0.85), rgba(12, 18, 32, 0.35))',
    card: 'linear-gradient(180deg, rgba(15, 23, 42, 0.04), rgba(15, 23, 42, 0))',
  },
};

const isObject = (val: unknown): val is Record<string, any> =>
  Boolean(val) && typeof val === 'object' && !Array.isArray(val);

const mergeTheme = (incoming?: Partial<ThemeTokens> | null): ThemeTokens => {
  const base = DEFAULT_WEBSITE_THEME;
  const src = isObject(incoming) ? incoming : {};
  const colors = isObject(src.colors) ? { ...base.colors, ...src.colors } : base.colors;
  const typography = isObject(src.typography) ? { ...base.typography, ...src.typography } : base.typography;
  const radii = isObject(src.radii) ? { ...base.radii, ...src.radii } : base.radii;
  const shadows = isObject(src.shadows) ? { ...base.shadows, ...src.shadows } : base.shadows;
  const spacing = isObject(src.spacing) ? { ...base.spacing, ...src.spacing } : base.spacing;
  const gradients = isObject(src.gradients) ? { ...base.gradients, ...src.gradients } : base.gradients;

  return {
    colors,
    typography,
    radii,
    shadows,
    spacing,
    gradients,
  };
};

const hexToRgb = (hex: string, fallback: string): string => {
  const normalized = (hex || '').replace('#', '').trim();
  if (!normalized || (normalized.length !== 6 && normalized.length !== 3)) {
    return fallback;
  }
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;
  const int = parseInt(full, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `${r} ${g} ${b}`;
};

export function applyWebsiteTheme(tokens?: Partial<ThemeTokens> | null) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const theme = mergeTheme(tokens);

  const set = (key: string, value: string) => root.style.setProperty(key, value);
  const rgbPrimary = hexToRgb(theme.colors.primary, '14 165 233');
  const rgbSecondary = hexToRgb(theme.colors.secondary, '34 197 94');
  const rgbAccent = hexToRgb(theme.colors.accent, '245 158 11');
  const rgbText = hexToRgb(theme.colors.textPrimary, '15 23 42');
  const rgbMuted = hexToRgb(theme.colors.textMuted, '71 85 105');
  const rgbSurface = hexToRgb(theme.colors.surface, '255 255 255');
  const rgbBackground = hexToRgb(theme.colors.background, '248 250 252');
  const rgbBorder = hexToRgb(theme.colors.border, '226 232 240');

  set('--sf-primary', theme.colors.primary);
  set('--sf-primary-rgb', rgbPrimary);
  set('--sf-secondary', theme.colors.secondary);
  set('--sf-secondary-rgb', rgbSecondary);
  set('--sf-accent', theme.colors.accent);
  set('--sf-accent-rgb', rgbAccent);
  set('--sf-bg', theme.colors.background);
  set('--sf-bg-rgb', rgbBackground);
  set('--sf-surface', theme.colors.surface);
  set('--sf-surface-rgb', rgbSurface);
  set('--sf-surface-muted', theme.colors.surfaceMuted);
  set('--sf-text', theme.colors.textPrimary);
  set('--sf-text-primary', theme.colors.textPrimary);
  set('--sf-text-muted', theme.colors.textMuted);
  set('--sf-text-rgb', rgbText);
  set('--sf-muted-rgb', rgbMuted);
  set('--sf-border', theme.colors.border);
  set('--sf-border-rgb', rgbBorder);

  set('--sf-font-family', theme.typography.fontFamily);
  set('--sf-font-size-base', `${theme.typography.baseSize}px`);
  set('--sf-font-weight-heading', `${theme.typography.headingWeight}`);
  set('--sf-font-weight-body', `${theme.typography.bodyWeight}`);

  set('--sf-radius-sm', `${theme.radii.sm}px`);
  set('--sf-radius-md', `${theme.radii.md}px`);
  set('--sf-radius-lg', `${theme.radii.lg}px`);
  set('--sf-radius-xl', `${theme.radii.xl}px`);
  set('--sf-radius-full', `${theme.radii.full}px`);

  set('--sf-shadow-card', theme.shadows.card);
  set('--sf-shadow-overlay', theme.shadows.overlay);

  set('--sf-section-pad-desktop', `${theme.spacing.sectionDesktop}px`);
  set('--sf-section-pad-tablet', `${theme.spacing.sectionTablet}px`);
  set('--sf-section-pad-mobile', `${theme.spacing.sectionMobile}px`);

  if (theme.gradients?.hero !== undefined) {
    set('--sf-hero-gradient', theme.gradients.hero || 'none');
  }
  if (theme.gradients?.card !== undefined) {
    set('--sf-card-gradient', theme.gradients.card || 'none');
  }

  // Keep compatibility with existing font-scale variable
  set('--font-scale-base', (Number(theme.typography.baseSize) / 15).toFixed(2));

  root.style.setProperty('font-family', `var(--sf-font-family, ${theme.typography.fontFamily})`);
}
