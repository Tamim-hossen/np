'use client';

export function ProjectsSectionSkeleton() {
  return (
    <div
      aria-label="Loading projects"
      aria-busy="true"
      className="relative z-10 grid w-full max-w-[74rem] flex-1 grid-cols-1 content-start items-start gap-5 sm:gap-8 lg:grid-cols-12 lg:content-center lg:items-center lg:gap-8 xl:gap-12"
    >
      {/* Left Column: Project Titles List Skeleton */}
      <div className="order-1 min-w-0 lg:col-span-5 space-y-4">
        <ul className="flex flex-col gap-3 sm:gap-4">
          {[
            { w: 'w-4/5' },
            { w: 'w-3/4' },
            { w: 'w-5/6' },
            { w: 'w-2/3' },
            { w: 'w-3/5' },
          ].map((item, index) => (
            <li key={index} className="py-2">
              <div
                className={`h-7 sm:h-9 lg:h-11 rounded-xl bg-black/10 animate-pulse ${item.w}`}
              />
            </li>
          ))}
        </ul>

        {/* Link Button Skeleton */}
        <div className="pt-6">
          <div className="h-4 w-28 rounded bg-black/15 animate-pulse" />
        </div>
      </div>

      {/* Right Column: Project Preview Card Skeleton */}
      <div className="order-2 min-w-0 lg:col-span-7">
        <div className="mx-auto aspect-square w-full max-w-[min(100%,34rem)] overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-black/[0.06] border border-black/10 animate-pulse flex items-center justify-center">
          <div className="size-20 rounded-2xl bg-black/5 flex items-center justify-center">
            <div className="size-10 rounded-xl bg-black/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

