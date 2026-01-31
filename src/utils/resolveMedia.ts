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

/**
 * Resolve a media record (with optional variants) into a <picture>-friendly shape.
 * Falls back to original_url/url if variants are missing.
 */
export function resolveMedia(media: any, alt = ''): ResolvedMedia {
  if (!media) return { src: '', alt, sources: [] };

  const variants: Record<string, MediaVariant | undefined> = media.variants || {};

  const orderedKeys = ['sm', 'md', 'lg', 'xl'];
  const variantList = orderedKeys
    .map((k) => variants[k])
    .filter((v): v is MediaVariant => Boolean(v?.url && v?.width));

  const buildSrcSet = (list: MediaVariant[]) =>
    list
      .filter((v) => v.url && v.width)
      .map((v) => `${v.url} ${v.width}w`)
      .join(', ');

  const fallback =
    variantList[1] /* md */ ||
    variantList[2] /* lg */ ||
    variantList[0] /* sm */ ||
    (media.original_url ? { url: media.original_url } : null) ||
    (media.url ? { url: media.url } : null);

  const src = fallback?.url || '';

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

