import type { Metadata } from 'next'
import { MarketingNav } from '@/components/layout/MarketingNav'
import { MarketingFooter } from '@/components/layout/MarketingFooter'
import { Reveal } from '@/components/motion'
import GlossaryClient from './GlossaryClient'

const SITE_URL = 'https://wrenlist.com'
const PAGE_URL = `${SITE_URL}/glossary`
const OG_IMAGE = `${SITE_URL}/api/og/glossary`

export const metadata: Metadata = {
  title: 'UK Reseller Glossary — 50+ Terms Every Thrifter Should Know',
  description:
    'Complete glossary of UK reseller terminology: condition grading, selling terms, platform-specific jargon, sourcing, shipping, and business metrics. 2025/26.',
  keywords: [
    'reseller glossary',
    'vinted terms',
    'ebay abbreviations',
    'condition grading nwt',
    'reselling terminology',
    'thrifter slang',
    'vintage selling terms',
    'uk reseller jargon',
  ],
  authors: [{ name: 'Wrenlist' }],
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    title: 'UK Reseller Glossary — Essential Terms & Definitions',
    description: 'Master 50+ reselling terms: condition grading, platform jargon, sourcing, shipping, and business metrics for UK thrifters.',
    siteName: 'Wrenlist',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Wrenlist UK Reseller Glossary',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UK Reseller Glossary',
    description: 'Learn 50+ essential terms for UK vintage resellers and thrifters.',
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
}

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'DefinedTermSet',
  name: 'UK Reseller Glossary',
  description: 'Comprehensive glossary of terms used by UK vintage resellers, thrifters, and online marketplace sellers.',
  url: PAGE_URL,
  creator: {
    '@type': 'Organization',
    name: 'Wrenlist',
  },
}

export default function GlossaryPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <MarketingNav />

      <main className="bg-[#f5f0e8] min-h-screen">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-5 sm:px-10 py-12 sm:py-20">
          <Reveal>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[#1e2e1c] mb-4">
              UK Reseller Glossary
            </h1>
          </Reveal>
          <Reveal>
            <p className="text-lg sm:text-xl font-light text-[#4a6147] leading-relaxed">
              A complete guide to reseller terminology. From condition grading to business metrics, master the language of UK thrifting and online selling.
            </p>
          </Reveal>
        </section>

        {/* Client Component with Search */}
        <GlossaryClient />
      </main>

      <MarketingFooter />
    </>
  )
}
