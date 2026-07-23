# 🛍️ HyperMarket — Full Frontend UI/UX Audit Report

**Auditor:** Senior Frontend Architect  
**Date:** 2026-07-23  
**Project:** `hyper-market` — Enterprise E-commerce Platform (Persian/Farsi RTL)  
**Reference Platforms:** Snapp Market, Digikala, Amazon Fresh

---

## EXECUTIVE SUMMARY

The project is architecturally solid with a modern Next.js 16 App Router setup, proper design token system, and well-structured components. The overall visual quality is **above average** compared to typical Iranian e-commerce startups, but several areas need polish to reach the premium quality of Snapp Market / Digikala.

**Overall Score: 7.2 / 10**  
**Target Score: 8.8 / 10**

---

## 🔴 CRITICAL Issues

### C1 — Header search lacks visual prominence
- **File:** `src/components/layout/header.tsx`, `src/components/layout/desktop-search.tsx`
- **Problem:** Search input is subtle (gray bg, `bg-slate-50`) and doesn't feel like the primary action. In Snapp Market / Digikala, search is the **most prominent** header element — large, centered, with rounded-full shape and clear call-to-action. Current search is only `max-w-xl` on medium screens and doesn't expand.
- **Solution:** Increase search height to `h-11`, add `rounded-full` shape, expand max-width to full available space, add subtle placeholder animation.
- **Risk:** ⬜ Low — purely visual, no logic change.

### C2 — Homepage hero section lacks real imagery
- **File:** `src/features/public-pages/home-page-client.tsx`
- **Problem:** Hero uses CSS-only abstract shapes (colored divs, gradient circles) instead of a real product visual or illustration. All premium marketplaces use either a real photograph or a polished illustration in the hero.
- **Solution:** Add a premium SVG illustration or a CSS-rendered shopping scene with product imagery. Keep the gradient background but add visual richness.
- **Risk:** ⬜ Low — visual-only enhancement.

### C3 — Product card "Add to Cart" button lacks visual hierarchy
- **File:** `src/components/product-card.tsx`
- **Problem:** The "افزودن به سبد" button uses `bg-rose-50 text-rose-700` (very light pink) — it looks disabled/secondary. In Digikala, this button is bold and clearly clickable. The current style makes it hard to distinguish from a disabled state.
- **Solution:** Use a more distinct background: `bg-rose-600 text-white` on hover, with the default being `bg-rose-50 hover:bg-rose-600 hover:text-white` for a clear interactive affordance.
- **Risk:** ⬜ Low — no functional change.

---

## 🟠 HIGH Priority Issues

### H1 — Footer is completely missing
- **File:** N/A — doesn't exist
- **Problem:** There is no footer component at all. Every professional marketplace (Digikala, Snapp Market, Amazon) has a comprehensive footer with links, trust badges, app download links, and legal information. This significantly hurts credibility.
- **Solution:** Create a `Footer` component with: about links, customer service, social media, trust badges, copyright, and app download section.
- **Risk:** ⬜ Low — additive only.

### H2 — No breadcrumbs on product/category pages
- **File:** `src/features/public-pages/product-detail-page-client.tsx`, `src/features/public-pages/products-page-client.tsx`
- **Problem:** Users can't see their navigation path. Breadcrumbs are standard on every e-commerce product page and improve SEO.
- **Solution:** Create a reusable `Breadcrumbs` component. Add to product detail and category pages.
- **Risk:** ⬜ Low — additive.

### H3 — Homepage flash sale timer is hardcoded/stale
- **File:** `src/features/public-pages/home-page-client.tsx`
- **Problem:** "۱۲ ساعت باقی‌مانده" is hardcoded text. This damages trust — users see the same "12 hours left" every time.
- **Solution:** Either compute a dynamic countdown or remove the timer. Better: use a real server-driven countdown with a target date.
- **Risk:** 🟡 Medium — need to decide approach. Start with a client-side countdown that resets daily.

### H4 — Cart page layout wastes horizontal space on large screens
- **File:** `src/features/public-pages/cart-page-client.tsx`
- **Problem:** `max-w-4xl` constrains the cart page too much. The item list has empty space and doesn't use the full viewport. Cart items are cramped on the left side while the summary sits on the right.
- **Solution:** Increase `max-w-5xl` or `max-w-6xl`. Make cart items more spacious with better visual separation.
- **Risk:** ⬜ Low — layout only.

### H5 — Product detail page lacks rating/review summary
- **File:** `src/features/public-pages/product-detail-page-client.tsx`
- **Problem:** No star rating or review count visible in the product summary area. Reviews are only shown at the bottom. Digikala prominently shows average rating next to the product title.
- **Solution:** Add a compact rating summary (stars + review count) near the product title/badges area.
- **Risk:** ⬜ Low — additive.

### H6 — Wishlist page has overlapping "Add to Cart" button
- **File:** `src/features/public-pages/wishlist-page-client.tsx`
- **Problem:** The floating "Add to Cart" button (`absolute bottom-3 left-3 right-3 z-10`) overlaps with the product card's own add-to-cart button, creating a confusing double-button situation.
- **Solution:** Remove the overlapping button since ProductCard already has its own add-to-cart.
- **Risk:** ⬜ Low — removes duplicate UI.

### H7 — Mobile menu lacks category navigation
- **File:** `src/components/layout/mobile-menu.tsx`
- **Problem:** Mobile menu only shows 3-4 links (Products, Orders, Profile, Login). Missing: categories, wishlist, cart link. Snapp Market's mobile menu includes all major navigation items.
- **Solution:** Expand mobile menu to include: Categories, Wishlist, Cart, Addresses, and proper section headers.
- **Risk:** ⬜ Low — additive.

---

## 🟡 MEDIUM Priority Issues

### M1 — Skeleton loader uses `animate-pulse` instead of shimmer
- **File:** `src/components/ui/skeleton.tsx`
- **Problem:** The `Skeleton` component uses Tailwind's `animate-pulse` but the CSS defines a premium `shimmer` animation class (`.skeleton`). These should be unified — the shimmer animation looks much more premium.
- **Solution:** Change `Skeleton` to use the CSS `skeleton` class instead of `animate-pulse`.
- **Risk:** ⬜ Low — purely visual.

### M2 — Inconsistent border radius across pages
- **File:** Various
- **Problem:** Mix of `rounded-xl`, `rounded-2xl`, `rounded-3xl`, and `rounded-[var(--radius-lg)]`. Some components use CSS variables, others use hardcoded values.
- **Solution:** Audit and standardize to use design token values consistently.
- **Risk:** ⬜ Low — cosmetic.

### M3 — Empty state components could be more engaging
- **File:** `src/components/ui/empty-state.tsx`
- **Problem:** Empty states use a simple icon + text. Premium marketplaces use illustrations or emojis with more engaging copy.
- **Solution:** Add larger emoji/icon, better typography, and more encouraging copy with visual hierarchy.
- **Risk:** ⬜ Low — additive.

### M4 — Search page doesn't show recent/popular searches
- **File:** `src/features/public-pages/search-page-client.tsx`, `src/components/layout/desktop-search.tsx`
- **Problem:** When users focus the search, they see nothing. Premium platforms show "recent searches" and "popular searches" as suggestions.
- **Solution:** Add recent search suggestions (from localStorage) and popular search terms when the search is focused with empty/minimal query.
- **Risk:** ⬜ Low — additive.

### M5 — Product gallery lightbox lacks swipe gesture on mobile
- **File:** `src/components/product-gallery.tsx`
- **Problem:** No touch/swipe support for the gallery. Mobile users must tap arrow buttons.
- **Solution:** Add basic touch swipe support using pointer events (no new dependency needed).
- **Risk:** 🟡 Medium — touch event handling can be tricky.

### M6 — Checkout page steps visual could be more polished
- **File:** `src/features/public-pages/checkout/order-summary-card.tsx`
- **Problem:** Step indicators use simple circles with numbers. A connected progress line between steps would look more professional.
- **Solution:** Add a vertical connecting line between steps.
- **Risk:** ⬜ Low — visual only.

### M7 — 404 page is too minimal
- **File:** `src/app/not-found.tsx`
- **Problem:** Just an emoji 🧭 and basic text. Lacks visual richness and brand personality.
- **Solution:** Create a more engaging 404 with a larger illustration area, better typography, and a search input.
- **Risk:** ⬜ Low — standalone page.

---

## 🟢 LOW Priority Issues

### L1 — No "back to top" button
- **File:** N/A
- **Problem:** Long pages (products listing, search results) don't have a back-to-top button.
- **Solution:** Add a scroll-triggered floating "back to top" button.
- **Risk:** ⬜ Low.

### L2 — Product card doesn't show delivery time estimate
- **File:** `src/components/product-card.tsx`
- **Problem:** No delivery time shown on product cards. Snapp Market shows "ارسال سریع" on cards.
- **Solution:** Add a small delivery estimate badge on cards.
- **Risk:** ⬜ Low — but may need backend data.

### L3 — No " recently viewed" section
- **File:** N/A
- **Problem:** No recently viewed products section on homepage or product pages.
- **Solution:** Add a client-side recently viewed tracker.
- **Risk:** ⬜ Low — additive.

### L4 — Footer-less bottom nav padding on desktop
- **File:** `src/app/(main)/layout.tsx`
- **Problem:** `pb-main-nav` class applies on mobile but there's no footer, so desktop pages end abruptly.
- **Solution:** Add a footer component.
- **Risk:** ⬜ Low — addressed with H1.

### L5 — Cart item count uses reduce on every render
- **File:** `src/components/layout/header.tsx`, `src/components/layout/bottom-nav.tsx`
- **Problem:** `cartItems.reduce()` runs on every render. Minor performance concern.
- **Solution:** Memoize the count calculation.
- **Risk:** ⬜ Low — optimization.

---

## 📊 Comparison Matrix

| Feature | HyperMarket | Snapp Market | Digikala | Amazon Fresh |
|---------|:-----------:|:------------:|:--------:|:------------:|
| Header Search | 🟡 Basic | 🟢 Prominent | 🟢 Best-in-class | 🟢 Excellent |
| Product Cards | 🟢 Good | 🟢 Great | 🟢 Best-in-class | 🟢 Great |
| Homepage Layout | 🟢 Good | 🟢 Great | 🟢 Excellent | 🟢 Great |
| Cart Experience | 🟡 Basic | 🟢 Great | 🟢 Great | 🟢 Excellent |
| Mobile Navigation | 🟢 Good | 🟢 Great | 🟢 Great | 🟡 Basic |
| Footer | 🔴 Missing | 🟢 Complete | 🟢 Complete | 🟢 Complete |
| Search UX | 🟡 Basic | 🟢 Great | 🟢 Excellent | 🟢 Great |
| Breadcrumbs | 🔴 Missing | 🟢 Present | 🟢 Present | 🟢 Present |
| Loading States | 🟢 Good | 🟢 Great | 🟢 Great | 🟢 Great |
| Error States | 🟢 Good | 🟢 Great | 🟢 Great | 🟢 Great |
| Empty States | 🟡 Basic | 🟢 Engaging | 🟢 Engaging | 🟢 Engaging |
| Checkout Flow | 🟢 Good | 🟢 Great | 🟢 Great | 🟢 Excellent |
| Visual Polish | 🟡 Good | 🟢 Premium | 🟢 Premium | 🟢 Premium |
| Accessibility | 🟢 Strong | 🟡 Average | 🟡 Average | 🟢 Strong |

---

## ✅ STRENGTHS (Do Not Break)

1. **RTL-first design** — Proper `dir="rtl"` with Vazirmatn font
2. **Design token system** — CSS variables + TypeScript exports
3. **Accessibility** — Skip-to-content, ARIA labels, focus rings, keyboard nav
4. **Mobile-first** — Bottom nav, responsive grids, touch targets ≥44px
5. **Error boundaries** — Per-route error/loading states
6. **Type safety** — Full TypeScript with proper types
7. **Component architecture** — Feature-based organization
8. **i18n support** — Persian translations in place
9. **Performance** — Image optimization, lazy loading, skeleton screens
10. **CSP compliance** — Nonce-based scripts, motion wrapper

---

## 🎯 IMPLEMENTATION PRIORITY

### Phase 1: High Impact / Low Risk (Quick Wins)
1. ~~**C1** — Improve header search prominence~~
2. ~~**C3** — Enhance product card add-to-cart button~~
3. ~~**M1** — Unify skeleton animation to shimmer~~
4. ~~**H1** — Add comprehensive footer~~
5. ~~**H6** — Fix wishlist overlapping button~~

### Phase 2: Medium Impact
6. ~~**H2** — Add breadcrumbs~~
7. ~~**H7** — Enhance mobile menu~~
8. ~~**C2** — Improve homepage hero visual~~
9. ~~**M3** — Enhance empty states~~
10. ~~**M7** — Improve 404 page~~

### Phase 3: Polish
11. ~~**H3** — Dynamic flash sale timer~~
12. ~~**H4** — Improve cart layout~~
13. ~~**M6** — Polish checkout steps~~
