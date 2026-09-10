import { apiUrl, buildHeaders, readJsonResponse } from './client';

export type PublicDemoRequestInput = {
  draftId?: string | null;
  mode: 'draft' | 'final';
  name: string;
  businessName: string;
  email?: string;
  phone?: string;
  interests?: string[];
  progressStep: number;
};

export type PublicDemoLeadResponse = {
  status: 'ok' | 'skipped';
  leadId?: string;
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

export const savePublicDemoLead = (input: PublicDemoRequestInput) =>
  requestJson<PublicDemoLeadResponse>('/demo-requests', {
    draftId: input.draftId ?? undefined,
    mode: input.mode,
    name: input.name,
    email: input.email,
    phone: input.phone,
    source: 'marketing-demo-funnel',
    progressStep: input.progressStep,
    details: {
      businessName: input.businessName,
      interests: input.interests ?? [],
      sourcePath: '/start',
      progressStep: input.progressStep,
    },
  });

export const preparePublicDemo = (leadId: string) =>
  requestJson<PublicDemoAccess & { leadId: string; lifecycleStatus: string }>(
    `/demo-requests/${encodeURIComponent(leadId)}/delivery`,
    {},
  );
