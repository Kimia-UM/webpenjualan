import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'j0eeys premiums',
    short_name: 'j0eeys',
    description: 'Toko digital premium — Apps Premium, PremiumShare, Privat Premium',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0B0E1A',
    theme_color: '#0B0E1A',
    categories: ['shopping', 'business', 'utilities'],
    icons: [
      { src: '/icons/icon-72x72.png',   sizes: '72x72',   type: 'image/png' },
      { src: '/icons/icon-96x96.png',   sizes: '96x96',   type: 'image/png' },
      { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
      { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-256x256.png', sizes: '256x256', type: 'image/png' },
      { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      },
    ],
    screenshots: [
      {
        src: '/screenshots/dashboard.png',
        sizes: '1280x720',
        type: 'image/png',
        label: 'Dashboard j0eeys premiums'
      }
    ]
  }
}
