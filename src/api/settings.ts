import { apiUrl, buildHeaders } from './client';

export type DefaultBookingRules = {
  buffer_before: number;
  buffer_after: number;
  min_notice_minutes: number;
  allow_same_day: boolean;
  allow_walkins_outside_availability: boolean;
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
  enforceStaffAvailability: boolean;
  uiFontScale: number;
  uiGlassEnabled: boolean;
  uiFontFamily: string;
  kioskThemeMode?: 'green' | 'milky' | 'black-glass';
  kioskPrimaryColor?: 'moneyGreen' | 'lightGreen' | 'gold';
  kioskKeypadStyle?: 'solid' | 'glass';
  businessPhone?: string | null;
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
    | 'enforceStaffAvailability'
    | 'currency'
    | 'uiFontScale'
    | 'uiGlassEnabled'
    | 'uiFontFamily'
    | 'kioskThemeMode'
    | 'kioskPrimaryColor'
    | 'kioskKeypadStyle'
    | 'businessPhone'
  >
> & {
  defaultBookingRules?: Partial<DefaultBookingRules>;
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
  const res = await fetch(apiUrl('/public/settings'), {
    headers: buildHeaders({ tenant: true, json: true }),
  });
  return handleResponse<BusinessSettings>(res, 'Failed to load settings');
}

export async function fetchMessagingSettings(): Promise<MessagingSettings> {
  const res = await fetch(apiUrl('/settings/messaging'), {
    headers: buildHeaders({ auth: true, tenant: true }),
  });
  return handleResponse<MessagingSettings>(res, 'Failed to load messaging settings');
}
