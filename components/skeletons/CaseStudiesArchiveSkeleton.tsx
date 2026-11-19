'use client';

export function CaseStudiesArchiveSkeleton() {
  return (
    <main
      aria-label="Loading case studies"
      aria-busy="true"
      className="relative min-h-screen bg-[#080b10] text-[#f4f4f6] overflow-hidden"
    >
      <div className="relative z-10 mx-auto flex flex-col items-center justify-center px-4 py-6 sm:px-6 md:px-10 lg:px-12 lg:py-12">
        {/* Header skeleton */}
        <header className="mt-14 sm:mt-18 w-full max-w-350">
          <div className="px-8 md:px-10 lg:px-16">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-12">
              <div className="h-16 w-72 rounded-2xl bg-white/15 animate-pulse sm:h-20 sm:w-96 md:h-24" />
              <div className="space-y-2 max-w-xs w-full">
                <div className="h-4 w-full rounded bg-white/10 animate-pulse" />
                <div className="h-4 w-4/5 rounded bg-white/10 animate-pulse" />
                <div className="h-4 w-2/3 rounded bg-white/10 animate-pulse" />
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:mt-14 md:flex-row md:items-center md:justify-between">
              <div className="h-7 w-24 rounded-full bg-white/20 animate-pulse" />
            </div>
          </div>

          <div className="mt-8 h-px w-full bg-white/20 sm:mt-10" />
        </header>

        {/* 4-column Grid skeleton */}
        <div className="mt-10 grid w-full grid-cols-1 gap-x-4 gap-y-10 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4 max-w-350 px-4 sm:px-6 md:px-10 lg:px-16">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
            <div key={item} className="space-y-3">
              {/* Card visual */}
              <div className="relative aspect-[9/10] overflow-hidden rounded-2xl bg-white/[0.04] border border-white/10 animate-pulse flex items-center justify-center">
                <div className="size-12 rounded-xl bg-white/5" />
              </div>

              {/* Title & link line under card */}
              <div className="mt-3 flex items-center justify-between gap-4">
                <div className="h-4 w-3/5 rounded bg-white/10 animate-pulse" />
                <div className="size-4 rounded-full bg-white/10 animate-pulse shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

