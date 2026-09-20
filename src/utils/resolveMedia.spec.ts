import { describe, expect, it } from 'vitest';
import { FALLBACK_IMAGE, resolveMedia } from './resolveMedia';

describe('resolveMedia', () => {
  it('provides ordered fallback candidates for a media record', () => {
    const resolved = resolveMedia({
      original_url: 'https://cdn.example/original.jpg',
      variants: {
        md: { url: 'https://cdn.example/md.jpg', width: 768 },
        lg: { url: 'https://cdn.example/lg.jpg', width: 1280 },
      },
    });

    expect(resolved.src).toBe('https://cdn.example/md.jpg');
    expect(resolved.candidates).toEqual([
      'https://cdn.example/md.jpg',
      'https://cdn.example/lg.jpg',
      'https://cdn.example/original.jpg',
    ]);
  });

  it('falls back to the original URL when variants are unavailable', () => {
    const resolved = resolveMedia({ original_url: 'https://cdn.example/original.jpg' });

    expect(resolved.src).toBe('https://cdn.example/original.jpg');
    expect(resolved.candidates).toEqual(['https://cdn.example/original.jpg']);
  });

  it('returns the safe placeholder for missing media', () => {
    expect(resolveMedia(null).src).toBe(FALLBACK_IMAGE);
    expect(resolveMedia(null).candidates).toEqual([]);
  });
});
