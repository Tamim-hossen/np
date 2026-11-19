'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import Link from 'next/link';
import Image from 'next/image';
import type { CaseStudy } from '@/data/case-studies';
import { usePortfolioStore } from '@/components/providers/PortfolioStoreProvider';

/* -------------------------------------------------------------------------- */
/*  Types & helpers                                                            */
/* -------------------------------------------------------------------------- */

type Rect = { left: number; top: number; width: number; height: number };
type Animation = { dir: 'next' | 'prev'; main: Rect; preview: Rect };

const DURATION = 700;
const EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';

/** Seconds after the intro starts when navigation unlocks (the typing has finished by then). */
const INTRO_LENGTH = 2.3;

/* -------------------------------------------------------------------------- */
/*  Intro typing                                                               */
/* -------------------------------------------------------------------------- */
/*
  `played` flips to true when the section is 50% in view. `instant` becomes true once the
  intro is over, so text that changes later (when the carousel moves on) appears at once
  instead of typing again.
*/

const IntroContext = createContext({ played: false, instant: false });

/** Types its text in during the intro. The untyped rest stays invisible so layout never shifts. */
function Typed({ text, delay = 0 }: { text: string; delay?: number }) {
  const { played, instant } = useContext(IntroContext);
  const [count, setCount] = useState(instant ? text.length : 0);

  useEffect(() => {
    if (instant) {
      setCount(text.length);
      return;
    }
    if (!played) return;
    const duration = Math.min(1500, Math.max(400, text.length * 20));
    let raf = 0;
    let start = 0;
    const timer = setTimeout(() => {
      const tick = (now: number) => {
        if (!start) start = now;
        const progress = Math.min(1, (now - start) / duration);
        setCount(Math.round(progress * text.length));
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [played, instant, text, delay]);

  return (
    <>
      {text.slice(0, count)}
      <span aria-hidden="true" className="invisible">
        {text.slice(count)}
      </span>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Image pieces                                                               */
/* -------------------------------------------------------------------------- */

function StudyImage({ study }: { study: CaseStudy }) {
  return (
    <Image
      src={study.image}
      alt={study.title}
      draggable={false}
      fill
      sizes="(max-width: 1024px) 100vw, 48vw"
      unoptimized
      className="object-cover aspect-square rounded-2xl"
    />
  );
}

/** An image that animates between two rects. Used for the previous-study move. */
function FlyingImage({
  study,
  from,
  to,
  fromOpacity = 1,
}: {
  study: CaseStudy;
  from: Rect;
  to: Rect;
  fromOpacity?: number;
}) {
  const [go, setGo] = useState(false);

  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setGo(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  const r = go ? to : from;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-10 overflow-hidden bg-[#e4e4e9]"
      style={{
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
        opacity: go ? 1 : fromOpacity,
        transition: `left ${DURATION}ms ${EASE}, top ${DURATION}ms ${EASE}, width ${DURATION}ms ${EASE}, height ${DURATION}ms ${EASE}, opacity ${DURATION}ms ${EASE}`,
      }}
    >
      <StudyImage study={study} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Details popup                                                              */
/* -------------------------------------------------------------------------- */

function DetailsModal({
  study,
  origin,
  onClose,
}: {
  study: CaseStudy;
  origin: Rect;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const overlay = overlayRef.current;
    if (!panel || !overlay) return;

    const target = panel.getBoundingClientRect();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || target.width === 0 || target.height === 0) {
      panel.style.transform = 'none';
      panel.style.opacity = '1';
      overlay.style.opacity = '1';
      return;
    }

    panel.style.transitionProperty = 'none';
    panel.style.transform = `translate(${origin.left - target.left}px, ${origin.top - target.top}px) scale(${origin.width / target.width}, ${origin.height / target.height})`;
    panel.style.opacity = '0.85';
    overlay.style.opacity = '0';
    void panel.offsetWidth;

    const frame = requestAnimationFrame(() => {
      panel.style.transitionProperty = 'transform, opacity';
      void panel.offsetWidth;
      panel.style.transform = 'translate(0, 0) scale(1, 1)';
      panel.style.opacity = '1';
      overlay.style.opacity = '1';
    });

    return () => cancelAnimationFrame(frame);
  }, [origin]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const src = study.image;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[1000] grid place-items-center bg-[#000000]/60 p-2 backdrop-blur-sm transition-opacity duration-300 sm:p-4 md:p-8 motion-reduce:transition-none"
      style={{ opacity: 0, transitionProperty: 'opacity' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={study.title}
        data-lenis-prevent
        className="relative max-h-[calc(100dvh-1rem)] w-full max-w-5xl origin-top-left overflow-y-auto overscroll-contain bg-[#f4f4f6] text-[#000000] shadow-2xl transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none sm:max-h-[calc(100dvh-2rem)] md:max-h-[calc(100dvh-4rem)]"
        style={{ transformOrigin: 'top left' }}
      >
        <div className="sticky top-0 z-10 h-0">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close case study details"
            className="absolute right-2 top-2 grid size-9 cursor-pointer place-items-center border border-[#000000]/20 bg-[#f4f4f6] transition-colors hover:bg-[#000000] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#000000] sm:right-3 sm:top-3 sm:size-10 md:right-5 md:top-5"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {src && (
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#e4e4e9] sm:aspect-[16/7]">
            <StudyImage study={study} />
          </div>
        )}

        <div className="p-4 sm:p-6 md:p-10">
          <header className="border-b border-[#000000]/10 pb-7">
            <p className="text-sm text-[#737691]">
              {study.category}
              {study.createdAt && `, ${new Date(study.createdAt).getFullYear()}`}
            </p>
            <h3 className="mt-3 max-w-3xl break-words text-2xl leading-tight font-normal tracking-[-0.04em] sm:text-3xl md:text-4xl">
              {study.title}
            </h3>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-[#555870] md:text-base md:leading-8">
              {study.executiveSummary}
            </p>
          </header>

          <div className="flex flex-col gap-8 py-6 sm:gap-10 sm:py-8">
            <section aria-label="Technical challenges">
              <h4 className="text-sm font-semibold">Technical challenges</h4>
              <ul className="mt-5 space-y-5">
                {study.technicalChallenges.map((c) => (
                  <li key={c.challenge} className="border-l border-[#000000]/20 pl-4">
                    <h5 className="text-sm font-semibold">{c.challenge}</h5>
                    <p className="mt-2 text-sm leading-6 text-[#555870]">{c.details}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="Architectural solution">
              <h4 className="text-sm font-semibold">Architectural solution</h4>
              <p className="mt-5 text-sm leading-6 text-[#555870]">
                {study.architecturalSolution.overview}
              </p>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {study.architecturalSolution.unforgeableSignals.map((s) => (
                  <li key={s.signal} className="border border-[#000000]/10 bg-white/70 p-4">
                    <h5 className="font-mono text-xs font-semibold">{s.signal}</h5>
                    <p className="mt-3 text-xs leading-5 text-[#555870]">
                      <span className="font-semibold text-[#000000]">Physical device: </span>
                      {s.genuineMobile}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[#555870]">
                      <span className="font-semibold text-[#000000]">Desktop emulation: </span>
                      {s.desktopEmulation}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="flex flex-col gap-8 border-t border-[#000000]/10 pt-8  lg:gap-10">
            <section aria-label="Results">
              <h4 className="text-sm font-semibold">Results</h4>
              <ul className="mt-4 space-y-3">
                {study.results.map((r) => (
                  <li key={r} className="flex gap-3 text-sm leading-6 text-[#555870]">
                    <span aria-hidden="true" className="text-[#737691]">
                      ↗
                    </span>
                    {r}
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="Implementation snippet">
              <h4 className="text-sm font-semibold">Implementation snippet</h4>
              <pre className="mt-4 max-h-72 overflow-auto border border-[#000000]/10 bg-white/70 p-3 text-[11px] leading-5 text-[#555870] sm:max-h-96 sm:p-4 sm:text-xs">
                <code>{study.implementationSnippet}</code>
              </pre>
            </section>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* -------------------------------------------------------------------------- */
/*  Section                                                                    */
/* -------------------------------------------------------------------------- */

const navBtn =
  'pointer-events-auto grid size-10 place-items-center border border-white/40 text-white transition-colors hover:bg-white hover:text-[#111114] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40';

export function CaseStudiesCarousel({ isActive }: { isActive: boolean }) {
  const caseStudies = usePortfolioStore((state) => state.caseStudies);
  const total = caseStudies.length;

  const [activeIndex, setActiveIndex] = useState(0);
  const [anim, setAnim] = useState<Animation | null>(null);
  const [detailsOrigin, setDetailsOrigin] = useState<Rect | null>(null);
  const [leftHovered, setLeftHovered] = useState(false);
  /** true once the section is 50% in view: layout builds, images slide in, text types. */
  const [played, setPlayed] = useState(false);
  /** true once the whole intro has finished; unlocks navigation and autoplay. */
  const [revealed, setRevealed] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const mainImgRef = useRef<HTMLDivElement>(null);
  const mainInnerRef = useRef<HTMLDivElement>(null);
  const infoLayerRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const previewImgRef = useRef<HTMLDivElement>(null);
  const previewInnerRef = useRef<HTMLDivElement>(null);
  const detailsBtnRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // intro targets
  const textRevealRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const nextTitleRef = useRef<HTMLHeadingElement>(null);
  const blurbRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);
  /** Navigation and "view details" are ignored until the intro has finished. */
  const revealDoneRef = useRef(false);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (autoplayTimer.current) clearTimeout(autoplayTimer.current);
    },
    [],
  );

  /* ------------------------------------------------------------------------ */
  /*  Intro, played once when 50% of the section is in view. Everything runs   */
  /*  at the same time:                                                        */
  /*   - layout:  frames wipe/fade in, staggered                               */
  /*   - images:  slide in inside their frames (main from left, preview right) */
  /*   - text:    typed in (see <Typed />, driven by `played`)                 */
  /* ------------------------------------------------------------------------ */
  const hasStudies = total > 0;

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || !hasStudies) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      revealDoneRef.current = true;
      setPlayed(true);
      setRevealed(true);
      return;
    }

    const ctx = gsap.context(() => {
      // starting state
      gsap.set(mainImgRef.current, { clipPath: 'inset(0 100% 0 0)' });
      gsap.set(previewImgRef.current, { clipPath: 'inset(0 0 0 100%)' });
      gsap.set(mainInnerRef.current, { xPercent: -100 });
      gsap.set(previewInnerRef.current, { xPercent: 100 });
      gsap.set(
        [
          textRevealRef.current,
          actionsRef.current,
          nextTitleRef.current,
          blurbRef.current,
          ctaRef.current,
        ],
        { autoAlpha: 0, y: 24 },
      );

      const tl = gsap.timeline({ paused: true });

      // layout: frames build
      tl.to(
        mainImgRef.current,
        { clipPath: 'inset(0 0% 0 0)', duration: 0.8, ease: 'power3.inOut', clearProps: 'clipPath' },
        0,
      );
      tl.to(
        previewImgRef.current,
        { clipPath: 'inset(0 0 0 0%)', duration: 0.8, ease: 'power3.inOut', clearProps: 'clipPath' },
        0.15,
      );
      tl.to(
        [textRevealRef.current, actionsRef.current],
        { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.1, clearProps: 'transform' },
        0.1,
      );
      tl.to(
        [nextTitleRef.current, blurbRef.current, ctaRef.current],
        { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.1, clearProps: 'transform' },
        0.2,
      );

      // images slide in inside their frames
      tl.to(
        mainInnerRef.current,
        { xPercent: 0, duration: 1, ease: 'power3.out', clearProps: 'transform' },
        0.2,
      );
      tl.to(
        previewInnerRef.current,
        { xPercent: 0, duration: 1, ease: 'power3.out', clearProps: 'transform' },
        0.35,
      );

      // unlock navigation once the typing has finished
      tl.call(
        () => {
          revealDoneRef.current = true;
          setRevealed(true);
        },
        [],
        INTRO_LENGTH,
      );

      const observer = new IntersectionObserver(
        ([entry]) => {
          // 50% of the section, but never demand more than half the viewport (tall sections).
          const needed = Math.min(entry.boundingClientRect.height * 0.5, window.innerHeight * 0.5);
          if (entry.isIntersecting && entry.intersectionRect.height >= needed - 1) {
            observer.disconnect();
            setPlayed(true);
            tl.play();
          }
        },
        { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
      );
      observer.observe(section);
      return () => observer.disconnect();
    }, section);

    return () => ctx.revert();
  }, [hasStudies]);

  useEffect(() => {
    const section = sectionRef.current;
    const image = mainImgRef.current;
    const info = infoLayerRef.current;
    const heading = headingRef.current;
    const rightColumn = rightColumnRef.current;
    const finePointer = window.matchMedia(
      '(min-width: 768px) and (hover: hover) and (pointer: fine)',
    );
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (
      !section ||
      !image ||
      !info ||
      !heading ||
      !rightColumn ||
      reduceMotion ||
      !finePointer.matches
    ) {
      return;
    }

    const parallaxTargets = [
      { element: heading, x: -5, y: -4, duration: 0.65 },
      { element: image, x: 16, y: 12, duration: 0.5 },
      { element: info, x: -10, y: -8, duration: 0.6 },
      { element: rightColumn, x: 13, y: -10, duration: 0.65 },
    ].map(({ element, x, y, duration }) => ({
      element,
      x,
      y,
      moveX: gsap.quickTo(element, 'x', { duration, ease: 'power3' }),
      moveY: gsap.quickTo(element, 'y', { duration, ease: 'power3' }),
    }));
    const resetParallax = () => {
      parallaxTargets.forEach((target) => {
        target.moveX(0);
        target.moveY(0);
      });
    };

    let cachedBounds: DOMRect | null = section.getBoundingClientRect();
    const updateBounds = () => {
      cachedBounds = section.getBoundingClientRect();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || detailsOrigin) return;

      const bounds = cachedBounds ?? section.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      ) {
        resetParallax();
        return;
      }

      const x = (event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5;
      const y = (event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5;
      parallaxTargets.forEach((target) => {
        target.moveX(x * target.x);
        target.moveY(y * target.y);
      });
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', updateBounds, { passive: true });
    window.addEventListener('resize', updateBounds, { passive: true });
    section.addEventListener('pointerleave', resetParallax);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', updateBounds);
      window.removeEventListener('resize', updateBounds);
      section.removeEventListener('pointerleave', resetParallax);
      gsap.killTweensOf(parallaxTargets.map((target) => target.element));
    };
  }, [detailsOrigin]);

  const safeTotal = Math.max(total, 1);
  const nextIndex = (activeIndex + 1) % safeTotal;
  const prevIndex = (activeIndex - 1 + safeTotal) % safeTotal;
  const afterNextIndex = (activeIndex + 2) % safeTotal;

  const measure = useCallback(() => {
    const stage = stageRef.current;
    const main = mainImgRef.current;
    const preview = previewImgRef.current;
    if (!stage || !main || !preview || preview.offsetWidth === 0) return null; // mobile: no preview slot
    const s = stage.getBoundingClientRect();
    const rel = (el: HTMLElement): Rect => {
      const r = el.getBoundingClientRect();
      return { left: r.left - s.left, top: r.top - s.top, width: r.width, height: r.height };
    };
    return { main: rel(main), preview: rel(preview) };
  }, []);

  const go = useCallback(
    (dir: 'next' | 'prev') => {
      if (anim || total < 2 || !revealDoneRef.current) return;
      const target = dir === 'next' ? nextIndex : prevIndex;
      const rects = measure();
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!rects || reduce) {
        setActiveIndex(target);
        return;
      }
      setAnim({ dir, ...rects });
      timer.current = setTimeout(() => {
        setActiveIndex(target);
        setAnim(null);
      }, DURATION + 40);
    },
    [anim, total, nextIndex, prevIndex, measure],
  );

  useEffect(() => {
    if (total < 2 || !revealed || leftHovered || detailsOrigin || anim) {
      return;
    }

    autoplayTimer.current = setTimeout(() => go('next'), 5000);
    return () => {
      if (autoplayTimer.current) clearTimeout(autoplayTimer.current);
    };
  }, [anim, detailsOrigin, go, leftHovered, revealed, total]);

  const closeDetails = useCallback(() => {
    setDetailsOrigin(null);
    detailsBtnRef.current?.focus();
  }, []);

  const study = caseStudies[activeIndex];
  const upNext = caseStudies[nextIndex];
  const busy = anim !== null;

  return (
    <section
      ref={sectionRef}
      id="section-4"
      data-section="section-4"
      aria-label="Case studies"
      className="pointer-events-none relative isolate w-full overflow-hidden text-[#f4f4f6]"
    >
      <IntroContext.Provider value={{ played, instant: revealed }}>
        <div className="relative mx-auto flex w-full max-w-[1200px] flex-col px-4 py-8 sm:px-6 md:px-10 lg:px-12 lg:py-16">
          <style>{`
            @keyframes cs-rise { from { opacity: 0; transform: translateX(28px) } to { opacity: 1; transform: none } }
            @keyframes cs-push-out { from { transform: translateX(0) } to { transform: translateX(-100%) } }
            @keyframes cs-push-in { from { transform: translateX(100%) } to { transform: translateX(0) } }
            @media (prefers-reduced-motion: reduce) {
              [data-cs-anim] { animation: none !important; }
            }
          `}</style>

          <div
            ref={headingRef}
            className="relative z-10 mb-5 flex items-center justify-between font-mono text-[10px] tracking-[0.28em] text-[#b8bac8] uppercase"
          >
            <span className="text-xs uppercase tracking-[0.2em] sm:text-sm text-white mb-8">
              <Typed text="Case studies" delay={200} />
            </span>
          </div>

          {study ? (
            <div
              ref={stageRef}
              className="relative z-10 grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[4fr_1fr] lg:gap-12"
            >
              {/* ============================ LEFT 80% ============================ */}
              <div
                className="pointer-events-auto relative grid content-start gap-4 sm:gap-6 lg:grid-cols-[1fr_1fr] lg:gap-10"
                onPointerEnter={() => setLeftHovered(true)}
                onPointerLeave={() => setLeftHovered(false)}
              >
                {/* Image */}
                <div
                  ref={mainImgRef}
                  className="relative aspect-[4/3] overflow-hidden bg-[#e4e4e9] sm:aspect-[16/10] lg:aspect-square rounded-3xl"
                  style={{
                    opacity: anim?.dir === 'prev' ? 0 : 1,
                    transition: `opacity ${DURATION * 0.4}ms ${EASE}`,
                  }}
                >
                  {/* Current image slides out to the left... */}
                  <div
                    ref={mainInnerRef}
                    className="absolute inset-0"
                    style={{
                      animation:
                        anim?.dir === 'next'
                          ? `cs-push-out ${DURATION}ms ${EASE} both`
                          : undefined,
                    }}
                  >
                    <StudyImage study={study} />
                  </div>
                  {/* ...while the next image slides in from the right, pushing it out. */}
                  {anim?.dir === 'next' && caseStudies[nextIndex] && (
                    <div
                      key={`main-in-${nextIndex}`}
                      aria-hidden="true"
                      className="absolute inset-0"
                      style={{ animation: `cs-push-in ${DURATION}ms ${EASE} both` }}
                    >
                      <StudyImage study={caseStudies[nextIndex]} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div ref={infoLayerRef} className="flex flex-col justify-start gap-8">
                  {/* The wrapper takes the intro so the keyed block inside can keep its own CSS animation. */}
                  <div ref={textRevealRef}>
                    <div
                      key={`info-${activeIndex}`}
                      data-cs-anim
                      aria-live={revealed ? 'polite' : 'off'}
                      style={{
                        opacity: busy ? 0 : 1,
                        transition: busy ? 'opacity 250ms ease-in' : undefined,
                        animation: busy ? undefined : 'cs-rise 350ms cubic-bezier(0.22, 1, 0.36, 1) both',
                      }}
                    >
                      <p className="text-sm text-[#b8bac8] uppercase tracking-[0.2em]">
                        <Typed text={study.category} delay={350} />
                      </p>
                      <h2 className="mt-3 text-lg leading-[1.5] font-normal tracking-[0.045em] sm:mt-5 sm:text-xl xl:text-2xl">
                        <Typed text={study.title} delay={450} />
                      </h2>
                      <p className="mt-3 line-clamp-7 text-justify text-sm leading-[1.8] font-normal tracking-[0.03em] sm:mt-5 sm:text-sm sm:tracking-[0.085em] xl:text-md">
                        <Typed text={study.executiveSummary} delay={650} />
                      </p>
                    </div>
                  </div>

                  <div
                    ref={actionsRef}
                    className="group flex flex-wrap items-center justify-between gap-2"
                  >
                    <button
                      ref={detailsBtnRef}
                      type="button"
                      onClick={(event) => {
                        if (!revealDoneRef.current) return;
                        const rect = event.currentTarget.getBoundingClientRect();
                        setDetailsOrigin({
                          left: rect.left,
                          top: rect.top,
                          width: rect.width,
                          height: rect.height,
                        });
                      }}
                      disabled={busy}
                      aria-haspopup="dialog"
                      className="pointer-events-auto flex min-h-11 cursor-pointer items-stretch border border-white/60 text-xs text-white transition-all hover:bg-white hover:text-[#111114] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60 sm:text-sm"
                    >
                      <span className="px-3 py-3 sm:px-4">
                        <Typed text="View details" delay={900} />
                      </span>
                      <span
                        aria-hidden="true"
                        className="m-[3px] grid w-9 place-items-center text-current group-hover:translate-x-1 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="24px" width="24px" fill="currentColor"><path d="M12.6,12L8,7.4L9.4,6l6,6l-6,6L8,16.6L12.6,12Z"/></svg>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => go('next')}
                      disabled={total < 2 || busy}
                      aria-label={`Show next case study: ${upNext?.title ?? ''}`}
                      className={`${navBtn} cursor-pointer`}
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" height="24" width="24" fill="currentColor">
                        <path d="M12.6,12L8,7.4L9.4,6l6,6l-6,6L8,16.6L12.6,12Z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* ============================ RIGHT 20% =========================== */}
              <div ref={rightColumnRef} className="flex flex-col gap-4 sm:gap-6">
                {/* Top 70%: next study preview.
                    No key / fade animation here, so it doesn't blink after the slide-in. */}
                <div
                  aria-hidden={total < 2 ? true : undefined}
                  className="relative hidden flex-col overflow-hidden bg-[#e4e4e9] lg:flex lg:overflow-visible lg:bg-transparent"
                  style={{
                    visibility: total < 2 ? 'hidden' : 'visible',
                    opacity: busy && anim?.dir === 'prev' ? 0 : 1,
                    transition: busy && anim?.dir === 'prev' ? 'opacity 200ms ease-in' : undefined,
                  }}
                >
                  <h3
                    ref={nextTitleRef}
                    className="relative z-10 mb-2 hidden line-clamp-3 text-xs leading-snug font-light tracking-widest text-[#b8bac8] lg:block"
                  >
                    {upNext && <Typed text={upNext.title} delay={600} />}
                  </h3>
                  <div ref={previewImgRef} className="relative aspect-square w-full overflow-hidden">
                    {/* Current preview slides out to the left during the first half */}
                    <div
                      ref={previewInnerRef}
                      className="absolute inset-0"
                      style={{
                        animation:
                          anim?.dir === 'next'
                            ? `cs-push-out ${DURATION / 2}ms ${EASE} both`
                            : undefined,
                      }}
                    >
                      {upNext && <StudyImage study={upNext} />}
                    </div>
                    {/* The following preview slides in from the right after the delay */}
                    {anim?.dir === 'next' && caseStudies[afterNextIndex] && (
                      <div
                        key={`preview-in-${afterNextIndex}`}
                        aria-hidden="true"
                        className="absolute inset-0"
                        style={{
                          animation: `cs-push-in ${DURATION / 2}ms ${EASE} ${DURATION / 2}ms both`,
                        }}
                      >
                        <StudyImage study={caseStudies[afterNextIndex]} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom 30%: blurb + CTA */}
                <div className="flex flex-col items-start gap-4">
                  <p
                    ref={blurbRef}
                    className="max-w-prose text-xs leading-relaxed sm:text-sm lg:text-left"
                  >
                    <Typed
                      text="Case studies are based on projects with critical technical and analytical requirements."
                      delay={800}
                    />
                  </p>
                  <Link
                    ref={ctaRef}
                    href="/case-studies"
                    className="pointer-events-auto inline-flex min-h-11 shrink-0 items-center border border-white/60 px-3 py-2 text-xs text-white transition-colors hover:bg-white hover:text-[#111114] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-4 sm:text-sm"
                  >
                    <Typed text="View all case studies" delay={1000} />
                  </Link>
                </div>
              </div>

              {/* ======================== TRANSITION LAYERS ======================= */}
              {anim?.dir === 'prev' && (
                <>
                  {/* Current image shrinks into the "next" slot */}
                  <FlyingImage
                    key={`out-${activeIndex}`}
                    study={study}
                    from={anim.main}
                    to={anim.preview}
                  />
                  {/* Previous image slides in from the left */}
                  <FlyingImage
                    key={`in-${prevIndex}`}
                    study={caseStudies[prevIndex]}
                    from={{ ...anim.main, left: anim.main.left - anim.main.width * 0.12 }}
                    to={anim.main}
                    fromOpacity={0}
                  />
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#d0d1dc]">No case studies are available yet.</p>
          )}
        </div>
      </IntroContext.Provider>

      {detailsOrigin && study && (
        <DetailsModal study={study} origin={detailsOrigin} onClose={closeDetails} />
      )}
    </section>
  );
}