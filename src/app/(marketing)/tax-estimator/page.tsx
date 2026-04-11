import type { Metadata } from 'next'
import TaxEstimatorClient from './TaxEstimatorClient'

const SITE_URL = 'https://wrenlist.com'
const PAGE_URL = `${SITE_URL}/tax-estimator`
const OG_IMAGE = `${SITE_URL}/api/og/tax-estimator`

export const metadata: Metadata = {
  title: 'UK Reseller Tax Estimator 2025/26 — Am I Over £1,000?',
  description:
    'Free UK tax estimator for Vinted, eBay, Etsy & Depop sellers. Work out whether you\u2019re over the £1,000 trading allowance and estimate your Self Assessment tax bill in under 60 seconds. 2025/26 rates.',
  keywords: [
    'vinted tax uk',
    'ebay tax calculator uk',
    'reseller tax calculator',
    '1000 trading allowance',
    'self assessment calculator reseller',
    'hmrc digital platform reporting',
    'uk vintage seller tax',
    'depop tax uk',
    'am i over the trading allowance',
  ],
  authors: [{ name: 'Wrenlist' }],
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    title: 'UK Reseller Tax Estimator — Am I over the £1,000 trading allowance?',
    description:
      'Free tool for UK Vinted, eBay, Etsy & Depop sellers. Work out your Self Assessment tax in 60 seconds. 2025/26 HMRC rates.',
    siteName: 'Wrenlist',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Wrenlist UK Reseller Tax Estimator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UK Reseller Tax Estimator 2025/26',
    description:
      'Am I over the £1,000 trading allowance? Free tool for UK Vinted, eBay, Etsy & Depop sellers.',
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
}

// Structured data: WebApplication + FAQPage for rich results in Google
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'Wrenlist UK Reseller Tax Estimator',
      url: PAGE_URL,
      description:
        'Free tax estimator for UK resellers on Vinted, eBay, Etsy, Depop and Shopify. Calculates income tax and Class 4 NIC on trading profits for the 2025/26 tax year.',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'GBP',
      },
      audience: {
        '@type': 'Audience',
        audienceType: 'UK online resellers',
        geographicArea: {
          '@type': 'Country',
          name: 'United Kingdom',
        },
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Do I need to pay tax on Vinted sales in the UK?',
          acceptedAnswer: {
            '@type': 'Answer',
            text:
              'You only pay tax if you are trading (buying to resell or making items to sell) and your gross trading income exceeds the £1,000 trading allowance in a tax year (6 April to 5 April). Selling your own used belongings is generally not taxable.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the £1,000 trading allowance?',
          acceptedAnswer: {
            '@type': 'Answer',
            text:
              'The trading allowance is a tax-free allowance of £1,000 on gross trading income per tax year. If your total reselling sales are under £1,000, you do not need to declare the income to HMRC. If they exceed £1,000, you must register for Self Assessment.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does HMRC know about my Vinted or eBay sales?',
          acceptedAnswer: {
            '@type': 'Answer',
            text:
              'Yes. Since 1 January 2024, UK digital platforms including Vinted, eBay, Etsy, Depop and Airbnb are required to report seller earnings directly to HMRC under the OECD Digital Platform Reporting rules. HMRC receives this data automatically each year.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I claim mileage for sourcing trips to charity shops and car boot sales?',
          acceptedAnswer: {
            '@type': 'Answer',
            text:
              'Yes. Under HMRC simplified expenses, you can claim 45p per mile for the first 10,000 business miles in a tax year and 25p per mile thereafter. Keep a log of date, destination, purpose and distance.',
          },
        },
        {
          '@type': 'Question',
          name: 'What can I claim as expenses against my reselling income?',
          acceptedAnswer: {
            '@type': 'Answer',
            text:
              'Allowable expenses include the cost of goods sold, postage and packaging, platform and payment fees, mileage, a portion of phone and internet costs used for the business, storage costs, and subscriptions for reselling tools. You can claim either actual expenses or the £1,000 trading allowance — whichever is more favourable.',
          },
        },
      ],
    },
  ],
}

export default function TaxEstimatorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <TaxEstimatorClient />
    </>
  )
}
