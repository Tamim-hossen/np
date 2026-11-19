'use client';

export function ProjectDetailSkeleton() {
  return (
    <main
      aria-label="Loading project details"
      aria-busy="true"
      className="relative min-h-screen bg-[#080b10] text-white overflow-hidden"
    >
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-14">
        {/* Back navigation placeholder */}
        <div className="mb-6 flex items-center gap-2">
          <div className="h-3.5 w-24 rounded-full bg-white/10 animate-pulse" />
        </div>

        {/* Sidebar + Main content grid */}
        <div className="mt-8 grid gap-y-10 md:grid-cols-4 md:gap-y-0">
          {/* Left: Project title placeholder */}
          <div className="md:pr-6 space-y-3">
            <div className="h-10 w-4/5 rounded-2xl bg-white/15 animate-pulse sm:h-12" />
            <div className="h-10 w-3/5 rounded-2xl bg-white/15 animate-pulse sm:h-12" />
            <div className="pt-4">
              <div className="h-4 w-28 rounded-full bg-white/10 animate-pulse" />
            </div>
          </div>

          {/* Right: Content details */}
          <div className="md:col-span-3 md:border-l md:border-white/20 md:pl-6">
            {/* Top row: Intro | Rest */}
            <div className="grid gap-8 md:min-h-[17rem] md:grid-cols-3 md:gap-0">
              <div className="md:col-span-2 md:pr-8 space-y-3">
                <div className="h-7 w-full rounded-xl bg-white/15 animate-pulse" />
                <div className="h-7 w-5/6 rounded-xl bg-white/15 animate-pulse" />
                <div className="h-7 w-4/6 rounded-xl bg-white/15 animate-pulse" />
              </div>

              <div className="flex flex-col justify-end gap-3 md:border-l md:border-white/20 md:pl-6">
                <div className="h-4 w-full rounded bg-white/10 animate-pulse" />
                <div className="h-4 w-4/5 rounded bg-white/10 animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-white/10 animate-pulse" />
              </div>
            </div>

            {/* Main Image + Technologies */}
            <div className="mt-10 grid grid-cols-2 gap-4 md:mt-14 md:grid-cols-3">
              {/* Main image card */}
              <div className="relative col-span-2 aspect-[3/2] overflow-hidden rounded-3xl bg-white/[0.04] border border-white/10 animate-pulse flex items-center justify-center">
                <div className="size-16 rounded-2xl bg-white/5 flex items-center justify-center">
                  <div className="size-8 rounded-lg bg-white/10" />
                </div>
              </div>

              {/* Technologies column */}
              <section className="col-span-2 md:col-span-1 flex flex-col justify-between">
                <div>
                  <div className="h-3 w-28 rounded bg-white/10 animate-pulse" />
                  <ul className="mt-5 border-t border-white/15 divide-y divide-white/15">
                    {[1, 2, 3, 4].map((tech) => (
                      <li key={tech} className="py-3">
                        <div className="h-4 w-24 rounded bg-white/10 animate-pulse" />
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-6">
                  <div className="h-5 w-32 rounded bg-white/15 animate-pulse" />
                </div>
              </section>
            </div>

            {/* Key features section */}
            <section className="mt-16 md:mt-24 space-y-4">
              <div className="h-3 w-28 rounded bg-white/10 animate-pulse" />
              <div className="space-y-3 pt-2 max-w-2xl">
                <div className="h-4 w-full rounded bg-white/10 animate-pulse" />
                <div className="h-4 w-11/12 rounded bg-white/10 animate-pulse" />
                <div className="h-4 w-4/5 rounded bg-white/10 animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-white/10 animate-pulse" />
              </div>
            </section>

            {/* Project gallery section */}
            <section className="mt-16 md:mt-24">
              <div className="h-3 w-32 rounded bg-white/10 animate-pulse" />
              <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <li
                    key={item}
                    className="aspect-[4/3] rounded-2xl bg-white/[0.04] border border-white/10 animate-pulse"
                  />
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

