'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { usePortfolioStore } from '@/components/providers/PortfolioStoreProvider';
import { ProjectDetailSkeleton } from '@/components/skeletons/ProjectDetailSkeleton';

const BackgroundCanvas = dynamic(
  () => import('@/components/canvas/BackgroundCanvas'),
  { ssr: false }
);

/**
 * Splits a description into:
 *  - intro: the first sentence
 *  - rest: all other text before "Key features"
 *  - features: "Key features" and everything after it (body only, heading removed)
 */
function splitDescription(text: string, count = 1) {
  const full = (text ?? '').trim();

  const featuresAt = full.search(/key features/i);
  const before = featuresAt >= 0 ? full.slice(0, featuresAt).trim() : full;
  const featuresRaw = featuresAt >= 0 ? full.slice(featuresAt) : '';

  const sentences = before.match(/[^.!?]+(?:[.!?]+["')\]]*|$)\s*/g) ?? [before];
  const features = featuresRaw.replace(/^key features\s*[:\-–—]?\s*/i, '').trim();

  return {
    intro: sentences.slice(0, count).join('').trim(),
    rest: sentences.slice(count).join('').trim(),
    features,
  };
}

/* ───────────────────────── Lightbox ─────────────────────────
   The viewer is a single fixed box. On open it animates FROM the clicked
   thumbnail's rect TO a centred, image-shaped rect; on close it animates
   from wherever it is TO the rect of the thumbnail for the image currently
   shown (which may differ from the one that was opened). The image uses
   object-cover throughout, so the crop morphs continuously with no jump. */

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * Locks page scrolling (wheel, trackpad, touch, keyboard, scrollbar drag, and
 * smooth-scroll libraries) while the viewer is open. The scrollbar's width is
 * replaced with padding so nothing shifts, which keeps the thumbnails' positions
 * exact for the open/close animation.
 */
function lockPageScroll() {
  const root = document.documentElement;
  const scrollbar = window.innerWidth - root.clientWidth;
  root.style.overflow = 'hidden';
  if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
}

function unlockPageScroll() {
  document.documentElement.style.overflow = '';
  document.body.style.paddingRight = '';
}

type Viewport = { w: number; h: number };

const readViewport = (): Viewport => ({
  w: document.documentElement.clientWidth,
  h: window.innerHeight,
});

const duration = (ms: number) =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms;

/** Largest box with the image's aspect ratio that fits the viewport. */
function fitBox(aspect: number, vp: Viewport) {
  const small = vp.w < 768;
  const maxW = vp.w - (small ? 32 : 128);
  const maxH = vp.h - (small ? 140 : 160);
  const width = Math.min(maxW, maxH * aspect);
  const height = width / aspect;
  return {
    left: (vp.w - width) / 2,
    top: (vp.h - height) / 2,
    width,
    height,
  };
}

const px = (r: { left: number; top: number; width: number; height: number }) => ({
  left: `${r.left}px`,
  top: `${r.top}px`,
  width: `${r.width}px`,
  height: `${r.height}px`,
});

type LightboxProps = {
  images: { src: string; alt: string }[];
  startIndex: number;
  from: DOMRect;
  startAspect: number;
  getThumb: (index: number) => HTMLElement | null;
  onIndexChange: (index: number) => void;
  onClosed: (index: number) => void;
};

function Lightbox({
  images,
  startIndex,
  from,
  startAspect,
  getThumb,
  onIndexChange,
  onClosed,
}: LightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const [aspect, setAspect] = useState(startAspect);
  const [vp, setVp] = useState<Viewport>(readViewport);
  const [chrome, setChrome] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const prevRectRef = useRef<DOMRect | null>(null);
  const closingRef = useRef(false);

  const target = fitBox(aspect, vp);

  // Open: fly out of the clicked thumbnail.
  useLayoutEffect(() => {
    const box = boxRef.current;
    const backdrop = backdropRef.current;
    if (!box || !backdrop) return;

    box.animate(
      [
        px(from),
        px(target),
      ],
      { duration: duration(650), easing: EASE },
    );
    backdrop.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: duration(450),
      easing: 'ease',
    });

    closeRef.current?.focus({ preventScroll: true });
    const id = requestAnimationFrame(() => setChrome(true));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Next/previous image (or a late aspect-ratio correction): morph from the old rect to the new one.
  useLayoutEffect(() => {
    const prev = prevRectRef.current;
    const box = boxRef.current;
    if (!prev || !box) return;
    prevRectRef.current = null;

    box.animate([px(prev), px(target)], { duration: duration(500), easing: EASE });
    innerRef.current?.animate([{ opacity: 0.35 }, { opacity: 1 }], {
      duration: duration(450),
      easing: 'ease-out',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, aspect]);

  useEffect(() => {
    const onResize = () => setVp(readViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const go = (delta: number) => {
    if (closingRef.current || images.length < 2) return;
    const next = (index + delta + images.length) % images.length;
    prevRectRef.current = boxRef.current?.getBoundingClientRect() ?? null;

    const img = getThumb(next)?.querySelector('img');
    const ar = img && img.naturalWidth > 0 ? img.naturalWidth / img.naturalHeight : aspect;

    setIndex(next);
    setAspect(ar);
    onIndexChange(next);
  };

  const close = () => {
    const box = boxRef.current;
    const backdrop = backdropRef.current;
    if (closingRef.current || !box || !backdrop) return;
    closingRef.current = true;
    setChrome(false);

    const cur = box.getBoundingClientRect();
    const thumbRect = getThumb(index)?.getBoundingClientRect();
    const thumbVisible =
      !!thumbRect &&
      thumbRect.width > 0 &&
      thumbRect.bottom > 0 &&
      thumbRect.top < vp.h &&
      thumbRect.right > 0 &&
      thumbRect.left < vp.w;

    const ms = duration(550);
    const anim = thumbVisible
      ? box.animate(
          [
            px(cur),
            px(thumbRect!),
          ],
          { duration: ms, easing: EASE, fill: 'forwards' },
        )
      : // thumbnail scrolled out of view: fall back to a soft fade
        box.animate(
          [
            { opacity: 1, transform: 'scale(1)' },
            { opacity: 0, transform: 'scale(0.94)' },
          ],
          { duration: ms, easing: EASE, fill: 'forwards' },
        );

    backdrop.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: ms,
      easing: 'ease',
      fill: 'forwards',
    });

    anim.onfinish = () => onClosed(index);
  };

  // Keep latest handlers reachable from the one-time listeners below.
  const handlersRef = useRef({ go, close });
  handlersRef.current = { go, close };

  useEffect(() => {
    const root = rootRef.current;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handlersRef.current.close();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handlersRef.current.go(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlersRef.current.go(-1);
      } else if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' ', 'Home', 'End'].includes(e.key)) {
        e.preventDefault(); // don't scroll the page behind the viewer
      }
    };
    const block = (e: Event) => e.preventDefault();

    window.addEventListener('keydown', onKey);
    // Block page scrolling without hiding the scrollbar (which would shift the layout and the thumbnails).
    root?.addEventListener('wheel', block, { passive: false });
    root?.addEventListener('touchmove', block, { passive: false });
    return () => {
      window.removeEventListener('keydown', onKey);
      root?.removeEventListener('wheel', block);
      root?.removeEventListener('touchmove', block);
    };
  }, []);

  const current = images[index];
  const chromeClass = `transition-opacity duration-300 ${
    chrome ? 'opacity-100' : 'pointer-events-none opacity-0'
  }`;
  const buttonClass =
    'large-mouse-hover-button flex size-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      data-lenis-prevent
      className="large-mouse-effects fixed inset-0 z-[100] overscroll-contain"
    >
      <div
        ref={backdropRef}
        onClick={close}
        className="absolute inset-0 bg-[#080b10]/90"
      />

      <div
        ref={boxRef}
        onClick={close}
        style={{ position: 'fixed', ...px(target) }}
        className="cursor-zoom-out overflow-hidden rounded-3xl bg-[#151519]"
      >
        <div ref={innerRef} className="absolute inset-0">
          <Image
            key={index}
            src={current.src}
            alt={current.alt}
            fill
            sizes="100vw"
            unoptimized
            priority
            className="object-cover"
            onLoad={(e) => {
              const img = e.currentTarget;
              if (!img.naturalWidth) return;
              const ar = img.naturalWidth / img.naturalHeight;
              if (Math.abs(ar - aspect) > 0.01) {
                prevRectRef.current = boxRef.current?.getBoundingClientRect() ?? null;
                setAspect(ar);
              }
            }}
          />
        </div>
      </div>

      <button
        ref={closeRef}
        type="button"
        onClick={close}
        aria-label="Close image viewer"
        className={`${buttonClass} ${chromeClass} fixed top-4 right-4 md:top-6 md:right-6 cursor-pointer`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous image"
            className={`${buttonClass} ${chromeClass} fixed top-1/2 left-3 -translate-y-1/2 md:left-6 cursor-pointer`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 5-7 7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next image"
            className={`${buttonClass} ${chromeClass} fixed top-1/2 right-3 -translate-y-1/2 md:right-6 cursor-pointer`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 5 7 7-7 7" />
            </svg>
          </button>
          <p
            className={`${chromeClass} fixed bottom-5 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.28em] text-white/70 uppercase`}
          >
            {index + 1} / {images.length}
          </p>
        </>
      )}
    </div>,
    document.body,
  );
}

/* ───────────────────────── Page ───────────────────────── */

export function ProjectDetailContent({ projectId }: { projectId: string }) {
  const projects = usePortfolioStore((state) => state.projects);
  const project = projects.find((item) => item.id === projectId);

  // Lightbox state (hooks must stay above the early return below)
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [lightbox, setLightbox] = useState<{
    index: number;
    from: DOMRect;
    aspect: number;
  } | null>(null);
  const [hiddenIndex, setHiddenIndex] = useState<number | null>(null);

  // Never leave the page locked if this component unmounts while the viewer is open.
  useEffect(() => unlockPageScroll, []);

  if (projects.length === 0) {
    return <ProjectDetailSkeleton />;
  }

  if (!project) {
    return (
      <main className="large-mouse-effects relative isolate flex min-h-screen items-center bg-[#242327] px-6 text-white">
        <BackgroundCanvas blobColor="#292929" />
        <div className="pointer-events-none relative z-10 mx-auto w-full max-w-6xl py-20">
          <p className="font-mono text-[10px] tracking-[0.28em] text-white/55 uppercase">
            Project not found
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
            This project isn’t available.
          </h1>
          <Link
            href="/projects"
            className="large-mouse-hover-button pointer-events-auto mt-8 inline-flex rounded-full border border-white/25 px-5 py-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            ← All projects
          </Link>
        </div>
      </main>
    );
  }

  const galleryImages = [
    ...new Set(project.projectImages.filter((image) => image !== project.image)),
  ];
  const { intro, rest, features } = splitDescription(project.description);

  const lightboxImages = galleryImages.map((src, i) => ({
    src,
    alt: `${project.title} project preview ${i + 1}`,
  }));

  const openLightbox = (index: number) => {
    const el = thumbRefs.current[index];
    if (!el) return;
    lockPageScroll(); // before measuring, so the thumbnail rect is final
    const img = el.querySelector('img');
    const aspect =
      img && img.naturalWidth > 0 ? img.naturalWidth / img.naturalHeight : 4 / 3;
    setLightbox({ index, from: el.getBoundingClientRect(), aspect });
    setHiddenIndex(index);
  };

  return (
    <main className="large-mouse-effects relative isolate min-h-screen bg-[#080b10] text-white">
      <BackgroundCanvas blobColor="#292929" />
      <div className="pointer-events-none relative z-10 mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-14">
        {/* Sidebar (title) + content, separated by a vertical rule */}
        <div className="mt-8 grid gap-y-10 md:grid-cols-4 md:gap-y-0">
          {/* ───────── Left: project title ───────── */}
          <div className="md:pr-6">
            <h1 className="break-words text-4xl font-light leading-[1.1] tracking-[-0.02em] sm:text-5xl md:sticky md:top-10 md:text-4xl lg:text-5xl">
              {project.title}
            </h1>
          </div>

          {/* ───────── Content ───────── */}
          <div className="md:col-span-3 md:border-l md:border-white/20 md:pl-6">
            {/* Top row: first sentence | the rest */}
            <div className="grid gap-8 md:min-h-[17rem] md:grid-cols-3 md:gap-0">
              <p className="whitespace-pre-line text-xl font-light leading-snug text-white/90 sm:text-2xl md:col-span-2 md:pr-8 lg:text-[1.7rem]">
                {intro}
              </p>

              <div className="flex flex-col justify-end gap-6 md:border-l md:border-white/20 md:pl-6">
                {rest && (
                  <p className="max-w-xs whitespace-pre-line text-base sm:text-xs leading-relaxed text-white/70">
                    {rest}
                  </p>
                )}
              </div>
            </div>


            <div className="mt-10 grid grid-cols-2 gap-4 md:mt-14 md:grid-cols-3">
              <div
                role="img"
                aria-label={`${project.title} main image`}
                className="relative col-span-2 aspect-[3/2] overflow-hidden rounded-3xl"
              >
                <Image
                  src={project.image}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 66vw"
                  unoptimized
                  priority
                  className="object-cover"
                />
              </div>

              <section className="col-span-2 md:col-span-1 flex flex-col justify-between">
                <div>
                  <h2 className="font-mono text-[10px] tracking-[0.24em] text-white/55 uppercase">
                  Technologies
                </h2>
                <ul className="mt-5 border-t border-white/15">
                  {project.techStack.map((technology) => (
                    <li
                      key={technology}
                      className="border-b border-white/15 py-3 text-sm font-light text-white/85"
                    >
                      {technology}
                    </li>
                  ))}
                </ul>
                </div>
                {project.link && (
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="large-mouse-arrow-group pointer-events-auto inline-flex w-fit group items-center gap-2 px-1 py-1 text-sm font-medium text-white border-b transition-colors focus-visible:outline focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    Visit live site <span aria-hidden="true" className="large-mouse-arrow transition">↗</span>
                  </a>
                )}
              </section>
            </div>

            {/* Key features: the remainder of the description */}
            {features && (
              <section className="mt-16 md:mt-24 ">
                <h2 className="font-mono text-[10px] tracking-[0.24em] text-white/55 uppercase">
                  Key features
                </h2>
                <p className="mt-6 max-w-2xl whitespace-pre-line text-base font-light leading-7 text-white/80 sm:text-lg sm:leading-8">
                  {features}
                </p>
              </section>
            )}

            {/* Project gallery */}
            {galleryImages.length > 0 && (
              <section className="mt-16 md:mt-24">
                <h2 className="font-mono text-[10px] tracking-[0.24em] text-white/55 uppercase">
                  Project gallery
                </h2>
                <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
                  {galleryImages.map((image, index) => (
                    <li
                      key={image}
                      className="relative aspect-4/3  bg-[#151519] rounded-3xl overflow-hidden"
                    >
                      <button
                        type="button"
                        ref={(el) => {
                          thumbRefs.current[index] = el;
                        }}
                        onClick={() => openLightbox(index)}
                        aria-label={`Open ${project.title} project preview ${index + 1}`}
                        className={`pointer-events-auto absolute inset-0 block cursor-zoom-in focus-visible:outline focus-visible:outline-offset-[-4px] focus-visible:outline-white ${
                          hiddenIndex === index ? 'opacity-0' : ''
                        }`}
                      >
                        <Image
                          src={image}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 50vw, 22vw"
                          unoptimized
                          className="object-cover"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>

      {lightbox && (
        <Lightbox
          images={lightboxImages}
          startIndex={lightbox.index}
          from={lightbox.from}
          startAspect={lightbox.aspect}
          getThumb={(i) => thumbRefs.current[i] ?? null}
          onIndexChange={setHiddenIndex}
          onClosed={(i) => {
            unlockPageScroll();
            setLightbox(null);
            setHiddenIndex(null);
            requestAnimationFrame(() =>
              thumbRefs.current[i]?.focus({ preventScroll: true }),
            );
          }}
        />
      )}
    </main>
  );
}