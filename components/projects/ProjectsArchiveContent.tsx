'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { usePortfolioStore } from '@/components/providers/PortfolioStoreProvider';
import { ProjectsArchiveSkeleton } from '@/components/skeletons/ProjectsArchiveSkeleton';

const BG = '#080b10';

const BackgroundCanvas = dynamic(
  () => import('@/components/canvas/BackgroundCanvas'),
  { ssr: false }
);

type TabId = 'all' | 'hard-coded' | 'shopify' | 'wordpress';

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'hard-coded', label: 'Hard-Coded' },
  { id: 'shopify', label: 'Shopify' },
  { id: 'wordpress', label: 'WordPress' },
];

// Tile sizes repeat every 10 projects (4-column layout = a 4x4 block):
// big, 4 small, 2 small, big, 2 small. With `grid-flow-dense` the
// smalls fill the gaps around each big tile, like Windows 10 live tiles.
const SIZE_PATTERN = ['big', 's', 's', 's', 's', 's', 's', 'big', 's', 's'] as const;

// Each tile's content slides in from a different side (left, right, top, bottom).
// The cell itself clips (overflow-hidden), so nothing needs to fade.
const TILE_ENTRANCES = [
  '-translate-x-full', // from left
  'translate-x-full', // from right
  '-translate-y-full', // from top
  'translate-y-full', // from bottom
] as const;

/*
  Real (transparent) notch for the live-site button.
  A 72x72px corner shape is punched out of the tile with a CSS mask, so the
  page background shows through instead of a painted-on colour.
  Notch = 52px square (40px button + 6px gap) with a 24px rounded top-left corner,
  plus two 20px concave fillets where it meets the tile edges.
*/
const NOTCH_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 72 72'>" +
  "<path d='M72 0A20 20 0 0 1 52 20H44A24 24 0 0 0 20 44V52A20 20 0 0 1 0 72H72Z'/>" +
  '</svg>';
const NOTCH_URL = `url("data:image/svg+xml,${encodeURIComponent(NOTCH_SVG)}")`;

// Keeps the whole-card link from covering the notch, so the notch is truly click-through.
const PROJECT_LINK_CLIP_PATH =
  'polygon(0 0, 100% 0, 100% calc(100% - 72px), calc(100% - 72px) calc(100% - 72px), calc(100% - 72px) 100%, 0 100%)';

const NOTCH_MASK_STYLE = {
  maskImage: `${NOTCH_URL}, linear-gradient(#000, #000)`,
  maskRepeat: 'no-repeat, no-repeat',
  maskPosition: 'right bottom, 0 0',
  maskSize: '72px 72px, 100% 100%',
  maskComposite: 'exclude, add',
} as const;

function hasTech(techStack: string[] | undefined, name: string) {
  return (techStack ?? []).some((t) => t.toLowerCase().includes(name));
}

function matchesTab(techStack: string[] | undefined, tab: TabId) {
  const isShopify = hasTech(techStack, 'shopify');
  const isWordpress = hasTech(techStack, 'wordpress');
  switch (tab) {
    case 'shopify':
      return isShopify;
    case 'wordpress':
      return isWordpress;
    case 'hard-coded':
      return !isShopify && !isWordpress;
    default:
      return true;
  }
}

/* ───────── Project tile ───────── */

type TileProps = {
  project: { id: string; title: string; image: string; link?: string | null };
  isBig: boolean;
  index: number;
};

function ProjectTile({ project, isBig, index }: TileProps) {
  const ref = useRef<HTMLLIElement>(null);
  const [revealed, setRevealed] = useState(false);

useEffect(() => {
  const el = ref.current;
  if (!el) return;

  const isMobile = window.matchMedia('(max-width: 766px)').matches;

  const io = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        setRevealed(true);
        io.disconnect();
      }
    },
    {
      rootMargin: isMobile ? '0px 0px -20% 0px' : '0px 0px -40% 0px',
      threshold: 0,
    }
  );

  io.observe(el);

  return () => io.disconnect();
}, []);

  // Stagger tiles within a row so the layout "builds" in sequence
  const stagger = (index % 4) * 90;
  const entrance = TILE_ENTRANCES[index % TILE_ENTRANCES.length];

  return (
    // The <li> is the fixed cell: it never moves, it only clips.
    <li
      ref={ref}
      id={project.id}
      className={`group large-mouse-scale-group pointer-events-auto relative isolate overflow-hidden rounded-3xl ${
        isBig ? 'col-span-2 row-span-2' : ''
      }`}
    >
      {/* Everything inside slides in from one side */}
      <div
        style={{ transitionDelay: `${stagger}ms` }}
        className={`absolute inset-0 transition-[translate] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          revealed ? 'translate-x-0 translate-y-0' : entrance
        }`}
      >
        {/* Masked layer: image + gradient, with a transparent notch bottom-right */}
        <div
          className="absolute inset-0 bg-[#151519]"
          style={project.link ? NOTCH_MASK_STYLE : undefined}
        >
          <Image
            src={project.image}
            alt=""
            fill
            sizes={
              isBig
                ? '(max-width: 768px) 100vw, 50vw'
                : '(max-width: 768px) 50vw, 25vw'
            }
            unoptimized
            className="large-mouse-scale object-cover transition-transform duration-700"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-1/2 bg-gradient-to-t from-black/70 to-transparent"
          />
        </div>

        {/* Whole card -> project page */}
        <Link
          href={`/projects/${project.id}`}
          aria-label={`View ${project.title} project details`}
          style={project.link ? { clipPath: PROJECT_LINK_CLIP_PATH } : undefined}
          className="absolute inset-0 z-10 rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
        />

        {/* Live-site button: floats in the transparent notch */}
        {project.link && (
          <a
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visit ${project.title} live site`}
            className="large-mouse-hover-button absolute right-1.5 bottom-1.5 z-20 flex size-10 items-center justify-center rounded-full bg-[#333] text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 17 17 7M8 7h9v9" />
            </svg>
          </a>
        )}
      </div>
    </li>
  );
}

/* ───────── Page ───────── */

export function ProjectsArchiveContent() {
  const projects = usePortfolioStore((state) => state.projects);
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const heroRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLElement>(null);

  // Native scroll-snap does the "finish the slide" work: the browser reads the
  // scroll direction and position and carries it to the next snap point (hero top
  // or grid top) itself, so there's no JS animation to fight with. Snapping is only
  // active while the grid is covering the hero; once it fully covers, scrolling is free.
  useEffect(() => {
    const root = document.documentElement;

    const update = () => {
      const heroH = heroRef.current?.offsetHeight ?? 0;
      const nextType = window.scrollY < heroH - 1 ? 'y mandatory' : 'none';
      if (root.style.scrollSnapType !== nextType) {
        root.style.scrollSnapType = nextType;
      }
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      root.style.scrollSnapType = '';
    };
  }, []);

  const counts = useMemo(() => {
    const result = {} as Record<TabId, number>;
    for (const tab of TABS) {
      result[tab.id] = projects.filter((p) => matchesTab(p.techStack, tab.id)).length;
    }
    return result;
  }, [projects]);

  const filtered = useMemo(
    () => projects.filter((p) => matchesTab(p.techStack, activeTab)),
    [projects, activeTab]
  );

  if (projects.length === 0) {
    return <ProjectsArchiveSkeleton />;
  }

  return (
    // No `isolate` here: the pinned hero and the sliding grid must share a stacking context.
    <main className="large-mouse-effects relative min-h-screen text-white">
      {/* ───────── Hero (pinned) ───────── */}
      {/*
        The wrapper takes up one screen of normal flow and clips its content.
        The inner layer is `fixed`, so it never moves; the wrapper scrolls away
        and the grid takes its place, which reads as the grid sliding over a
        pinned hero. Unlike `sticky`, this works even if an ancestor has overflow set.
      */}
      <section
        id="projects-archive-hero"
        ref={heroRef}
        className="relative z-0 h-screen snap-start [clip-path:inset(0)]"
      >
        <div className="fixed inset-0 isolate overflow-hidden bg-[#080b10]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                'radial-gradient(60% 70% at 85% 10%, rgba(252,252,252,0.85) 0%, rgba(252,252,252,0) 70%),' +
                'radial-gradient(70% 60% at 70% 100%, rgba(252,252,252,0.9) 0%, rgba(252,252,252,0.45) 40%, rgba(252,252,252,0) 75%)',
            }}
          />
        </div>
      </section>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-screen [clip-path:inset(0)]">
        <div className="mb-16 fixed inset-0 mx-auto flex max-w-6xl flex-col justify-center gap-40 lg:gap-16 px-8 sm:px-10 ">
          <div>
            <p className="text-xs text-white/70 sm:mt-14 tracking-[0.2em] uppercase">
              • Selected work
            </p>

            <h1 className="mt-4 text-4xl font-light uppercase leading-[1.05] sm:text-6xl md:text-7xl tracking-[0.2em]">
              Every build, <br className="hidden sm:block" />
              every <span className="font-serif italic normal-case">platform</span>
            </h1>
          </div>

          <div className="flex md:items-center gap-2 md:gap-5 flex-col md:flex-row justify-start items-start">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-12 shrink-0 text-white sm:size-14 md:block hidden"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 19 19 5M7 5h12v12" />
            </svg>
            <p className="max-w-md text-xs sm:text-sm uppercase leading-relaxed text-white/85 tracking-[0.4em] md:tracking-[0.2em]">
              A growing shelf of product, interaction, and systems work —
              hand-coded, Shopify and WordPress.
            </p>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-12 shrink-0 text-white sm:size-14 md:hidden block"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 19 19 5M7 5h12v12" />
            </svg>
          </div>
          <p className='absolute tracking-[0.4em] uppercase text-[10px] text-white/70 translate-x-1/2 right-1/2 -bottom-10'>Scroll Down</p>

        </div>
              </div>

      {/* ───────── Tabs + grid (slides up over the hero) ───────── */}
      <section
        id="projects-archive-grid"
        ref={gridRef}
        className="relative z-10 isolate min-h-screen snap-start overflow-hidden bg-[#080b10]"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{ backgroundColor: BG }}
        />
        <BackgroundCanvas blobColor="#292929" />
        <div className="pointer-events-none relative z-10 mx-auto max-w-6xl px-4 py-14 sm:px-6 md:px-10 md:py-20">
          <div
            role="tablist"
            aria-label="Filter projects"
            className="mb-12 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4 md:gap-x-10"
          >
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className="large-mouse-tab pointer-events-auto group cursor-pointer text-left focus-visible:outline focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  {/* bar */}
                  <span
                    aria-hidden="true"
                    className={`large-mouse-tab-line block h-px w-full transition-colors ${
                      active ? 'bg-white' : 'bg-white/25'
                    }`}
                  />
                  <span className="mt-4 flex items-baseline gap-2">
                    <span
                      className={`large-mouse-tab-label text-xl font-light tracking-[-0.02em] transition-colors sm:text-3xl ${
                        active ? 'text-white' : 'text-white/45'
                      }`}
                    >
                      {tab.label}
                    </span>
                    <span className="text-xs text-white/50">{counts[tab.id]}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <p className="py-20 text-center text-white/55">
              No projects in this category yet.
            </p>
          ) : (
            // Container query unit (cqw) lets every grid row equal one column width,
            // so each 1x1 cell is a perfect square at any screen size.
            <div className="[container-type:inline-size]">
              <ul className="grid grid-flow-dense auto-rows-[calc((100cqw_-_0.75rem)/2)] grid-cols-2 gap-3 md:auto-rows-[calc((100cqw_-_2.25rem)/4)] md:grid-cols-4">
                {filtered.map((project, index) => {
                  const size = SIZE_PATTERN[index % SIZE_PATTERN.length];
                  return (
                    // Keyed by tab so tiles remount (and re-animate) on filter change
                    <ProjectTile
                      key={`${activeTab}-${project.id}`}
                      project={project}
                      isBig={size === 'big'}
                      index={index}
                    />
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}