"use client";

import { useEffect } from "react";
import Lenis from "lenis";

// Momentum ("macOS/Safari"-style) smoothing for the dashboard scroll area.
// The app scrolls inside <main id="scroll-main"> (not the window), so Lenis is
// pointed at that wrapper + a stable inner content element. Disabled entirely
// under prefers-reduced-motion.
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const wrapper = document.getElementById("scroll-main");
    const content = document.getElementById("scroll-content");
    if (!wrapper || !content) return;

    const lenis = new Lenis({
      wrapper,
      content,
      lerp: 0.1, // interpolation factor — lower = smoother/heavier
      smoothWheel: true,
      wheelMultiplier: 1,
    });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
