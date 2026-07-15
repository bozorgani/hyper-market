"use client";

import {
  motion as framerMotion,
  AnimatePresence,
} from "framer-motion";
import { createElement, useEffect, useState } from "react";
import type { ComponentType, HTMLAttributes, ReactNode } from "react";

/**
 * A hydration-safe adapter around Framer Motion.
 *
 * Framer Motion serializes its `initial` visual state into SSR `style`
 * attributes. Those attributes are intentionally blocked by the production
 * CSP (`style-src-attr 'none'`). Rendering the Framer Motion component with
 * animation props stripped during SSR and the first client render keeps the
 * DOM tree stable; animation props are enabled immediately after hydration
 * and then update the CSSOM at runtime without creating author style
 * attributes in the HTML.
 */
type CspMotionProps = Omit<HTMLAttributes<HTMLElement>, "style"> & {
  children?: ReactNode;
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  transition?: unknown;
  whileTap?: unknown;
  whileHover?: unknown;
  whileFocus?: unknown;
  whileInView?: unknown;
  viewport?: unknown;
  variants?: unknown;
  custom?: unknown;
  layout?: unknown;
  layoutId?: unknown;
  drag?: unknown;
};

type MotionTag = "div" | "span" | "tr";

const motionProps = new Set([
  "initial",
  "animate",
  "exit",
  "transition",
  "whileTap",
  "whileHover",
  "whileFocus",
  "whileInView",
  "viewport",
  "variants",
  "custom",
  "layout",
  "layoutId",
  "drag",
]);

function createCspMotionComponent(tag: MotionTag) {
  return function CspMotionComponent(props: CspMotionProps) {
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
      setIsHydrated(true);
    }, []);

    const MotionComponent = framerMotion[tag] as unknown as ComponentType<CspMotionProps>;

    if (isHydrated) {
      // Start from the target state after hydration. This avoids a transient
      // opacity/transform state that can make controls appear unavailable to
      // automation and assistive technology during the CSP-safe handoff.
      return createElement(MotionComponent, { ...props, initial: false });
    }

    const staticProps: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (!motionProps.has(key)) {
        staticProps[key] = value;
      }
    }

    // Keep the same component type before and after hydration so interactive
    // descendants do not get remounted when animation props are enabled.
    return createElement(MotionComponent, staticProps, props.children);
  };
}

export const motion = {
  div: createCspMotionComponent("div"),
  span: createCspMotionComponent("span"),
  tr: createCspMotionComponent("tr"),
};

export { AnimatePresence };
