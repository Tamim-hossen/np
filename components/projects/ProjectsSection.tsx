'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Project } from '@/data/projects';
import { ProjectPopup, type PopupOrigin } from './ProjectPopup';
import { ProjectsSectionSkeleton } from '@/components/skeletons/ProjectsSectionSkeleton';

gsap.registerPlugin(ScrollTrigger);

const MAX_PROJECTS = 8;
/** Mouse-like devices only. Touch screens never get parallax, spotlight or the custom cursor. */
const FINE_POINTER = '(hover: hover) and (pointer: fine)';
/** The intro plays when the top of the list/image block reaches the viewport midpoint. */
const INTRO_START = 'top 50%';

export function ProjectsSection({ projects }: { projects: Project[] }) {
  const items = useMemo(() => projects.slice(0, MAX_PROJECTS), [projects]);
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const previewLayerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLButtonElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLSpanElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeRef = useRef(0);
  const shownRef = useRef(0);
  const zRef = useRef(1);
  const openRef = useRef(false);
  const cursorVisibleRef = useRef(false);
  const pointerRef = useRef<{ x: number; y: number; pointerType: string } | null>(null);
  const introRef = useRef<gsap.core.Timeline | null>(null);
  const introPlayedRef = useRef(false);
  const cursorTo = useRef<{ x: gsap.QuickToFunc; y: gsap.QuickToFunc } | null>(null);
  const previewBoundsRef = useRef<DOMRect | null>(null);
  const sectionBoundsRef = useRef<DOMRect | null>(null);

  const [active, setActive] = useState(0);
  const [popup, setPopup] = useState<{ index: number; origin: PopupOrigin } | null>(null);

  const showImage = useCallback((next: number, dir: 1 | -1) => {
    const slide = slideRefs.current[next];
    if (!slide || shownRef.current === next) return;

    zRef.current += 1;
    shownRef.current = next;
    const image = slide.firstElementChild as HTMLElement | null;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    gsap.set(slide, { zIndex: zRef.current, autoAlpha: 1 });
    gsap.fromTo(
      slide,
      { clipPath: dir > 0 ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)' },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: reduce ? 0 : 0.65,
        ease: 'power3.out',
        overwrite: true,
        onComplete: () => {
          if (shownRef.current !== next) return;
          slideRefs.current.forEach((element, index) => {
            if (element && index !== next) gsap.set(element, { autoAlpha: 0 });
          });
        },
      },
    );
    if (image) {
      gsap.fromTo(
        image,
        { scale: 1.12 },
        { scale: 1, duration: reduce ? 0 : 0.65, ease: 'power3.out', overwrite: true },
      );
    }
  }, []);

  /** Finish any image swap that is mid-flight, so the popup origin matches what is on screen. */
  const settleSlides = useCallback((index: number) => {
    slideRefs.current.forEach((slide, i) => {
      if (!slide) return;
      const image = slide.firstElementChild as HTMLElement | null;
      gsap.killTweensOf(image ? [slide, image] : slide);
      if (i === index) {
        gsap.set(slide, { autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)', zIndex: zRef.current });
        if (image) gsap.set(image, { scale: 1 });
      } else {
        gsap.set(slide, { autoAlpha: 0 });
      }
    });
    shownRef.current = index;
  }, []);

  const selectProject = useCallback(
    (index: number) => {
      if (index < 0 || index >= items.length || index === activeRef.current) return;
      const previous = activeRef.current;
      activeRef.current = index;
      setActive(index);
      showImage(index, index > previous ? 1 : -1);
    },
    [items.length, showImage],
  );

  const setCursorVisible = useCallback((visible: boolean) => {
    if (!cursorRef.current || cursorVisibleRef.current === visible) return;
    cursorVisibleRef.current = visible;
    gsap.to(cursorRef.current, {
      scale: visible ? 1 : 0,
      autoAlpha: visible ? 1 : 0,
      duration: visible ? 0.2 : 0.15,
      ease: 'power2.out',
    });
  }, []);

  const updateCursor = useCallback(() => {
    const preview = previewRef.current;
    const pointer = pointerRef.current;
    const position = cursorTo.current;
    if (
      !preview ||
      !pointer ||
      !position ||
      pointer.pointerType === 'touch' ||
      openRef.current ||
      !window.matchMedia(FINE_POINTER).matches
    ) {
      setCursorVisible(false);
      return;
    }

    const bounds = previewBoundsRef.current ?? preview.getBoundingClientRect();
    const inside =
      pointer.x >= bounds.left &&
      pointer.x <= bounds.right &&
      pointer.y >= bounds.top &&
      pointer.y <= bounds.bottom &&
      bounds.width > 0 &&
      bounds.height > 0;

    if (!inside) {
      setCursorVisible(false);
      return;
    }

    position.x(pointer.x - bounds.left);
    position.y(pointer.y - bounds.top);
    setCursorVisible(true);
  }, [setCursorVisible]);

  /**
   * The intro plays when the list/image block enters the viewport. Project selection
   * remains controlled by hover and focus, never by scroll position.
   */
  useLayoutEffect(() => {
    const content = contentRef.current;
    const list = listRef.current;
    const preview = previewRef.current;
    if (!content || !list || !preview || items.length === 0) return;

    const media = gsap.matchMedia();

    media.add(
      {
        full: '(prefers-reduced-motion: no-preference)',
        reduced: '(prefers-reduced-motion: reduce)',
      },
      (context) => {
        const reduced = Boolean(context.conditions?.reduced);
        const rows = gsap.utils.toArray<HTMLElement>('li', list).slice(1);
        const ghost = ghostRef.current;

        if (reduced || introPlayedRef.current) {
          gsap.set(rows, { autoAlpha: 1 });
          gsap.set(preview, { autoAlpha: 1, xPercent: 0 });
          if (ghost) gsap.set(ghost, { autoAlpha: 1 });
          return;
        }

        // On desktop the list is vertical: each title starts tucked under the one above and slides
        // into its slot. On mobile the list is a horizontal strip, so the offset is 0 and the rows
        // simply fade in.
        gsap.set(rows, {
          autoAlpha: 0,
          y: (index: number, element: HTMLElement) => {
            const above = (index === 0 ? list.firstElementChild : rows[index - 1]) as HTMLElement;
            return -(element.getBoundingClientRect().top - above.getBoundingClientRect().top);
          },
        });
        gsap.set(preview, { xPercent: -100, autoAlpha: 0 });
        if (ghost) gsap.set(ghost, { autoAlpha: 0 });

        const intro = gsap.timeline({ paused: true });
        introRef.current = intro;
        intro.to(rows, { y: 0, autoAlpha: 1, duration: 0.55, ease: 'power3.out', stagger: 0.04 }, 0);
        intro.to(preview, { autoAlpha: 1, duration: 0.15, ease: 'none' }, 0);
        intro.to(preview, { xPercent: 0, duration: 0.75, ease: 'power3.out' }, 0);
        if (ghost) intro.to(ghost, { autoAlpha: 1, duration: 0.6, ease: 'power2.out' }, 0.2);

        ScrollTrigger.create({
          trigger: content,
          start: INTRO_START,
          once: true,
          onEnter: () => {
            if (openRef.current || introPlayedRef.current) return;
            introPlayedRef.current = true;
            intro.timeScale(1).play();
          },
          // page reloaded mid-scroll: show the finished state straight away
          onRefresh: (self) => {
            if (self.progress > 0 && intro.progress() === 0 && !intro.isActive()) {
              introPlayedRef.current = true;
              intro.progress(1);
            }
          },
        });
      },
    );

    return () => {
      introRef.current = null;
      media.revert();
    };
  }, [items.length]);

  useEffect(() => {
    if (items.length === 0) return;

    activeRef.current = 0;
    shownRef.current = 0;
    slideRefs.current.forEach((slide, index) => {
      if (slide) {
        gsap.set(slide, {
          autoAlpha: index === 0 ? 1 : 0,
          clipPath: 'inset(0% 0% 0% 0%)',
          zIndex: index === 0 ? 1 : 0,
        });
      }
    });
    if (cursorRef.current) {
      gsap.set(cursorRef.current, { xPercent: -50, yPercent: -50, scale: 0, autoAlpha: 0 });
      cursorTo.current = {
        x: gsap.quickTo(cursorRef.current, 'x', { duration: 0.35, ease: 'power3' }),
        y: gsap.quickTo(cursorRef.current, 'y', { duration: 0.35, ease: 'power3' }),
      };
    }

    const section = sectionRef.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia(FINE_POINTER);
    const quickLayers: Array<{ x: gsap.QuickToFunc; y: gsap.QuickToFunc; dx: number; dy: number }> = [];
    const addLayer = (element: HTMLElement | null, dx: number, dy: number) => {
      if (!element || reduceMotion) return;
      quickLayers.push({
        x: gsap.quickTo(element, 'x', { duration: 0.8, ease: 'power3' }),
        y: gsap.quickTo(element, 'y', { duration: 0.8, ease: 'power3' }),
        dx,
        dy,
      });
    };

    addLayer(listRef.current, -10, -6);
    addLayer(previewLayerRef.current, 14, 9);
    addLayer(ghostRef.current, -26, -16);
    const animatedElements = [
      ...slideRefs.current.filter((slide): slide is HTMLDivElement => slide !== null),
      listRef.current,
      previewLayerRef.current,
      cursorRef.current,
      spotlightRef.current,
    ];

    const spotlightX =
      spotlightRef.current && !reduceMotion
        ? gsap.quickTo(spotlightRef.current, 'x', { duration: 0.55, ease: 'power3' })
        : null;
    const spotlightY =
      spotlightRef.current && !reduceMotion
        ? gsap.quickTo(spotlightRef.current, 'y', { duration: 0.55, ease: 'power3' })
        : null;

    const updateCachedBounds = () => {
      if (previewRef.current) previewBoundsRef.current = previewRef.current.getBoundingClientRect();
      if (section) sectionBoundsRef.current = section.getBoundingClientRect();
      updateCursor();
    };

    updateCachedBounds();

    const onPointerMove = (event: PointerEvent) => {
      // Touch input must never move anything.
      if (event.pointerType === 'touch' || !finePointer.matches) {
        pointerRef.current = null;
        return;
      }

      pointerRef.current = { x: event.clientX, y: event.clientY, pointerType: event.pointerType };

      const bounds = sectionBoundsRef.current ?? section?.getBoundingClientRect();
      if (bounds && !openRef.current && event.clientY >= bounds.top && event.clientY <= bounds.bottom) {
        const x = (event.clientX / window.innerWidth) * 2 - 1;
        const y = (event.clientY / window.innerHeight) * 2 - 1;
        quickLayers.forEach((layer) => {
          layer.x(x * layer.dx);
          layer.y(y * layer.dy);
        });
        spotlightX?.(event.clientX);
        spotlightY?.(event.clientY);
      }
      updateCursor();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', updateCachedBounds, { passive: true });
    window.addEventListener('resize', updateCachedBounds);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', updateCachedBounds);
      window.removeEventListener('resize', updateCachedBounds);
      gsap.killTweensOf(animatedElements);
      cursorTo.current = null;
    };
  }, [items.length, updateCursor]);

  /** Opens the popup on a project. The title click and the image click both land here. */
  const openPopup = (index: number = activeRef.current) => {
    const preview = previewRef.current;
    if (!preview || openRef.current || !items[index]) return;

    // finish the intro first so the popup starts from, and returns to, the full-size image
    introPlayedRef.current = true;
    introRef.current?.progress(1);
    selectProject(index);
    settleSlides(index);

    openRef.current = true;
    setCursorVisible(false);
    setPopup({ index, origin: { rect: preview.getBoundingClientRect() } });
  };

  const handlePopupStart = () => {
    if (previewRef.current) previewRef.current.style.visibility = 'hidden';
  };

  const handlePopupIndexChange = (index: number) => {
    selectProject(index);
  };

  const handlePopupClosed = () => {
    openRef.current = false;
    settleSlides(activeRef.current);
    setPopup(null);
    introRef.current?.progress(1);
    const preview = previewRef.current;
    if (preview) {
      preview.style.visibility = 'visible';
      preview.focus({ preventScroll: true });
    }
    updateCursor();
  };

  const current = items[active];

  return (
    <section
      ref={sectionRef}
      id="section-3"
      data-section="section-3"
      className="pointer-events-none relative z-10 w-full overflow-x-clip bg-transparent py-12 text-[#000000] sm:py-16"
    >
      <div className="pointer-events-none relative flex w-full flex-col px-10 pb-15 pt-8 md:px-20 xl:px-5">
        <span
          ref={ghostRef}
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-[5vw] right-4 z-0 select-none text-[34vw] font-medium leading-none tracking-tighter tabular-nums text-[#000000]/[0.04] will-change-transform md:right-8 md:text-[26vw]"
        >
          {String(active + 1).padStart(2, '0')}
        </span>

        <header className="relative z-10 mb-6 flex items-center justify-start sm:mb-8 lg:justify-center lg:px-4">
          <div className="flex w-full max-w-[74rem] flex-1 justify-start px-1">
            <h2 className="text-start text-xs font-medium tracking-[0.3em] text-[#000000]/60 sm:text-sm">
              PROJECTS
            </h2>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center">
          {current ? (
            <div
              ref={contentRef}
              className="relative z-10 grid w-full max-w-[74rem] flex-1 grid-cols-1 content-start items-start gap-5 sm:gap-8 lg:grid-cols-12 lg:content-center lg:items-center lg:gap-8 xl:gap-12"
            >
              {/* Mobile order: list, image, all-projects button. Desktop: list left, image right. */}
              <div className="order-1 min-w-0 lg:col-span-5">
                <ul
                  ref={listRef}
                  className="-mx-4 flex flex-col snap-x snap-mandatory flex-nowrap gap-2 md:gap-5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-5 sm:px-5 lg:mx-0 lg:block lg:overflow-visible lg:px-1 lg:pb-0 [&::-webkit-scrollbar]:hidden"
                  aria-label="Select a project"
                >
                  {items.map((project, index) => {
                    const isActive = index === active;
                    return (
                      <li
                        key={project.id}
                        className="shrink-0 lg:shrink"
                        // Hidden until the intro plays (avoids a flash before hydration); keeps its space so layout never shifts.
                        style={index === 0 ? undefined : { visibility: 'hidden' }}
                      >
                        <button
                          type="button"
                          onMouseEnter={() => selectProject(index)}
                          onFocus={() => selectProject(index)}
                          onClick={() => openPopup(index)}
                          aria-current={isActive ? 'true' : undefined}
                          aria-haspopup="dialog"
                          className={[
                            'pointer-events-auto block w-auto snap-start cursor-pointer whitespace-nowrap py-1.5 text-left text-xs font-medium uppercase leading-snug tracking-[0.1em] transition-[opacity,transform,color] duration-300 focus-visible:outline focus-visible:outline-offset-4 focus-visible:outline-[#000000] sm:py-2 sm:text-sm sm:tracking-[0.12em]',
                            'lg:w-full lg:max-w-full lg:whitespace-normal lg:py-2.5 lg:pl-0 lg:text-[clamp(1rem,1.5vw,2.4rem)] lg:tracking-[0.16em]',
                            isActive
                              ? 'text-[#000000] opacity-100 lg:translate-x-4'
                              : 'text-[#000000]/45 hover:text-[#000000] hover:opacity-80 lg:hover:translate-x-2',
                          ].join(' ')}
                        >
                          {project.title}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {/* Desktop-only button, sits under the list */}
                <Link
                  href="/projects"
                  className="pointer-events-auto mt-10 hidden w-fit border-b border-[#000000]/30 pb-1 text-xs tracking-[0.2em] text-[#000000]/70 transition-colors hover:border-[#000000] hover:text-[#000000] focus-visible:outline focus-visible:outline-offset-4 focus-visible:outline-[#000000] lg:inline-flex"
                >
                  ALL PROJECTS
                </Link>
              </div>

              <div className="order-2 min-w-0 lg:col-span-7">
                <div
                  ref={previewLayerRef}
                  className="mx-auto w-full max-w-[min(100%,34rem)] overflow-hidden rounded-[2rem] will-change-transform sm:rounded-[2.5rem]"
                >
                  <button
                    ref={previewRef}
                    type="button"
                    onClick={() => openPopup()}
                    aria-haspopup="dialog"
                    aria-label={`Open details for ${current.title}`}
                    // Hidden until the intro scales it in (avoids a flash before hydration).
                    style={{ visibility: 'hidden' }}
                    className="pointer-events-auto relative block aspect-square w-full overflow-hidden bg-[#000000]/10 focus-visible:outline focus-visible:outline-offset-4 focus-visible:outline-[#000000] lg:aspect-square [@media(hover:hover)_and_(pointer:fine)]:cursor-none"
                  >
                    {/* Own stacking context so the growing slide z-indexes never climb above the cursor. */}
                    <div className="absolute inset-0 isolate z-0">
                      {items.map((project, index) => (
                        <div
                          key={project.id}
                          ref={(element) => {
                            slideRefs.current[index] = element;
                          }}
                          aria-hidden="true"
                          className="absolute inset-0 overflow-hidden"
                          style={index === 0 ? undefined : { visibility: 'hidden', opacity: 0 }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={project.image}
                            alt=""
                            draggable={false}
                            className="absolute inset-0 h-full w-full object-cover will-change-transform"
                          />
                        </div>
                      ))}
                    </div>

                    <div
                      ref={cursorRef}
                      aria-hidden="true"
                      className="pointer-events-none absolute left-0 top-0 z-20 hidden h-4 w-4 rounded-full bg-[#000000] ring-2 ring-[#eceefb]/80 [@media(hover:hover)_and_(pointer:fine)]:block"
                    />
                  </button>
                </div>

                {/* Mobile and tablet: the button comes after the image */}
                <div className="mx-auto mt-5 flex w-full max-w-[min(100%,34rem)] items-center lg:hidden">
                  <Link
                    href="/projects"
                    className="pointer-events-auto border-b border-[#000000]/30 pb-1 text-[10px] tracking-[0.2em] text-[#000000]/70 transition-colors hover:border-[#000000] hover:text-[#000000] focus-visible:outline focus-visible:outline-offset-4 focus-visible:outline-[#000000]"
                  >
                    ALL PROJECTS
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <ProjectsSectionSkeleton />
          )}
        </div>
      </div>

      {popup && items[popup.index] && (
        <ProjectPopup
          items={items}
          startIndex={popup.index}
          origin={popup.origin}
          onStart={handlePopupStart}
          onIndexChange={handlePopupIndexChange}
          onClosed={handlePopupClosed}
        />
      )}
    </section>
  );
}