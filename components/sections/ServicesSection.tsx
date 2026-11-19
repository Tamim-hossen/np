'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Service } from '@/data/services';

gsap.registerPlugin(ScrollTrigger);

const BENTO_SLOTS = [
  'md:col-start-1 md:row-start-1 md:row-span-2 xl:col-start-1 xl:row-start-1 xl:row-span-2',
  'md:col-start-2 md:col-span-2 md:row-start-1 xl:col-start-2 xl:col-span-2 xl:row-start-1',
  'md:col-start-2 md:row-start-2 xl:col-start-4 xl:row-start-1',
  'md:col-start-3 md:row-start-2 xl:col-start-2 xl:row-start-2',
  'md:col-start-1 md:row-start-3 xl:col-start-3 xl:row-start-2',
  'md:col-start-2 md:col-span-2 md:row-start-3 xl:col-start-4 xl:col-span-1 xl:row-start-2',
];

const BENTO_GRID =
  'grid-cols-1 auto-rows-[minmax(16rem,auto)] gap-4 sm:grid-cols-2 md:grid-cols-3 md:grid-rows-3 md:auto-rows-[minmax(15rem,auto)] md:gap-5 xl:grid-cols-4 xl:grid-rows-2 xl:auto-rows-[minmax(13rem,auto)] xl:gap-6 xl:grid-flow-dense';

const SLIDE_FROM = [
  { xPercent: -101, yPercent: 0 },
  { xPercent: 0, yPercent: -101 },
  { xPercent: 101, yPercent: 0 },
  { xPercent: 0, yPercent: 101 },
];

const CARET = [
  'after:absolute',
  'after:-right-0.5',
  'after:top-[0.12em]',
  'after:bottom-[0.08em]',
  'after:w-0.5',
  'after:bg-white',
];

type ActiveService = {
  service: Service;
  index: number;
  rect: DOMRect;
  origin: HTMLElement;
};

function TypingText({ text }: { text: string }) {
  return (
    <span data-service-copy>
      <span aria-hidden="true">
        {Array.from(text).map((character, index) => (
          <span key={index} data-service-char className="relative inline-block opacity-0">
            {character === ' ' ? '\u00a0' : character}
          </span>
        ))}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}

function ServiceCard({
  service,
  index,
  onOpen,
}: {
  service: Service;
  index: number;
  onOpen: (payload: ActiveService) => void;
}) {
  const open = (el: HTMLElement) =>
    onOpen({ service, index, rect: el.getBoundingClientRect(), origin: el });

  return (
    <article
      data-service-card
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-label={`${service.title}, open details`}
      onClick={(e) => open(e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(e.currentTarget);
        }
      }}
      className="group pointer-events-auto relative isolate h-full min-h-64 cursor-pointer overflow-hidden rounded-[1.625rem] border border-white/20 text-black shadow-[0_20px_55px_rgba(0,0,0,0.2)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      style={{ visibility: 'hidden' }}
    >
      <div
        data-service-media
        aria-hidden="true"
        className="absolute inset-0 will-change-transform"
      >
        <div
          className={`absolute inset-0 bg-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none 
                    ${index == 0 ? "bg-position-[left_8rem_bottom_-2.5rem] md:bg-position-[left_50%_bottom_8rem]": 
                      index == 1 ? "bg-position-[left_8rem_bottom_0rem] md:bg-position-[left_10rem_bottom_-1.5rem] xl:bg-position-[left_12rem_bottom_-2.5rem]": 
                      index == 2 ? "bg-position-[left_8rem_bottom_0rem] md:bg-position-[right_-6.5rem_bottom_7rem] xl:bg-position-[right_-7rem_bottom_8rem]":
                      index == 3 ? "bg-position-[left_6rem_bottom_1.5rem] md:bg-position-[right_-6rem_bottom_8rem] xl:bg-position-[right_-6.5rem_bottom_8.5rem] ": 
                      index == 4 ? "bg-position-[left_8rem_bottom_0rem] md:bg-position-[right_-7rem_bottom_7rem] xl:bg-position-[right_-7.5rem_bottom_7.5rem] ": 
                      "bg-position-[left_7.5rem_bottom_0rem] md:bg-position-[right_-10rem_bottom_-1rem] xl:bg-position-[right_-7.5rem_bottom_7.5rem]"}`}
          style={{ backgroundImage: `url("${service.image}")`, opacity: 0.7 }}
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute -z-2 inset-0 bg-linear-to-b from-black/10 via-black/5 to-black/10 backdrop-blur-sm opacity-95"
      />

      <div className="relative flex h-full min-h-64 flex-col justify-between p-5 sm:p-6 lg:p-7">
        <div>
          <span className="font-mono text-[10px] tracking-[0.24em] text-black/75 sm:text-xs">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>

        <div className="mt-10">
          <h3 className="text-xl font-medium leading-tight tracking-[-0.025em] sm:text-2xl lg:text-[clamp(1.35rem,1.9vw,1.9rem)]">
            <TypingText text={service.title} />
          </h3>
          <p className="mt-2 line-clamp-3 max-w-[52ch] text-sm leading-relaxed text-black/80">
            <TypingText text={service.description} />
          </p>
          {service.bullets.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {service.bullets.slice(0, 3).map((bullet, bulletIndex) => (
                <li
                  key={`${service.id}-${bulletIndex}`}
                  className="max-w-full truncate rounded-full border border-white/35 bg-black/20 px-3 py-1 text-[10px] leading-4 text-white/90 backdrop-blur-sm sm:text-xs"
                >
                  <TypingText text={bullet} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Detail popup: grows from the clicked card's rect, shrinks back to it */
/* ------------------------------------------------------------------ */

function getTargetRect() {
  const width = Math.min(window.innerWidth * 0.92, 820);
  const height = Math.min(window.innerHeight * 0.8, window.innerWidth > 767 ? 460 : 580);
  return {
    left: (window.innerWidth - width) / 2,
    top: (window.innerHeight - height) / 2,
    width,
    height,
  };
}

function ServiceModal({
  active,
  onClosed,
}: {
  active: ActiveService;
  onClosed: () => void;
}) {
  const { service, index, rect, origin } = active;
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const closingRef = useRef(false);
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // open
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel || !backdrop) return;

    const items = panel.querySelectorAll('[data-modal-item]');
    const target = getTargetRect();

    if (reduced) {
      gsap.set(panel, { ...target, borderRadius: 28 });
      gsap.set(backdrop, { opacity: 1 });
      closeRef.current?.focus();
      return;
    }

    gsap.set(panel, {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      borderRadius: 26,
    });
    gsap.set(backdrop, { opacity: 0 });
    gsap.set(items, { opacity: 0, y: 16 });

    const tl = gsap.timeline({ onComplete: () => closeRef.current?.focus() });
    tl.to(backdrop, { opacity: 1, duration: 0.35, ease: 'power2.out' }, 0)
      .to(panel, { ...target, borderRadius: 28, duration: 0.65, ease: 'power3.inOut' }, 0)
      .to(items, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', stagger: 0.06 }, 0.4);
    tlRef.current = tl;

    return () => {
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (reduced || !panel || !backdrop) {
      origin.focus({ preventScroll: true });
      onClosed();
      return;
    }

    tlRef.current?.kill();
    const items = panel.querySelectorAll('[data-modal-item]');
    // read the card's *current* rect in case the page scrolled while open
    const r = origin.getBoundingClientRect();

    gsap
      .timeline({
        onComplete: () => {
          origin.focus({ preventScroll: true });
          onClosed();
        },
      })
      .to(items, { opacity: 0, duration: 0.18, ease: 'power1.in' }, 0)
      .to(
        panel,
        {
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
          borderRadius: 26,
          duration: 0.5,
          ease: 'power3.inOut',
        },
        0.05,
      )
      .to(panel, { opacity: 0, duration: 0.45, ease: 'power1.in' }, 0.1)
      .to(backdrop, { opacity: 0, duration: 0.4, ease: 'power2.in' }, 0.1);
  };

  // escape, scroll lock, focus trap, resize
  useEffect(() => {
    const html = document.documentElement;
    const prevBody = document.body.style.overflow;
    const prevHtml = html.style.overflow;
    document.body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';

    const insidePanel = (t: EventTarget | null) =>
      !!panelRef.current && t instanceof Node && panelRef.current.contains(t);

    // swallow wheel/touch scrolling anywhere outside the popup
    const blockScroll = (e: Event) => {
      if (insidePanel(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('wheel', blockScroll, { passive: false, capture: true });
    window.addEventListener('touchmove', blockScroll, { passive: false, capture: true });

    const SCROLL_KEYS = [' ', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'];

    const onKey = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.includes(e.key) && !insidePanel(e.target)) {
        e.preventDefault();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    const onResize = () => {
      if (panelRef.current && !closingRef.current) {
        gsap.set(panelRef.current, getTargetRect());
      }
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.body.style.overflow = prevBody;
      html.style.overflow = prevHtml;
      window.removeEventListener('wheel', blockScroll, true);
      window.removeEventListener('touchmove', blockScroll, true);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div
        ref={backdropRef}
        onClick={close}
        aria-hidden="true"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        data-lenis-prevent
        role="dialog"
        aria-modal="true"
        aria-labelledby={`service-dialog-title-${service.id}`}
        className="fixed flex flex-col overflow-hidden border border-white/15 bg-black/30 text-white shadow-[0_30px_90px_rgba(0,0,0,0.5)] md:flex-row"
      >
        <div
          aria-hidden="true"
          className="relative h-40 shrink-0 bg-cover bg-center md:h-auto md:w-2/5"
          style={{ backgroundImage: `url("${service.image}")` }}
        />
                  <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close details"
            className=" cursor-pointer absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full border border-white/25 bg-white/5 text-lg leading-none transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span aria-hidden="true" className='cursor-pointer'>✕</span>
          </button>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-6 sm:p-8 md:p-10">


          <span data-modal-item className="font-mono text-xs tracking-[0.24em] text-white/60">
            {String(index + 1).padStart(2, '0')}
          </span>

          <h3
            id={`service-dialog-title-${service.id}`}
            data-modal-item
            className="mt-4 pr-10 text-2xl font-medium leading-tight tracking-[-0.025em] sm:text-3xl"
          >
            {service.title}
          </h3>

          <p
            data-modal-item
            className="mt-4 max-w-[60ch] text-sm leading-relaxed text-white/80 sm:text-base"
          >
            {service.description}
          </p>

          {service.bullets.length > 0 && (
            <ul data-modal-item className="mt-6 flex flex-col gap-3">
              {service.bullets.map((bullet, i) => (
                <li
                  key={`${service.id}-modal-${i}`}
                  className="flex gap-3 text-sm leading-relaxed text-white/90 sm:text-base"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-white/70"
                  />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */

export function ServicesSection({ services }: { services: Service[] }) {
  const useBento = services.length === BENTO_SLOTS.length;
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<ActiveService | null>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const grid = gridRef.current;
    if (!section || !grid || services.length === 0) return;

    const context = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>('[data-service-card]', grid);
      const media: HTMLElement[] = [];
      const textStreams: HTMLElement[][] = [];
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      cards.forEach((card, index) => {
        const image = card.querySelector<HTMLElement>('[data-service-media]');
        if (!image) return;
        media.push(image);
        card.querySelectorAll<HTMLElement>('[data-service-copy]').forEach((copy) => {
          textStreams.push(gsap.utils.toArray<HTMLElement>('[data-service-char]', copy));
        });

        gsap.set(
          image,
          reducedMotion ? { xPercent: 0, yPercent: 0 } : SLIDE_FROM[index % SLIDE_FROM.length],
        );
      });

      if (reducedMotion) {
        gsap.set(cards, { autoAlpha: 1, scale: 1, y: 0 });
        textStreams.flat().forEach((char) => {
          char.style.opacity = '1';
        });
        return;
      }

      // initial hidden state
      gsap.set(cards, { autoAlpha: 0, scale: 0.97, y: 28 });
      textStreams.flat().forEach((char) => {
        char.style.opacity = '0';
      });

      const intro = gsap.timeline({ paused: true });

      // 1) cards build the layout
      intro.to(cards, {
        autoAlpha: 1,
        scale: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.08,
      });

      // everything below starts only once the cards are fully in place
      intro.addLabel('reveal', '>');

      // 2a) images slide in
      media.forEach((image) => {
        intro.to(
          image,
          { xPercent: 0, yPercent: 0, duration: 1, ease: 'power3.out' },
          'reveal',
        );
      });

      // 2b) text types in, at the same moment as the images
      textStreams.forEach((chars) => {
        if (chars.length === 0) return;
        const typed = { count: 0 };
        let caret: HTMLElement | null = null;

        intro.to(
          typed,
          {
            count: chars.length,
            duration: Math.min(1.6, Math.max(0.5, chars.length * 0.022)),
            ease: 'none',
            onUpdate: () => {
              const count = Math.round(typed.count);
              chars.forEach((char, i) => {
                char.style.opacity = i < count ? '1' : '0';
              });
              const next = count > 0 && count < chars.length ? chars[count - 1] : null;
              if (next !== caret) {
                caret?.classList.remove(...CARET);
                next?.classList.add(...CARET);
                caret = next;
              }
            },
          },
          'reveal',
        );
      });

      // plays once when the section's top reaches 50% of the viewport
      ScrollTrigger.create({
        trigger: section,
        start: 'top 50%',
        once: true,
        onEnter: () => intro.play(),
      });
    }, grid);

    return () => context.revert();
  }, [services]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const finePointer = window.matchMedia(
      '(min-width: 768px) and (hover: hover) and (pointer: fine)',
    );
    if (!finePointer.matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const targets = Array.from(
      section.querySelectorAll<HTMLElement>('[data-service-parallax]'),
    ).map((element, index) => {
      const depth = element.hasAttribute('data-service-heading')
        ? { x: -5, y: -4, duration: 0.65 }
        : { x: index % 2 === 0 ? 14 : -14, y: index % 2 === 0 ? 10 : -10, duration: 0.5 };

      return {
        element,
        moveX: gsap.quickTo(element, 'x', { duration: depth.duration, ease: 'power3' }),
        moveY: gsap.quickTo(element, 'y', { duration: depth.duration, ease: 'power3' }),
        x: depth.x,
        y: depth.y,
      };
    });

    const resetParallax = () => {
      targets.forEach((target) => {
        target.moveX(0);
        target.moveY(0);
      });
    };

    let cachedBounds: DOMRect | null = section.getBoundingClientRect();
    const updateBounds = () => {
      cachedBounds = section.getBoundingClientRect();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;

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
      targets.forEach((target) => {
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
      gsap.killTweensOf(targets.map((target) => target.element));
    };
  }, [services]);

  return (
    <section
      ref={sectionRef}
      id="section-7"
      data-section="section-7"
      aria-labelledby="services-heading"
      className="pointer-events-none relative w-full px-6 py-16 text-white sm:px-10 sm:py-16 md:px-16 lg:px-24"
    >
      <div className="mx-auto max-w-7xl">
        <header className="mb-12 flex flex-col gap-3 justify-center items-center">
          <div>
            <h2
              id="services-heading"
              data-service-parallax
              data-service-heading
              className=" text-xs tracking-[0.2em] sm:text-sm text-black/70 uppercase"
            >
              Services
            </h2>
          </div>
        </header>

        {services.length === 0 ? (
          <div data-service-parallax className="rounded-2xl border border-white/20 bg-white/[0.06] p-8 text-center text-sm text-white/70 backdrop-blur-xl">
            Services will appear here.
          </div>
        ) : (
          <div ref={gridRef} className={`grid ${BENTO_GRID}`}>
            {services.map((service, index) => (
              <div
                key={service.id}
                data-service-parallax
                className={useBento ? BENTO_SLOTS[index] : ''}
              >
                <ServiceCard service={service} index={index} onOpen={setActive} />
              </div>
            ))}
          </div>
        )}
      </div>

      {active && <ServiceModal active={active} onClosed={() => setActive(null)} />}
    </section>
  );
}