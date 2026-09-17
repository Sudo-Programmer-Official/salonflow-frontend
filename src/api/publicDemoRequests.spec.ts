import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDemoTemplateCatalog, savePublicDemoLead } from './publicDemoRequests';

const response = (payload: unknown, ok = true) => ({
  ok,
  text: async () => JSON.stringify(payload),
});

describe('public demo request helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes only enabled catalog templates', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response({
        templates: [
          { templateKey: 'nail-salon-v1', businessTypes: ['nail_salon'], label: 'Nail Salon', detail: 'Nails', enabled: true },
          { templateKey: 'hair-salon-v1', businessTypes: ['hair_salon'], label: 'Hair Salon', detail: 'Hair', enabled: false },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchDemoTemplateCatalog()).resolves.toEqual([
      expect.objectContaining({ templateKey: 'nail-salon-v1' }),
    ]);
  });

  it('submits the selected template separately from optional interests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ status: 'ok', leadId: 'lead-1' }));
    vi.stubGlobal('fetch', fetchMock);

    await savePublicDemoLead({
      mode: 'final',
      name: 'Natalie',
      businessName: 'Glow House Salon',
      businessType: 'nail_salon',
      templateKey: 'nail-salon-v1',
      email: 'natalie@example.com',
      phone: '3615550184',
      interests: [],
      progressStep: 3,
    });

    const requestBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(requestBody.templateKey).toBe('nail-salon-v1');
    expect(requestBody.details.businessType).toBe('nail_salon');
    expect(requestBody.details.interests).toEqual([]);
  });
});
