import type { MetadataRoute } from 'next'

function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || 'https://cashin-ng.vercel.app'
  try {
    return new URL(raw.startsWith('http') ? raw : `https://${raw}`).origin
  } catch {
    return 'https://cashin-ng.vercel.app'
  }
}

/** Public marketing & auth URLs only (dashboard routes are behind login). */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin()
  const now = new Date()

  return [
    {
      url: `${origin}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${origin}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${origin}/signup`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
