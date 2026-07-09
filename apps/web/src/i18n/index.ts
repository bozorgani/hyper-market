/**
 * HyperMarket i18n – Issue #24
 * Simple typed Persian dictionary with progressive adoption.
 * 
 * Usage:
 *   import { t, tf } from '@/i18n'
 *   t('nav.products') // → "محصولات"
 *   tf('cart.cartCountAriaLabel', { count: 3 }) // → "۳ مورد در سبد خرید"
 */

import fa from "./fa.json";

type Primitive = string | number | boolean | null | undefined;

// Deep key path type helper – allows autocomplete in editors that support it
type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends Primitive
        ? K
        : `${K}.${NestedKeyOf<T[K]>}`;
    }[keyof T & string]
  : never;

export type I18nKey = NestedKeyOf<typeof fa>;

// Simple deep get – no-explicit-any fixed for Issue #23 lint
function get(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Translate – returns Persian string or key fallback
 */
export function t(key: I18nKey): string {
  const v = get(fa, key as string);
  return typeof v === "string" ? v : String(key);
}

/**
 * Translate with simple {placeholder} interpolation + fa-IR number formatting
 */
export function tf(
  key: I18nKey,
  params?: Record<string, string | number>
): string {
  let str = t(key);
  if (!params) return str;
  for (const [k, v] of Object.entries(params)) {
    const formatted =
      typeof v === "number"
        ? v.toLocaleString("fa-IR")
        : String(v);
    str = str.replaceAll(`{${k}}`, formatted);
  }
  return str;
}

/**
 * Dictionary object – for advanced use / spreading
 */
export const messages = fa;

/**
 * Typed sections – convenience exports to reduce key typos during migration
 */
export const i18n = {
  common: fa.common,
  nav: fa.nav,
  header: fa.header,
  auth: fa.auth,
  product: fa.product,
  cart: fa.cart,
  a11y: fa.a11y,
  errors: fa.errors,
  admin: fa.admin,
  home: fa.home,
  features: fa.features,
} as const;

/**
 * RTL helper
 */
export const isRTL = true;
export const locale = "fa-IR";
export const dir: "rtl" | "ltr" = "rtl";

/**
 * Migration helper – gradually replace hardcoded Persian strings:
 * 
 * Before:
 *   <Link>محصولات</Link>
 * 
 * After:
 *   import { t } from '@/i18n'
 *   <Link>{t('nav.products')}</Link>
 * 
 * With params:
 *   tf('cart.cartCountAriaLabel', { count })
 */
