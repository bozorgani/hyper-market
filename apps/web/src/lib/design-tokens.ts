/**
 * HyperMarket Design Tokens
 * Issue #25 – Magic numbers / inconsistent spacing
 * 
 * Centralizes Tailwind arbitrary values into typed constants.
 * Use these in components instead of hardcoded `min-h-[310px]`, `rounded-3xl`, etc.
 * 
 * CSS variables are defined in `src/app/globals.css` :root
 * These TS exports mirror those for JS usage.
 */

export const radius = {
  sm: "var(--radius-sm)",     // 8px
  md: "var(--radius-md)",     // 12px
  lg: "var(--radius-lg)",     // 16px
  xl: "var(--radius-xl)",     // 20px
  "2xl": "var(--radius-2xl)", // 24px – CARD DEFAULT
  "3xl": "var(--radius-2xl)", // mapped to 2xl – normalize system
} as const;

export const spacing = {
  1: "var(--space-1)", // 4px
  2: "var(--space-2)", // 8px
  3: "var(--space-3)", // 12px
  4: "var(--space-4)", // 16px
  5: "var(--space-5)", // 20px
  6: "var(--space-6)", // 24px
  8: "var(--space-8)", // 32px
} as const;

export const card = {
  product: {
    minHeight: "var(--card-product-min-h)",       // 20rem / 320px
    minHeightSm: "var(--card-product-min-h-sm)",  // 22rem / 352px
    radius: radius["2xl"],
    padding: spacing[4],
    paddingSm: spacing[4],
  },
  default: {
    radius: radius["2xl"],
    padding: spacing[4],
  },
} as const;

export const button = {
  height: {
    sm: "2.25rem", // 36px
    md: "2.5rem",  // 40px
    lg: "3rem",    // 48px – touch target ≥44px WCAG
  },
  radius: radius.xl,
  paddingX: spacing[4],
} as const;

export const touch = {
  min: "var(--touch-target-min)", // 44px WCAG 2.5.5
};

export const shadow = {
  sm: "var(--shadow-sm)",
  md: "var(--shadow-md)",
  lg: "var(--shadow-lg)",
  xl: "var(--shadow-xl)",
} as const;

/**
 * Tailwind class helpers – prefer these over arbitrary values
 */
export const tw = {
  card: "rounded-[var(--radius-2xl)] border border-slate-200 bg-white shadow-[var(--shadow-sm)]",
  cardHover: "hover:-translate-y-[2px] hover:shadow-[var(--shadow-lg)] transition-all duration-200",
  button: "rounded-[var(--radius-xl)]",
  buttonLg: "rounded-[var(--radius-2xl)]",
  input: "rounded-[var(--radius-xl)]",
  focusRing: "focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-700 focus-visible:outline-offset-2",
} as const;

/**
 * Migration guide – Issue #25
 * 
 * Before:
 *   className="min-h-[310px] rounded-3xl px-5 py-3.5 shadow-[0_4px_...]"
 * 
 * After:
 *   import { card, tw } from '@/lib/design-tokens'
 *   className={`min-h-[${card.product.minHeight}] ${tw.card}`}
 *   // or use CSS variable directly:
 *   className="min-h-[var(--card-product-min-h)] rounded-2xl"
 * 
 * Border radius normalization:
 *   rounded-3xl → rounded-2xl  (24px – design system standard)
 *   rounded-xl  → buttons / inputs
 *   rounded-2xl → cards / modals
 * 
 * Spacing normalization:
 *   px-3.5 / py-3.5 → px-4 py-3  (use 4pt grid)
 *   gap-1.5 → gap-1 or gap-2
 */
