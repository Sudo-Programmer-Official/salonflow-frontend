import { describe, expect, it } from 'vitest';
import {
  getTenantDomainConfig,
  isDemoGatewayHost,
  isRenderHost,
  isPlatformHost,
  isStagingEnvironment,
  tenantFromHost,
  type TenantDomainConfig,
} from './tenantDomains';

const production: TenantDomainConfig = {
  tenantBaseDomain: 'salonflow.studio',
  platformHost: 'app.salonflow.studio',
  apiHost: 'api.salonflow.studio',
  demoPublicHost: 'demo.salonflow.studio',
};

const staging: TenantDomainConfig = {
  tenantBaseDomain: 'staging.salonflow.studio',
  platformHost: 'platform.staging.salonflow.studio',
  apiHost: 'api-staging.salonflow.studio',
  demoPublicHost: 'demo.staging.salonflow.studio',
};

describe('tenantDomains', () => {
  it('keeps the production root as the tenant base domain', () => {
    expect(getTenantDomainConfig('salonflow.studio').tenantBaseDomain).toBe('salonflow.studio');
  });

  it('keeps production tenant parsing unchanged', () => {
    expect(tenantFromHost('mtvnails.salonflow.studio', production)).toBe('mtvnails');
    expect(tenantFromHost('salonflow.studio', production)).toBeNull();
    expect(tenantFromHost('app.salonflow.studio', production)).toBeNull();
    expect(tenantFromHost('demo.salonflow.studio', production)).toBeNull();
    expect(isPlatformHost('api.salonflow.studio', production)).toBe(true);
  });

  it('parses staging tenants and does not turn platform/API hosts into tenants', () => {
    expect(tenantFromHost('mtvnailsdemo.staging.salonflow.studio', staging)).toBe('mtvnailsdemo');
    expect(tenantFromHost('staging.salonflow.studio', staging)).toBeNull();
    expect(tenantFromHost('platform.staging.salonflow.studio', staging)).toBeNull();
    expect(tenantFromHost('api-staging.salonflow.studio', staging)).toBeNull();
    expect(tenantFromHost('demo.staging.salonflow.studio', staging)).toBeNull();
    expect(isDemoGatewayHost('demo.staging.salonflow.studio', staging)).toBe(true);
    expect(isDemoGatewayHost('demo.salonflow.studio', staging)).toBe(false);
    expect(isPlatformHost('demo.staging.salonflow.studio', staging)).toBe(true);
    expect(tenantFromHost('one.two.staging.salonflow.studio', staging)).toBeNull();
    expect(isPlatformHost('staging.salonflow.studio', staging)).toBe(true);
    expect(isPlatformHost('platform.staging.salonflow.studio', staging)).toBe(true);
  });

  it('keeps the staging marker hidden in production and visible in staging', () => {
    expect(isStagingEnvironment('production')).toBe(false);
    expect(isStagingEnvironment('staging')).toBe(true);
  });

  it('treats Render service hostnames as reserved app hosts, never tenant websites', () => {
    const renderHost = 'salonflow-frontend-mc9x.onrender.com';

    expect(isRenderHost(renderHost)).toBe(true);
    expect(isPlatformHost(renderHost, production)).toBe(true);
    expect(tenantFromHost(renderHost, production)).toBeNull();
    expect(isRenderHost('preview.onrender.com.attacker.example')).toBe(false);
    expect(isRenderHost('preview.child.onrender.com')).toBe(false);
  });
});
