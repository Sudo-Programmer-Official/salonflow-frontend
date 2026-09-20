import type { ThemeTokens } from '../api/settings';
import { DEFAULT_WEBSITE_THEME } from './websiteTheme';

export type WebsiteThemeTokensPatch = {
  presetKey?: ThemeTokens['presetKey'];
  colors?: Partial<ThemeTokens['colors']>;
  typography?: Partial<ThemeTokens['typography']>;
  radii?: Partial<ThemeTokens['radii']>;
  shadows?: Partial<ThemeTokens['shadows']>;
  spacing?: Partial<ThemeTokens['spacing']>;
  gradients?: Partial<ThemeTokens['gradients']>;
};

const preset = (
  presetKey: NonNullable<ThemeTokens['presetKey']>,
  colors: Partial<ThemeTokens['colors']>,
  extras: WebsiteThemeTokensPatch = {},
): WebsiteThemeTokensPatch => ({
  presetKey,
  ...extras,
  colors: { ...DEFAULT_WEBSITE_THEME.colors, ...colors },
});

export const WEBSITE_THEME_PRESETS: Array<{
  key: NonNullable<ThemeTokens['presetKey']>;
  label: string;
  description: string;
  tokens: WebsiteThemeTokensPatch;
}> = [
  { key: 'legacy', label: 'Current / Legacy', description: 'Keep the current SalonFlow website appearance.', tokens: preset('legacy', {}) },
  {
    key: 'soft-luxe', label: 'Soft Luxe', description: 'Warm ivory, blush, and polished accents for beauty brands.',
    tokens: preset('soft-luxe', { primary: '#be185d', secondary: '#9f1239', background: '#fffafc', surfaceMuted: '#fdf2f8', textPrimary: '#1f1720', textMuted: '#6b5563', accent: '#f472b6', border: '#f5d0e1' }),
  },
  {
    key: 'editorial', label: 'Editorial', description: 'High-contrast cream, ink, and fashion-forward neutrals for hair salons.',
    tokens: preset('editorial', { primary: '#111111', secondary: '#57534e', background: '#f7f4ee', surface: '#fffdf8', surfaceMuted: '#ebe7df', textPrimary: '#171717', textMuted: '#57534e', accent: '#b45309', border: '#d6d3d1' }),
  },
  {
    key: 'calm-spa', label: 'Calm Spa', description: 'Sage, sand, and soft stone for calm wellness experiences.',
    tokens: preset('calm-spa', { primary: '#356859', secondary: '#789d87', background: '#f4f1e8', surface: '#fffdf7', surfaceMuted: '#e7eee6', textPrimary: '#263b34', textMuted: '#61736b', accent: '#c28b57', border: '#d7dfd3' }),
  },
  {
    key: 'modern-dark', label: 'Modern Dark', description: 'Charcoal, warm tan, and crisp contrast for contemporary barbershops.',
    tokens: preset('modern-dark', { primary: '#d4a373', secondary: '#e7e5e4', background: '#111111', surface: '#1c1917', surfaceMuted: '#292524', textPrimary: '#fafaf9', textMuted: '#d6d3d1', accent: '#f59e0b', border: '#44403c' }),
  },
  {
    key: 'clean-neutral', label: 'Clean Neutral', description: 'A restrained, flexible starting point for any new salon.',
    tokens: preset('clean-neutral', { primary: '#334155', secondary: '#64748b', background: '#f8fafc', surface: '#ffffff', surfaceMuted: '#f1f5f9', textPrimary: '#0f172a', textMuted: '#64748b', accent: '#0ea5e9', border: '#cbd5e1' }),
  },
];

export const mergeWebsiteThemeTokens = (
  base: ThemeTokens | undefined,
  patch: WebsiteThemeTokensPatch = {},
): ThemeTokens => ({
  ...(base ?? DEFAULT_WEBSITE_THEME),
  ...patch,
  colors: { ...(base?.colors ?? DEFAULT_WEBSITE_THEME.colors), ...(patch.colors ?? {}) },
  typography: { ...(base?.typography ?? DEFAULT_WEBSITE_THEME.typography), ...(patch.typography ?? {}) },
  radii: { ...(base?.radii ?? DEFAULT_WEBSITE_THEME.radii), ...(patch.radii ?? {}) },
  shadows: { ...(base?.shadows ?? DEFAULT_WEBSITE_THEME.shadows), ...(patch.shadows ?? {}) },
  spacing: { ...(base?.spacing ?? DEFAULT_WEBSITE_THEME.spacing), ...(patch.spacing ?? {}) },
  gradients: { ...(base?.gradients ?? DEFAULT_WEBSITE_THEME.gradients), ...(patch.gradients ?? {}) },
});

export const isWebsiteHexColor = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
