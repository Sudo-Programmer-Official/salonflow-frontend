import { apiUrl, buildHeaders } from './client';

export type DefaultBookingRules = {
  buffer_before: number;
  buffer_after: number;
  min_notice_minutes: number;
  allow_same_day: boolean;
  allow_walkins_outside_availability: boolean;
};

export type ThemeTokens = {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    surfaceMuted: string;
    textPrimary: string;
    textMuted: string;
    accent: string;
    border: string;
  };
  typography: {
    fontFamily: string;
    baseSize: number;
    headingWeight: number;
    bodyWeight: number;
  };
  radii: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  shadows: {
    card: string;
    overlay: string;
  };
  spacing: {
    sectionDesktop: number;
    sectionTablet: number;
    sectionMobile: number;
  };
  gradients?: {
    hero?: string | null;
    card?: string | null;
  };
};

export type BusinessHours = {
  mon?: { open: string; close: string } | null;
  tue?: { open: string; close: string } | null;
  wed?: { open: string; close: string } | null;
  thu?: { open: string; close: string } | null;
  fri?: { open: string; close: string } | null;
  sat?: { open: string; close: string } | null;
  sun?: { open: string; close: string } | null;
};

export type BusinessSettings = {
  businessId: string;
  businessName: string;
  timezone: string | null;
  currency: string;
  kioskEnabled: boolean;
  publicCheckInEnabled: boolean;
  requirePhone: boolean;
  showPointsOnKiosk: boolean;
  showPointsPreview: boolean;
  allowMultiService: boolean;
  requireService: boolean;
  allowStaffSelection: boolean;
  requireStaffSelection: boolean;
  kioskWelcomeStyle: 'classic' | 'modern';
  kioskShowRewardsCard: boolean;
  kioskAllowSkipService: boolean;
  kioskAllowSkipStaff: boolean;
  kioskAutoResetSeconds: number | null;
  kioskShowPrice?: boolean;
  enforceStaffAvailability: boolean;
  uiFontScale: number;
  uiGlassEnabled: boolean;
  uiFontFamily: string;
  kioskThemeMode?: 'milky' | 'black-glass';
  kioskPrimaryColor?: 'moneyGreen' | 'lightGreen' | 'gold';
  kioskKeypadStyle?: 'solid' | 'glass';
  kioskBusinessName?: string | null;
  kioskBusinessPhone?: string | null;
  businessPhone?: string | null;
  businessHours?: BusinessHours | null;
  themeTokens?: ThemeTokens;
  defaultBookingRules: DefaultBookingRules;
  createdAt: string | null;
  updatedAt: string | null;
};

export type MessagingSettings = {
  phoneE164: string | null;
  provider: string | null;
  active: boolean;
};

export type SettingsPatch = Partial<
  Pick<
    BusinessSettings,
    | 'kioskEnabled'
    | 'publicCheckInEnabled'
    | 'requirePhone'
    | 'showPointsOnKiosk'
    | 'showPointsPreview'
    | 'allowMultiService'
    | 'requireService'
    | 'allowStaffSelection'
    | 'requireStaffSelection'
    | 'kioskWelcomeStyle'
    | 'kioskShowRewardsCard'
    | 'kioskAllowSkipService'
    | 'kioskAllowSkipStaff'
    | 'kioskAutoResetSeconds'
    | 'kioskShowPrice'
    | 'enforceStaffAvailability'
    | 'currency'
    | 'uiFontScale'
    | 'uiGlassEnabled'
    | 'uiFontFamily'
    | 'kioskThemeMode'
    | 'kioskPrimaryColor'
    | 'kioskKeypadStyle'
    | 'kioskBusinessName'
    | 'kioskBusinessPhone'
    | 'businessPhone'
    | 'businessHours'
    | 'themeTokens'
  >
> & {
  defaultBookingRules?: Partial<DefaultBookingRules>;
  themeTokens?: Partial<ThemeTokens> | ThemeTokens;
};

const handleResponse = async <T>(res: Response, defaultError: string): Promise<T> => {
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const message = errBody.error || defaultError;
    const error = new Error(message) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return res.json();
};

export async function fetchSettings(): Promise<BusinessSettings> {
  const res = await fetch(apiUrl('/settings'), {
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
  });
  return handleResponse<BusinessSettings>(res, 'Failed to load settings');
}

export async function updateSettings(patch: SettingsPatch): Promise<BusinessSettings> {
  const res = await fetch(apiUrl('/settings'), {
    method: 'PATCH',
    headers: buildHeaders({ auth: true, tenant: true, json: true }),
    body: JSON.stringify(patch),
  });
  return handleResponse<BusinessSettings>(res, 'Failed to update settings');
}

export async function fetchPublicSettings(): Promise<BusinessSettings> {
  const headers: Record<string, string> = buildHeaders({ json: true });
  if (typeof window !== 'undefined' && window.location.host) {
    headers['x-website-host'] = window.location.host;
  }
  const res = await fetch(apiUrl('/public/settings'), { headers });
  return handleResponse<BusinessSettings>(res, 'Failed to load settings');
}

export async function fetchMessagingSettings(): Promise<MessagingSettings> {
  const res = await fetch(apiUrl('/settings/messaging'), {
    headers: buildHeaders({ auth: true, tenant: true }),
  });
  return handleResponse<MessagingSettings>(res, 'Failed to load messaging settings');
}
