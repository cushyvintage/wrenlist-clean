export interface PostMeta {
  slug: string
  title: string
  excerpt: string
  date: string
  readTime: string
  tag: string
}

export const POSTS: PostMeta[] = [
  {
    slug: 'vinted-vs-depop-uk-sellers',
    title: 'Vinted vs Depop: which is better for UK resellers in 2026?',
    excerpt:
      'Fees, audience, what sells, listing speed and payouts — an honest comparison of Vinted and Depop for UK resellers in 2026, now that both platforms run on a buyer-pays fee model.',
    date: '2026-04-11',
    readTime: '8 min',
    tag: 'Platforms',
  },
  {
    slug: 'hmrc-digital-platform-reporting-2024',
    title: 'HMRC now sees your Vinted & eBay sales. Here\u2019s what that means.',
    excerpt:
      'Since January 2024, UK marketplaces report seller earnings directly to HMRC. If you\u2019re over the £1,000 trading allowance, HMRC already knows. Here\u2019s what to do about it.',
    date: '2026-04-11',
    readTime: '6 min',
    tag: 'Tax',
  },
]
