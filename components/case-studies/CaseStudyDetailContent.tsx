'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { usePortfolioStore } from '@/components/providers/PortfolioStoreProvider';

const BackgroundCanvas = dynamic(
  () => import('@/components/canvas/BackgroundCanvas'),
  { ssr: false },
);

export function CaseStudyDetailContent({ slug }: { slug: string }) {
  const study = usePortfolioStore((state) =>
    state.caseStudies.find((item) => item.slug === slug),
  );

  if (!study) {
    return (
      <main className="flex min-h-screen items-center bg-[#080b10] px-6 text-white md:px-10">
        <div className="mx-auto w-full max-w-5xl py-20">
          <p className="font-mono text-[10px] tracking-[0.28em] text-white/55 uppercase">
            Case study not found
          </p>
          <h1 className="mt-3 text-4xl font-light tracking-[-0.045em] sm:text-5xl">
            This case study isn’t available.
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="large-mouse-effects relative isolate min-h-screen bg-[#080b10] text-[#f4f4f6]">
      <BackgroundCanvas blobColor="#292929" />
      <div className="pointer-events-none relative z-10">
        <article className="mx-auto w-full min-w-0 max-w-6xl px-6 py-8 md:px-10 md:py-12">

        <header className="mt-10 border-b border-white/15 pb-8 sm:mt-14 sm:pb-10">
          <p className="font-mono text-[10px] tracking-[0.24em] text-white/55 uppercase">
            {study.category}
            {study.createdAt && ` · ${new Date(study.createdAt).getFullYear()}`}
          </p>
          <h1 className="mt-4 max-w-4xl break-words font-serif text-5xl font-light leading-[1.05] tracking-[-0.04em] sm:text-6xl md:text-7xl [overflow-wrap:anywhere]">
            {study.title}
          </h1>
          <p className="mt-6 max-w-3xl whitespace-pre-line text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
            {study.executiveSummary}
          </p>
        </header>

        <div className="relative mt-8 aspect-4/3 overflow-hidden rounded-2xl bg-white/5 sm:mt-10 sm:aspect-16/8">
          <Image
            src={study.image}
            alt={`${study.title} case study`}
            fill
            sizes="(max-width: 768px) 100vw, 1152px"
            unoptimized
            priority
            className="object-cover"
          />
        </div>

        <div className="mt-12 grid min-w-0 gap-12 md:mt-16 md:gap-16 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <p className="font-mono text-[10px] tracking-[0.24em] text-white/55 uppercase">
            The case study
          </p>

          <div className="min-w-0 space-y-12">
            {study.technicalChallenges.length > 0 && (
              <section aria-labelledby="technical-challenges">
                <h2
                  id="technical-challenges"
                  className="text-2xl font-light tracking-[-0.03em] sm:text-3xl"
                >
                  Technical challenges
                </h2>
                <ul className="mt-6 divide-y divide-white/15 border-y border-white/15">
                  {study.technicalChallenges.map((challenge) => (
                    <li key={challenge.challenge} className="py-5">
                      <h3 className="break-words text-base font-medium [overflow-wrap:anywhere]">{challenge.challenge}</h3>
                      <p className="mt-2 whitespace-pre-line break-words text-sm leading-7 text-white/65 [overflow-wrap:anywhere]">
                        {challenge.details}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="architectural-solution">
              <h2
                id="architectural-solution"
                className="text-2xl font-light tracking-[-0.03em] sm:text-3xl"
              >
                Architectural solution
              </h2>
              <p className="mt-5 whitespace-pre-line break-words text-sm leading-7 text-white/65 sm:text-base [overflow-wrap:anywhere]">
                {study.architecturalSolution.overview}
              </p>
              {study.architecturalSolution.unforgeableSignals.length > 0 && (
                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                  {study.architecturalSolution.unforgeableSignals.map((signal) => (
                    <li
                      key={signal.signal}
                      className="min-w-0 rounded-xl border border-white/15 bg-white/[0.03] p-5"
                    >
                      <h3 className="break-words font-mono text-xs font-medium [overflow-wrap:anywhere]">{signal.signal}</h3>
                      <p className="mt-4 break-words text-sm leading-6 text-white/65 [overflow-wrap:anywhere]">
                        <span className="font-medium text-white/90">Physical device: </span>
                        {signal.genuineMobile}
                      </p>
                      <p className="mt-3 break-words text-sm leading-6 text-white/65 [overflow-wrap:anywhere]">
                        <span className="font-medium text-white/90">Desktop emulation: </span>
                        {signal.desktopEmulation}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {study.results.length > 0 && (
              <section aria-labelledby="results">
                <h2
                  id="results"
                  className="text-2xl font-light tracking-[-0.03em] sm:text-3xl"
                >
                  Results
                </h2>
                <ul className="mt-5 space-y-3">
                  {study.results.map((result) => (
                    <li
                      key={result}
                      className="flex min-w-0 gap-3 text-sm leading-7 text-white/70 sm:text-base"
                    >
                      <span aria-hidden="true" className="text-white/45">↗</span>
                      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{result}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="implementation">
              <h2
                id="implementation"
                className="text-2xl font-light tracking-[-0.03em] sm:text-3xl"
              >
                Implementation
              </h2>
              <pre
                data-lenis-prevent
                tabIndex={0}
                aria-label="Scrollable implementation code"
                className="pointer-events-auto mt-5 max-h-[32rem] min-w-0 max-w-full overflow-x-auto overflow-y-scroll rounded-xl border border-white/10 bg-black/30 p-4 text-xs leading-6 text-white/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:p-6"
              >
                <code>{study.implementationSnippet}</code>
              </pre>
            </section>
          </div>
        </div>
        </article>
      </div>
    </main>
  );
}
