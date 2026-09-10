import { describe, expect, it, vi } from 'vitest';
import { getDemoAccessConfig } from '@/api/demoAccess';
import { scrubDemoAccessUrl } from './demoAccess';

describe('demo access URL handling', () => {
  it('removes the token, query, and fragment after exchange', () => {
    expect(scrubDemoAccessUrl('https://mtvnailsdemo.salonflow.studio/demo/access/secret-token?x=1#token'))
      .toBe('https://mtvnailsdemo.salonflow.studio/demo/access');
  });

  it('fails closed when the API feature flag cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, text: async () => '' }));
    await expect(getDemoAccessConfig()).resolves.toEqual({ enabled: false });
  });
});
