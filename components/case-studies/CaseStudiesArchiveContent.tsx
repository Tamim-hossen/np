'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { usePortfolioStore } from '@/components/providers/PortfolioStoreProvider';
import { CaseStudiesArchiveSkeleton } from '@/components/skeletons/CaseStudiesArchiveSkeleton';

const BackgroundCanvas = dynamic(
  () => import('@/components/canvas/BackgroundCanvas'),
  { ssr: false },
);

// Where each card links to. Change this if your case study pages live elsewhere.
const caseStudyHref = (slug: string) => `/case-studies/${slug}`;

function ArrowUpRight({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

export function CaseStudiesArchiveContent() {
  const caseStudies = usePortfolioStore((state) => state.caseStudies);

  if (caseStudies.length === 0) {
    return <CaseStudiesArchiveSkeleton />;
  }

  const categories = [
    ...new Set(caseStudies.map((study) => study.category).filter(Boolean)),
  ];

  return (
    <main className="large-mouse-effects relative isolate min-h-screen bg-[#080b10] text-[#f4f4f6]">
      <BackgroundCanvas blobColor="#292929" />
      <div className="pointer-events-none relative z-10 mx-auto flex flex-col items-center justify-center px-4 py-6 sm:px-6 md:px-10 lg:px-12 lg:py-12">
        {/* ───────── Header ───────── */}
        <header className="mt-14 sm:mt-18 w-full">
          <div className='px-8 md:px-10 lg:px-16'>
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-12 ">
            <h1 className="font-serif text-6xl font-light leading-none tracking-[-0.04em] sm:text-7xl md:text-8xl">
              Case Studies
            </h1>
            <p className="max-w-xs text-sm leading-relaxed text-[#b8bac8]">
              A closer look at the challenges, architecture, and outcomes behind
              selected projects.
            </p>
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:mt-14 md:flex-row md:items-center md:justify-between">
            <span className="w-fit rounded-full bg-white px-4 py-2 text-[11px] font-medium tracking-wide text-[#14161b] uppercase">
              Showcase
            </span>
          </div>
          </div>

          <div className="mt-8 h-px w-full bg-white/20 sm:mt-10" />
        </header>

        {/* ───────── Grid: rounded image, title underneath ───────── */}
        {caseStudies.length === 0 ? (
          <p className="py-10 text-sm text-[#b8bac8]">
            No case studies are available yet.
          </p>
        ) : (
          <ol className="mt-10 grid grid-cols-1 gap-x-4 gap-y-10 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4 max-w-350">
            {caseStudies.map((study) => (
              <li key={study.id || study.slug} id={study.slug}>
                <Link
                  href={caseStudyHref(study.slug)}
                  className="large-mouse-opacity-group large-mouse-scale-group pointer-events-auto group block focus-visible:outline focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  <div className="relative aspect-[9/10] overflow-hidden rounded-2xl bg-white/5">
                    <Image
                      src={study.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      unoptimized
                      className="large-mouse-scale object-cover transition-transform duration-700 ease-out"
                    />
                  </div>

                  {/* Only the title sits under the image */}
                  <div className="mt-3 flex items-center justify-between gap-4 text-sm text-white/90">
                    <h2 className="truncate font-normal">{study.title}</h2>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span className="large-mouse-opacity hidden text-white underline underline-offset-4 opacity-0 transition-opacity duration-300 sm:inline">
                        See Detail
                      </span>
                      <ArrowUpRight />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </main>
  );
}