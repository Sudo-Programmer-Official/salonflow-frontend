import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sendDemoRequest } from './demoRequests';

describe('demo request API helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('executes the legacy Send Demo helper without referencing an undeclared template key', async () => {
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => null) });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await sendDemoRequest('request-1');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/demo-requests/request-1/send',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
