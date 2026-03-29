# Wrenlist — Design Patterns

Reference for developers building the Next.js app. These patterns define how interactions should behave across the product. When in doubt, favour the simpler implementation — Wrenlist's aesthetic is refined, not flashy.

---

## Animation principles

All motion should feel **organic and purposeful** — never decorative for its own sake.

| Property | Value |
|---|---|
| Default easing | `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo) |
| Subtle easing | `cubic-bezier(0.4, 0, 0.2, 1)` (material standard) |
| Short duration | `150ms` — state changes (hover, active, focus) |
| Medium duration | `250ms` — panel opens, badge transitions |
| Long duration | `400ms` — page-level reveals, modals |
| Stagger delay | `60ms` per item — list/grid entrance sequences |

**Rules:**
- Never animate `width` or `height` directly — use `transform: scaleY()` or `max-height` with `overflow:hidden`
- Always use `transform` and `opacity` for performance — avoid animating `margin`, `padding`, `top`, `left`
- Respect `prefers-reduced-motion` — wrap all non-essential animations in the media query
- Entry animations fire once — not on every re-render or tab switch

---

## Page load / entrance

Marketing pages fade their hero content in on load with a staggered reveal:

```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.fade-up {
  animation: fadeUp 500ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* Stagger children */
.fade-up:nth-child(1) { animation-delay: 0ms; }
.fade-up:nth-child(2) { animation-delay: 60ms; }
.fade-up:nth-child(3) { animation-delay: 120ms; }
```

**Use on:** hero headline, hero subheading, hero CTA, hero image/preview card.

App pages use skeleton loading states instead of entrance animations — data arrives asynchronously, so animate the skeleton out rather than the content in.

---

## Scroll-triggered reveals

Section content below the fold fades up when it enters the viewport:

```js
const observer = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('is-visible');
      observer.unobserve(e.target);
    }
  }),
  { threshold: 0.15 }
);
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
```

```css
.reveal {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 500ms cubic-bezier(0.16, 1, 0.3, 1),
              transform 500ms cubic-bezier(0.16, 1, 0.3, 1);
}
.reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}
```

**Use on:** features strip columns, pricing cards, testimonial blocks, blog grid cards, compare table rows.

---

## Toast notifications

In-app feedback for every user action. Position: top-right, 20px from edge.

```
type: 'success' | 'error' | 'info' | 'warning'
duration: 3000ms (success/info) | persistent until dismissed (error)
max visible at once: 3 (stack downward)
```

**Anatomy:**
- Icon (16px) — ✓ success, ✗ error, ℹ info, ⚠ warning
- Body text — sentence case, 13px, max ~60 chars
- Optional action link (e.g. "view listing →")
- Dismiss button (×)

**Entry:** slide in from right + fade, `transform: translateX(100%)` → `translateX(0)`, 300ms
**Exit:** fade out + slide right, 200ms

**Examples:**
```
✓  Find saved                          [success]
✓  Listed on eBay UK — view listing →  [success]
✓  Auto-delisted from Vinted           [success]
✗  Couldn't connect to eBay — retry →  [error, persistent]
ℹ  Syncing 3 platforms…                [info]
⚠  Vinted rate limit — retrying in 30s [warning]
```

---

## Hover row actions

Inventory table rows reveal quick-action buttons on hover. These should feel instant — no delay on show, 150ms fade on hide.

**Behaviour:**
- Row background transitions to `var(--cream)` on hover (already in base styles)
- Action buttons appear in the rightmost column, replacing the status badge
- Status badge fades out (150ms), action buttons fade in (150ms)
- Clicking the row itself navigates to find detail
- Action buttons use `event.stopPropagation()`

**Actions (in order):**
1. Edit → navigates to find detail
2. Drop price → opens inline price input or modal
3. Mark sold → opens sold modal
4. Delist → confirm inline or modal

**Implementation note:** render action buttons in the DOM always, toggle visibility with CSS. Don't mount/unmount on hover — it causes layout shift.

---

## Modal pattern

All modals use the shared overlay system.

```
open:  overlay fades in (200ms), modal box scales up from 0.96 + fades in (250ms)
close: modal fades out (150ms), overlay fades out (150ms)
```

**Rules:**
- Focus trap within open modal
- `Escape` key closes
- Clicking backdrop closes (unless `data-persistent`)
- `body: overflow: hidden` while open
- Never nest modals — use a step/wizard pattern inside one modal instead

**Variants:**
- Standard: `max-width: 480px`, centered
- Wide: `max-width: 640px`, for crosslist success, upgrade paywall
- Sheet: bottom-anchored on mobile (see mobile patterns)

---

## Skeleton loading

Show skeletons when data is fetching. Show immediately — do not wait 200ms before showing skeleton.

```css
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--cream-md) 25%,
    var(--cream-dk) 50%,
    var(--cream-md) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 3px;
}
```

**Skeleton shapes map to real content:**
- Stat card → `height: 88px`, full card width
- Table row → `height: 46px`
- Chart area → `height: 160px`
- Line (large) → `height: 18px, width: 60%`
- Line (medium) → `height: 13px, width: 80%`
- Line (small) → `height: 11px, width: 45%`

**Transition out:** when data arrives, skeleton fades out (200ms), real content fades in (200ms). Don't replace instantly — the flash is jarring.

---

## Bulk select mode

Entered via the "select" button in the inventory topbar. Changes the inventory table into multi-select mode.

**Entry:**
1. Checkboxes slide in from left in each row (`transform: translateX(-6px)` → `0`, 200ms, staggered 20ms per row)
2. Floating action bar rises from bottom (`translateY(20px)` → `0`, 250ms)
3. "select" button changes to "cancel" (same position)

**Bar content:** `{n} selected · relist · mark sold · delist · delete · ✕`
**Destructive actions** (delete) shown in muted red
**Bar position:** `fixed, bottom: 80px, centered` — above cookie banner if visible

**Exit:** action taken or ✕ pressed. Checkboxes slide back, bar slides down, selection cleared.

---

## Notification panel

Bell icon in app topbar. Dot indicator shows unread count (amber).

**Open/close:** panel drops down from bell icon with `translateY(-8px)` → `translateY(0)` + fade, 200ms. Closes on outside click or Escape.

**Unread state:** `background: rgba(90,122,87,.04)` tint on unread items
**Dot:** pulses once on new notification (`animation: pulse 2s 3` then stops)
**Mark all read:** clears dot, removes unread tint from all items

**Notification types:**
- `sale` — amber icon, sale price, platform
- `listing-live` — sage icon, item name, platform
- `insight` — amber icon, Wren insight text
- `auto-delist` — neutral icon, item + platforms affected
- `system` — neutral icon, platform sync status

---

## Quick add / rack mode

A stripped-down modal for logging finds in the field. Optimised for one-handed mobile use.

**Trigger:** floating `+` button (mobile) or `Cmd+N` / `N` shortcut (desktop)

**Fields — step 1 (rack, fast):**
1. Photo (camera first on mobile, file on desktop)
2. Item name (autocomplete from brand/category)
3. Cost paid (numeric keyboard on mobile, `£` prefix)
4. Platform(s) (checkbox chips, remembers last selection)

**Fields — step 2 (optional, later):**
- Asking price, condition, description, sourcing detail

**Behaviour:**
- Step 1 submits as `status: draft` — item is saved, crosslisting is optional later
- "Save & add another" keeps modal open and clears form
- Progress indicator: `Step 1 of 2 — you can complete step 2 later`

**Mobile:** bottom sheet, 90vh, drag-to-dismiss handle at top

---

## Avatar dropdown

Clicking the user avatar (top-right of app shell) opens an account menu.

**Contents:**
- User name + email (non-interactive header)
- Plan badge (e.g. "Forager · £29/mo")
- ——
- Account settings
- Billing & plan
- Help
- What's new (links to changelog, with unread dot if new)
- ——
- Log out (bottom, separated)

**Position:** anchored to avatar, right-aligned, `min-width: 220px`
**Open/close:** same pattern as notification panel

---

## Stat card number count-up

Dashboard stat cards animate their values counting up when the dashboard first loads (or on data refresh).

```js
function countUp(el, target, duration = 800) {
  const start = performance.now();
  const isFloat = target % 1 !== 0;
  const update = now => {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
    const value = ease * target;
    el.textContent = isFloat ? value.toFixed(1) : Math.round(value);
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}
```

**Only fires once per session** — store in sessionStorage. On subsequent navigations back to dashboard, values appear instantly.

---

## Nav scroll behaviour

The topnav picks up a subtle shadow when the page scrolls past 8px:

```js
window.addEventListener('scroll', () => {
  document.querySelector('.topnav')
    .classList.toggle('scrolled', window.scrollY > 8);
}, { passive: true });
```

```css
.topnav { transition: box-shadow 200ms ease; }
.topnav.scrolled { box-shadow: 0 1px 12px rgba(0,0,0,.06); }
```

---

## Plan card hover (pricing page)

Plan cards lift slightly on hover. The "Forager" (most popular) card gets a stronger treatment.

```css
.plan-card {
  transition: transform 200ms ease, box-shadow 200ms ease;
}
.plan-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 32px rgba(0,0,0,.08);
}
.plan-card.popular:hover {
  box-shadow: 0 8px 32px rgba(61,92,58,.16);
}
```

---

## Notification dot pulse

The bell icon dot pulses when there are new unread notifications:

```css
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%       { transform: scale(1.4); opacity: 0.7; }
}
.notif-dot.has-unread {
  animation: pulse 2s ease-in-out 3; /* 3 pulses then stops */
}
```

---

## Milestone celebration

Shown once when the user hits a meaningful threshold (first sale, 10 sales, first £100 month). Uses a subtle confetti burst + full-width banner in the dashboard.

**Triggers:**
- First sale → "Your first sale 🎉"
- 10 items sold → "10 finds sold — the rack is calling 🧥"
- First £100 revenue month → "First £100 month 💰"

**Pattern:** banner slides down from topbar (not blocking the page), auto-dismisses after 6 seconds, or on click. Never shown more than once per trigger (stored in user profile).

---

## Responsive / mobile patterns

| Breakpoint | Behaviour |
|---|---|
| `≥ 1024px` | Full desktop layout |
| `768–1023px` | Sidebar collapses to icon-only strip (48px) |
| `< 768px` | Sidebar hidden, hamburger nav, bottom tab bar for core actions |

**Bottom tab bar (mobile app pages):**
Dashboard · Inventory · + Add Find · Listings · Analytics
Fixed at bottom, `height: 56px`, safe area inset padding for iPhone notch.

**Add find on mobile:** full-screen, step-wizard layout. Camera permission requested on first use. Photo step is first — most common entry at the rack.

---

## `prefers-reduced-motion`

Wrap all non-essential animations:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Skeleton shimmer is considered essential (it communicates loading state) — keep it, but reduce speed to `3s`.

---

## Colour usage quick reference

```
Primary actions     var(--sage)         #3D5C3A
Hover states        var(--sage-dk)      #2C4428
Links / accents     var(--sage-lt)      #5A7A57
Muted labels        var(--sage-dim)     #8A9E88
Light fills / chips var(--sage-pale)    #D4E2D2

Page background     var(--cream)        #F5F0E8
Surface / sidebar   var(--cream-md)     #EDE8DE
Borders / dividers  var(--cream-dk)     #E0D9CC

Headings            var(--ink)          #1E2E1C
Body text           var(--ink-md)       #4A5E48
Secondary text      var(--ink-lt)       #6B7D6A

Warning / on-hold   var(--amber)        #BA7517
Warning light fill  var(--amber-lt)     #EDD9A3
```

---

## Typography quick reference

| Use | Font | Weight | Size |
|---|---|---|---|
| Page titles, display | Cormorant Garamond | 400 | 36–72px |
| Section headings | Cormorant Garamond | 400 | 24–32px |
| UI labels (uppercase) | Jost | 600 | 10–11px |
| Body text | Jost | 300 | 13–15px |
| Button / nav | Jost | 500 | 12–14px |
| All prices & numbers | DM Mono | 400–500 | contextual |

Cormorant Garamond italic is for **display moments** only — page titles, hero headings, pull quotes. Not body copy.

Numbers (prices, margins, percentages, counts) always use DM Mono. No exceptions.
