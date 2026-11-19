'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useLenis } from 'lenis/react';
import type Lenis from 'lenis';

/**
 * Maps a section's sticky runway to 0–1 progress.
 * Invokes onProgress every Lenis frame for transform scrubbing.
 */
export function useSectionProgress(
  sectionRef: React.RefObject<HTMLElement | null>,
  onProgress: (progress: number) => void
) {
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  const measure = useCallback(() => {
    const el = sectionRef.current;
    if (!el) return 0;

    const sectionHeight = el.offsetHeight;
    const viewH = window.innerHeight;
    const runnable = Math.max(sectionHeight - viewH, 1);
    const scrolled = -el.getBoundingClientRect().top;

    return Math.min(Math.max(scrolled / runnable, 0), 1);
  }, [sectionRef]);

  const handle = useCallback(
    (_lenis: Lenis) => {
      onProgressRef.current(measure());
    },
    [measure]
  );

  useLenis(handle, [handle]);

  useEffect(() => {
    onProgressRef.current(measure());
  }, [measure]);
}
