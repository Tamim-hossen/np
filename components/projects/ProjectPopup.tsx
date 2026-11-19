'use client';

import Link from 'next/link';
import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import { useLenis } from 'lenis/react';
import type { Project } from '@/data/projects';
import {ChevronRight, ChevronLeft} from 'lucide-react'; 

export type PopupOrigin = {
  /** The preview image's screen position when the dialog was opened. */
  rect: DOMRect;
};

type Props = {
  items: Project[];
  startIndex: number;
  origin: PopupOrigin;
  onStart?: () => void;
  onIndexChange?: (index: number) => void;
  onClosed: () => void;
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function ProjectPopup({
  items,
  startIndex,
  origin,
  onStart,
  onIndexChange,
  onClosed,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLElement>(null);
  const descriptionRef = useRef<HTMLElement>(null);
  const detailsBodyRef = useRef<HTMLDivElement>(null);
  const descBodyRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const closingRef = useRef(false);
  const busyRef = useRef(false);
  const currentRef = useRef(startIndex);
  const shownRef = useRef(startIndex);
  const dirRef = useRef<1 | -1>(1);
  const onStartRef = useRef(onStart);
  const onClosedRef = useRef(onClosed);
  const onIndexChangeRef = useRef(onIndexChange);

  /** `target` updates instantly (counter-independent UI like the arrows); `index` drives the text, which swaps mid-transition. */
  const [target, setTarget] = useState(startIndex);
  const [index, setIndex] = useState(startIndex);
  const lenis = useLenis();
  const project = items[index];

  useLayoutEffect(() => {
    onStartRef.current = onStart;
    onClosedRef.current = onClosed;
    onIndexChangeRef.current = onIndexChange;
  }, [onStart, onClosed, onIndexChange]);

  /**
   * Opening: the popup panel is revealed with a clip-path that starts as the exact rectangle of the
   * preview image and grows to the full panel, so it reads as the image container itself getting bigger.
   * At the same time the image column travels from the preview's position into the left column.
   * The image is scaled uniformly (cover-style), so it never stretches.
   */
  useLayoutEffect(() => {
    const root = rootRef.current;
    const panel = panelRef.current;
    const image = imageRef.current;
    const backdrop = backdropRef.current;
    const details = detailsRef.current;
    const description = descriptionRef.current;
    const closeButton = closeButtonRef.current;

    if (!root || !panel || !image || !backdrop || !details || !description || !closeButton) {
      return;
    }

    const reduceMotion = prefersReducedMotion();
    const start = origin.rect;
    const panelRect = panel.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();

    const wide = window.innerWidth >= 640;
    const startRadius = wide ? 40 : 32; // matches the preview's rounded corners
    const endRadius = wide ? 16 : 12; // matches the panel's rounded corners
    const inset = (t: number, r: number, b: number, l: number, radius: number) =>
      `inset(${t}px ${r}px ${b}px ${l}px round ${radius}px)`;

    const clipFrom = inset(
      start.top - panelRect.top,
      panelRect.right - start.right,
      panelRect.bottom - start.bottom,
      start.left - panelRect.left,
      startRadius,
    );
    const clipTo = inset(0, 0, 0, 0, endRadius);

    const scale =
      Math.max(
        start.width > 0 && imageRect.width > 0 ? start.width / imageRect.width : 1,
        start.height > 0 && imageRect.height > 0 ? start.height / imageRect.height : 1,
      ) || 1;
    const dx = start.left + start.width / 2 - (imageRect.left + imageRect.width / 2);
    const dy = start.top + start.height / 2 - (imageRect.top + imageRect.height / 2);

    slideRefs.current.forEach((slide, i) => {
      if (!slide) return;
      gsap.set(slide, { xPercent: 0, autoAlpha: i === startIndex ? 1 : 0, zIndex: i === startIndex ? 2 : 0 });
    });

    gsap.set(root, { autoAlpha: 1 });
    gsap.set(backdrop, { autoAlpha: 0 });
    gsap.set(panel, { autoAlpha: 1, clipPath: clipFrom });
    gsap.set(image, { transformOrigin: '50% 50%', x: dx, y: dy, scale, force3D: true });
    gsap.set([details, description, closeButton], { autoAlpha: 0, y: 18 });

    onStartRef.current?.();
    closeButton.focus({ preventScroll: true });

    const duration = reduceMotion ? 0.01 : 0.95;
    const timeline = gsap.timeline({
      onComplete: () => closeButton.focus({ preventScroll: true }),
    });

    timeline
      .to(backdrop, { autoAlpha: 1, duration: reduceMotion ? 0.01 : 0.45, ease: 'power2.out' }, 0)
      .to(panel, { clipPath: clipTo, duration, ease: 'power3.inOut' }, 0)
      .to(image, { x: 0, y: 0, scale: 1, duration, ease: 'power3.inOut', force3D: true }, 0)
      .to(
        [details, description],
        {
          autoAlpha: 1,
          y: 0,
          duration: reduceMotion ? 0.01 : 0.5,
          stagger: 0.08,
          ease: 'power3.out',
        },
        reduceMotion ? 0 : 0.4,
      )
      .to(
        closeButton,
        { autoAlpha: 1, y: 0, duration: reduceMotion ? 0.01 : 0.3, ease: 'power2.out' },
        reduceMotion ? 0 : 0.5,
      );

    timelineRef.current = timeline;

    return () => {
      timeline.kill();
      timelineRef.current = null;
      gsap.set([panel, image, backdrop, details, description, closeButton], { clearProps: 'all' });
    };
  }, [origin, startIndex]);

  /** Lock page scroll while the dialog is open. */
  useLayoutEffect(() => {
    const html = document.documentElement;
    const overflow = html.style.getPropertyValue('overflow');
    const overflowPriority = html.style.getPropertyPriority('overflow');
    const paddingRight = html.style.paddingRight;
    const scrollbar = window.innerWidth - html.clientWidth;

    lenis?.stop();
    html.style.setProperty('overflow', 'hidden', 'important');
    if (scrollbar > 0) html.style.paddingRight = `${scrollbar}px`;

    return () => {
      if (overflow) html.style.setProperty('overflow', overflow, overflowPriority);
      else html.style.removeProperty('overflow');
      html.style.paddingRight = paddingRight;
      lenis?.start();
    };
  }, [lenis]);

  /** After the text has been swapped, bring the new content in from the direction of travel. */
  useLayoutEffect(() => {
    if (shownRef.current === index) return;
    shownRef.current = index;

    const bodies = [detailsBodyRef.current, descBodyRef.current].filter(Boolean) as HTMLElement[];
    if (descriptionRef.current) descriptionRef.current.scrollTop = 0;

    gsap.fromTo(
      bodies,
      { autoAlpha: 0, x: 28 * dirRef.current },
      {
        autoAlpha: 1,
        x: 0,
        duration: prefersReducedMotion() ? 0.01 : 0.45,
        ease: 'power3.out',
        stagger: 0.06,
        overwrite: true,
      },
    );
  }, [index]);

  /** Snap any in-flight slide/text transition to its end state. */
  const settle = useCallback(() => {
    const bodies = [detailsBodyRef.current, descBodyRef.current].filter(Boolean) as HTMLElement[];
    slideRefs.current.forEach((slide, i) => {
      if (!slide) return;
      gsap.killTweensOf(slide);
      gsap.set(slide, {
        xPercent: 0,
        autoAlpha: i === currentRef.current ? 1 : 0,
        zIndex: i === currentRef.current ? 2 : 0,
      });
    });
    gsap.killTweensOf(bodies);
    gsap.set(bodies, { autoAlpha: 1, x: 0 });
    busyRef.current = false;
    shownRef.current = currentRef.current;
    setIndex(currentRef.current);
    setTarget(currentRef.current);
  }, []);

  const closeDialog = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;

    if (busyRef.current) settle();

    const timeline = timelineRef.current;
    if (!timeline) {
      onClosedRef.current();
      return;
    }

    timeline.eventCallback('onReverseComplete', () => onClosedRef.current());
    timeline.reverse();
  }, [settle]);

  /**
   * Next: the new image slides in from the right while the current one leaves to the left.
   * Previous: the new image slides in from the left while the current one leaves to the right.
   * The text fades out in the direction of travel, swaps, then fades back in.
   */
  const changeProject = useCallback(
    (next: number) => {
      if (
        closingRef.current ||
        busyRef.current ||
        next < 0 ||
        next >= items.length ||
        next === currentRef.current
      ) {
        return;
      }

      const previous = currentRef.current;
      const dir: 1 | -1 = next > previous ? 1 : -1;
      const reduce = prefersReducedMotion();
      const duration = reduce ? 0.01 : 0.8;
      const incoming = slideRefs.current[next];
      const outgoing = slideRefs.current[previous];
      const bodies = [detailsBodyRef.current, descBodyRef.current].filter(Boolean) as HTMLElement[];

      dirRef.current = dir;
      currentRef.current = next;
      busyRef.current = true;
      setTarget(next);
      onIndexChangeRef.current?.(next);

      if (incoming && outgoing) {
        gsap.set(incoming, { autoAlpha: 1, xPercent: 100 * dir, zIndex: 3 });
        gsap.set(outgoing, { zIndex: 2 });
        gsap
          .timeline({
            defaults: { duration, ease: 'power3.inOut' },
            onComplete: () => {
              gsap.set(outgoing, { autoAlpha: 0, xPercent: 0, zIndex: 0 });
              gsap.set(incoming, { zIndex: 2 });
              busyRef.current = false;
            },
          })
          .to(incoming, { xPercent: 0 }, 0)
          .to(outgoing, { xPercent: -100 * dir }, 0);
      } else {
        busyRef.current = false;
      }

      gsap.killTweensOf(bodies);
      gsap.to(bodies, {
        autoAlpha: 0,
        x: -28 * dir,
        duration: reduce ? 0.01 : 0.25,
        ease: 'power2.in',
        onComplete: () => setIndex(next),
      });
    },
    [items.length],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDialog();
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      changeProject(currentRef.current + (event.key === 'ArrowRight' ? 1 : -1));
      return;
    }

    if (event.key !== 'Tab') return;

    const root = rootRef.current;
    if (!root) return;

    const focusable = Array.from(
      root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]'),
    ).filter((element) => element.tabIndex >= 0);

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!project) return null;

  const href = project.link || `/projects#${project.id}`;
  const hasExternalLink = Boolean(project.link);

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-popup-title"
      aria-describedby="project-popup-description"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-[200] flex items-center justify-center p-2 outline-none sm:p-4 lg:p-6"
      style={{ visibility: 'hidden', color: '#000000' }}
    >
      <div
        ref={backdropRef}
        onClick={closeDialog}
        aria-hidden="true"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <button
        ref={closeButtonRef}
        type="button"
        onClick={closeDialog}
        aria-label="Close project details"
        className="absolute cursor-pointer right-4 top-4 z-30 grid h-10 w-10 place-items-center rounded-full bg-[#eceefb] text-black opacity-0 shadow-lg transition-transform hover:rotate-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-6 sm:top-6 sm:h-11 sm:w-11"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="m2 2 10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <div
        ref={panelRef}
        className="
          relative z-10 grid h-[calc(100dvh-1rem)] max-h-[58rem] w-full max-w-[96rem]
          grid-cols-1 grid-rows-[minmax(9rem,27dvh)_auto_minmax(0,1fr)]
          overflow-hidden rounded-xl bg-[#eceefb]
          shadow-[0_30px_100px_rgba(0,0,0,0.35)]
          sm:h-[calc(100dvh-2rem)] sm:rounded-2xl
          md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]
          md:grid-rows-[minmax(0,auto)_minmax(0,1fr)]
          lg:h-[min(84dvh,54rem)]
          lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.85fr)_minmax(18rem,1fr)]
          lg:grid-rows-1
        "
      >
        {/* Section 1: image stack. Slides move horizontally when browsing. */}
        <div
          ref={imageRef}
          className="
            relative col-start-1 row-start-1 min-h-0 overflow-hidden bg-[#101014]
            md:row-span-2
            lg:row-span-1
          "
        >
          {items.map((item, i) => (
            <div
              key={item.id}
              ref={(element) => {
                slideRefs.current[i] = element;
              }}
              aria-hidden={i !== target}
              className="absolute inset-0 overflow-hidden"
              style={i === startIndex ? undefined : { visibility: 'hidden' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt={i === target ? `${item.title} project preview` : ''}
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          ))}
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/25 via-transparent to-black/10" />
        </div>

        {/* Section 2: title, technologies, live link, and project navigation. */}
        <section
          ref={detailsRef}
          className="
            col-start-1 row-start-2 flex min-h-0 flex-col items-start
            border-b border-black/10 px-5 py-5
            sm:px-7 sm:py-6
            md:col-start-2 md:row-start-1 md:px-6 md:py-7
            lg:col-start-2 lg:row-start-1 lg:border-b-0 lg:border-r
            lg:px-7 lg:py-9 xl:px-9
          "
        >
          <div ref={detailsBodyRef} className="w-full">
            <p className="font-mono text-[10px] tracking-[0.24em] text-black/50">
              PROJECT {String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
            </p>

            <h2
              id="project-popup-title"
              className="mt-3 max-w-full break-words text-2xl font-medium leading-tight tracking-[-0.04em] sm:mt-4 sm:text-3xl xl:text-4xl"
            >
              {project.title}
            </h2>

            <div className="mt-5 w-full sm:mt-7">
              <h3 className="mb-3 font-mono text-[10px] tracking-[0.2em] text-black/50">TECHNOLOGIES</h3>
              <ul className="flex flex-wrap gap-2">
                {project.techStack.map((technology) => (
                  <li
                    key={technology}
                    className="rounded-full border border-black/15 px-3 py-1.5 text-xs text-black/75"
                  >
                    {technology}
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href={href}
              target={hasExternalLink ? '_blank' : undefined}
              rel={hasExternalLink ? 'noopener noreferrer' : undefined}
              className="cursor-pointer group mt-5 inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-black/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black sm:mt-7"
            >
              {hasExternalLink ? 'Visit live site' : 'View project'}
              <span aria-hidden="true" className='group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all  '>↗</span>
            </Link>
          </div>

          <div className="mt-auto flex w-full items-center justify-between gap-4 pt-5 sm:pt-7">
            <span className="font-mono text-[10px] tracking-[0.14em] text-black/45">BROWSE PROJECTS</span>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => changeProject(currentRef.current - 1)}
                disabled={target === 0}
                aria-label="Previous project"
                className="cursor-pointer grid h-9 w-9 place-items-center rounded-full border border-black/20 text-lg transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-black sm:h-10 sm:w-10"
              >
                <ChevronLeft/>
              </button>
              <button
                type="button"
                onClick={() => changeProject(currentRef.current + 1)}
                disabled={target === items.length - 1}
                aria-label="Next project"
                className="cursor-pointer grid h-9 w-9 place-items-center rounded-full border border-black/20 text-lg transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-black sm:h-10 sm:w-10"
              >
                <ChevronRight/>
              </button>
            </div>
          </div>
        </section>

        {/* Section 3: description with its own scroll area. */}
        <section
          ref={descriptionRef}
          data-lenis-prevent
          className="
            col-start-1 row-start-3 min-h-0 overflow-y-auto overscroll-contain
            px-5 py-5 [scrollbar-width:thin]
            sm:px-7 sm:py-6
            md:col-start-2 md:row-start-2 md:border-t md:border-black/10 md:px-6 md:py-7
            lg:col-start-3 lg:row-start-1 lg:border-t-0
            lg:px-7 lg:py-9 xl:px-9
          "
        >
          <div ref={descBodyRef}>
            <h3 className="font-mono text-[10px] tracking-[0.24em] text-black/50">ABOUT THIS PROJECT</h3>
            <p
              id="project-popup-description"
              className="mt-4 whitespace-pre-line text-sm leading-7 text-black/75 sm:mt-5 sm:text-base sm:leading-8"
            >
              {project.description || 'More details about this project will be added soon.'}
            </p>
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}