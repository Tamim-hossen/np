'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLenis } from 'lenis/react';
import type Lenis from 'lenis';

// Mutable scroll clock shared with R3F — updated every Lenis frame, zero re-render cost
export const scrollRef = {
  scrollY: 0,
  scrollProgress: 0,
  activeSection: 'hero',
  sectionProgress: 0,
  backgroundScrollPaused: false,
  backgroundScrollPauseReasons: new Set<string>(),
};

export function setBackgroundScrollPaused(reason: string, paused: boolean) {
  if (paused) {
    scrollRef.backgroundScrollPauseReasons.add(reason);
  } else {
    scrollRef.backgroundScrollPauseReasons.delete(reason);
  }

  scrollRef.backgroundScrollPaused =
    scrollRef.backgroundScrollPauseReasons.size > 0;
}

export interface ScrollState {
  scrollY: number;
  scrollProgress: number;
  activeSection: string;
  sectionProgress: number;
}

let cachedSections: Array<{ id: string; docTop: number; height: number }> = [];

export function refreshCachedSections() {
  if (typeof document === 'undefined') return;
  const elements = document.querySelectorAll<HTMLElement>(
    '[data-section], section[id]'
  );
  const scrollY = window.scrollY || 0;
  cachedSections = Array.from(elements).map((el, index) => {
    const rect = el.getBoundingClientRect();
    return {
      id: el.getAttribute('data-section') || el.id || `section-${index + 1}`,
      docTop: rect.top + scrollY,
      height: rect.height,
    };
  });
}

function detectActiveSection(scrollY: number) {
  if (cachedSections.length === 0) {
    refreshCachedSections();
  }

  let activeSection = 'hero';
  const totalSections = Math.max(cachedSections.length, 1);

  if (cachedSections.length > 0) {
    const viewportCenter = (typeof window !== 'undefined' ? window.innerHeight : 900) * 0.45;
    let minDistance = Infinity;

    cachedSections.forEach((sec) => {
      const currentTop = sec.docTop - scrollY;
      const elementCenter = currentTop + sec.height * 0.35;
      const distance = Math.abs(elementCenter - viewportCenter);

      if (distance < minDistance) {
        minDistance = distance;
        activeSection = sec.id;
      }
    });
  }

  return { activeSection, totalSections };
}

function writeScrollRef(scrollY: number, scrollProgress: number) {
  const { activeSection, totalSections } = detectActiveSection(scrollY);
  const sectionProgress = Math.min(
    Math.max(scrollProgress * Math.max(totalSections - 1, 1), 0),
    totalSections - 1
  );

  scrollRef.scrollY = scrollY;
  scrollRef.scrollProgress = scrollProgress;
  scrollRef.activeSection = activeSection;
  scrollRef.sectionProgress = sectionProgress;

  return { activeSection, sectionProgress };
}

function syncNativeScrollRef() {
  const scrollY = window.scrollY || window.pageYOffset || 0;
  scrollRef.scrollY = scrollY;
  const maxScroll = Math.max(
    document.documentElement.scrollHeight - window.innerHeight,
    1
  );
  writeScrollRef(scrollY, Math.min(Math.max(scrollY / maxScroll, 0), 1));
}

export function useScrollProgress() {
  const [scrollState, setScrollState] = useState<ScrollState>({
    scrollY: 0,
    scrollProgress: 0,
    activeSection: 'hero',
    sectionProgress: 0,
  });
  const lastSection = useRef('hero');
  const wasScrolling = useRef(false);

  // Stable callback — never setState while Lenis is mid-scroll (avoids layout jumps)
  const onScroll = useCallback((lenis: Lenis) => {
    const scrollY = lenis.scroll;
    const scrollProgress = lenis.progress;
    const { activeSection, sectionProgress } = writeScrollRef(
      scrollY,
      scrollProgress
    );

    const scrolling = Boolean(lenis.isScrolling);
    const justSettled = wasScrolling.current && !scrolling;
    wasScrolling.current = scrolling;

    // Update React UI only after scroll settles — mid-scroll setState causes hitch/jump
    if (
      justSettled &&
      activeSection !== lastSection.current
    ) {
      lastSection.current = activeSection;
      setScrollState({
        scrollY,
        scrollProgress,
        activeSection,
        sectionProgress,
      });
    }
  }, []);

  useLenis(onScroll, [onScroll]);

  useEffect(() => {
    const syncNative = () => {
      refreshCachedSections();
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      );
      const scrollProgress = Math.min(Math.max(scrollY / maxScroll, 0), 1);
      const { activeSection, sectionProgress } = writeScrollRef(
        scrollY,
        scrollProgress
      );

      lastSection.current = activeSection;
      setScrollState({
        scrollY,
        scrollProgress,
        activeSection,
        sectionProgress,
      });
    };

    syncNative();
    const handleNativeScroll = () => syncNativeScrollRef();
    window.addEventListener('scroll', handleNativeScroll, { passive: true });
    window.addEventListener('resize', syncNative, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleNativeScroll);
      window.removeEventListener('resize', syncNative);
    };
  }, []);

  return scrollState;
}
