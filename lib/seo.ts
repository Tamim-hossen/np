export const SITE_URL = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tamimhossen.vercel.app',
);

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

export function createMetaDescription(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const maxLength = 160;

  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

/** Shared Open Graph image dimensions */
export const OG_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
} as const;

/** Shared Twitter card defaults */
export const TWITTER_DEFAULTS = {
  card: 'summary_large_image' as const,
  creator: '@tamimhossen',
  site: '@tamimhossen',
};
