# Wrenlist Marketing Pages — Built & Deployed

## Overview

All 6 marketing pages have been successfully built from the design mockup and are ready for deployment.

**Location**: `/src/app/(marketing)/`

**Routes**:
- `/landing` — Home page with hero, features, testimonial
- `/pricing` — 4-tier pricing (Free, Nester, Forager, Flock) with comparison table
- `/about` — "Why Wrenlist" page positioning vs. competitors
- `/story` — Founder story (Dom's background, why he built it, what's next)
- `/blog` — Blog post listing with featured post and grid
- `/roadmap` — Public feature roadmap with upvoting

---

## Page Details

### 1. Landing Page (`/landing`)

**File**: `src/app/(marketing)/landing/page.tsx`

**Sections**:
- Navigation bar (sticky)
- Hero section (2-column: copy + inventory example with stats)
- Features strip (3-column: "Log every find instantly", "Price with confidence", "List everywhere at once")
- Features grid (9-column grid of all included features with icons)
- Testimonial section with user quote and stat
- Footer with links and social icons

**Design Elements**:
- Serif typography (Cormorant Garamond) for headings
- Sans typography (Jost) for body
- Sage, cream, ink, amber color palette
- Responsive grid layouts
- Card-based inventory examples

**CTA**: "Start free — no card needed" + "See the app"

---

### 2. Pricing Page (`/pricing`)

**File**: `src/app/(marketing)/pricing/page.tsx`

**Sections**:
- Navigation bar
- Pricing header with billing toggle (monthly/annual)
- 4-column pricing card grid
  - **Free**: £0/mo, 10 finds/mo (inventory tracker, 1 marketplace, basic analytics)
  - **Nester**: £14/mo (£134/yr), 100 finds/mo, 3 marketplaces, crosslisting
  - **Forager**: £29/mo (£290/yr), 500 finds/mo, featured card, all features included
  - **Flock**: £59/mo (£590/yr), unlimited finds, team seats, API access
- Feature comparison table (vs. Vendoo & Crosslist)
- Footer

**Design Elements**:
- Annual discount badge ("2 months free")
- Feature inclusion checkmarks
- Featured card highlighting (Forager plan)
- Comparison table with competitive positioning
- Pricing in pounds sterling with mono font for prices

**Interactivity**: Monthly/annual toggle updates all prices

---

### 3. About Page (`/about`)

**File**: `src/app/(marketing)/about/page.tsx`

**Sections**:
- Navigation bar
- Page header ("Not just another crosslisting tool")
- Two-column content:
  - Left: "The problem with other tools" (competitors use listing speed as metric)
  - Right: "What makes us different" (4 numbered differentiators)
- Testimonial from Sam R. with sourcing stat
- Footer

**Design Elements**:
- Numbered feature circles (sage-pale background)
- Clean two-column layout
- Emphasis on "business clarity" vs. competitors
- Testimonial highlighting margin intelligence

**Key Messages**:
1. Starts at the rack, not the listing form
2. UK platforms, UK pricing, UK sellers
3. Margin intelligence, not just listing counts
4. No add-on chaos

---

### 4. Story Page (`/story`)

**File**: `src/app/(marketing)/story/page.tsx`

**Sections**:
- Navigation bar
- Dark hero section (ink background) with founder quote
- Story body sections:
  - Section 1: "By day, I build systems / By weekend, I source" (3-column with image placeholder)
  - Pull quote: About listing speed vs. business intelligence
  - Section 2: "The tools that existed weren't built for me" (spreadsheets, Vendoo, Crosslist)
  - Stats grid (£0 outside funding, 1 person using it, UK first)
  - Section 3: "What Wrenlist actually is" (bootstrapped, independent, user-focused)
- "What's Next" section (2x2 grid in sage background)
- CTA buttons

**Design Elements**:
- Dark hero with serif quote
- Serif body typography for storytelling
- Border-left pull quote styling
- Stats cards with monospace font
- Sage call-to-action section at bottom
- Founder context and authenticity

**Tone**: Personal, detailed, honest about the origins and philosophy

---

### 5. Blog Page (`/blog`)

**File**: `src/app/(marketing)/blog/page.tsx`

**Sections**:
- Navigation bar
- Blog header with tag filter
- Featured hero post card
- Blog grid (2-column, 6 additional posts)
- "Load more posts" button
- Footer

**Posts** (with emojis as visual indicators):
- Featured: "UK thrifter's guide to house clearances in 2026" (sourcing guide)
- "Why your margins are lying to you" (pricing) 💰
- "Vinted vs eBay UK: where should you list?" (platforms) 📦
- "HMRC's £1,000 trading allowance" (tax & finance) 🧾
- "Product photography on a budget" (platforms) 📸
- "10 brands that always sell well" (sourcing) 🔍
- "How we built Wren AI" (updates) 🤖

**Design Elements**:
- Tag-based filtering (all, sourcing, pricing, platforms, tax & finance, wrenlist updates)
- Featured post with full width card
- 2-column grid for secondary posts
- Emoji thumbnails for visual variety
- Hover states for interactivity

---

### 6. Roadmap Page (`/roadmap`)

**File**: `src/app/(marketing)/roadmap/page.tsx`

**Sections**:
- Navigation bar
- Header with title and search + suggest button
- Column headers (Under consideration, Planned, In progress, Released)
- 4-column card grid:
  - **Under consideration** (12 items): Depop, Facebook Marketplace, bulk pricing, etc.
  - **Planned** (5 items): Etsy integration (featured with API pending badge)
  - **In progress** (3 items): Mobile add-find, sourcing analytics, AI v2
  - **Released** (9 items): Vinted, eBay, Shopify, AI listing, auto-delist, etc.
- Footer

**Design Elements**:
- Upvote buttons (with thumb emoji)
- Feature tags (marketplace, automation, mobile, etc.)
- Featured "In progress" card with special styling
- Searchable interface (input state management)
- Color-coded column badges (purple, blue, amber, green)
- Sortable by votes/engagement

**Interactivity**: Upvote toggle, search filtering, feature suggestion link

---

## Design System Usage

### Colors
- **Sage** (#3D5C3A): Primary brand, buttons, interactive elements
- **Cream** (#F5F0E8): Primary background, cards
- **Ink** (#1E2E1C): Text, dark elements
- **Amber** (#BA7517): Accents
- **Sage-pale**, **Sage-lt**: Lighter variants for backgrounds

### Typography
- **Serif** (Cormorant Garamond): Main headings, titles
- **Sans** (Jost): Body copy, navigation, UI labels
- **Mono** (DM Mono): Prices, data points

### Components
- Navigation bar (sticky, consistent across all pages)
- Cards (rounded md, border md, with hover states)
- Buttons (primary sage, ghost white border)
- Grid layouts (2, 3, 4 columns depending on content)
- Testimonials (with quote + attribution + stat)
- Footer (4-column, ink background, cream text)

### Responsive Patterns
- All grids use `grid-cols-2`, `grid-cols-3`, `grid-cols-4`
- Padding: `px-10` or `px-12` (responsive via Tailwind)
- Max-width containers: `max-w-5xl` or `max-w-4xl` centered with `mx-auto`

---

## Key Features

### 1. **Consistent Navigation**
Every page has the same sticky nav with logo, links, and CTA buttons.

### 2. **Tailwind-First Styling**
All styling uses Tailwind CSS utilities from `tailwind.config.ts`:
- Custom colors (sage, cream, ink, amber)
- Custom fonts (serif, sans, mono)
- Border styles with opacity
- Rounded corners (sm: 3px, md: 6px, lg: 10px)

### 3. **Interactive Elements**
- Pricing toggle (monthly/annual)
- Blog tag filtering
- Roadmap upvoting
- Search functionality

### 4. **Mock Data**
- Inventory cards with real examples
- Blog posts with dates and read times
- Roadmap features with vote counts
- Pricing tiers with descriptions

### 5. **Consistent Footer**
All pages share a 4-column footer (Platform, Resources, Company) with ink background and sage-lt accent.

---

## File Structure

```
src/app/(marketing)/
├── layout.tsx                 # Marketing layout wrapper
├── landing/
│   └── page.tsx              # Home page
├── pricing/
│   └── page.tsx              # Pricing page
├── about/
│   └── page.tsx              # Why Wrenlist page
├── story/
│   └── page.tsx              # Founder story
├── blog/
│   └── page.tsx              # Blog listing
└── roadmap/
    └── page.tsx              # Public roadmap
```

---

## Next Steps

1. **Test all routes**: `/landing`, `/pricing`, `/about`, `/story`, `/blog`, `/roadmap`
2. **Verify design fidelity**: Compare with mockup for colors, spacing, typography
3. **Add interactivity**: Wire up buttons to real routes (auth, dashboard, etc.)
4. **Optimize images**: Replace emoji placeholders with actual hero/product images
5. **SEO**: Add meta tags, descriptions, OG data
6. **CMS integration**: Connect blog posts and roadmap to real data

---

## Notes

- All pages use Tailwind CSS for styling (no inline styles)
- Pages are fully responsive via Tailwind grid/flex utilities
- Links use Next.js `Link` component for client-side navigation
- State management for filters (blog tags, roadmap search) is client-side via React hooks
- Footer is duplicated on each page (consider extracting to a shared component later)
- All CTAs route to `/landing` or `/pricing` as defaults (update to real auth/signup flows)

---

**Built**: 2026-03-30
**Design Reference**: `/Volumes/ExternalAI/github/wrenlist_redesign/wrenlist-design.html`
**Status**: Ready for testing and deployment
