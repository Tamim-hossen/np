'use client';

export function ContactPageSkeleton() {
  return (
    <main
      aria-label="Loading contact page"
      aria-busy="true"
      className="relative min-h-screen bg-[#080b10] text-white/65 overflow-hidden"
    >
      {/* Top Hero Section */}
      <section className="relative flex w-full justify-center">
        <div className="grid w-full max-w-350 lg:grid-cols-2">
          {/* Left: Contact info placeholder */}
          <div className="relative z-20 flex flex-col justify-center px-6 py-24 sm:px-10 sm:py-20 lg:px-16 lg:py-24 space-y-4">
            <div className="h-3 w-36 rounded bg-white/10 animate-pulse" />
            <div className="h-14 sm:h-20 w-64 rounded-2xl bg-white/20 animate-pulse" />
            <div className="space-y-2 max-w-sm pt-2">
              <div className="h-4 w-full rounded bg-white/10 animate-pulse" />
              <div className="h-4 w-4/5 rounded bg-white/10 animate-pulse" />
            </div>

            {/* Quick contact links */}
            <div className="flex items-center gap-3 pt-6">
              <div className="h-5 w-28 rounded bg-white/10 animate-pulse" />
              <div className="h-3 w-px bg-white/20" />
              <div className="h-5 w-24 rounded bg-white/10 animate-pulse" />
            </div>
          </div>

          {/* Right: Globe / Orb canvas placeholder */}
          <div className="relative z-20 flex items-center justify-center h-[340px] sm:h-[420px] lg:h-auto lg:min-h-[520px] p-8">
            <div className="relative size-60 sm:size-80 rounded-full border border-white/15 bg-white/[0.02] animate-pulse flex items-center justify-center">
              <div className="size-44 sm:size-60 rounded-full border border-white/10 flex items-center justify-center">
                <div className="size-28 sm:size-40 rounded-full border border-white/10" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Form Section Skeleton */}
      <section className="relative px-6 py-12 sm:px-10 sm:py-16 lg:px-16 lg:py-20 bg-[#f2f2f0]">
        <div className="relative z-20 mx-auto max-w-[1440px]">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
            <div className="space-y-2">
              <div className="h-3 w-28 rounded bg-black/10 animate-pulse" />
              <div className="h-10 w-56 rounded-xl bg-black/15 animate-pulse" />
            </div>
            <div className="space-y-1.5 max-w-xs w-full">
              <div className="h-3.5 w-full rounded bg-black/10 animate-pulse" />
              <div className="h-3.5 w-3/4 rounded bg-black/10 animate-pulse" />
            </div>
          </div>

          {/* Form input fields grid */}
          <div className="grid gap-x-10 gap-y-7 md:grid-cols-2 lg:gap-x-16">
            <div className="space-y-6">
              {[1, 2, 3].map((field) => (
                <div key={field} className="space-y-2">
                  <div className="h-3 w-24 rounded bg-black/10 animate-pulse" />
                  <div className="h-12 w-full rounded-xl bg-black/5 border border-black/10 animate-pulse" />
                </div>
              ))}
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="h-3 w-28 rounded bg-black/10 animate-pulse" />
                <div className="h-32 w-full rounded-xl bg-black/5 border border-black/10 animate-pulse" />
              </div>
              <div className="flex justify-end pt-4">
                <div className="h-12 w-44 rounded-full bg-black/20 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

