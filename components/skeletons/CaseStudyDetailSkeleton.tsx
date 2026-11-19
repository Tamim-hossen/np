'use client';

export function CaseStudyDetailSkeleton() {
  return (
    <main
      aria-label="Loading case study"
      aria-busy="true"
      className="relative min-h-screen bg-[#080b10] text-[#f4f4f6] overflow-hidden"
    >
      <div className="relative z-10">
        <article className="mx-auto w-full min-w-0 max-w-6xl px-6 py-8 md:px-10 md:py-12">
          {/* Header skeleton */}
          <header className="mt-10 border-b border-white/15 pb-8 sm:mt-14 sm:pb-10 space-y-4">
            <div className="h-3 w-36 rounded bg-white/10 animate-pulse" />
            <div className="space-y-3 pt-2">
              <div className="h-12 w-4/5 max-w-2xl rounded-2xl bg-white/15 animate-pulse sm:h-16 md:h-20" />
              <div className="h-12 w-3/5 max-w-xl rounded-2xl bg-white/15 animate-pulse sm:h-16 md:h-20" />
            </div>
            <div className="space-y-2 pt-4 max-w-3xl">
              <div className="h-4 w-full rounded bg-white/10 animate-pulse" />
              <div className="h-4 w-5/6 rounded bg-white/10 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-white/10 animate-pulse" />
            </div>
          </header>

          {/* Banner image skeleton */}
          <div className="relative mt-8 aspect-4/3 overflow-hidden rounded-2xl bg-white/[0.04] border border-white/10 animate-pulse sm:mt-10 sm:aspect-16/8 flex items-center justify-center">
            <div className="size-20 rounded-2xl bg-white/5 flex items-center justify-center">
              <div className="size-10 rounded-xl bg-white/10" />
            </div>
          </div>

          {/* Content columns skeleton */}
          <div className="mt-12 grid min-w-0 gap-12 md:mt-16 md:gap-16 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div>
              <div className="h-3 w-28 rounded bg-white/10 animate-pulse" />
            </div>

            <div className="min-w-0 space-y-12">
              {/* Technical challenges section */}
              <section className="space-y-6">
                <div className="h-8 w-60 rounded-xl bg-white/15 animate-pulse" />
                <div className="divide-y divide-white/15 border-y border-white/15">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="py-5 space-y-2.5">
                      <div className="h-5 w-1/2 rounded bg-white/15 animate-pulse" />
                      <div className="h-4 w-full rounded bg-white/10 animate-pulse" />
                      <div className="h-4 w-4/5 rounded bg-white/10 animate-pulse" />
                    </div>
                  ))}
                </div>
              </section>

              {/* Architectural solution section */}
              <section className="space-y-4">
                <div className="h-8 w-64 rounded-xl bg-white/15 animate-pulse" />
                <div className="space-y-2.5 max-w-3xl pt-2">
                  <div className="h-4 w-full rounded bg-white/10 animate-pulse" />
                  <div className="h-4 w-11/12 rounded bg-white/10 animate-pulse" />
                  <div className="h-4 w-4/5 rounded bg-white/10 animate-pulse" />
                </div>
              </section>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}

