export type MediaVariant = {
  url: string;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
};

export type ResolvedMedia = {
  src: string;
  alt: string;
  sources: Array<{ srcset: string; type?: string; media?: string }>;
};

export const FALLBACK_IMAGE =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" role="img" aria-label="Image unavailable">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f8fafc" />
          <stop offset="100%" stop-color="#e2e8f0" />
        </linearGradient>
      </defs>
      <rect width="1200" height="900" fill="url(#bg)" />
      <g fill="none" stroke="#94a3b8" stroke-width="24" stroke-linecap="round" stroke-linejoin="round">
        <rect x="180" y="180" width="840" height="540" rx="40" />
        <path d="M260 610 470 430l155 140 115-95 180 135" />
        <circle cx="430" cy="360" r="54" />
      </g>
      <text
        x="600"
        y="790"
        fill="#475569"
        font-family="Arial, sans-serif"
        font-size="44"
        text-anchor="middle"
      >
        Image unavailable
      </text>
    </svg>
  `);

const asVariant = (value: any): MediaVariant | null => {
  if (!value) return null;
  if (typeof value === 'string') return { url: value };
  if (typeof value === 'object' && value.url) {
    return {
      url: value.url,
      width: value.width ?? null,
      height: value.height ?? null,
      mimeType: value.mimeType ?? value.mime_type ?? null,
    };
  }
  return null;
};

/**
 * Resolve a media record (with optional variants) into a <picture>-friendly shape.
 * Falls back to original_url/url if variants are missing.
 */
export function resolveMedia(media: any, alt = ''): ResolvedMedia {
  if (!media) return { src: FALLBACK_IMAGE, alt, sources: [] };

  const variants: Record<string, MediaVariant | undefined> = {
    ...(media.variants || {}),
    thumbnail: asVariant(media.thumbnail) || undefined,
    sm: asVariant(media.sm) || undefined,
    md: asVariant(media.md) || undefined,
    lg: asVariant(media.lg) || undefined,
    xl: asVariant(media.xl) || undefined,
    original: asVariant(media.original) || undefined,
  };

  const orderedKeys = ['thumbnail', 'sm', 'md', 'lg', 'xl'];
  const variantList = orderedKeys
    .map((k) => variants[k])
    .filter((v): v is MediaVariant => Boolean(v?.url && v?.width));

  const buildSrcSet = (list: MediaVariant[]) =>
    list
      .filter((v) => v.url && v.width)
      .map((v) => `${v.url} ${v.width}w`)
      .join(', ');

  const fallbackCandidates = [
    variants.md,
    variants.lg,
    variants.sm,
    variants.xl,
    variants.thumbnail,
    asVariant(media.original),
    asVariant(media.original_url),
    asVariant(media.url),
  ].filter((candidate): candidate is MediaVariant => Boolean(candidate?.url));

  const src = fallbackCandidates[0]?.url || FALLBACK_IMAGE;

  const sources: ResolvedMedia['sources'] = [];
  if (variantList.length) {
    const srcset = buildSrcSet(variantList);
    if (srcset) {
      sources.push({
        srcset,
        type: variantList[0]?.mimeType || undefined,
      });
    }
  }

  return { src, alt, sources };
}
