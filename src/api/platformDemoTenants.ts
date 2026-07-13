import { apiUrl, buildHeaders } from './client';

export type DemoValidationSection = {
  name:
    | 'Business'
    | 'Staff'
    | 'Services'
    | 'Website'
    | 'Customers'
    | 'Appointments'
    | 'Reviews'
    | 'Loyalty'
    | 'Authentication';
  status: 'PASS' | 'WARNING' | 'FAIL';
  detail?: string | null;
};

export type DemoValidationRecord = {
  checkedAt: string | null;
  status: 'PASS' | 'WARNING' | 'FAIL' | null;
  reason: string | null;
  sections: DemoValidationSection[];
};

export type DemoSmokeTestRecord = {
  checkedAt: string | null;
  passed: boolean | null;
  checkedBy: string | null;
  notes: string | null;
  checks: Record<string, boolean>;
};

export type DemoDeploymentChecklist = {
  backend: {
    tenantCreated: boolean;
    adminCreated: boolean;
    validationPassed: boolean;
  };
  frontend: {
    vercelConfigured: boolean;
    sslActive: boolean;
  };
  dns: {
    provider: string | null;
    dnsConfigured: boolean;
    cnameVerified: boolean;
    propagated: boolean;
  };
  website: {
    publicUrlWorks: boolean;
    homepageWorks: boolean;
    bookingWorks: boolean;
    httpsValid: boolean;
  };
  communications: {
    emailReady: boolean;
    magicLinkTested: boolean;
    smsReady: boolean;
    smsSkipped: boolean;
  };
};

export type DemoTemplateAvailability = {
  templateId: string;
  displayName: string;
  version: string;
  supportedSalonType: string;
  available: boolean;
  description: string;
};

export type DemoTenantCatalogItem = {
  businessId: string;
  businessName: string;
  slug: string;
  status: string;
  isDemo: boolean;
  createdAt: string;
  lastResetAt: string | null;
  loginEmail: string | null;
  demoUrl: string;
  templateId: string | null;
  templateName: string | null;
  templateVersion: string | null;
  seedVersion: string | null;
  magicLinkStatus: 'AVAILABLE' | 'UNAVAILABLE';
  lastDemoSentAt: string | null;
  lastAccessAt: string | null;
  lastValidation: DemoValidationRecord;
  lastSmokeTest: DemoSmokeTestRecord;
  deploymentChecklist: DemoDeploymentChecklist;
  readinessStatus: 'READY' | 'VALIDATION_REQUIRED' | 'DNS_PENDING' | 'SMOKE_TEST_REQUIRED' | 'RESET_RECOMMENDED';
  nextAction: string;
};

export type DemoTenantCatalogResponse = {
  tenants: DemoTenantCatalogItem[];
  templates: DemoTemplateAvailability[];
};

export type DemoTenantMetadataPatch = Partial<{
  templateId: string | null;
  templateVersion: string | null;
  seedVersion: string | null;
  lastValidationAt: string | null;
  lastValidationStatus: 'PASS' | 'WARNING' | 'FAIL' | null;
  lastValidationReason: string | null;
  lastValidationSections: DemoValidationSection[] | null;
  lastSmokeTestAt: string | null;
  lastSmokeTestPassed: boolean | null;
  lastSmokeTestCheckedBy: string | null;
  lastSmokeTestNotes: string | null;
  lastSmokeTestChecks: Record<string, boolean> | null;
  deploymentChecklist: DemoDeploymentChecklist | null;
}>;

export async function fetchDemoTenants(): Promise<DemoTenantCatalogResponse> {
  const res = await fetch(apiUrl('/platform/demo-tenants'), {
    headers: buildHeaders({ auth: true, json: true }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to load demo tenants');
  }
  return body as DemoTenantCatalogResponse;
}

export async function updateDemoTenantMetadata(
  businessId: string,
  payload: DemoTenantMetadataPatch,
): Promise<{ tenant: DemoTenantCatalogItem }> {
  const res = await fetch(apiUrl(`/platform/demo-tenants/${businessId}/metadata`), {
    method: 'PATCH',
    headers: buildHeaders({ auth: true, json: true }),
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to update demo metadata');
  }
  return body as { tenant: DemoTenantCatalogItem };
}

export async function validateDemoTenant(
  businessId: string,
): Promise<{ validation: DemoValidationRecord; tenant: DemoTenantCatalogItem }> {
  const res = await fetch(apiUrl(`/platform/demo-tenants/${businessId}/validate`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, json: true }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to validate demo tenant');
  }
  return body as { validation: DemoValidationRecord; tenant: DemoTenantCatalogItem };
}

export async function resetDemoTenant(
  businessId: string,
  payload: { confirmed: boolean; forceReset?: boolean },
): Promise<{
  catalogItem: DemoTenantCatalogItem;
  validation: DemoValidationRecord;
}> {
  const res = await fetch(apiUrl(`/platform/demo-tenants/${businessId}/reset`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, json: true }),
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to reset demo tenant');
  }
  return body as {
    catalogItem: DemoTenantCatalogItem;
    validation: DemoValidationRecord;
  };
}

export async function refreshDemoTenant(
  businessId: string,
  payload: { confirmed: boolean },
): Promise<{
  catalogItem: DemoTenantCatalogItem;
  validation: DemoValidationRecord;
}> {
  const res = await fetch(apiUrl(`/platform/demo-tenants/${businessId}/refresh-seed`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, json: true }),
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to refresh demo seed');
  }
  return body as {
    catalogItem: DemoTenantCatalogItem;
    validation: DemoValidationRecord;
  };
}

export async function generateDemoTenantMagicLink(
  businessId: string,
): Promise<{ magicUrl: string; ownerEmail: string; subdomain: string }> {
  const res = await fetch(apiUrl(`/platform/demo-tenants/${businessId}/magic-link`), {
    method: 'POST',
    headers: buildHeaders({ auth: true, json: true }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || 'Failed to generate magic link');
  }
  return body as { magicUrl: string; ownerEmail: string; subdomain: string };
}

