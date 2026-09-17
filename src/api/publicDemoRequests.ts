import { apiUrl, buildHeaders, readJsonResponse } from './client';

export type PublicDemoRequestInput = {
  draftToken?: string | null;
  mode: 'draft' | 'final';
  name: string;
  businessName: string;
  businessType: string;
  templateKey?: string | null;
  email?: string;
  phone?: string;
  interests?: string[];
  progressStep: number;
};

export type PublicDemoLeadResponse = {
  status: 'ok' | 'skipped';
  leadId?: string;
  draftToken?: string;
  deliveryToken?: string;
  isDraft?: boolean;
  progressStep?: number | null;
};

export type PublicDemoAccess = {
  accessUrl: string;
  demoUrl: string;
  expiresAt: string;
  lifecycleStatus?: 'APPROVED' | 'SENT';
  emailStatus?: { status: string; error?: string };
  smsStatus?: { status: string; error?: string };
};

export type PublicDemoTemplateOption = {
  templateKey: string;
  businessTypes: string[];
  label: string;
  detail: string;
  enabled: true;
};

const requestJson = async <T>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: buildHeaders({ json: true }),
    body: JSON.stringify(body),
  });
  const payload = await readJsonResponse<{ error?: string } & T>(response, {} as { error?: string } & T);
  if (!response.ok) {
    throw new Error(payload.error || 'Something went wrong. Please try again.');
  }
  return payload;
};

export const fetchDemoTemplateCatalog = async (): Promise<PublicDemoTemplateOption[]> => {
  const response = await fetch(apiUrl('/demo/templates'));
  const payload = await readJsonResponse<{ templates?: PublicDemoTemplateOption[]; error?: string }>(response, {});
  if (!response.ok || !Array.isArray(payload.templates)) {
    throw new Error(payload.error || 'Demo options are temporarily unavailable.');
  }
  return payload.templates.filter(
    (template) => template.enabled === true && Boolean(template.templateKey) && template.businessTypes.length > 0,
  );
};

export const savePublicDemoLead = (input: PublicDemoRequestInput) =>
  requestJson<PublicDemoLeadResponse>('/demo-requests', {
    draftToken: input.draftToken ?? undefined,
    mode: input.mode,
    templateKey: input.templateKey,
    name: input.name,
    email: input.email,
    phone: input.phone,
    source: 'marketing-demo-funnel',
    progressStep: input.progressStep,
    details: {
      businessName: input.businessName,
      businessType: input.businessType,
      templateKey: input.templateKey,
      interests: input.interests ?? [],
      sourcePath: '/start',
      progressStep: input.progressStep,
    },
  });

export const preparePublicDemo = (deliveryToken: string) =>
  requestJson<PublicDemoAccess & { leadId: string; lifecycleStatus: string }>(
    '/demo-requests/delivery',
    { capability: deliveryToken },
  );
