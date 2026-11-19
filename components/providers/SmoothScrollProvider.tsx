'use client';

import { useCallback, useEffect, useRef } from 'react';
import { ReactLenis, useLenis, type LenisRef } from 'lenis/react';
import type Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { scrollRef } from '@/hooks/useScrollProgress';

gsap.registerPlugin(ScrollTrigger);

/**
 * Keeps the shared scrollRef and GSAP ScrollTrigger in lockstep with Lenis
 * on the exact same frame ticker to eliminate scroll stutter and staggering.
 */
function ScrollSync() {
  const onScroll = useCallback((lenis: Lenis) => {
    scrollRef.scrollY = lenis.scroll;
    scrollRef.scrollProgress = lenis.progress;
    ScrollTrigger.update();
  }, []);

  useLenis(onScroll, [onScroll]);

  return null;
}

export function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    function update(time: number) {
      lenisRef.current?.lenis?.raf(time * 1000);
    }

    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(update);
    };
  }, []);

  return (
    <ReactLenis
      ref={lenisRef}
      root
      options={{
        lerp: 0.1,
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.1,
        autoRaf: false,
      }}
    >
      <ScrollSync />
      {children}
    </ReactLenis>
  );
}
