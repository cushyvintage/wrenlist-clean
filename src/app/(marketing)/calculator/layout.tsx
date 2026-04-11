import type { Metadata } from 'next'

const SITE_URL = 'https://wrenlist.com'
const PAGE_URL = `${SITE_URL}/calculator`
const OG_IMAGE = `${SITE_URL}/api/og/calculator`

export const metadata: Metadata = {
  title: 'Marketplace Fee Calculator — Vinted, eBay, Etsy & Depop (UK)',
  description:
    'Free UK marketplace fee calculator. Compare Vinted, eBay, Etsy and Depop fees and net profit side-by-side before you list.',
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    title: 'Marketplace Fee Calculator — Vinted, eBay, Etsy & Depop',
    description:
      'Compare UK marketplace fees and net profit side-by-side before you list.',
    siteName: 'Wrenlist',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Wrenlist Marketplace Fee Calculator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marketplace Fee Calculator — UK Resellers',
    description:
      'Compare Vinted, eBay, Etsy and Depop fees side-by-side.',
    images: [OG_IMAGE],
  },
}

export default function CalculatorLayout({ children }: { children: React.ReactNode }) {
  return children
}
