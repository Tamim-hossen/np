'use client';

import React, { useEffect, useRef } from 'react';
import { isLargeMouseViewport } from '@/lib/large-mouse';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type Vec2 = { x: number; y: number };

type LetterSpec = {
  id: string;
  character: string;
  x: number;
  mobileX?: number;
  y: number;
  className: string;
  /** Collision box as a fraction of the element box (glyphs are smaller than their line box). */
  hitbox?: { w: number; h: number };
};

type LetterBody = LetterSpec & {
  element: HTMLSpanElement;

  // Rigid-body state (all coordinates are section-local px, origin = body centre)
  pos: Vec2;
  vel: Vec2;
  angle: number;
  angVel: number;

  // Previous physics step, used to interpolate rendering between steps
  prevX: number;
  prevY: number;
  prevAngle: number;

  // Rope: fixed at `anchor`, attached to the CENTRE of the letter
  anchor: Vec2;
  ropeLength: number;

  // Geometry / mass properties
  hw: number; // collision half-width
  hh: number; // collision half-height
  invMass: number;
  invInertia: number;
  mass: number;

  // Lifecycle
  startAt: number;
  /** Hidden (and not drawn) until its drop starts. */
  deferReveal: boolean;

  // Parallax base (anchor.x = baseAnchorX + current parallax offset)
  baseAnchorX: number;

  // Thread tug (signed offset along the rope's normal, damped spring)
  tugOffset: number;
  tugVel: number;
  tugT: number; // 0..1 position of the pluck along the rope
  tugReadyAt: number;
  hovering: boolean;

  // Scroll stretch (damped spring, 0 = normal) and per-letter strength
  stretch: number;
  stretchVel: number;
  scrollGain: number;
  scrollReadyAt: number;

  /** Last values written to the DOM, so unchanged letters cost nothing. */
  lastX: number;
  lastY: number;
  lastAngle: number;
  lastTug: number;
  lastStretch: number;
  released: boolean;
  /** True once the rope has gone taut for the first time. Collisions are skipped until then. */
  armed: boolean;

  // Dragging (soft spring on a grab point, so off-centre grabs tilt the letter)
  dragging: boolean;
  pointerId: number | null;
  grabLocal: Vec2;
  dragTarget: Vec2;
  /** Smoothed version of dragTarget, so jumpy pointer events don't jerk the letter. */
  dragCur: Vec2;
};

type ContactPoint = {
  ra: Vec2;
  rb: Vec2;
  kN: number;
  kT: number;
  vBias: number;
  jn: number;
  jt: number;
};

type Contact = {
  a: LetterBody;
  b: LetterBody;
  n: Vec2; // from a to b
  t: Vec2;
  depth: number;
  points: ContactPoint[];
};

/* -------------------------------------------------------------------------- */
/*  Content                                                                   */
/* -------------------------------------------------------------------------- */

const BIG = 'text-6xl sm:text-7xl md:text-8xl lg:text-[7.5rem]';

const LETTERS: LetterSpec[] = [
  { id: 'greeting-h', character: 'H', x: 30.5, y: 25, className: BIG },
  {
    id: 'greeting-comma',
    character: ',',
    x: 20,
    y: 44,
    className: 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl',
    hitbox: { w: 1, h: 0.4 },
  },
  { id: 'greeting-i', character: 'I', x: 37, y: 25, className: BIG },
  { id: 'intro-i', character: 'I', x: 15, mobileX: 14, y: 46, className: BIG },
  { id: 'intro-m', character: 'M', x: 25, mobileX: 29, y: 46, className: BIG },
  { id: 'name-t', character: 'T', x: 41, mobileX: 43, y: 65, className: BIG },
  { id: 'name-a', character: 'A', x: 51, mobileX: 53, y: 65, className: BIG },
  { id: 'name-m-1', character: 'M', x: 61, mobileX: 65, y: 65, className: BIG },
  { id: 'name-i', character: 'I', x: 71, mobileX: 74, y: 65, className: BIG },
  { id: 'name-m-2', character: 'M', x: 81, mobileX: 83, y: 65, className: BIG },
];

/* -------------------------------------------------------------------------- */
/*  Physics constants (px, seconds)                                           */
/* -------------------------------------------------------------------------- */

const GRAVITY = 2200;
const DROP_GRAVITY_MULT = 3; // extra gravity only until the rope first goes taut
const DROP_INITIAL_SPEED = 900; // px/s initial downward speed (desktop)
const COMPACT_DROP_INITIAL_SPEED = 500; // px/s initial downward speed (compact)
const FIXED_DT = 1 / 240; // fixed sub-step => deterministic, frame-rate independent
const MAX_FRAME_TIME = 1 / 20;
const SOLVER_ITERATIONS = 8;

// Cheaper simulation on compact (mobile) screens
const COMPACT_FIXED_DT = 1 / 120;
const COMPACT_SOLVER_ITERATIONS = 5;
const MAX_STEPS_PER_FRAME = 8; // never let a slow frame snowball into a bigger one

// The loop stops entirely once everything has come to rest
const SLEEP_LINEAR_SPEED = 3; // px/s
const SLEEP_ANGULAR_SPEED = 0.03; // rad/s
const SLEEP_AFTER_FRAMES = 45;

const LINEAR_DRAG = 1.4; // 1/s, air resistance
const ANGULAR_DRAG = 2.4; // 1/s

// A letter hung from its centre has no natural "up", so a soft torsion spring keeps type legible.
const UPRIGHT_FREQ = 8; // rad/s
const UPRIGHT_DAMPING = 0.3; // damping ratio

const ROPE_EPSILON = 0.5; // px tolerance before the rope is considered taut
const ROPE_RESTITUTION = 0.2; // small snap-back when the rope goes taut hard
const ROPE_BOUNCE_THRESHOLD = 60; // px/s, below this the rope is perfectly inelastic (no jitter)

const RESTITUTION = 0.4;
const RESTITUTION_THRESHOLD = 40; // px/s
const FRICTION = 0.4;
const PENETRATION_SLOP = 0.5;
const CORRECTION_FACTOR = 0.4;

const MAX_SPEED = 5000;
const MAX_ANGULAR_SPEED = 12;

const DRAG_FREQ = 30; // rad/s, stiffness of the grab spring
const DRAG_DAMPING = 1; // critically damped
const DRAG_ANGULAR_DAMPING = 8; // extra 1/s while held, stops wild spinning
const DRAG_TARGET_SMOOTHING = 80; // 1/s, how quickly the grab target follows the pointer

const DEFAULT_HITBOX = { w: 0.9, h: 0.72 };

// 1. Mouse parallax: the ceiling anchors drift with the cursor, letters swing along with them
const PARALLAX_X = 14; // px
const PARALLAX_Y = 6; // px
const PARALLAX_RESPONSE = 14; // 1/s, how quickly the anchors follow the cursor

// 2. Thread tug: crossing a string plucks it, the letter gets a gentle sideways pull
const TUG_RADIUS = 9; // px (mouse)
const TUG_TOUCH_RADIUS = 20; // px (finger)
const TUG_COOLDOWN = 120; // ms per string
const TUG_FREQ = 34; // rad/s, how fast the plucked thread rings
const TUG_DAMPING = 0.2;
const TUG_STRING_KICK = 500; // px/s, sets how far the thread bows
const TUG_LETTER_KICK = 80; // px/s, sideways pull on the letter

// 3. Scroll motion: scrolling down makes letters hop, scrolling up stretches them (swap here)
const SCROLL_DOWN_EFFECT: 'jump' | 'stretch' = 'jump';
const SCROLL_COOLDOWN = 140; // ms between kicks, so a long scroll doesn't lift the letters away
const STRETCH_FREQ = 26; // rad/s
const STRETCH_DAMPING = 0.4;

// Staggers
const DESKTOP_STAGGER = 25; // ms between letters

// Compact screens (< 1024px): letters drop a short way onto their rope, one at a time in reading order.
const COMPACT_BREAKPOINT = 1024;
const COMPACT_DROP_MIN = 70; // px above the final resting position
const COMPACT_DROP_VARIANCE = 30;
const COMPACT_INITIAL_DELAY = 0; // ms
const COMPACT_STAGGER = 40; // ms between letters
const DROP_ORDER = [
  'greeting-h',
  'greeting-i',
  'intro-i',
  'greeting-comma',
  'intro-m',
  'name-t',
  'name-a',
  'name-m-1',
  'name-i',
  'name-m-2',
];

/* -------------------------------------------------------------------------- */
/*  Small math helpers                                                        */
/* -------------------------------------------------------------------------- */

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function wrapAngle(a: number) {
  return a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
}

/* -------------------------------------------------------------------------- */
/*  Rope                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Inextensible, unilateral rope. The rope can go slack (letter can move closer to the anchor)
 * but can never stretch. The pull acts through the letter's centre, so it produces no torque.
 * Returns true if the rope was taut.
 */
function enforceRope(body: LetterBody, allowBounce: boolean) {
  const dx = body.pos.x - body.anchor.x;
  const dy = body.pos.y - body.anchor.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= body.ropeLength || dist === 0) return false;

  const nx = dx / dist;
  const ny = dy / dist;

  body.pos.x = body.anchor.x + nx * body.ropeLength;
  body.pos.y = body.anchor.y + ny * body.ropeLength;

  const radialSpeed = body.vel.x * nx + body.vel.y * ny;
  if (radialSpeed > 0) {
    const e =
      allowBounce && radialSpeed > ROPE_BOUNCE_THRESHOLD ? ROPE_RESTITUTION : 0;
    body.vel.x -= (1 + e) * radialSpeed * nx;
    body.vel.y -= (1 + e) * radialSpeed * ny;
  }

  body.armed = true;
  return true;
}

/** Velocity-level rope constraint used inside the contact solver loop. */
function constrainRopeVelocity(body: LetterBody) {
  const dx = body.pos.x - body.anchor.x;
  const dy = body.pos.y - body.anchor.y;
  const dist = Math.hypot(dx, dy);
  if (dist < body.ropeLength - ROPE_EPSILON || dist === 0) return;

  const nx = dx / dist;
  const ny = dy / dist;
  const radialSpeed = body.vel.x * nx + body.vel.y * ny;
  if (radialSpeed > 0) {
    body.vel.x -= radialSpeed * nx;
    body.vel.y -= radialSpeed * ny;
  }
}

/**
 * SVG path for the rope. Taut = straight line, slack = parabolic sag.
 * (bx, by) is the letter position to draw to (the interpolated render position).
 */
function buildRopePath(body: LetterBody, bx: number, by: number) {
  const ax = body.anchor.x;
  const ay = body.anchor.y;
  const dx = bx - ax;
  const dy = by - ay;
  const d = Math.hypot(dx, dy) || 1e-6;
  const slack = body.ropeLength - d;

  // A plucked thread bends at the contact point
  if (Math.abs(body.tugOffset) > 0.3) {
    const tx = ax + dx * body.tugT + (-dy / d) * body.tugOffset;
    const ty = ay + dy * body.tugT + (dx / d) * body.tugOffset;
    return `M ${ax} ${ay} L ${tx} ${ty} L ${bx} ${by}`;
  }

  if (slack <= 1) return `M ${ax} ${ay} L ${bx} ${by}`;

  // Perpendicular to the chord, pointing downward (the way gravity sags it).
  let nx = -dy / d;
  let ny = dx / d;
  if (ny < 0) {
    nx = -nx;
    ny = -ny;
  }

  // Parabola of length L over chord d: L ≈ d + 8s²/(3d)  =>  s = sqrt(3d(L-d)/8)
  const sag = Math.min(
    Math.sqrt((3 * d * slack) / 8) * Math.abs(ny),
    body.ropeLength * 0.4,
  );
  const cx = (ax + bx) / 2 + nx * sag * 2;
  const cy = (ay + by) / 2 + ny * sag * 2;
  return `M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`;
}

/* -------------------------------------------------------------------------- */
/*  Collision: oriented boxes (SAT + reference/incident face clipping)        */
/* -------------------------------------------------------------------------- */

type Manifold = { n: Vec2; depth: number; points: Vec2[] };

function collideBoxes(a: LetterBody, b: LetterBody): Manifold | null {
  const ca = Math.cos(a.angle);
  const sa = Math.sin(a.angle);
  const cb = Math.cos(b.angle);
  const sb = Math.sin(b.angle);

  const axA = { x: ca, y: sa };
  const ayA = { x: -sa, y: ca };
  const axB = { x: cb, y: sb };
  const ayB = { x: -sb, y: cb };
  const axes = [axA, ayA, axB, ayB];

  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;

  // 1. Separating Axis Test -> axis of least penetration
  let bestScore = Infinity;
  let bestOverlap = 0;
  let bestIndex = -1;

  for (let i = 0; i < 4; i += 1) {
    const n = axes[i];
    const rA =
      a.hw * Math.abs(n.x * axA.x + n.y * axA.y) +
      a.hh * Math.abs(n.x * ayA.x + n.y * ayA.y);
    const rB =
      b.hw * Math.abs(n.x * axB.x + n.y * axB.y) +
      b.hh * Math.abs(n.x * ayB.x + n.y * ayB.y);
    const overlap = rA + rB - Math.abs(dx * n.x + dy * n.y);
    if (overlap <= 0) return null;

    // Slight bias toward A's axes avoids flip-flopping between near-equal axes.
    const score = i >= 2 ? overlap * 1.02 + 0.01 : overlap;
    if (score < bestScore) {
      bestScore = score;
      bestOverlap = overlap;
      bestIndex = i;
    }
  }

  // Collision normal points from A to B
  let n = { ...axes[bestIndex] };
  if (n.x * dx + n.y * dy < 0) n = { x: -n.x, y: -n.y };

  // 2. Reference face (owner of the best axis) and incident edge (other box)
  const refIsA = bestIndex < 2;
  const ref = refIsA ? a : b;
  const inc = refIsA ? b : a;
  const refAxX = refIsA ? axA : axB;
  const refAxY = refIsA ? ayA : ayB;
  const incAxX = refIsA ? axB : axA;
  const incAxY = refIsA ? ayB : ayA;

  // Outward normal of the reference face, facing the incident box
  const refN = refIsA ? n : { x: -n.x, y: -n.y };
  const faceIsX = bestIndex % 2 === 0;
  const faceHalf = faceIsX ? ref.hw : ref.hh;
  const tangent = faceIsX ? refAxY : refAxX;
  const tangentHalf = faceIsX ? ref.hh : ref.hw;
  const fc = {
    x: ref.pos.x + refN.x * faceHalf,
    y: ref.pos.y + refN.y * faceHalf,
  };

  // Incident edge = the edge of the other box most anti-parallel to refN
  const dX = refN.x * incAxX.x + refN.y * incAxX.y;
  const dY = refN.x * incAxY.x + refN.y * incAxY.y;
  let edgeCenter: Vec2;
  let edgeTangent: Vec2;
  let edgeHalf: number;
  if (Math.abs(dX) > Math.abs(dY)) {
    const s = -Math.sign(dX) || -1;
    edgeCenter = {
      x: inc.pos.x + incAxX.x * s * inc.hw,
      y: inc.pos.y + incAxX.y * s * inc.hw,
    };
    edgeTangent = incAxY;
    edgeHalf = inc.hh;
  } else {
    const s = -Math.sign(dY) || -1;
    edgeCenter = {
      x: inc.pos.x + incAxY.x * s * inc.hh,
      y: inc.pos.y + incAxY.y * s * inc.hh,
    };
    edgeTangent = incAxX;
    edgeHalf = inc.hw;
  }

  const p0 = {
    x: edgeCenter.x - edgeTangent.x * edgeHalf,
    y: edgeCenter.y - edgeTangent.y * edgeHalf,
  };
  const p1 = {
    x: edgeCenter.x + edgeTangent.x * edgeHalf,
    y: edgeCenter.y + edgeTangent.y * edgeHalf,
  };

  // 3. Clip incident edge to the side planes of the reference face
  const s0 = (p0.x - fc.x) * tangent.x + (p0.y - fc.y) * tangent.y;
  const s1 = (p1.x - fc.x) * tangent.x + (p1.y - fc.y) * tangent.y;
  const ds = s1 - s0;

  let t0 = 0;
  let t1 = 1;
  let clipped = true;
  if (Math.abs(ds) < 1e-9) {
    clipped = s0 >= -tangentHalf && s0 <= tangentHalf;
  } else {
    let ta = (-tangentHalf - s0) / ds;
    let tb = (tangentHalf - s0) / ds;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(0, ta);
    t1 = Math.min(1, tb);
    clipped = t0 <= t1;
  }

  const points: Vec2[] = [];
  if (clipped) {
    for (const t of [t0, t1]) {
      const q = {
        x: p0.x + (p1.x - p0.x) * t,
        y: p0.y + (p1.y - p0.y) * t,
      };
      const separation = (q.x - fc.x) * refN.x + (q.y - fc.y) * refN.y;
      if (separation <= 0) {
        // Put the contact halfway between the incident point and the reference face
        points.push({
          x: q.x - refN.x * separation * 0.5,
          y: q.y - refN.y * separation * 0.5,
        });
      }
    }
  }

  if (points.length === 0) {
    points.push({
      x: (a.pos.x + b.pos.x) / 2,
      y: (a.pos.y + b.pos.y) / 2,
    });
  }

  return { n, depth: bestOverlap, points };
}

/* -------------------------------------------------------------------------- */
/*  Sequential-impulse contact solver                                         */
/* -------------------------------------------------------------------------- */

function applyImpulse(
  a: LetterBody,
  b: LetterBody,
  p: ContactPoint,
  px: number,
  py: number,
) {
  a.vel.x -= px * a.invMass;
  a.vel.y -= py * a.invMass;
  a.angVel -= a.invInertia * (p.ra.x * py - p.ra.y * px);

  b.vel.x += px * b.invMass;
  b.vel.y += py * b.invMass;
  b.angVel += b.invInertia * (p.rb.x * py - p.rb.y * px);
}

function relativeVelocity(a: LetterBody, b: LetterBody, p: ContactPoint) {
  return {
    x: b.vel.x - b.angVel * p.rb.y - (a.vel.x - a.angVel * p.ra.y),
    y: b.vel.y + b.angVel * p.rb.x - (a.vel.y + a.angVel * p.ra.x),
  };
}

function buildContacts(bodies: LetterBody[]) {
  const contacts: Contact[] = [];

  for (let i = 0; i < bodies.length; i += 1) {
    const a = bodies[i];
    if (!a.armed) continue;

    for (let j = i + 1; j < bodies.length; j += 1) {
      const b = bodies[j];
      if (!b.armed) continue;

      // Broad phase: bounding circles
      const reach = Math.hypot(a.hw, a.hh) + Math.hypot(b.hw, b.hh);
      const ddx = b.pos.x - a.pos.x;
      const ddy = b.pos.y - a.pos.y;
      if (ddx * ddx + ddy * ddy > reach * reach) continue;

      const manifold = collideBoxes(a, b);
      if (!manifold) continue;

      const { n } = manifold;
      const t = { x: -n.y, y: n.x };

      const points: ContactPoint[] = manifold.points.map((point) => {
        const ra = { x: point.x - a.pos.x, y: point.y - a.pos.y };
        const rb = { x: point.x - b.pos.x, y: point.y - b.pos.y };

        const raN = ra.x * n.y - ra.y * n.x;
        const rbN = rb.x * n.y - rb.y * n.x;
        const raT = ra.x * t.y - ra.y * t.x;
        const rbT = rb.x * t.y - rb.y * t.x;

        const kN =
          a.invMass + b.invMass + a.invInertia * raN * raN + b.invInertia * rbN * rbN;
        const kT =
          a.invMass + b.invMass + a.invInertia * raT * raT + b.invInertia * rbT * rbT;

        const cp: ContactPoint = {
          ra,
          rb,
          kN,
          kT,
          vBias: 0,
          jn: 0,
          jt: 0,
        };

        const dv = relativeVelocity(a, b, cp);
        const vn = dv.x * n.x + dv.y * n.y;
        cp.vBias = vn < -RESTITUTION_THRESHOLD ? -RESTITUTION * vn : 0;
        return cp;
      });

      contacts.push({ a, b, n, t, depth: manifold.depth, points });
    }
  }

  return contacts;
}

function solveContact(contact: Contact) {
  const { a, b, n, t } = contact;

  for (const p of contact.points) {
    // Normal impulse (accumulated + clamped so contacts can only push)
    let dv = relativeVelocity(a, b, p);
    const vn = dv.x * n.x + dv.y * n.y;
    let ln = (-vn + p.vBias) / p.kN;
    const newJn = Math.max(p.jn + ln, 0);
    ln = newJn - p.jn;
    p.jn = newJn;
    applyImpulse(a, b, p, n.x * ln, n.y * ln);

    // Coulomb friction, bounded by the normal impulse
    dv = relativeVelocity(a, b, p);
    const vt = dv.x * t.x + dv.y * t.y;
    let lt = -vt / p.kT;
    const maxFriction = FRICTION * p.jn;
    const newJt = clamp(p.jt + lt, -maxFriction, maxFriction);
    lt = newJt - p.jt;
    p.jt = newJt;
    applyImpulse(a, b, p, t.x * lt, t.y * lt);
  }
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function MinimalHero({ isActive = true }: { isActive?: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const portfolioRef = useRef<HTMLDivElement>(null);
  const letterElementsRef = useRef(new Map<string, HTMLSpanElement>());
  const stringPathsRef = useRef(new Map<string, SVGPathElement>());
  const bodiesRef = useRef(new Map<string, LetterBody>());
  const wakeRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!isActive) return;

    const section = sectionRef.current;
    if (!section) return;

    const currentBodies = bodiesRef.current;
    const sectionRect = section.getBoundingClientRect();
    const startTime = performance.now();
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const bodies: LetterBody[] = [];
    const isCompact = window.innerWidth < COMPACT_BREAKPOINT;

    const getTargetXPercent = (letter: LetterSpec) =>
      window.innerWidth < COMPACT_BREAKPOINT && letter.mobileX !== undefined
        ? letter.mobileX
        : letter.x;

    /** Recompute size-dependent properties (hit box, mass, inertia). */
    const updateGeometry = (body: LetterBody) => {
      const width = body.element.offsetWidth;
      const height = body.element.offsetHeight;
      const hitbox = body.hitbox ?? DEFAULT_HITBOX;

      body.hw = Math.max((width * hitbox.w) / 2, 1);
      body.hh = Math.max((height * hitbox.h) / 2, 1);

      const w = body.hw * 2;
      const h = body.hh * 2;
      body.mass = Math.max((w * h) / 10000, 0.05);
      const inertia = (body.mass * (w * w + h * h)) / 12;
      body.invMass = 1 / body.mass;
      body.invInertia = 1 / inertia;
    };

    LETTERS.forEach((letter, index) => {
      const element = letterElementsRef.current.get(letter.id);
      if (!element) return;

      const anchorX = (sectionRect.width * getTargetXPercent(letter)) / 100;
      const ropeLength = (sectionRect.height * letter.y) / 100;

      const body: LetterBody = {
        ...letter,
        element,
        pos: { x: anchorX, y: ropeLength },
        vel: { x: 0, y: 0 },
        angle: 0,
        angVel: 0,
        prevX: anchorX,
        prevY: ropeLength,
        prevAngle: 0,
        anchor: { x: anchorX, y: 0 },
        ropeLength,
        hw: 1,
        hh: 1,
        mass: 1,
        invMass: 1,
        invInertia: 1,
        startAt: isCompact
          ? startTime +
            COMPACT_INITIAL_DELAY +
            Math.max(DROP_ORDER.indexOf(letter.id), 0) * COMPACT_STAGGER
          : startTime + index * DESKTOP_STAGGER,
        deferReveal: isCompact && !prefersReducedMotion,
        lastX: Number.NaN,
        lastY: Number.NaN,
        lastAngle: Number.NaN,
        lastTug: Number.NaN,
        lastStretch: Number.NaN,
        baseAnchorX: anchorX,
        tugOffset: 0,
        tugVel: 0,
        tugT: 0.5,
        tugReadyAt: 0,
        hovering: false,
        stretch: 0,
        stretchVel: 0,
        scrollGain: 0.8 + ((index * 37) % 10) / 25, // 0.8 .. 1.16, so letters don't move in lockstep
        scrollReadyAt: 0,
        released: prefersReducedMotion,
        armed: prefersReducedMotion,
        dragging: false,
        pointerId: null,
        grabLocal: { x: 0, y: 0 },
        dragTarget: { x: 0, y: 0 },
        dragCur: { x: 0, y: 0 },
      };

      updateGeometry(body);

      if (!prefersReducedMotion) {
        if (isCompact) {
          // Short, straight drop from just above the final position (no sideways motion)
          body.pos.y =
            ropeLength - (COMPACT_DROP_MIN + Math.random() * COMPACT_DROP_VARIANCE);
          body.vel.y = COMPACT_DROP_INITIAL_SPEED;
        } else {
          // Start hidden above the section; gravity drops the letter until the rope snaps taut.
          body.pos.y = -(element.offsetHeight / 2) - 60 - Math.random() * 40;
          body.vel.x = (Math.random() - 0.5) * 160;
          body.vel.y = DROP_INITIAL_SPEED + Math.random() * 200;
        }
      }

      body.prevX = body.pos.x;
      body.prevY = body.pos.y;
      body.prevAngle = body.angle;

      if (body.deferReveal) {
        element.style.transition = 'opacity 80ms ease-out';
      } else {
        element.style.opacity = '1';
      }
      currentBodies.set(letter.id, body);
      bodies.push(body);
    });

    if (isCompact) {
      stringPathsRef.current.forEach((path) => {
        path.removeAttribute('stroke-dasharray');
        path.removeAttribute('marker-start');
        path.removeAttribute('marker-end');
      });
    }

    /* ------------------------------ rendering ------------------------------ */

    /** `alpha` (0..1) blends the previous and current physics step, so motion stays smooth at any refresh rate. */
    const renderBody = (body: LetterBody, alpha: number) => {
      if (body.deferReveal && !body.released) return;

      const x = body.prevX + (body.pos.x - body.prevX) * alpha;
      const y = body.prevY + (body.pos.y - body.prevY) * alpha;
      const angle = body.prevAngle + (body.angle - body.prevAngle) * alpha;

      if (
        Math.abs(x - body.lastX) < 0.02 &&
        Math.abs(y - body.lastY) < 0.02 &&
        Math.abs(angle - body.lastAngle) < 0.0002 &&
        Math.abs(body.tugOffset - body.lastTug) < 0.02 &&
        Math.abs(body.stretch - body.lastStretch) < 0.0005
      ) {
        return;
      }
      body.lastX = x;
      body.lastY = y;
      body.lastAngle = angle;
      body.lastTug = body.tugOffset;
      body.lastStretch = body.stretch;

      body.element.style.transform =
        `translate3d(${x}px, ${y}px, 0) ` +
        `translate(-50%, -50%) rotate(${angle}rad) ` +
        `scale(${1 - body.stretch * 0.5}, ${1 + body.stretch})`;

      const path = stringPathsRef.current.get(body.id);
      if (path) path.setAttribute('d', buildRopePath(body, x, y));
    };

    /* ------------------------------ simulation ----------------------------- */

    const integrate = (body: LetterBody, dt: number) => {
      // Plucked thread: rings like a damped spring
      if (body.tugOffset !== 0 || body.tugVel !== 0) {
        body.tugVel +=
          (-TUG_FREQ * TUG_FREQ * body.tugOffset -
            2 * TUG_DAMPING * TUG_FREQ * body.tugVel) *
          dt;
        body.tugOffset += body.tugVel * dt;
        if (Math.abs(body.tugOffset) < 0.01 && Math.abs(body.tugVel) < 0.5) {
          body.tugOffset = 0;
          body.tugVel = 0;
        }
      }

      // Scroll stretch: springs back to normal
      if (body.stretch !== 0 || body.stretchVel !== 0) {
        body.stretchVel +=
          (-STRETCH_FREQ * STRETCH_FREQ * body.stretch -
            2 * STRETCH_DAMPING * STRETCH_FREQ * body.stretchVel) *
          dt;
        body.stretch += body.stretchVel * dt;
        if (Math.abs(body.stretch) < 0.0005 && Math.abs(body.stretchVel) < 0.01) {
          body.stretch = 0;
          body.stretchVel = 0;
        }
      }

      let ax = 0;
      // Falls faster until the rope has gone taut for the first time
      let ay = body.armed ? GRAVITY : GRAVITY * DROP_GRAVITY_MULT;
      let alpha = 0;

      // Torsion spring toward upright (keeps the type readable)
      alpha +=
        -UPRIGHT_FREQ * UPRIGHT_FREQ * wrapAngle(body.angle) -
        2 * UPRIGHT_DAMPING * UPRIGHT_FREQ * body.angVel;

      // Grab spring: pulls a point on the letter toward the pointer, producing torque
      if (body.dragging) {
        // Ease the target so jumpy pointer events don't jerk the letter around
        const follow = 1 - Math.exp(-DRAG_TARGET_SMOOTHING * dt);
        body.dragCur.x += (body.dragTarget.x - body.dragCur.x) * follow;
        body.dragCur.y += (body.dragTarget.y - body.dragCur.y) * follow;

        const c = Math.cos(body.angle);
        const s = Math.sin(body.angle);
        const rx = c * body.grabLocal.x - s * body.grabLocal.y;
        const ry = s * body.grabLocal.x + c * body.grabLocal.y;

        const px = body.pos.x + rx;
        const py = body.pos.y + ry;
        const pvx = body.vel.x - body.angVel * ry;
        const pvy = body.vel.y + body.angVel * rx;

        const k = DRAG_FREQ * DRAG_FREQ;
        const damp = 2 * DRAG_DAMPING * DRAG_FREQ;
        const fx = k * (body.dragCur.x - px) - damp * pvx;
        const fy = k * (body.dragCur.y - py) - damp * pvy;

        ax += fx;
        ay += fy;
        // torque = m * (r × a); alpha = torque / I
        alpha += body.mass * body.invInertia * (rx * fy - ry * fx);
        alpha -= DRAG_ANGULAR_DAMPING * body.angVel;
      }

      body.vel.x += ax * dt;
      body.vel.y += ay * dt;
      body.angVel += alpha * dt;

      // Exponential drag (stable for any dt)
      const linear = Math.exp(-LINEAR_DRAG * dt);
      const angular = Math.exp(-ANGULAR_DRAG * dt);
      body.vel.x *= linear;
      body.vel.y *= linear;
      body.angVel *= angular;

      const speed = Math.hypot(body.vel.x, body.vel.y);
      if (speed > MAX_SPEED) {
        body.vel.x *= MAX_SPEED / speed;
        body.vel.y *= MAX_SPEED / speed;
      }
      body.angVel = clamp(body.angVel, -MAX_ANGULAR_SPEED, MAX_ANGULAR_SPEED);

      body.pos.x += body.vel.x * dt;
      body.pos.y += body.vel.y * dt;
      body.angle += body.angVel * dt;

      enforceRope(body, true);
    };

    const stepDt = isCompact ? COMPACT_FIXED_DT : FIXED_DT;
    const solverIterations = isCompact ? COMPACT_SOLVER_ITERATIONS : SOLVER_ITERATIONS;

    const step = (dt: number) => {
      // Remember where everything was, so rendering can interpolate between steps
      for (const body of bodies) {
        body.prevX = body.pos.x;
        body.prevY = body.pos.y;
        body.prevAngle = body.angle;
      }

      for (const body of bodies) {
        if (body.released) integrate(body, dt);
      }

      const contacts = buildContacts(bodies);

      for (let i = 0; i < solverIterations; i += 1) {
        for (const contact of contacts) solveContact(contact);
        for (const body of bodies) {
          if (body.released) constrainRopeVelocity(body);
        }
      }

      // Positional correction for any remaining penetration
      for (const { a, b, n, depth } of contacts) {
        const correction =
          (Math.max(depth - PENETRATION_SLOP, 0) * CORRECTION_FACTOR) /
          (a.invMass + b.invMass);
        a.pos.x -= n.x * correction * a.invMass;
        a.pos.y -= n.y * correction * a.invMass;
        b.pos.x += n.x * correction * b.invMass;
        b.pos.y += n.y * correction * b.invMass;
      }

      for (const body of bodies) {
        if (body.released) enforceRope(body, false);
      }
    };

    // Cursor parallax state (anchors are shifted by this each frame)
    const parallax = { x: 0, y: 0, tx: 0, ty: 0 };

    let animationFrame = 0;
    let previousFrameTime = startTime;
    let accumulator = 0;
    let asleep = false;
    let calmFrames = 0;

    const isBusy = () => {
      for (const body of bodies) {
        if (!body.released || body.dragging) return true;
        if (
          Math.abs(body.vel.x) + Math.abs(body.vel.y) > SLEEP_LINEAR_SPEED ||
          Math.abs(body.angVel) > SLEEP_ANGULAR_SPEED
        ) {
          return true;
        }
        if (
          Math.abs(body.tugOffset) > 0.05 ||
          Math.abs(body.tugVel) > 1 ||
          Math.abs(body.stretch) > 0.002 ||
          Math.abs(body.stretchVel) > 0.02
        ) {
          return true;
        }
      }
      return (
        Math.abs(parallax.tx - parallax.x) > 0.05 ||
        Math.abs(parallax.ty - parallax.y) > 0.05
      );
    };

    const tick = (now: number) => {
      const frameTime = Math.min((now - previousFrameTime) / 1000, MAX_FRAME_TIME);
      previousFrameTime = now;

      for (const body of bodies) {
        if (!body.released && now >= body.startAt) {
          body.released = true;
          if (body.deferReveal) {
            body.prevX = body.pos.x;
            body.prevY = body.pos.y;
            body.prevAngle = body.angle;
            renderBody(body, 1); // place it before it becomes visible
            body.element.style.opacity = '1';
          }
        }
      }

      // Ease the ceiling anchors toward the cursor-driven target
      const follow = 1 - Math.exp(-PARALLAX_RESPONSE * frameTime);
      parallax.x += (parallax.tx - parallax.x) * follow;
      parallax.y += (parallax.ty - parallax.y) * follow;
      for (const body of bodies) {
        body.anchor.x = body.baseAnchorX + parallax.x;
        body.anchor.y = parallax.y;
      }

      accumulator += frameTime;
      let steps = 0;
      while (accumulator >= stepDt && steps < MAX_STEPS_PER_FRAME) {
        step(stepDt);
        accumulator -= stepDt;
        steps += 1;
      }
      if (steps === MAX_STEPS_PER_FRAME) accumulator = 0;

      // Draw between the last two physics steps
      const alpha = clamp(accumulator / stepDt, 0, 1);
      for (const body of bodies) renderBody(body, alpha);

      calmFrames = isBusy() ? 0 : calmFrames + 1;
      if (calmFrames >= SLEEP_AFTER_FRAMES) {
        // Everything is at rest: snap to the final state and stop the loop until something disturbs it
        for (const body of bodies) renderBody(body, 1);
        asleep = true;
        return;
      }
      animationFrame = requestAnimationFrame(tick);
    };

    const wake = () => {
      calmFrames = 0;
      if (!asleep) return;
      asleep = false;
      accumulator = 0;
      previousFrameTime = performance.now();
      animationFrame = requestAnimationFrame(tick);
    };
    wakeRef.current = wake;

    for (const body of bodies) renderBody(body, 1);
    animationFrame = requestAnimationFrame(tick);

    /* -------------------------------- layout -------------------------------- */

    const measure = () => {
      const bounds = section.getBoundingClientRect();
      for (const body of bodies) {
        updateGeometry(body);

        const baseX = (bounds.width * getTargetXPercent(body)) / 100;
        const anchorX = baseX + parallax.x;
        body.pos.x += anchorX - body.anchor.x; // keep the current swing, just move with the anchor
        body.baseAnchorX = baseX;
        body.anchor.x = anchorX;
        body.ropeLength = (bounds.height * body.y) / 100;

        if (body.released) enforceRope(body, false);

        // Sync the previous state so a resize doesn't smear the letter across frames
        body.prevX = body.pos.x;
        body.prevY = body.pos.y;
        body.prevAngle = body.angle;
        renderBody(body, 1);
      }
      wake();
    };

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(section);

    // Web fonts change glyph widths after mount, so re-measure once they're ready.
    document.fonts?.ready.then(measure).catch(() => undefined);

    /* ------------------------------- pointer -------------------------------- */

    const findDragged = (pointerId: number) =>
      bodies.find((candidate) => candidate.dragging && candidate.pointerId === pointerId);

    const nearestOnString = (body: LetterBody, px: number, py: number) => {
      const ax = body.anchor.x;
      const ay = body.anchor.y;
      const dx = body.pos.x - ax;
      const dy = body.pos.y - ay;
      const len = Math.hypot(dx, dy) || 1e-6;
      const t = clamp(((px - ax) * dx + (py - ay) * dy) / (len * len), 0, 1);
      return {
        t,
        dist: Math.hypot(px - (ax + dx * t), py - (ay + dy * t)),
        nx: -dy / len, // unit normal of the rope
        ny: dx / len,
      };
    };

    const triggerTug = (
      body: LetterBody,
      t: number,
      nx: number,
      ny: number,
      sign: number,
      intensity: number,
    ) => {
      const now = performance.now();
      if (now < body.tugReadyAt) return;
      body.tugReadyAt = now + TUG_COOLDOWN;

      body.tugT = clamp(t, 0.2, 0.8);
      body.tugVel += sign * intensity * TUG_STRING_KICK;

      const kick = TUG_LETTER_KICK * intensity * (0.4 + 0.6 * t);
      body.vel.x += nx * sign * kick;
      body.vel.y += ny * sign * kick;
      wake();
    };

    const pointer = { x: 0, y: 0, time: 0, known: false };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' && !isLargeMouseViewport()) return;
      const bounds = section.getBoundingClientRect();
      const px = event.clientX - bounds.left;
      const py = event.clientY - bounds.top;

      const dragged = findDragged(event.pointerId);
      if (dragged) {
        dragged.dragTarget.x = px;
        dragged.dragTarget.y = py;
        return;
      }

      if (prefersReducedMotion || event.pointerType === 'touch') return;

      // 1. Parallax target (same direction as the bottom-right text)
      parallax.tx = -((event.clientX / window.innerWidth) * 2 - 1) * PARALLAX_X;
      parallax.ty = -((event.clientY / window.innerHeight) * 2 - 1) * PARALLAX_Y;

      // Pointer velocity
      const dt = Math.max((event.timeStamp - pointer.time) / 1000, 0.001);
      const mx = pointer.known ? (px - pointer.x) / dt : 0;
      const my = pointer.known ? (py - pointer.y) / dt : 0;
      pointer.x = px;
      pointer.y = py;
      pointer.time = event.timeStamp;
      pointer.known = true;

      // 2. Thread tug
      if (!bodies.some((body) => body.dragging)) {
        const speed = Math.hypot(mx, my);
        for (const body of bodies) {
          if (!body.released) continue;

          const hit = nearestOnString(body, px, py);
          const nearLetter =
            Math.hypot(px - body.pos.x, py - body.pos.y) < Math.max(body.hw, body.hh) + 6;

          if (hit.dist > TUG_RADIUS * 1.8) {
            body.hovering = false;
          } else if (hit.dist <= TUG_RADIUS && !body.hovering && !nearLetter) {
            body.hovering = true;

            // Pull the way the cursor is moving across the thread; fall back to the side it's on
            const lateral = mx * hit.nx + my * hit.ny;
            const side = (px - body.pos.x) * hit.nx + (py - body.pos.y) * hit.ny;
            const sign = Math.abs(lateral) > 20 ? Math.sign(lateral) : Math.sign(side) || 1;
            triggerTug(body, hit.t, hit.nx, hit.ny, sign, clamp(speed / 900, 0.4, 1));
          }
        }
      }

      wake();
    };

    // Touch has no hover, so a tap on a thread plucks it instead
    const handlePointerDownWindow = (event: PointerEvent) => {
      if (prefersReducedMotion || event.pointerType !== 'touch') return;
      if (bodies.some((body) => body.dragging)) return;

      const bounds = section.getBoundingClientRect();
      const px = event.clientX - bounds.left;
      const py = event.clientY - bounds.top;

      for (const body of bodies) {
        if (!body.released) continue;
        const hit = nearestOnString(body, px, py);
        const nearLetter =
          Math.hypot(px - body.pos.x, py - body.pos.y) < Math.max(body.hw, body.hh) + 6;
        if (hit.dist > TUG_TOUCH_RADIUS || nearLetter) continue;

        const side = (px - body.pos.x) * hit.nx + (py - body.pos.y) * hit.ny;
        triggerTug(body, hit.t, hit.nx, hit.ny, Math.sign(side) || 1, 0.8);
      }
    };

    /* -------------------------------- scroll -------------------------------- */

    let heroVisible = true;
    let lastScrollY = window.scrollY;
    let lastScrollTime = performance.now();

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
    });
    visibilityObserver.observe(section);

    const handleScroll = () => {
      const now = performance.now();
      const delta = window.scrollY - lastScrollY;
      const dt = Math.max((now - lastScrollTime) / 1000, 0.008);
      lastScrollY = window.scrollY;
      lastScrollTime = now;

      if (prefersReducedMotion || !heroVisible || Math.abs(delta) < 2) return;

      const speed = Math.abs(delta) / dt;
      const upEffect = SCROLL_DOWN_EFFECT === 'jump' ? 'stretch' : 'jump';
      const effect = delta > 0 ? SCROLL_DOWN_EFFECT : upEffect;

      for (const body of bodies) {
        if (!body.released || now < body.scrollReadyAt) continue;
        body.scrollReadyAt = now + SCROLL_COOLDOWN;

        if (effect === 'jump') {
          // A small hop; the rope goes slack, then catches the letter again
          const kick = clamp(speed * 0.15, 60, 200) * body.scrollGain;
          body.vel.y = Math.min(body.vel.y, -kick);
        } else {
          // Stretch along the motion, with a slight pull downward
          const kick = clamp(speed * 0.0008, 0.35, 1.3) * body.scrollGain;
          body.stretchVel = Math.max(body.stretchVel, kick);
          body.vel.y = Math.max(body.vel.y, 50 * body.scrollGain);
        }
      }
      wake();
    };

    const handlePointerUp = (event: PointerEvent) => {
      const body = findDragged(event.pointerId);
      if (!body) return;

      body.dragging = false;
      body.pointerId = null;
      wake();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerdown', handlePointerDownWindow);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDownWindow);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      wakeRef.current = () => undefined;
      currentBodies.clear();
    };
  }, [isActive]);

  /* ----------------------- parallax for the meta block ----------------------- */

  useEffect(() => {
    if (!isActive) return;

    const RESPONSE = 14; // 1/s, frame-rate independent easing

    let animId = 0;
    let running = false;
    let lastTime = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 1 / 20);
      lastTime = now;
      const follow = 1 - Math.exp(-RESPONSE * dt);

      currentX += (targetX - currentX) * follow;
      currentY += (targetY - currentY) * follow;
      if (metaRef.current) {
        metaRef.current.style.transform = `translate3d(${-currentX * 0.5}px, ${-currentY * 0.5}px, 0)`;
      }
      if (portfolioRef.current) {
        portfolioRef.current.style.transform = `translate3d(${-currentX * 0.5}px, ${-currentY * 0.5}px, 0)`;
      }

      if (Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05) {
        animId = requestAnimationFrame(loop);
      } else {
        running = false;
      }
    };

    const startAnimation = () => {
      if (running) return;
      running = true;
      lastTime = performance.now();
      animId = requestAnimationFrame(loop);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isLargeMouseViewport()) return;
      targetX = ((event.clientX / window.innerWidth) * 2 - 1) * 20;
      targetY = ((event.clientY / window.innerHeight) * 2 - 1) * 14;
      startAnimation();
    };

    const handleResize = () => {
      if (isLargeMouseViewport()) return;
      targetX = 0;
      targetY = 0;
      startAnimation();
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [isActive]);

  /* ------------------------------- handlers -------------------------------- */

  const handlePointerDown = (
    event: React.PointerEvent<HTMLSpanElement>,
    id: string,
  ) => {
    if (event.pointerType !== 'touch' && !isLargeMouseViewport()) return;
    const body = bodiesRef.current.get(id);
    const section = sectionRef.current;
    if (!body || !section || !body.released) return;

    event.preventDefault();

    const bounds = section.getBoundingClientRect();
    const px = event.clientX - bounds.left;
    const py = event.clientY - bounds.top;

    // Store the grab point in the letter's local frame so it stays pinned to the same glyph spot
    const dx = px - body.pos.x;
    const dy = py - body.pos.y;
    const c = Math.cos(body.angle);
    const s = Math.sin(body.angle);
    body.grabLocal = {
      x: clamp(c * dx + s * dy, -body.hw, body.hw),
      y: clamp(-s * dx + c * dy, -body.hh, body.hh),
    };

    body.dragTarget = { x: px, y: py };
    body.dragCur = { x: px, y: py };
    body.dragging = true;
    body.pointerId = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    wakeRef.current();
  };

  const nudge = (id: string, direction: number) => {
    const body = bodiesRef.current.get(id);
    if (!body || !body.released) return;
    body.vel.x += direction * 500;
    body.angVel += direction * 2.2;
    wakeRef.current();
  };

  return (
    <section
      ref={sectionRef}
      id="hero"
      data-section="hero"
      aria-hidden={!isActive}
      className="relative h-[100svh] min-h-[min(640px,100svh)] w-full overflow-hidden bg-transparent text-[#000000] pointer-events-none select-none"
    >
      <h1 className="sr-only">
        Hi, I&apos;m Tamim — Web &amp; Product Designer and Creative Developer
      </h1>

      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" aria-hidden="true">
        <defs>
          <marker
            id="hero-rope-pin"
            markerUnits="userSpaceOnUse"
            markerWidth="8"
            markerHeight="8"
            refX="4"
            refY="4"
          >
            <circle cx="4" cy="4" r="2.2" fill="#000000" fillOpacity="0.45" />
          </marker>
        </defs>
        {LETTERS.map((letter) => (
          <path
            key={`string-${letter.id}`}
            ref={(el) => {
              if (el) stringPathsRef.current.set(letter.id, el);
              else stringPathsRef.current.delete(letter.id);
            }}
            fill="none"
            stroke="#000000"
            strokeWidth="1.2"
            strokeOpacity="0.3"
            strokeDasharray="3 3"
            strokeLinecap="round"
            markerStart="url(#hero-rope-pin)"
            markerEnd="url(#hero-rope-pin)"
          />
        ))}
      </svg>

      <div className="absolute inset-0 pointer-events-none z-10">
        {LETTERS.map((letter) => (
          <span
            key={letter.id}
            ref={(element) => {
              if (element) letterElementsRef.current.set(letter.id, element);
              else letterElementsRef.current.delete(letter.id);
            }}
            role="button"
            tabIndex={isActive ? 0 : -1}
            aria-label={`Hanging letter ${letter.character}`}
            onPointerDown={(event) => handlePointerDown(event, letter.id)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') {
                event.preventDefault();
                nudge(letter.id, -1);
              } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                nudge(letter.id, 1);
              } else if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                nudge(letter.id, Math.random() < 0.5 ? -1 : 1);
              }
            }}
            className={`absolute left-0 top-0 inline-block origin-center font-medium leading-none text-[#000000] opacity-0 pointer-events-auto touch-none cursor-grab active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#000000] will-change-transform ${letter.className}`}
            style={{
              transform: 'translate(-50%, -50%)',
              transformOrigin: 'center',
            }}
          >
            {letter.character}
          </span>
        ))}
      </div>


      <div
        ref={metaRef}
        className="absolute bottom-8 right-8 md:bottom-12 md:right-16 z-20 text-right will-change-transform pointer-events-auto"
      >
        <div className="text-xs sm:text-[13px] font-medium tracking-[0.22em] text-[#000000] uppercase leading-tight space-y-1">
          <div>WEB DESIGNER &amp; DEVELOPER</div>
        </div>

        <div className="text-[8px] sm:text-[10px] font-mono tracking-[0.22em] text-[#555870] uppercase mt-4 sm:mt-5 space-y-1">
          <div>
            <a
              href="mailto:TAMIMHOSSEN003@GMAIL.COM"
              className="hover:text-[#000000] transition-colors"
            >
              TAMIMHOSSEN003@GMAIL.COM
            </a>
          </div>
          <div>
            <a
              href="https://github.com/tamim"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#000000] transition-colors"
            >
              GITHUB.COM/TAMIM
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}