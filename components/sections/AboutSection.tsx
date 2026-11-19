'use client';

import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { setBackgroundScrollPaused } from '@/hooks/useScrollProgress';

gsap.registerPlugin(ScrollTrigger);

interface CopyPart {
  text: string;
  note?: string;
}

const COPY_PARTS: CopyPart[] = [
  { text: 'I create thoughtful digital experiences.' },
  { text: ' Clear product  thinking meets visual craft,  with purposeful motion in every detail.' }
];

const NOTE_COUNT = COPY_PARTS.filter((part) => part.note).length;

const BACKGROUND_PAUSE_REASON = 'about-section';

const INK = '#15151f';
const ACCENT = '#000000';

/**
 * Mouse-parallax depth layers. Same direction as the content wrapper,
 * scaled by `mult` (smaller = further away) and smoothed by `lag`
 * (smaller = more inertia).
 */
interface ParallaxLayer {
  el: HTMLElement;
  mode: 'translate' | 'sway';
  mult: number;
  lag: number;
  x: number;
  y: number;
}

/* ---------------------------------------------------------------------- */
/* Scroll-triggered, draggable popup chips                                 */
/* ---------------------------------------------------------------------- */

type PopupTone = 'sage' | 'cream' | 'blue' | 'peach' | 'lilac';
type PopupIcon = 'pie' | 'play' | 'user' | 'spark' | 'box' | 'dots' | 'loop';

interface PopupDef {
  label?: string; // no label = round icon-only chip
  icon: PopupIcon;
  tone: PopupTone;
}

interface Popup extends PopupDef {
  id: number;
  x: number; // % of stage width
  y: number; // % of stage height
  rotate: number; // resting tilt, degrees
  at: number; // 0..1 point in the scroll range where it pops in
}

const TONE_CLASS: Record<PopupTone, string> = {
  sage: 'bg-[#b9cbb5]',
  cream: 'bg-[#f3ecd0]',
  blue: 'bg-[#c9d4e6]',
  peach: 'bg-[#f6c3a0]',
  lilac: 'bg-[#d9dcf0]',
};

const POPUP_POOL: PopupDef[] = [
  { label: 'Strategy', icon: 'pie', tone: 'sage' },
  { label: 'Motion Graphics', icon: 'play', tone: 'cream' },
  { label: 'Visual Identity', icon: 'user', tone: 'blue' },
  { label: 'Experience', icon: 'spark', tone: 'peach' },
  { label: 'Content', icon: 'box', tone: 'cream' },
  { label: 'Branding', icon: 'spark', tone: 'sage' },
  { label: 'Web Design', icon: 'box', tone: 'blue' },
  { label: 'Prototyping', icon: 'play', tone: 'peach' },
  { label: 'Art Direction', icon: 'user', tone: 'cream' },
  { label: 'Interaction', icon: 'pie', tone: 'blue' },
  { label: 'Research', icon: 'loop', tone: 'sage' },
  { label: 'Storytelling', icon: 'spark', tone: 'lilac' },
  { icon: 'dots', tone: 'lilac' },
  { icon: 'loop', tone: 'blue' },
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Client-only (uses Math.random), so call it from an effect, never during render. */
function generatePopups(
  isMobile: boolean,
  stageRect: DOMRect,
  copyRect: DOMRect,
): Popup[] {
  const pool = shuffle(POPUP_POOL).slice(0, isMobile ? 7 : POPUP_POOL.length);
  const stageWidth = stageRect.width;
  const stageHeight = stageRect.height;
  const copyBounds = {
    left: copyRect.left - stageRect.left - 28,
    top: copyRect.top - stageRect.top - 28,
    right: copyRect.right - stageRect.left + 28,
    bottom: copyRect.bottom - stageRect.top + 28,
  };
  const placed: Array<{ popup: Popup; x: number; y: number; width: number; height: number }> = [];

  pool.forEach((def, id) => {
    const width = def.label
      ? 48 + def.label.length * (isMobile ? 6.4 : 7.2)
      : 36;
    const height = isMobile ? 34 : 38;
    const maxX = Math.max(12, stageWidth - width - 12);
    const maxY = Math.max(12, stageHeight - height - 12);

    for (let attempt = 0; attempt < 240; attempt += 1) {
      const x = 12 + Math.random() * Math.max(0, maxX - 12);
      const y = 12 + Math.random() * Math.max(0, maxY - 12);
      const overlapsCopy =
        x < copyBounds.right &&
        x + width > copyBounds.left &&
        y < copyBounds.bottom &&
        y + height > copyBounds.top;
      const overlapsPopup = placed.some(
        (popup) =>
          x < popup.x + popup.width + 12 &&
          x + width + 12 > popup.x &&
          y < popup.y + popup.height + 10 &&
          y + height + 10 > popup.y,
      );

      if (!overlapsCopy && !overlapsPopup) {
        placed.push({
          popup: {
            ...def,
            id,
            x: (x / stageWidth) * 100,
            y: (y / stageHeight) * 100,
            rotate: (Math.random() * 2 - 1) * 6,
            at: 0,
          },
          x,
          y,
          width,
          height,
        });
        return;
      }
    }
  });

  // random moments spread over the scroll range, shuffled so position and
  // timing are unrelated
  const moments = shuffle(
    placed.map((_, i) => 0.03 + ((i + Math.random()) / placed.length) * 0.87)
  );
  return placed.map(({ popup }, i) => ({ ...popup, at: moments[i] }));
}

function PopupGlyph({ icon }: { icon: PopupIcon }) {
  const svg = {
    width: 12,
    height: 12,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (icon) {
    case 'pie':
      return (
        <svg {...svg}>
          <circle cx="8" cy="8" r="6" />
          <path d="M8 2v6h6" />
        </svg>
      );
    case 'play':
      return (
        <svg {...svg}>
          <rect x="2" y="3" width="12" height="10" rx="2" />
          <path d="M7 6l3 2-3 2z" />
        </svg>
      );
    case 'user':
      return (
        <svg {...svg}>
          <circle cx="8" cy="5.5" r="2.5" />
          <path d="M3 13.5c.6-2.4 2.6-3.5 5-3.5s4.4 1.1 5 3.5" />
        </svg>
      );
    case 'spark':
      return (
        <svg {...svg}>
          <path d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M12 4l-2 2M6 10l-2 2" />
        </svg>
      );
    case 'box':
      return (
        <svg {...svg}>
          <rect x="3" y="3" width="10" height="10" rx="2" />
        </svg>
      );
    case 'dots':
      return (
        <svg {...svg} fill="currentColor" stroke="none">
          <circle cx="3.5" cy="8" r="1.1" />
          <circle cx="8" cy="8" r="1.1" />
          <circle cx="12.5" cy="8" r="1.1" />
        </svg>
      );
    case 'loop':
      return (
        <svg {...svg}>
          <path d="M13 8a5 5 0 1 1-1.5-3.5" />
          <path d="M13 2.5V5h-2.5" />
        </svg>
      );
  }
}

const CHIP_SHADOW = '0 6px 16px -10px rgba(0, 7, 68, 0.35)';
const CHIP_SHADOW_LIFTED = '0 16px 28px -10px rgba(0, 7, 68, 0.4)';

/**
 * Separate layers so transforms never fight:
 *  holder   – positioned in % of the stage, moved by dragging
 *  parallax – cursor movement, driven by the section's mouse handler
 *  chip     – pop-in / settle animation, driven by the scroll timeline
 * The chip accepts pointer events, so an appeared chip can be grabbed.
 */
function PopupChip({ popup, nextZ }: { popup: Popup; nextZ: () => number }) {
  const holderRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const inertiaTweenRef = useRef<gsap.core.Tween | null>(null);
  const drag = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    velocityX: 0,
    velocityY: 0,
    moved: false,
    baseX: 0,
    baseY: 0,
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
    offsetX: 0,
    offsetY: 0,
  });

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const holder = holderRef.current;
    const stage = holder?.closest<HTMLElement>('[data-about-stage]');
    if (!holder || !stage) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const d = drag.current;
    const stageRect = stage.getBoundingClientRect();
    const rect = holder.getBoundingClientRect();
    const now = performance.now();

    inertiaTweenRef.current?.kill();
    inertiaTweenRef.current = null;
    d.active = true;
    d.pointerId = event.pointerId;
    d.startX = event.clientX;
    d.startY = event.clientY;
    d.lastX = event.clientX;
    d.lastY = event.clientY;
    d.lastTime = now;
    d.velocityX = 0;
    d.velocityY = 0;
    d.moved = false;
    d.baseX = d.offsetX;
    d.baseY = d.offsetY;
    // keep the chip inside the stage
    d.minX = d.offsetX + (stageRect.left - rect.left);
    d.maxX = d.offsetX + (stageRect.right - rect.right);
    d.minY = d.offsetY + (stageRect.top - rect.top);
    d.maxY = d.offsetY + (stageRect.bottom - rect.bottom);

    holder.style.zIndex = String(nextZ());
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.style.boxShadow = CHIP_SHADOW_LIFTED;
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const holder = holderRef.current;
    if (!d.active || event.pointerId !== d.pointerId || !holder) return;

    const now = performance.now();
    const elapsed = now - d.lastTime;
    if (elapsed > 0) {
      const sampleX = (event.clientX - d.lastX) / elapsed;
      const sampleY = (event.clientY - d.lastY) / elapsed;
      d.velocityX = d.velocityX * 0.55 + sampleX * 0.45;
      d.velocityY = d.velocityY * 0.55 + sampleY * 0.45;
    }
    d.lastX = event.clientX;
    d.lastY = event.clientY;
    d.lastTime = now;
    d.moved ||= Math.hypot(event.clientX - d.startX, event.clientY - d.startY) > 2;

    const nextX = Math.min(d.maxX, Math.max(d.minX, d.baseX + event.clientX - d.startX));
    const nextY = Math.min(d.maxY, Math.max(d.minY, d.baseY + event.clientY - d.startY));
    d.offsetX = nextX;
    d.offsetY = nextY;
    holder.style.transform = `translate3d(${d.offsetX}px, ${d.offsetY}px, 0)`;
  };

  const handlePointerEnd = (
    event: ReactPointerEvent<HTMLDivElement>,
    cancelled = false,
  ) => {
    const d = drag.current;
    if (!d.active || event.pointerId !== d.pointerId) return;
    d.active = false;
    event.currentTarget.style.boxShadow = CHIP_SHADOW;

    const holder = holderRef.current;
    const idleFor = performance.now() - d.lastTime;
    const velocityX = !cancelled && d.moved && idleFor < 100 ? d.velocityX : 0;
    const velocityY = !cancelled && d.moved && idleFor < 100 ? d.velocityY : 0;
    const speed = Math.hypot(velocityX, velocityY);
    if (!holder || speed < 0.08) return;

    const duration = Math.min(0.9, Math.max(0.35, speed * 1500));
    const durationMs = duration * 1000;
    const travelX = (velocityX * durationMs) / 3;
    const travelY = (velocityY * durationMs) / 3;
    const maxTravel = 120;
    const travelScale = Math.min(
      1,
      maxTravel / Math.max(1, Math.hypot(travelX, travelY)),
    );
    const targetX = Math.min(
      d.maxX,
      Math.max(d.minX, d.offsetX + travelX * travelScale),
    );
    const targetY = Math.min(
      d.maxY,
      Math.max(d.minY, d.offsetY + travelY * travelScale),
    );
    if (Math.hypot(targetX - d.offsetX, targetY - d.offsetY) < 1) return;

    inertiaTweenRef.current = gsap.to(d, {
      offsetX: targetX,
      offsetY: targetY,
      duration,
      ease: 'power3.out',
      onUpdate: () => {
        holder.style.transform = `translate3d(${d.offsetX}px, ${d.offsetY}px, 0)`;
      },
      onComplete: () => {
        inertiaTweenRef.current = null;
      },
    });
  };

  useEffect(() => () => {
    inertiaTweenRef.current?.kill();
  }, []);

  const iconOnly = !popup.label;

  return (
    <div
      ref={holderRef}
      className="pointer-events-none absolute"
      style={{ left: `${popup.x}%`, top: `${popup.y}%` }}
    >
      <div
        data-about-popup-parallax
        className="pointer-events-none will-change-transform"
      >
        <div
          ref={chipRef}
          data-about-popup
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={(event) => handlePointerEnd(event, true)}
          style={{ boxShadow: CHIP_SHADOW }}
          className={`pointer-events-auto inline-flex cursor-grab touch-none select-none items-center justify-center whitespace-nowrap rounded-full font-mono text-[10px] font-medium uppercase tracking-wide text-[#2b2b2b] transition-shadow duration-200 will-change-transform active:cursor-grabbing md:text-[12px] ${
            TONE_CLASS[popup.tone]
          } ${iconOnly ? 'h-8 w-8' : 'gap-1.5 px-3 py-1.5'}`}
        >
          <PopupGlyph icon={popup.icon} />
          {popup.label}
        </div>
      </div>
    </div>
  );
}

export function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const mainCopyRef = useRef<HTMLParagraphElement>(null);

  const [popups, setPopups] = useState<Popup[]>([]);
  const zTop = useRef(40);
  const nextZ = () => {
    zTop.current += 1;
    return zTop.current;
  };

  // Measure the copy after mount so chips can be placed around it without
  // obscuring the text or causing a hydration mismatch.
  useEffect(() => {
    const stage = stageRef.current;
    const mainCopy = mainCopyRef.current;
    if (!stage || !mainCopy) return;

    let frame = 0;
    const updatePopups = () => {
      frame = 0;
      setPopups(
        generatePopups(
          window.innerWidth < 768,
          stage.getBoundingClientRect(),
          mainCopy.getBoundingClientRect(),
        ),
      );
    };
    const handleResize = () => {
      if (!frame) frame = window.requestAnimationFrame(updatePopups);
    };

    updatePopups();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* Multi-layer mouse parallax                                          */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const section = sectionRef.current;
    const backdrop = backdropRef.current;
    const content = contentRef.current;
    if (!section || !backdrop || !content) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const layers: ParallaxLayer[] = [
      // far: soft backdrop barely moves, with the most inertia
      { el: backdrop, mode: 'translate', mult: -0.35, lag: 0.05, x: 0, y: 0 },
      // mid: the typography (primary multiplier, same feel as before)
      { el: content, mode: 'translate', mult: -1, lag: 0.08, x: 0, y: 0 },
    ];

    // near: tags drift a little further than the text and trail behind it,
    // so they read as hanging in front of the sentence
    section
      .querySelectorAll<HTMLElement>('[data-about-tag-layer]')
      .forEach((el) => {
        layers.push({ el, mode: 'translate', mult: -0.55, lag: 0.045, x: 0, y: 0 });
      });

    section
      .querySelectorAll<HTMLElement>('[data-about-popup-parallax]')
      .forEach((el) => {
        layers.push({ el, mode: 'translate', mult: -0.7, lag: 0.055, x: 0, y: 0 });
      });

    // the anchor rope sways gently from its pin
    section.querySelectorAll<HTMLElement>('[data-about-rope]').forEach((el) => {
      layers.push({ el, mode: 'sway', mult: 1, lag: 0.06, x: 0, y: 0 });
    });

    let pointerX = 0;
    let pointerY = 0;
    let frame = 0;

    const apply = (layer: ParallaxLayer) => {
      layer.el.style.transform =
        layer.mode === 'sway'
          ? `rotate(${layer.x * 0.25}deg)`
          : `translate3d(${layer.x}px, ${layer.y}px, 0)`;
    };

    const reset = () => {
      layers.forEach((layer) => {
        layer.x = 0;
        layer.y = 0;
        layer.el.style.transform = '';
      });
    };

    const tick = () => {
      let settled = true;

      layers.forEach((layer) => {
        const targetX = pointerX * 12 * layer.mult;
        const targetY = pointerY * 8 * layer.mult;
        layer.x += (targetX - layer.x) * layer.lag;
        layer.y += (targetY - layer.y) * layer.lag;

        if (
          Math.abs(targetX - layer.x) > 0.01 ||
          Math.abs(targetY - layer.y) > 0.01
        ) {
          settled = false;
        }

        apply(layer);
      });

      // stop the loop once everything has caught up; mousemove restarts it
      frame = settled ? 0 : window.requestAnimationFrame(tick);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (reduceMotion.matches) return;

      pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      pointerY = (event.clientY / window.innerHeight) * 2 - 1;

      if (!frame) frame = window.requestAnimationFrame(tick);
    };

    const handleMotionPreference = () => {
      if (reduceMotion.matches) {
        window.cancelAnimationFrame(frame);
        frame = 0;
        reset();
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    reduceMotion.addEventListener('change', handleMotionPreference);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      reduceMotion.removeEventListener('change', handleMotionPreference);
      window.cancelAnimationFrame(frame);
      reset();
    };
  }, [popups]);

  /* ------------------------------------------------------------------ */
  /* Pinned scroll-scrub kinetic typography                              */
  /* ------------------------------------------------------------------ */
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    const media = gsap.matchMedia();

    media.add(
      {
        full: '(prefers-reduced-motion: no-preference)',
        reduced: '(prefers-reduced-motion: reduce)',
      },
      (context) => {
        const reduced = Boolean(context.conditions?.reduced);

        const parts = gsap.utils.toArray<HTMLElement>(
          '[data-about-part]',
          section
        );
        const notes = gsap.utils.toArray<HTMLElement>(
          '[data-about-note]',
          section
        );
        const chars = parts.map((part) =>
          gsap.utils.toArray<HTMLElement>('[data-about-char]', part)
        );

        if (
          parts.length !== COPY_PARTS.length ||
          notes.length !== NOTE_COUNT ||
          chars.some((lineChars) => lineChars.length === 0)
        ) {
          console.error(
            'About section copy and animation targets are out of sync'
          );
          return;
        }

        const height = () => stage.clientHeight;
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            pin: stage,
            start: 'top top',
            end: () => `+=${height() * 2.8}`,
            scrub: 0.7,
            pinSpacing: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onToggle: (self) => {
              setBackgroundScrollPaused(BACKGROUND_PAUSE_REASON, self.isActive);
            },
          },
        });

        // Tags hang from the top-center of their string, so every rotation
        // pivots around the attachment point like a real pendulum.
        gsap.set(notes, {
          autoAlpha: 0,
          xPercent: -50,
          transformOrigin: '50% 0%',
          ...(reduced ? {} : { y: 6, scale: 0.86, rotation: -16 }),
        });

        const totalCharacters = chars.reduce(
          (total, lineChars) => total + lineChars.length,
          0
        );
        let noteIndex = 0;
        let characterIndex = 0;
        let timelinePosition = 0;
        let timelineEnd = 0;

        parts.forEach((_, index) => {
          let lastCharacterEnd = timelinePosition;

          chars[index].forEach((char) => {
            const characterGap =
              characterIndex / totalCharacters >= 0.82 ? 0.06 : 0.025;

            if (reduced) {
              // colour sweep only, no movement
              timeline.to(
                char,
                { color: INK, duration: 0.12, ease: 'none' },
                timelinePosition
              );
              lastCharacterEnd = timelinePosition + 0.12;
            } else {
              // A travelling sine wave across the sentence: neighbouring
              // characters lift and tilt out of phase, then overshoot
              // slightly and settle, like a ripple through cloth.
              const phase = characterIndex * 0.6;
              const lift = Math.sin(phase) * -6;
              const tilt = Math.cos(phase) * 2; // stays within ±2deg

              timeline.to(
                char,
                {
                  keyframes: [
                    {
                      color: ACCENT,
                      y: lift,
                      rotation: tilt,
                      duration: 0.1,
                      ease: 'power2.out',
                    },
                    {
                      color: INK,
                      y: -lift * 0.3,
                      rotation: -tilt * 0.4,
                      duration: 0.07,
                      ease: 'power3.out',
                    },
                    {
                      y: 0,
                      rotation: 0,
                      duration: 0.08,
                      ease: 'back.out(2.2)',
                    },
                  ],
                },
                timelinePosition
              );
              lastCharacterEnd = timelinePosition + 0.25;
            }

            timelineEnd = Math.max(timelineEnd, lastCharacterEnd);
            timelinePosition += characterGap;
            characterIndex += 1;
          });

          if (COPY_PARTS[index].note) {
            const note = notes[noteIndex];

            if (reduced) {
              timeline.to(
                note,
                { autoAlpha: 1, duration: 0.18, ease: 'none' },
                lastCharacterEnd
              );
              timelineEnd = Math.max(timelineEnd, lastCharacterEnd + 0.18);
              timelinePosition = Math.max(
                timelinePosition,
                lastCharacterEnd + 0.18
              );
            } else {
              // drop in with an overshoot...
              timeline.to(
                note,
                {
                  autoAlpha: 1,
                  y: 0,
                  scale: 1,
                  duration: 0.16,
                  ease: 'back.out(2)',
                },
                lastCharacterEnd
              );
              // ...while the tag swings about its string and settles to rest
              timeline.to(
                note,
                {
                  rotation: 0,
                  duration: 0.55,
                  ease: 'elastic.out(1, 0.4)',
                },
                lastCharacterEnd
              );
              timelineEnd = Math.max(timelineEnd, lastCharacterEnd + 0.55);
              // following characters carry on while the tag is still swinging
              timelinePosition = Math.max(
                timelinePosition,
                lastCharacterEnd + 0.2
              );
            }

            noteIndex += 1;
          }
        });

        timeline.to({}, { duration: 0.2 }, Math.max(timelinePosition, timelineEnd));

        return () => {
          timeline.kill();
          setBackgroundScrollPaused(BACKGROUND_PAUSE_REASON, false);
        };
      }
    );

    return () => media.revert();
  }, []);

  /* ------------------------------------------------------------------ */
  /* Popup chips: pop in at random points while scrolling the pinned     */
  /* section, and reverse as you scroll back up                          */
  /* ------------------------------------------------------------------ */
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage || popups.length === 0) return;

    const media = gsap.matchMedia();

    media.add(
      {
        full: '(prefers-reduced-motion: no-preference)',
        reduced: '(prefers-reduced-motion: reduce)',
      },
      (context) => {
        const reduced = Boolean(context.conditions?.reduced);
        const items = gsap.utils.toArray<HTMLElement>(
          '[data-about-popup]',
          section
        );
        if (items.length !== popups.length) return;

        gsap.set(items, {
          autoAlpha: 0,
          ...(reduced
            ? {}
            : {
                scale: 0.5,
                y: 14,
                rotation: (index: number) => popups[index].rotate - 14,
              }),
        });

        // same scroll range as the pinned timeline, but no pin of its own
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => `+=${stage.clientHeight * 2.8}`,
            scrub: 0.5,
            invalidateOnRefresh: true,
          },
        });

        timeline.to({}, { duration: 1 }, 0); // fixes the timeline length at 1

        items.forEach((item, index) => {
          const popup = popups[index];
          if (reduced) {
            timeline.to(item, { autoAlpha: 1, duration: 0.04, ease: 'none' }, popup.at);
          } else {
            timeline.to(
              item,
              {
                autoAlpha: 1,
                scale: 1,
                y: 0,
                rotation: popup.rotate,
                duration: 0.1,
                ease: 'back.out(2.2)',
              },
              popup.at
            );
          }
        });

        return () => {
          timeline.kill();
        };
      }
    );

    return () => media.revert();
  }, [popups]);

  return (
    <section
      ref={sectionRef}
      id="section-2"
      data-section="section-2"
      aria-labelledby="about-heading"
      className="relative z-10 w-full md:min-h-screen"
    >
      <div
        ref={stageRef}
        data-about-stage
        className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-6 py-16 md:h-screen md:min-h-0 md:px-12"
      >
        {/* Far layer: soft tonal wash that drifts least */}
        <div
          ref={backdropRef}
          aria-hidden="true"
          className="pointer-events-none absolute -inset-10 will-change-transform "
        />

        {/* Mid layer: typography */}
        <div
          ref={contentRef}
          className="relative w-full max-w-[1000px] text-center will-change-transform"
        >
          <p className="mb-8 font-mono text-[12px] tracking-[0.28em] uppercase text-[#000000] ">
            A bit about me
          </p>

          <h2 id="about-heading" className="sr-only">
            How I approach my work
          </h2>
          <p
            ref={mainCopyRef}
            data-about-main-copy
            aria-label={COPY_PARTS.map((part) => part.text).join('')}
            className="text-[clamp(2rem,4.2vw,3.5rem)] leading-[1.55] tracking-[0.065em] text-[#c2c2c2] md:leading-[1.75] lg:leading-[1.38]"
          >
            {COPY_PARTS.map((part, partIndex) => (
              <span
                key={partIndex}
                data-about-part
                className={part.note ? 'relative inline-block' : 'inline'}
              >
                {Array.from(part.text).map((char, charIndex) =>
                  char === ' ' ? (
                    <Fragment key={charIndex}> </Fragment>
                  ) : (
                    <span
                      key={charIndex}
                      data-about-char
                      className="inline-block text-[#c2c2c2]"
                    >
                      {char}
                    </span>
                  )
                )}

                {part.note && (
                  /*
                   * Three nested layers so transforms never fight:
                   *  anchor  – zero-size point on the word's baseline (CSS only)
                   *  layer   – mouse parallax (rAF-driven)
                   *  note    – GSAP scroll swing, pivoting at the top of the string
                   */
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-[calc(100%-0.18em)] z-20 h-0 w-0"
                  >
                    <span
                      data-about-tag-layer
                      className="absolute left-0 top-0 block will-change-transform"
                    >
                      <span
                        data-about-note
                        className="absolute left-0 top-0 flex w-max flex-col items-center"
                      >
                        {/* string + pin dot, reaching up to the word */}
                        <span className="relative block h-3 w-px bg-[#000000]/45 lg:h-4">
                          <span className="absolute left-1/2 top-0 h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#000000]" />
                        </span>
                        <span className="whitespace-nowrap rounded-full bg-[#000744] px-3 py-1 font-mono text-[10px] lg:text-[14px] font-medium tracking-normal text-white shadow-[0_8px_24px_-12px_rgba(255,77,10,0.8)]">
                          {part.note}
                        </span>
                      </span>
                    </span>
                  </span>
                )}
              </span>
            ))}
          </p>
        </div>

        {/* Popup chips: free-floating, draggable, no strings */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-30">
          {popups.map((popup) => (
            <PopupChip key={popup.id} popup={popup} nextZ={nextZ} />
          ))}
        </div>
      </div>
    </section>
  );
}