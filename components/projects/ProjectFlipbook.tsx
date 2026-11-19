'use client';

import Image from 'next/image';
import { forwardRef } from 'react';
import type { Project } from '@/data/projects';
import { cn } from '@/lib/utils';

interface ProjectFlipbookProps {
  project: Project;
  index: number;
  total: number;
  turnKey: number;
  className?: string;
}

export const ProjectFlipbook = forwardRef<HTMLDivElement, ProjectFlipbookProps>(
  function ProjectFlipbook(
    { project, index, total, turnKey, className },
    ref
  ) {
    return (
      <div
        ref={ref}
        className={cn('relative w-full max-w-[920px] will-change-transform', className)}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Book shadow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-6 left-1/2 h-8 w-[70%] -translate-x-1/2 rounded-[100%] bg-[#000000]/20 blur-2xl"
        />

        <div
          className="relative grid grid-cols-2 overflow-hidden rounded-sm bg-[#f4f4f6] shadow-[0_28px_80px_-28px_rgba(31,34,68,0.45)]"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Spine */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 bg-[#000000]/15"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-3 left-1/2 z-20 w-[3px] -translate-x-1/2 rounded-full bg-[#000000]/08 blur-[1px]"
          />

          {/* Left page — image */}
          <div
            key={`left-${turnKey}`}
            className="relative aspect-[4/5] origin-right overflow-hidden bg-[#d8d8dc] animate-[pageIn_520ms_cubic-bezier(0.22,1,0.36,1)_both]"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <Image
              src={project.image}
              alt={project.title}
              fill
              sizes="(max-width: 1024px) 50vw, 460px"
              className="object-cover"
              unoptimized
              priority={index === 0}
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#000000]/25 via-transparent to-white/10" />
            <div className="absolute bottom-4 left-4 font-mono text-[10px] tracking-[0.28em] uppercase text-white/80">
              {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
            </div>
          </div>

          {/* Right page — copy */}
          <div
            key={`right-${turnKey}`}
            className="relative flex aspect-[4/5] origin-left flex-col justify-between bg-[#f7f7f9] p-6 sm:p-8 md:p-10 animate-[pageIn_520ms_cubic-bezier(0.22,1,0.36,1)_both]"
            style={{ transformStyle: 'preserve-3d', animationDelay: '40ms' }}
          >
            <div>
              <div className="font-mono text-[10px] tracking-[0.28em] uppercase text-[#737691]">
                Project {String(index + 1).padStart(2, '0')}
              </div>
              <h3 className="mt-3 break-words font-[family-name:var(--font-geist-sans)] text-[clamp(1.25rem,6vw,1.5rem)] font-semibold tracking-[-0.03em] text-[#000000] sm:text-3xl md:text-4xl">
                {project.title}
              </h3>
              <p className="mt-4 max-w-[34ch] text-sm leading-relaxed text-[#555870] sm:text-[15px]">
                {project.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-6">
              {project.techStack.map((tech) => (
                <span
                  key={tech}
                  className="border border-[#000000]/15 px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] uppercase text-[#000000]/80"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
