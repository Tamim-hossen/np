'use client';

import dynamic from 'next/dynamic';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { TransitionEvent } from 'react';
import { useLenis } from 'lenis/react';

const LoaderBlobScene = dynamic(() => import('./LoaderBlobScene'), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center gap-5"
    >
      {[34, 24, 17, 12, 8].map((size, index) => (
  <span
    key={size}
    className="loader-pulse cursor-pointer rounded-full bg-[#fefefe] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] transition-[filter] hover:brightness-125 active:brightness-150"
    style={{
      width: size,
      height: size,
      animationDelay: `${index * 120}ms`,
    }}
  />
))}
    </div>
  ),
});

const MINIMUM_DISPLAY_MS = 1400;
const MAXIMUM_WAIT_MS = 8000;
const EXIT_DURATION_MS = 850;

export function SiteLoadingScreen() {
  const [isExiting, setIsExiting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const lenis = useLenis();
  const completionDispatchedRef = useRef(false);

  useEffect(() => {
    const startedAt = Date.now();
    let pageLoaded = document.readyState === 'complete';
    let dataReady = document.documentElement.hasAttribute(
      'data-portfolio-data-ready',
    );
    let exitScheduled = false;
    let exitTimer: number | undefined;
    let fallbackTimer: number | undefined;

    const beginExit = () => {
      if (!pageLoaded || !dataReady || exitScheduled) return;
      exitScheduled = true;
      if (fallbackTimer !== undefined) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = undefined;
      }
      const delay = Math.max(0, MINIMUM_DISPLAY_MS - (Date.now() - startedAt));
      exitTimer = window.setTimeout(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          setIsDone(true);
        } else {
          setIsExiting(true);
        }
      }, delay);
    };

    const onDataReady = () => {
      dataReady = true;
      beginExit();
    };

    const onPageLoad = () => {
      pageLoaded = true;
      beginExit();
    };

    fallbackTimer = window.setTimeout(() => {
      pageLoaded = true;
      fallbackTimer = undefined;
      beginExit();
    }, MAXIMUM_WAIT_MS);

    if (pageLoaded) beginExit();
    else window.addEventListener('load', onPageLoad, { once: true });
    if (!dataReady) {
      window.addEventListener('portfolio-data:ready', onDataReady, {
        once: true,
      });
    }

    return () => {
      window.removeEventListener('load', onPageLoad);
      window.removeEventListener('portfolio-data:ready', onDataReady);
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      if (exitTimer !== undefined) window.clearTimeout(exitTimer);
    };
  }, []);

  useEffect(() => {
    if (!isExiting || isDone) return;
    const timer = window.setTimeout(
      () => setIsDone(true),
      EXIT_DURATION_MS + 150,
    );
    return () => window.clearTimeout(timer);
  }, [isDone, isExiting]);

  useLayoutEffect(() => {
    if (!isDone) {
      lenis?.stop();
      return;
    }

    document.documentElement.removeAttribute('data-site-loading');
    lenis?.start();
    if (!completionDispatchedRef.current) {
      completionDispatchedRef.current = true;
      window.dispatchEvent(new Event('site-loader:complete'));
    }
  }, [isDone, lenis]);

  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (
      event.target === event.currentTarget &&
      event.propertyName === 'transform'
    ) {
      setIsDone(true);
    }
  };

  if (isDone) return null;

  return (
    <div
      role="status"
      aria-label="Loading portfolio"
      onTransitionEnd={handleTransitionEnd}
      className={`fixed inset-0 z-[2000] overflow-hidden bg-[#e8e8ea] transition-transform duration-[850ms] ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:transition-none ${
        isExiting ? 'pointer-events-none -translate-y-full' : 'translate-y-0'
      }`}
    >
      <div aria-hidden="true" className="absolute inset-0">
        <LoaderBlobScene />
      </div>
    </div>
  );
}
