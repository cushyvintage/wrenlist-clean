import type { Metadata } from 'next'
import '@/styles/globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

export const metadata: Metadata = {
  title: {
    default: 'Wrenlist — The Thrifter\'s Operating System',
    template: '%s | Wrenlist',
  },
  description: 'Track inventory, crosslist to Vinted, eBay, Etsy & Shopify, and grow your vintage resale business. Built for UK thrifters.',
  icons: {
    icon: '/wrenlist-logo.png',
    apple: '/wrenlist-logo.png',
  },
  openGraph: {
    title: 'Wrenlist — The Thrifter\'s Operating System',
    description: 'Track inventory, crosslist to Vinted, eBay, Etsy & Shopify, and grow your vintage resale business. Built for UK thrifters.',
    url: 'https://wrenlist.com',
    siteName: 'Wrenlist',
    locale: 'en_GB',
    type: 'website',
    images: [
      {
        url: 'https://wrenlist.com/wrenlist-logo.png',
        width: 600,
        height: 600,
        alt: 'Wrenlist — The Thrifter\'s Operating System',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wrenlist — The Thrifter\'s Operating System',
    description: 'Track inventory, crosslist to Vinted, eBay, Etsy & Shopify, and grow your vintage resale business.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
