import type { MetadataRoute } from 'next'

function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || 'https://cashin-ng.vercel.app'
  try {
    return new URL(raw.startsWith('http') ? raw : `https://${raw}`).origin
  } catch {
    return 'https://cashin-ng.vercel.app'
  }
}

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin()

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/accounts', '/transactions', '/investments'],
    },
    sitemap: `${origin}/sitemap.xml`,
  }
}
