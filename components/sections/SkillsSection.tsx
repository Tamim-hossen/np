'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Skill } from '@/data/skills';

/* -------------------------------------------------------------------------- */
/*  Config                                                                     */
/* -------------------------------------------------------------------------- */

/** Optional fields. If your Skill type has them, the detail card uses them. */
type SkillExtras = { proficiency?: number; description?: string; category?: string };

type OrbitNode = { skill: Skill; ring: number; phase: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number };
type LineState = { from: number; to: number; born: number; curve: number; detail: number };

/** Below this width the orbit is replaced by a static tile grid. */
const MOBILE_QUERY = '(max-width: 766px)';

/** Ring half-width as a fraction of the container width (inner → outer). */
const RING_X = [0.24, 0.35, 0.45];
/** Ring height as a fraction of its width. */
const RING_Y = 0.56;
/** Slight tilt per ring, like the mockup. */
const RING_TILT = [-7, 5, -3].map((d) => (d * Math.PI) / 180);
/** Radians per second. Alternating directions. */
const RING_SPEED = [0.14, -0.1, 0.07];
const RING_SEGMENTS = 160;
const WAVE_PX = 7;
const THREAD_COLOR = '#000000';

/** Hovered orbit stops in a few hundred ms. Other orbits glide to a stop over ~2s. */
const STOP_RATE_HOVERED = 16;
const STOP_RATE_OTHERS = 1.8;
const RESUME_RATE = 2.5;

const LINE_DRAW = 1.6; // seconds to draw from one node to the other
const LINE_LIFE = 5; // seconds before an untouched line breaks by itself
const LINE_GAP = 0.5; // pause before the next line starts

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** A point on an (optionally waving) tilted ellipse, relative to the centre. */
function ringPoint(ring: number, phi: number, width: number, amp: number, t: number) {
  const radiusScale = width < 320 ? 0.5 : width < 400 ? 0.58 : width < 900 ? 0.86 : 1;
  const rx = width * RING_X[ring] * radiusScale;
  const ry = rx * RING_Y;
  const wave =
    amp * WAVE_PX * (Math.sin(3 * phi + t * 5 + ring * 1.3) + 0.5 * Math.sin(5 * phi - t * 7));
  const x = (rx + wave) * Math.cos(phi);
  const y = (ry + wave * RING_Y) * Math.sin(phi);
  const c = Math.cos(RING_TILT[ring]);
  const s = Math.sin(RING_TILT[ring]);
  return { x: x * c - y * s, y: x * s + y * c };
}

function threadPath(
  a: { x: number; y: number },
  b: { x: number; y: number },
  curve: number,
  detail: number,
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const nx = distance ? -dy / distance : 0;
  const ny = distance ? dx / distance : 0;
  const points = Array.from({ length: 9 }, (_, i) => {
    const u = i / 8;
    const wave =
      Math.sin(u * Math.PI * 2) * 0.55 +
      Math.sin(u * Math.PI * 4) * detail * 0.3 +
      Math.sin(u * Math.PI * 6) * (1 - detail) * 0.15;
    const offset = distance * curve * wave;
    const tilt = distance * detail * 0.035 * Math.sin(u * Math.PI * 2);
    return {
      x: a.x + dx * u + nx * offset + (distance ? (dx / distance) * tilt : 0),
      y: a.y + dy * u + ny * offset + (distance ? (dy / distance) * tilt : 0),
    };
  });
  let d = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const previous = points[Math.max(0, i - 1)];
    const start = points[i];
    const end = points[i + 1];
    const next = points[Math.min(points.length - 1, i + 2)];
    const c1x = start.x + (end.x - previous.x) / 6;
    const c1y = start.y + (end.y - previous.y) / 6;
    const c2x = end.x - (next.x - start.x) / 6;
    const c2y = end.y - (next.y - start.y) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
  }
  return d;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function SkillsSection({ skills }: { skills: Skill[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodeEls = useRef<(HTMLDivElement | null)[]>([]);
  const ringEls = useRef<(SVGPathElement | null)[]>([]);
  const ringHitEls = useRef<(SVGPathElement | null)[]>([]);
  const lineEl = useRef<SVGPathElement>(null);
  const lineHitEl = useRef<SVGPathElement>(null);
  const tipEl = useRef<SVGCircleElement>(null);

  /** null until the first client check, so the wrong layout never flashes. */
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [size, setSize] = useState({ w: 1100, h: 640 });
  const [hovered, setHovered] = useState<number | null>(null);

  // Read by the animation loop so hover never restarts it.
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const hoveredNodeRef = useRef<number | null>(null);
  const hoveredRingRef = useRef<number | null>(null);
  const ringShakeAtRef = useRef(RING_X.map(() => 0));
  const pointerTargetRef = useRef({ x: 0, y: 0 });
  const breakRequestRef = useRef(false);

  /* ------------------------- Mobile / orbit switch ------------------------ */
  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const apply = () => setIsMobile(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  /* ---------------------------- Responsive size --------------------------- */
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const apply = (width: number) => {
      const w = Math.max(1, Math.round(width));
      const h = Math.round(Math.min(720, Math.max(520, w * 0.62)));
      setSize((p) => (p.w === w && p.h === h ? p : { w, h }));
    };
    apply(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => apply(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMobile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
  }, [size.w, size.h, isMobile]);

  /* ------------------------ Spread skills over rings ---------------------- */
  const nodes = useMemo<OrbitNode[]>(() => {
    const total = skills.length;
    if (!total) return [];
    const sum = RING_X.reduce((a, b) => a + b, 0);
    const counts = RING_X.map((r) => Math.floor((r / sum) * total));
    let rest = total - counts.reduce((a, b) => a + b, 0);
    for (let i = counts.length - 1; rest > 0; i = (i - 1 + counts.length) % counts.length, rest--) {
      counts[i]++;
    }
    const result: OrbitNode[] = [];
    let cursor = 0;
    counts.forEach((count, ring) => {
      for (let k = 0; k < count; k++) {
        result.push({
          skill: skills[cursor++],
          ring,
          phase: (k / count) * Math.PI * 2 + ring * 0.9,
        });
      }
    });
    return result;
  }, [skills]);

  /* ----------------------------- Animation loop --------------------------- */
  useEffect(() => {
    const section = sectionRef.current;
    // The orbit only runs on tablet and larger.
    if (isMobile !== false || !section || nodes.length === 0) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const angles = nodes.map((n) => n.phase);
    const mult = RING_X.map(() => 1); // per-ring speed multiplier (0 = stopped)
    const ringDirty = RING_X.map(() => true);
    const pos = nodes.map(() => ({ x: 0, y: 0 }));
    const particles: Particle[] = [];

    let line: LineState | null = null;
    let nextSpawn = 0.6;
    let t = 0;
    let last = performance.now();
    let visible = true;
    let hadParticles = false;
    let lastW = 0;
    let lastH = 0;
    let raf = 0;
    const pointer = { x: 0, y: 0 };
    const ringOffsets = RING_X.map(() => ({ x: 0, y: 0 }));
    const ringDepth = [0.4, 0.7, 1];

    const onPointerMove = (event: PointerEvent) => {
      if (reduce || event.pointerType !== 'mouse') return;
      const bounds = section.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      ) {
        pointerTargetRef.current = { x: 0, y: 0 };
        return;
      }
      pointerTargetRef.current = {
        x: (event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5,
        y: (event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5,
      };
    };
    const resetPointer = () => {
      pointerTargetRef.current = { x: 0, y: 0 };
    };
    section.addEventListener('pointermove', onPointerMove, { passive: true });
    section.addEventListener('pointerleave', resetPointer);

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(section);

    const spawnLine = () => {
      const from = Math.floor(Math.random() * nodes.length);
      const all = nodes.map((_, i) => i).filter((i) => i !== from);
      const otherRing = all.filter((i) => nodes[i].ring !== nodes[from].ring);
      const pool = otherRing.length ? otherRing : all;
      const to = pool[Math.floor(Math.random() * pool.length)];
      line = {
        from,
        to,
        born: t,
        curve: (Math.random() < 0.5 ? -1 : 1) * (0.18 + Math.random() * 0.2),
        detail: 0.25 + Math.random() * 0.7,
      };
      breakRequestRef.current = false;
    };

    const clearLine = () => {
      lineEl.current?.setAttribute('d', '');
      lineHitEl.current?.setAttribute('d', '');
      tipEl.current?.setAttribute('r', '0');
    };

    const burst = (path: SVGPathElement | null, upTo: number) => {
      if (!path) return;
      const n = 36;
      const length = path.getTotalLength();
      for (let k = 0; k < n; k++) {
        const u = ((k + Math.random()) / n) * upTo;
        const point = path.getPointAtLength(length * u);
        const ang = Math.random() * Math.PI * 2;
        const speed = 18 + Math.random() * 60;
        particles.push({
          x: point.x,
          y: point.y,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed - 10,
          life: 0,
          max: 0.6 + Math.random() * 0.7,
          r: 1 + Math.random() * 1.8,
        });
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!visible) return;
      t += dt;

      const { w, h } = sizeRef.current;
      const cx = w / 2;
      const cy = h / 2;
      const pointerEase = 1 - Math.exp(-3.5 * dt);
      pointer.x += (pointerTargetRef.current.x - pointer.x) * pointerEase;
      pointer.y += (pointerTargetRef.current.y - pointer.y) * pointerEase;
      labelRef.current?.style.setProperty(
        'transform',
        `translate3d(${(-pointer.x * 8).toFixed(2)}px, ${(-pointer.y * 5).toFixed(2)}px, 0)`,
      );
      headlineRef.current?.style.setProperty(
        'transform',
        `translate3d(${(-pointer.x * 12).toFixed(2)}px, ${(-pointer.y * 8).toFixed(2)}px, 0)`,
      );

      if (w !== lastW || h !== lastH) {
        lastW = w;
        lastH = h;
        ringDirty.fill(true);
      }

      /* 1. Orbit speeds: hovered ring stops fast, the rest glide to a stop */
      const hn = hoveredNodeRef.current;
      const stopRing = hn !== null ? (nodes[hn]?.ring ?? null) : null;
      for (let r = 0; r < mult.length; r++) {
        let target = 1;
        let rate = RESUME_RATE;
        if (stopRing !== null) {
          target = 0;
          rate = r === stopRing ? STOP_RATE_HOVERED : STOP_RATE_OTHERS;
        }
        mult[r] += (target - mult[r]) * (1 - Math.exp(-rate * dt));
        if (target === 0 && mult[r] < 0.02) mult[r] = 0;
      }

      /* 3. Orbit rings */
      for (let r = 0; r < RING_X.length; r++) {
        const offset = ringOffsets[r];
        const nextX = pointer.x * 24 * ringDepth[r];
        const nextY = pointer.y * 16 * ringDepth[r];
        if (Math.abs(offset.x - nextX) > 0.01 || Math.abs(offset.y - nextY) > 0.01) {
          offset.x += (nextX - offset.x) * pointerEase;
          offset.y += (nextY - offset.y) * pointerEase;
          ringDirty[r] = true;
        }
        const isHovered = hoveredRingRef.current === r;
        const startedAt = ringShakeAtRef.current[r];
        const shake = reduce || !startedAt ? 0 : Math.exp(-4.2 * ((now - startedAt) / 1000));
        if (shake < 0.005) ringShakeAtRef.current[r] = 0;
        if (shake > 0 || ringDirty[r]) {
          let d = '';
          for (let k = 0; k <= RING_SEGMENTS; k++) {
            const p = ringPoint(r, (k / RING_SEGMENTS) * Math.PI * 2, w, shake * 1.25, t);
            d += `${k ? 'L' : 'M'}${(cx + p.x + offset.x).toFixed(1)} ${(cy + p.y + offset.y).toFixed(1)}`;
          }
          d += 'Z';
          ringEls.current[r]?.setAttribute('d', d);
          ringHitEls.current[r]?.setAttribute('d', d);
          ringDirty[r] = shake > 0;
        }
        const el = ringEls.current[r];
        if (el) {
          el.style.strokeOpacity = (isHovered ? 0.8 : 0.5 + 0.22 * shake).toFixed(3);
          el.style.strokeWidth = (isHovered ? 2 : 1 + shake).toFixed(2);
        }
      }

      /* 4. Nodes ride their ring (including the wave) with a small shake */
      for (let i = 0; i < nodes.length; i++) {
        const ring = nodes[i].ring;
        if (!reduce) angles[i] += RING_SPEED[ring] * mult[ring] * dt;
        const startedAt = ringShakeAtRef.current[ring];
        const shake = reduce || !startedAt
          ? 0
          : Math.exp(-4.2 * ((now - startedAt) / 1000));
        const p = ringPoint(ring, angles[i], w, shake * 1.25, t);
        const offset = ringOffsets[ring];
        const x = cx + p.x + offset.x + shake * Math.sin(t * 23 + i * 1.7);
        const y = cy + p.y + offset.y + shake * Math.cos(t * 19 + i * 2.3);
        pos[i].x = x;
        pos[i].y = y;
        const el = nodeEls.current[i];
        if (el) {
          const tilt = shake * 2.2 * Math.sin(t * 9 + i);
          el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) translate(-50%, -50%) rotate(${tilt.toFixed(2)}deg)`;
        }
      }

      /* 5. One connecting line at a time */
      if (nodes.length > 1) {
        if (!line && t >= nextSpawn) spawnLine();
        if (line) {
          const a = pos[line.from];
          const b = pos[line.to];
          const age = t - line.born;
          const progress = reduce ? 1 : easeInOut(Math.min(1, age / LINE_DRAW));

          if (breakRequestRef.current || age >= LINE_LIFE) {
            if (!reduce) burst(lineEl.current, progress);
            line = null;
            breakRequestRef.current = false;
            nextSpawn = t + LINE_GAP;
            clearLine();
          } else {
            const d = threadPath(a, b, line.curve, line.detail);
            const path = lineEl.current;
            const hit = lineHitEl.current;
            const offset = (1 - progress).toFixed(4);
            if (path) {
              path.setAttribute('d', d);
              path.setAttribute('stroke-dashoffset', offset);
            }
            if (hit) {
              hit.setAttribute('d', d);
              hit.setAttribute('stroke-dashoffset', offset);
            }
            const tip = tipEl.current;
            if (tip && path) {
              if (progress < 1) {
                const pt = path.getPointAtLength(path.getTotalLength() * progress);
                tip.setAttribute('cx', pt.x.toFixed(1));
                tip.setAttribute('cy', pt.y.toFixed(1));
                tip.setAttribute('r', '3.5');
              } else {
                tip.setAttribute('r', '0');
              }
            }
          }
        }
      }

      /* 6. Break particles */
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx && (particles.length > 0 || hadParticles)) {
        const dpr = canvas.width / Math.max(w, 1);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = THREAD_COLOR;
        ctx.shadowColor = 'rgba(31, 34, 68, 0.45)';
        ctx.shadowBlur = 5;
        const drag = Math.exp(-2.5 * dt);
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.life += dt;
          if (p.life >= p.max) {
            particles.splice(i, 1);
            continue;
          }
          const k = p.life / p.max;
          p.vx *= drag;
          p.vy *= drag;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          ctx.globalAlpha = 1 - k;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * (1 - k * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        hadParticles = particles.length > 0;
      }
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      section.removeEventListener('pointermove', onPointerMove);
      section.removeEventListener('pointerleave', resetPointer);
    };
  }, [nodes, isMobile]);

  /* --------------------------------- Render ------------------------------- */
  const triggerRingShake = (ring: number) => {
    ringShakeAtRef.current[ring] = performance.now();
  };
  const nodeSize = Math.round(52 * Math.min(1, Math.max(0.75, size.w / 1100)));
  const extras = hovered !== null ? (nodes[hovered]?.skill as (Skill & SkillExtras) | undefined) : undefined;
  const showCard =
    !!extras && (typeof extras.proficiency === 'number' || !!extras.description || !!extras.category);

  /* Before the first client check: keep the section's space, render nothing. */
  if (isMobile === null) {
    return (
      <section
        ref={sectionRef}
        id="skills-orbit-section"
        aria-label="Skills"
        className="min-h-[24rem] w-full"
      />
    );
  }

  /* Mobile (< 767px): static grid of white tiles on a white background. */
  if (isMobile) {
    return (
      <section
        ref={sectionRef}
        id="skills-orbit-section"
        aria-label="Skills"
        className="relative w-full px-4 py-12 text-[#000000]"
      >
        <p className="mb-8 text-sm text-center uppercase tracking-[0.2em] text-[#737691]">SKILLS</p>


        <ul className="grid grid-cols-3 gap-3 min-[420px]:gap-4">
          {skills.map((skill, i) => (
            <li
              key={skill.id || i}
              className="flex aspect-square flex-col items-center justify-center gap-20 rounded-3xl border border-black/5 overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.10)] opacity-90"
            >
              {skill.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={skill.image}
                  alt=""
                  draggable={false}
                  loading="lazy"
                  className="h-full w-full object-contain"
                />
              )}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  /* Tablet and larger: the orbit. */
  return (
    <section
      ref={sectionRef}
      id="skills-orbit-section"
      aria-label="Skills"
      className="relative isolate flex flex-col w-full items-center justify-center overflow-hidden bg-transparent px-4 py-12 text-[#000000]"
    ><p ref={labelRef} className='text-xs uppercase tracking-[0.2em] sm:text-sm text-[#737691] mb-2'>SKILLS</p>
      <div
        ref={wrapperRef}
        className="relative w-full max-w-6xl"
        style={{ height: size.h }}
      >
        {/* Headline sits behind the orbits */}
        <div className="pointer-events-none absolute inset-0 z-0 grid place-items-center px-6">
          <h2
            ref={headlineRef}
            className="text-center text-sm md:text-lg uppercase leading-[1.04] tracking-[0.2em] max-w-80 text-[#737691]"

          >
            I build thoughtful and scaleable software
          </h2>
        </div>

        {/* Orbit rings + connecting line */}
        <svg
          className="pointer-events-none absolute inset-0 z-10 overflow-visible"
          width={size.w}
          height={size.h}
          aria-hidden="true"
        >
          {RING_X.map((_, r) => (
            <g key={r}>
              <path
                ref={(el) => {
                  ringEls.current[r] = el;
                }}
                fill="none"
                stroke="#000000"
                strokeOpacity={0.14}
                strokeWidth={1}
                strokeDasharray={r === 1 ? '5 6' : undefined}
              />
              <path
                ref={(el) => {
                  ringHitEls.current[r] = el;
                }}
                fill="none"
                stroke="transparent"
                strokeWidth={22}
                style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                onPointerEnter={() => {
                  hoveredRingRef.current = r;
                  triggerRingShake(r);
                }}
                onPointerLeave={() => {
                  if (hoveredRingRef.current === r) hoveredRingRef.current = null;
                }}
              />
            </g>
          ))}

          <path
            ref={lineEl}
            pathLength={1}
            fill="none"
            stroke={THREAD_COLOR}
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="1 1"
            strokeDashoffset={1}
            style={{ filter: 'drop-shadow(0 0 3px rgba(85, 88, 112, 0.35))' }}
          />
          <path
            ref={lineHitEl}
            pathLength={1}
            fill="none"
            stroke="transparent"
            strokeWidth={20}
            strokeDasharray="1 1"
            strokeDashoffset={1}
            style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
            onPointerEnter={() => {
              breakRequestRef.current = true;
            }}
          />
          <circle
            ref={tipEl}
            r={0}
            fill={THREAD_COLOR}
            style={{ filter: 'drop-shadow(0 0 6px rgba(85, 88, 112, 0.4))' }}
          />
        </svg>

        {/* Skill nodes */}
        {nodes.map((node, i) => {
          const isHover = hovered === i;
          const hasImage = Boolean(node.skill.image);
          return (
            <div
              key={node.skill.id || i}
              ref={(el) => {
                nodeEls.current[i] = el;
              }}
              role="img"
              aria-label={node.skill.name}
              className={`absolute left-0 top-0 select-none will-change-transform ${isHover ? 'z-30' : 'z-20'}`}
              style={{
                transform: `translate3d(${size.w / 2}px, ${size.h / 2}px, 0) translate(-50%, -50%)`,
              }}
              onPointerEnter={() => {
                hoveredNodeRef.current = i;
                triggerRingShake(node.ring);
                setHovered(i);
              }}
              onPointerLeave={() => {
                if (hoveredNodeRef.current === i) {
                  hoveredNodeRef.current = null;
                  setHovered(null);
                }
              }}
            >
              <div
                className={`flex cursor-pointer items-center overflow-hidden rounded-full border backdrop-blur-md transition-[transform,box-shadow,background-color] duration-300 ${
                  isHover
                    ? 'scale-110 border-white bg-white shadow-[0_10px_30px_rgba(31,34,68,0.22)]'
                    : 'border-white/70 bg-white/65 shadow-[0_4px_16px_rgba(31,34,68,0.12)]'
                }`}
                style={{ height: nodeSize, minWidth: nodeSize }}
              >
                {hasImage && (
                  <span
                    className="grid shrink-0 place-items-center"
                    style={{ width: nodeSize, height: nodeSize }}
                  >
                    <img
                      src={node.skill.image}
                      alt=""
                      draggable={false}
                      className="object-contain"
                      style={{ width: nodeSize * 0.5, height: nodeSize * 0.5 }}
                    />
                  </span>
                )}
                <span
                  className={`whitespace-nowrap font-mono text-[11px] font-medium uppercase tracking-wider transition-all duration-300 ${
                    hasImage
                      ? isHover
                        ? 'max-w-24 truncate pr-4 opacity-100 sm:max-w-40'
                        : 'max-w-0 pr-0 opacity-0'
                      : 'max-w-32 truncate px-3 opacity-100 sm:max-w-40 sm:px-4'
                  }`}
                >
                  {node.skill.name}
                </span>
              </div>
            </div>
          );
        })}

        {/* Break particles */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[25]"
          style={{ width: size.w, height: size.h }}
        />

        {/* Detail card (only when the skill has extra data) */}
        {showCard && extras && (
          <div
            className="pointer-events-none absolute inset-x-2 bottom-2 z-40 mx-auto w-auto max-w-64 border border-[#000000]/10 bg-white/85 p-4 shadow-xl backdrop-blur-md"
            aria-live="polite"
          >
            <p className="text-sm font-semibold">{extras.name}</p>
            {extras.category && <p className="mt-1 text-xs text-[#555870]">{extras.category}</p>}
            {typeof extras.proficiency === 'number' && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-[#555870]">
                  <span>Proficiency</span>
                  <span>{Math.round(extras.proficiency)}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full bg-[#000000]/10">
                  <div
                    className="h-full bg-[#000000]"
                    style={{ width: `${Math.min(100, Math.max(0, extras.proficiency))}%` }}
                  />
                </div>
              </div>
            )}
            {extras.description && (
              <p className="mt-3 text-xs leading-5 text-[#555870]">{extras.description}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}