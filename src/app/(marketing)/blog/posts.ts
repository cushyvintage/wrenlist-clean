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
    slug: 'why-i-built-wrenlist',
    title: 'Why I Built Wrenlist',
    excerpt:
      'From spreadsheet chaos to the operating system for UK resellers. The story of how Wrenlist came to be, and why I built it.',
    date: '2026-04-30',
    readTime: '7 min',
    tag: 'Story',
  },
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
    title: 'HMRC now sees your Vinted & eBay sales. Here is what that means.',
    excerpt:
      'Since January 2024, UK marketplaces report seller earnings directly to HMRC. If you are over the £1,000 trading allowance, HMRC already knows. Here is what to do about it.',
    date: '2026-04-11',
    readTime: '6 min',
    tag: 'Tax',
  },
]
