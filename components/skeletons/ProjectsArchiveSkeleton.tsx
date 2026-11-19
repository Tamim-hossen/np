'use client';

export function ProjectsArchiveSkeleton() {
  return (
    <main
      aria-label="Loading projects archive"
      aria-busy="true"
      className="relative min-h-screen bg-[#080b10] text-white overflow-hidden"
    >
      {/* Background glow gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 70% at 85% 10%, rgba(252,252,252,0.06) 0%, rgba(252,252,252,0) 70%),' +
            'radial-gradient(70% 60% at 70% 100%, rgba(252,252,252,0.08) 0%, rgba(252,252,252,0.03) 40%, rgba(252,252,252,0) 75%)',
        }}
      />

      {/* Hero section skeleton */}
      <section className="relative mx-auto flex min-h-[75vh] max-w-6xl flex-col justify-center px-8 py-20 sm:px-10">
        <div className="space-y-4">
          {/* Tagline skeleton */}
          <div className="h-3 w-32 rounded-full bg-white/10 animate-pulse" />

          {/* Heading skeleton */}
          <div className="space-y-3 pt-2">
            <div className="h-12 w-4/5 max-w-2xl rounded-2xl bg-white/10 animate-pulse sm:h-16 md:h-20" />
            <div className="h-12 w-3/5 max-w-xl rounded-2xl bg-white/10 animate-pulse sm:h-16 md:h-20" />
          </div>

          {/* Subtext skeleton */}
          <div className="pt-6 space-y-2 max-w-md">
            <div className="h-3.5 w-full rounded bg-white/10 animate-pulse" />
            <div className="h-3.5 w-4/5 rounded bg-white/10 animate-pulse" />
          </div>
        </div>

        {/* Scroll indicator skeleton */}
        <div className="mt-16 flex items-center gap-2">
          <div className="h-2.5 w-20 rounded bg-white/10 animate-pulse" />
        </div>
      </section>

      {/* Grid section skeleton */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-14 sm:px-6 md:px-10 md:py-20 border-t border-white/10">
        {/* Tabs skeleton */}
        <div className="mb-12 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4 md:gap-x-10">
          {[
            { labelWidth: 'w-16', countWidth: 'w-4' },
            { labelWidth: 'w-24', countWidth: 'w-4' },
            { labelWidth: 'w-20', countWidth: 'w-4' },
            { labelWidth: 'w-24', countWidth: 'w-4' },
          ].map((tab, i) => (
            <div key={i} className="space-y-4">
              <div
                className={`h-px w-full ${
                  i === 0 ? 'bg-white/40' : 'bg-white/15'
                }`}
              />
              <div className="flex items-baseline gap-2">
                <div
                  className={`h-7 rounded-lg bg-white/10 animate-pulse ${tab.labelWidth}`}
                />
                <div
                  className={`h-3 rounded bg-white/10 animate-pulse ${tab.countWidth}`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Tiles dense grid skeleton */}
        <div className="[container-type:inline-size]">
          <ul className="grid grid-flow-dense auto-rows-[calc((100cqw_-_0.75rem)/2)] grid-cols-2 gap-3 md:auto-rows-[calc((100cqw_-_2.25rem)/4)] md:grid-cols-4">
            {/* Tile 0: Big */}
            <li className="col-span-2 row-span-2 relative overflow-hidden rounded-3xl bg-white/[0.04] border border-white/10 animate-pulse p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="h-4 w-28 rounded-full bg-white/10" />
                <div className="size-8 rounded-full bg-white/10" />
              </div>
              <div className="space-y-2">
                <div className="h-6 w-1/2 rounded-lg bg-white/15" />
                <div className="h-3.5 w-1/3 rounded bg-white/10" />
              </div>
            </li>

            {/* Tile 1: Small */}
            <li className="relative overflow-hidden rounded-3xl bg-white/[0.03] border border-white/10 animate-pulse p-4 flex flex-col justify-end">
              <div className="h-4 w-3/4 rounded bg-white/10" />
            </li>

            {/* Tile 2: Small */}
            <li className="relative overflow-hidden rounded-3xl bg-white/[0.03] border border-white/10 animate-pulse p-4 flex flex-col justify-end">
              <div className="h-4 w-2/3 rounded bg-white/10" />
            </li>

            {/* Tile 3: Small */}
            <li className="relative overflow-hidden rounded-3xl bg-white/[0.03] border border-white/10 animate-pulse p-4 flex flex-col justify-end">
              <div className="h-4 w-4/5 rounded bg-white/10" />
            </li>

            {/* Tile 4: Small */}
            <li className="relative overflow-hidden rounded-3xl bg-white/[0.03] border border-white/10 animate-pulse p-4 flex flex-col justify-end">
              <div className="h-4 w-3/5 rounded bg-white/10" />
            </li>

            {/* Tile 5: Small */}
            <li className="relative overflow-hidden rounded-3xl bg-white/[0.03] border border-white/10 animate-pulse p-4 flex flex-col justify-end">
              <div className="h-4 w-3/4 rounded bg-white/10" />
            </li>

            {/* Tile 6: Small */}
            <li className="relative overflow-hidden rounded-3xl bg-white/[0.03] border border-white/10 animate-pulse p-4 flex flex-col justify-end">
              <div className="h-4 w-2/3 rounded bg-white/10" />
            </li>

            {/* Tile 7: Big */}
            <li className="col-span-2 row-span-2 relative overflow-hidden rounded-3xl bg-white/[0.04] border border-white/10 animate-pulse p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="h-4 w-28 rounded-full bg-white/10" />
                <div className="size-8 rounded-full bg-white/10" />
              </div>
              <div className="space-y-2">
                <div className="h-6 w-1/2 rounded-lg bg-white/15" />
                <div className="h-3.5 w-1/3 rounded bg-white/10" />
              </div>
            </li>

            {/* Tile 8: Small */}
            <li className="relative overflow-hidden rounded-3xl bg-white/[0.03] border border-white/10 animate-pulse p-4 flex flex-col justify-end">
              <div className="h-4 w-4/5 rounded bg-white/10" />
            </li>

            {/* Tile 9: Small */}
            <li className="relative overflow-hidden rounded-3xl bg-white/[0.03] border border-white/10 animate-pulse p-4 flex flex-col justify-end">
              <div className="h-4 w-1/2 rounded bg-white/10" />
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}

