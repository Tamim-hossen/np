'use client';

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type {
  PointerEvent as ReactPointerEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  CSSProperties,
} from 'react';
import { gsap } from 'gsap';
import { usePortfolioStore } from '@/components/providers/PortfolioStoreProvider';
import type { Testimonial } from '@/data/testimonials';

const WHITE = '#ffffff';
const INK = '#000000';
const CLIENT_COUNT = '100+';
const FOOTNOTE = 'From people all around the world.';
const DESKTOP_EDGE = 40;
const MOBILE_EDGE = 16;

type Variant = 'text' | 'photo' | 'quote';
const VARIANTS: Variant[] = ['text', 'photo', 'quote'];

const tagsOf = (review: Testimonial): string[] =>
  (review as Testimonial & { tags?: string[] }).tags ?? [];

function splitQuote(text: string): { headline: string | null; body: string } {
  const match = text.match(/^(.+?[.!?])\s+([\s\S]+)$/);
  if (match && match[1].length <= 80) return { headline: match[1], body: match[2] };
  return { headline: null, body: text };
}

/* ------------------------------ glass surfaces ------------------------------ */

const PANEL =
  'relative overflow-hidden rounded-[2rem] border border-white/20 bg-black/30 text-white ring-1 ring-black/10 shadow-[0_24px_60px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-xl backdrop-saturate-150';

const CARD =
  'relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-white/15 bg-gradient-to-b from-white/[0.14] to-white/[0.04] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]';

/* ------------------------------ entrance animation ------------------------------ */
/*
  One observer on the section flips `played` to true once, when the section is 50% in view.
  Everything (layout build, image slides, typing) reads that flag and starts together.
*/

const PlayedContext = createContext(false);
const usePlayed = () => useContext(PlayedContext);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function useSectionPlayed(ref: React.RefObject<HTMLElement | null>) {
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
      setPlayed(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        // 50% of the section, but never demand more than half the viewport (tall sections).
        const needed = Math.min(entry.boundingClientRect.height * 0.5, window.innerHeight * 0.5);
        if (entry.isIntersecting && entry.intersectionRect.height >= needed - 1) {
          setPlayed(true);
          observer.disconnect();
        }
      },
      { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return played;
}

function enterStyle(played: boolean, delay: number, from: string): CSSProperties {
  if (prefersReducedMotion()) return {};
  return {
    opacity: played ? 1 : 0,
    transform: played ? 'none' : from,
    transition: `opacity 650ms ease ${delay}ms, transform 800ms cubic-bezier(0.2, 0.75, 0.25, 1) ${delay}ms`,
  };
}

/** Layout build: fades and scales its children in. */
function Enter({
  delay = 0,
  from = 'translate3d(0, 28px, 0) scale(0.97)',
  className = '',
  children,
}: {
  delay?: number;
  from?: string;
  className?: string;
  children: ReactNode;
}) {
  const played = usePlayed();
  return (
    <div className={className} style={enterStyle(played, delay, from)}>
      {children}
    </div>
  );
}

/** Types its text in once the section has played. The untyped rest stays invisible so layout never shifts. */
function Typed({ text, delay = 0 }: { text: string; delay?: number }) {
  const played = usePlayed();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!played) return;
    if (prefersReducedMotion()) {
      setCount(text.length);
      return;
    }
    const duration = Math.min(1600, Math.max(500, text.length * 22));
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
  }, [played, text, delay]);

  return (
    <>
      {text.slice(0, count)}
      <span aria-hidden="true" className="invisible">
        {text.slice(count)}
      </span>
    </>
  );
}

/* ------------------------------ small parts ------------------------------ */

function Stars({
  rating,
  size = 14,
  color = WHITE,
  empty = 'rgba(255,255,255,0.22)',
}: {
  rating: number;
  size?: number;
  color?: string;
  empty?: string;
}) {
  const filled = Math.round(rating);
  return (
    <span role="img" aria-label={`${rating} out of 5`} className="inline-flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill={i < filled ? color : empty}
        >
          <path d="m12 2 2.9 6.9 7.1.6-5.4 4.7 1.6 7.1L12 17.8l-6.2 3.5 1.6-7.1L2 9.5l7.1-.6z" />
        </svg>
      ))}
    </span>
  );
}

function StarsPill({ rating }: { rating: number }) {
  return (
    <span className="inline-flex shrink-0 rounded-full px-3 py-1.5" style={{ background: WHITE }}>
      <Stars rating={rating} size={12} color={INK} empty="rgba(11,42,31,0.25)" />
    </span>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex max-w-full truncate rounded-full px-3 py-1 text-xs font-medium"
      style={{ background: WHITE, color: INK }}
    >
      {children}
    </span>
  );
}

function QuoteMark({ size = 44, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
      className={className}
    >
      <path d="M4 18v-5.2C4 8.7 6.2 6 10 5.4v2.3c-1.9.5-2.9 1.8-3 3.3H10V18zm9 0v-5.2c0-4.1 2.2-6.8 6-7.4v2.3c-1.9.5-2.9 1.8-3 3.3H19V18z" />
    </svg>
  );
}

/** Avatar slides in from the left while it scales up. */
function Avatar({
  review,
  className = '',
  delay = 0,
}: {
  review: Testimonial;
  className?: string;
  delay?: number;
}) {
  const played = usePlayed();
  return (
    <div
      aria-hidden="true"
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 font-semibold text-white ring-2 ring-white/25 ${className}`}
      style={{
        ...(review.avatarImage
          ? {
              backgroundImage: `url("${review.avatarImage}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined),
        ...enterStyle(played, delay, 'translate3d(-32px, 0, 0) scale(0.7)'),
      }}
    >
      {!review.avatarImage && review.avatar}
    </div>
  );
}

const CLAMP: Record<number, string> = {
  3: 'line-clamp-3',
  4: 'line-clamp-4',
  5: 'line-clamp-5',
  6: 'line-clamp-6',
};

function QuoteText({
  text,
  lines = 4,
  className = '',
  delay = 0,
}: {
  text: string;
  lines?: number;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      if (!expanded) setCanExpand(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, expanded]);

  return (
    <div className="min-w-0">
      <p ref={ref} className={`break-words ${expanded ? '' : CLAMP[lines]} ${className}`}>
        <Typed text={text} delay={delay} />
      </p>
      {canExpand && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-white/60 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {expanded ? 'Read less' : 'Read more'}
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden="true"
            className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="m2 3.5 3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* ------------------------------ review cards ------------------------------ */
/* `base` is the card's stagger delay. Images start slightly after it, typing slightly after that. */

function TextCard({ review, base }: { review: Testimonial; base: number }) {
  const { headline, body } = splitQuote(review.quote);
  const tags = tagsOf(review).slice(0, 2);
  const t = base + 200;
  return (
    <div className={`${CARD} w-[calc(100vw-5rem)] max-w-[18.5rem] p-5 sm:w-[19.5rem] sm:p-6`}>
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-base text-white/90">
          <Typed text={review.name} delay={t} />
        </p>
        <StarsPill rating={review.rating} />
      </div>
      <div className="mt-6 flex-1">
        {headline && (
          <p className="text-[1.35rem] leading-tight font-semibold tracking-tight">
            <Typed text={headline} delay={t + 100} />
          </p>
        )}
        <QuoteText
          text={body}
          lines={headline ? 4 : 6}
          delay={t + 250}
          className={`${headline ? 'mt-3 text-base' : 'text-lg font-medium'} leading-snug text-white/75`}
        />
      </div>
      <div className="mt-6 flex items-center gap-3">
        <Avatar review={review} className="size-12 text-sm" delay={base + 150} />
        <div className="min-w-0">
          <p className="truncate text-sm leading-tight font-semibold">
            <Typed text={review.name} delay={t + 400} />
          </p>
          <p className="truncate text-xs text-white/55">
            <Typed text={review.role} delay={t + 500} />
          </p>
        </div>
      </div>
      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Chip key={tag}>
              <Typed text={tag} delay={t + 600} />
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoCard({ review, base }: { review: Testimonial; base: number }) {
  const played = usePlayed();
  const chip = tagsOf(review)[0] ?? review.role;
  const t = base + 200;
  const reduced = prefersReducedMotion();
  return (
    <div className={`${CARD} w-[calc(100vw-5rem)] max-w-[18rem] p-2.5 sm:w-[19rem]`}>
      <div
        aria-hidden="true"
        className="grid h-[clamp(9rem,52vw,13rem)] shrink-0 place-items-center overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-white/25 to-white/5 text-5xl font-semibold text-white/80"
        style={{
          ...(review.avatarImage
            ? {
                backgroundImage: `url("${review.avatarImage}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined),
          ...(reduced
            ? {}
            : {
                ...enterStyle(played, base + 100, 'translate3d(-56px, 0, 0)'),
                clipPath: played ? 'inset(0 0 0 0 round 1.25rem)' : 'inset(0 100% 0 0 round 1.25rem)',
                transition: `opacity 650ms ease ${base + 100}ms, transform 900ms cubic-bezier(0.2, 0.75, 0.25, 1) ${base + 100}ms, clip-path 900ms cubic-bezier(0.2, 0.75, 0.25, 1) ${base + 100}ms`,
              }),
        }}
      >
        {!review.avatarImage && review.avatar}
      </div>
      <div className="flex flex-1 flex-col px-3.5 pt-4 pb-3">
        <div className="flex-1">
          <QuoteText
            text={review.quote}
            lines={3}
            delay={t + 150}
            className="text-xl leading-tight font-semibold tracking-tight"
          />
        </div>
        <p className="mt-3 truncate text-xs text-white/55">
          <Typed text={review.name} delay={t + 300} />
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          <Stars rating={review.rating} size={15} />
          {chip && (
            <Chip>
              <Typed text={chip} delay={t + 400} />
            </Chip>
          )}
        </div>
      </div>
    </div>
  );
}

function QuoteCard({ review, base }: { review: Testimonial; base: number }) {
  const chip = tagsOf(review)[0] ?? review.role;
  const t = base + 200;
  return (
    <div className={`${CARD} w-[calc(100vw-5rem)] max-w-[17.5rem] p-5 sm:w-[18.5rem] sm:p-6`}>
      <Enter delay={base + 100} from="translate3d(-24px, 0, 0) scale(0.8)">
        <QuoteMark className="text-white/80" />
      </Enter>
      <div className="mt-5 flex-1">
        <QuoteText
          text={review.quote}
          lines={6}
          delay={t + 100}
          className="text-[1.3rem] leading-snug font-semibold tracking-tight"
        />
      </div>
      <p className="mt-5 truncate text-xs text-white/55">
        <Typed text={review.name} delay={t + 300} />
      </p>
      <div className="mt-2">
        <Stars rating={review.rating} size={16} />
      </div>
      {chip && (
        <div className="mt-4">
          <Chip>
            <Typed text={chip} delay={t + 400} />
          </Chip>
        </div>
      )}
    </div>
  );
}

function ReviewCard({
  review,
  variant,
  base,
}: {
  review: Testimonial;
  variant: Variant;
  base: number;
}) {
  if (variant === 'photo') return <PhotoCard review={review} base={base} />;
  if (variant === 'quote') return <QuoteCard review={review} base={base} />;
  return <TextCard review={review} base={base} />;
}

/* ------------------------------ carousel panel ------------------------------ */

function ReviewsPanel({ reviews }: { reviews: Testimonial[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const played = usePlayed();
  const [active, setActive] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const drag = useRef({ down: false, startX: 0, startLeft: 0 });

  const cardsOf = () =>
    Array.from(scrollerRef.current?.querySelectorAll<HTMLElement>('[data-card]') ?? []);

  const behavior = (): ScrollBehavior => (prefersReducedMotion() ? 'auto' : 'smooth');
  const snapEdge = () => (window.matchMedia('(min-width: 640px)').matches ? DESKTOP_EDGE : MOBILE_EDGE);

  /* Jump straight to a card (used by the dots). Clamped by the browser if unreachable. */
  const scrollToIndex = (index: number) => {
    const el = scrollerRef.current;
    const card = cardsOf()[Math.max(0, Math.min(reviews.length - 1, index))];
    if (!el || !card) return;
    el.scrollTo({ left: Math.max(0, card.offsetLeft - snapEdge()), behavior: behavior() });
  };

  /*
    Prev/next work from the real scroll position, not from the active index.
    At the end of the row several cards share the same clamped scroll position, so an
    index-based "previous" could target a spot past the max scroll and do nothing.
  */
  const step = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const left = el.scrollLeft;
    const max = el.scrollWidth - el.clientWidth;
    const edge = snapEdge();
    const targets = cardsOf().map((card) => Math.min(max, Math.max(0, card.offsetLeft - edge)));
    let next: number | undefined;
    if (dir > 0) {
      next = targets.find((x) => x > left + 4);
      if (next === undefined && left < max - 2) next = max;
    } else {
      next = [...targets].reverse().find((x) => x < left - 4);
      if (next === undefined && left > 2) next = 0;
    }
    if (next !== undefined) el.scrollTo({ left: next, behavior: behavior() });
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const cards = cardsOf();
      if (cards.length === 0) return;
      const max = el.scrollWidth - el.clientWidth;
      setAtStart(el.scrollLeft <= 2);
      setAtEnd(el.scrollLeft >= max - 2);
      if (el.scrollLeft >= max - 2) {
        setActive(cards.length - 1);
        return;
      }
      const pos = el.scrollLeft + snapEdge();
      let best = 0;
      let bestDistance = Infinity;
      cards.forEach((card, i) => {
        const distance = Math.abs(card.offsetLeft - pos);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      });
      setActive(best);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reviews.length]);

  /* Click-and-drag with a mouse. Touch and trackpads already scroll natively. */
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (!el || event.pointerType !== 'mouse' || (event.target as HTMLElement).closest('button')) return;
    drag.current = { down: true, startX: event.clientX, startLeft: el.scrollLeft };
    el.style.scrollSnapType = 'none';
    el.style.cursor = 'grabbing';
    el.style.userSelect = 'none';
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (!el || !drag.current.down) return;
    el.scrollLeft = drag.current.startLeft - (event.clientX - drag.current.startX);
  };
  const endDrag = () => {
    const el = scrollerRef.current;
    if (!el || !drag.current.down) return;
    drag.current.down = false;
    // Restoring the snap type lets the browser settle on the nearest snap point itself.
    el.style.scrollSnapType = '';
    el.style.cursor = '';
    el.style.userSelect = '';
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    }
  };

  const navBtn =
    'grid size-10 cursor-pointer place-items-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-35 disabled:hover:bg-white/10';

  return (
    <div data-reviews-parallax="panel" className={`${PANEL} flex h-full flex-col pt-5 pb-6`}>
      <div className="flex justify-end gap-2.5 px-8 pb-4">
        <button
          type="button"
          aria-label="Previous review"
          disabled={atStart}
          onClick={() => step(-1)}
          className={navBtn}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="m10 3-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Next review"
          disabled={atEnd}
          onClick={() => step(1)}
          className={navBtn}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div
        ref={scrollerRef}
        role="region"
        aria-label="Client reviews"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        className="relative flex flex-1 cursor-grab snap-x snap-mandatory items-stretch gap-4 overflow-x-auto scroll-pl-4 px-4 pb-1 [scrollbar-width:none] focus-visible:outline-none sm:scroll-pl-10 sm:px-10 [&::-webkit-scrollbar]:hidden"
      >
        {reviews.map((review, i) => {
          const base = 200 + Math.min(i, 4) * 90;
          return (
            <div
              key={review.id}
              data-card
              className="flex shrink-0 snap-start"
              style={enterStyle(played, base, 'translate3d(56px, 0, 0) scale(0.96)')}
            >
              <ReviewCard review={review} variant={VARIANTS[i % VARIANTS.length]} base={base} />
            </div>
          );
        })}
        {/* spacer so the last card can reach the snap line */}
        <div aria-hidden="true" className="w-6 shrink-0" />
      </div>

      <div className="mt-6 flex items-center justify-center md:justify-between gap-6 px-8">
        <div
          role="tablist"
          aria-label="Choose a review"
          className="flex items-center gap-2.5 rounded-full bg-black/30 px-3.5 py-3 ring-1 ring-white/10"
        >
          {reviews.map((review, i) => (
            <button
              key={review.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Show review ${i + 1} of ${reviews.length}`}
              onClick={() => scrollToIndex(i)}
              className={`h-2 cursor-pointer rounded-full transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                i === active ? 'w-4' : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
              style={i === active ? { background: WHITE } : undefined}
            />
          ))}
        </div>
        <p className="hidden max-w-[11rem] text-right text-xs sm:text-sm leading-snug text-white/70 sm:block tracking-[0.2em]">
          <Typed text={FOOTNOTE} delay={900} />
        </p>
      </div>
    </div>
  );
}

/* ------------------------------ stat cards ------------------------------ */

function UsersIcon() {
  return (
    <svg
      width="92"
      height="92"
      viewBox="0 0 24 24"
      fill="none"
      stroke={WHITE}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="7.5" r="3.2" />
      <path d="M5.8 20v-1.4A4.6 4.6 0 0 1 10.4 14h3.2a4.6 4.6 0 0 1 4.6 4.6V20z" />
      <circle cx="4.6" cy="9.6" r="2.1" />
      <circle cx="19.4" cy="9.6" r="2.1" />
      <path d="M1.6 17.6v-.6a3 3 0 0 1 2.8-3" />
      <path d="M22.4 17.6v-.6a3 3 0 0 0-2.8-3" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="84" height="84" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke={WHITE} strokeWidth="1.5" strokeLinejoin="round">
      <path d="m12 2.8 2.7 6.1 6.6.6-5 4.4 1.5 6.5L12 17l-5.8 3.4 1.5-6.5-5-4.4 6.6-.6z" />
    </svg>
  );
}

function StatCard({
  label,
  value,
  icon,
  base,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  base: number;
}) {
  return (
    <div
      data-reviews-parallax="stat"
      className={`${PANEL} flex h-full min-h-[12rem] flex-col gap-4 justify-center p-6`}
    >
      <div className='text-center'>
        <p className="text-base text-white/85 sm:text-md tracking-[0.2em]">
          <Typed text={label} delay={base + 200} />
        </p>
        <p className="mt-1 text-lg leading-none font-semibold tracking-[0.2em] sm:text-2xl ">
          <Typed text={value} delay={base + 350} />
        </p>
      </div>
      <div className="mt-4 flex justify-center">
        <Enter delay={base + 150} from="translate3d(0, 32px, 0) scale(0.6)">
          {icon}
        </Enter>
      </div>
    </div>
  );
}

/* ------------------------------ section ------------------------------ */

export function ReviewsSection() {
  const testimonials = usePortfolioStore((state) => state.testimonials);
  const sectionRef = useRef<HTMLElement>(null);
  const played = useSectionPlayed(sectionRef);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const finePointer = window.matchMedia(
      '(min-width: 768px) and (hover: hover) and (pointer: fine)',
    );
    if (!finePointer.matches || prefersReducedMotion()) return;

    const elements = Array.from(
      section.querySelectorAll<HTMLElement>('[data-reviews-parallax]'),
    );
    const parallaxTargets = elements.map((element, index) => {
      const type = element.dataset.reviewsParallax;
      const values =
        type === 'heading'
          ? { x: -2, y: -2, duration: 0.9 }
          : type === 'panel'
            ? { x: 8, y: 6, duration: 0.7 }
            : { x: index % 2 === 0 ? -5 : 7, y: index % 2 === 0 ? -4 : -5, duration: 0.85 };

      return {
        element,
        ...values,
        moveX: gsap.quickTo(element, 'x', { duration: values.duration, ease: 'power3' }),
        moveY: gsap.quickTo(element, 'y', { duration: values.duration, ease: 'power3' }),
      };
    });

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
        return;
      }

      const x = (event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5;
      const y = (event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5;
      parallaxTargets.forEach((target) => {
        target.moveX(x * target.x);
        target.moveY(y * target.y);
      });
    };

    const resetParallax = () => {
      parallaxTargets.forEach((target) => {
        target.moveX(0);
        target.moveY(0);
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
  }, []);

  const averageRating =
    testimonials.length > 0
      ? (
          testimonials.reduce((sum, testimonial) => sum + testimonial.rating, 0) /
          testimonials.length
        ).toFixed(1)
      : '0.0';

  return (
    <section
      ref={sectionRef}
      id="section-6"
      data-section="section-6"
      aria-labelledby="reviews-heading"
      className="pointer-events-none relative w-full bg-transparent px-6 py-16 sm:px-10 md:px-16 lg:px-24"
    >
      <PlayedContext.Provider value={played}>
        <h2
          id="reviews-heading"
          data-reviews-parallax="heading"
          className="text-white text-center mb-12 text-xs sm:text-sm uppercase tracking-[0.2em]"
        >
          <Typed text="Reviews" />
        </h2>

        <div className="mx-auto max-w-7xl">
          {testimonials.length === 0 ? (
            <div
              data-reviews-parallax="panel"
              className={`${PANEL} pointer-events-auto p-8 text-center text-sm text-white/70`}
            >
              Client reviews will appear here.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
              <Enter className="pointer-events-auto min-w-0">
                <ReviewsPanel reviews={testimonials} />
              </Enter>
              <div className="pointer-events-auto grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-2 lg:gap-6">
                <Enter delay={120} className="h-full">
                  <StatCard label="Number of Clients" value={CLIENT_COUNT} icon={<UsersIcon />} base={120} />
                </Enter>
                <Enter delay={240} className="h-full">
                  <StatCard label="Average rating" value={`${averageRating}/5`} icon={<StarIcon />} base={240} />
                </Enter>
              </div>
            </div>
          )}
        </div>
      </PlayedContext.Provider>
    </section>
  );
}