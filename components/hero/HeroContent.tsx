'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ArrowDown, ArrowUpRight, Sparkles } from 'lucide-react';

const RobotCanvas = dynamic(() => import('@/components/canvas/RobotCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-2 border-neutral-200 border-t-neutral-800 animate-spin" />
    </div>
  ),
});

const SKILLS = [
  'Next.js & React',
  'React Three Fiber',
  'Node & GraphQL',
  'Shopify & E-Commerce',
  'Modern UI/UX',
];

function TypewriterSkills() {
  const [skillIndex, setSkillIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;

    const currentSkill = SKILLS[skillIndex];
    let timeout: NodeJS.Timeout;

    if (!isDeleting) {
      if (displayText.length < currentSkill.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentSkill.slice(0, displayText.length + 1));
        }, 75);
      } else {
        // Pause at full word before deleting
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, 1800);
      }
    } else {
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(currentSkill.slice(0, displayText.length - 1));
        }, 35);
      } else {
        // Finished deleting, proceed to next word
        setIsDeleting(false);
        setSkillIndex((prev) => (prev + 1) % SKILLS.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, skillIndex, hasMounted]);

  return (
    <div className="text-xl md:text-2xl text-neutral-600 font-medium tracking-tight mt-3 flex items-center flex-wrap gap-x-2 min-h-[36px]">
      <span>I build with</span>
      <span className="font-mono text-neutral-950 font-semibold inline-flex items-center">
        <span>{hasMounted ? displayText : SKILLS[0]}</span>
        <span className="inline-block w-[2px] h-5 md:h-6 bg-blue-600 ml-1.5 animate-pulse" />
      </span>
    </div>
  );
}

interface HeroContentProps {
  robotSlot?: React.ReactNode;
}

export function HeroContent({ robotSlot }: HeroContentProps) {
  return (
    <section className="min-h-screen grid grid-cols-1 lg:grid-cols-12 items-center px-8 md:px-16 lg:px-24 max-w-7xl mx-auto relative z-10 pointer-events-none pt-20 lg:pt-0">
      {/* Left Column: Interactive Hero Typography & CTAs */}
      <div className="lg:col-span-6 pointer-events-auto flex flex-col justify-center py-12 lg:py-0">
        {/* Job Title Badge / Pill */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-neutral-200/90 bg-neutral-50/90 backdrop-blur-md text-xs md:text-sm font-medium text-neutral-800 shadow-xs w-fit mb-6 transition-all hover:border-neutral-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="tracking-wide">Full-Stack Engineer &amp; Creative Developer</span>
        </div>

        {/* Large Hero Headline */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-neutral-900 leading-[1.08]">
          Designing digital products that <span className="underline decoration-neutral-300 decoration-wavy underline-offset-8">move.</span>
        </h1>

        {/* Animated Typewriter Skills */}
        <TypewriterSkills />

        {/* Intro Paragraph */}
        <p className="text-neutral-500 text-lg leading-relaxed mt-5 max-w-md">
          Bridging creative engineering and high-performance architecture. Building interactive 3D interfaces, distributed web systems, and fluid digital experiences.
        </p>

        {/* CTA Row */}
        <div className="flex flex-wrap items-center gap-4 mt-8">
          <a
            href="#projects"
            className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-neutral-950 text-white font-medium text-sm transition-all duration-200 hover:bg-neutral-800 hover:shadow-lg active:scale-98 shadow-neutral-900/10"
          >
            <span>Explore Projects</span>
            <ArrowDown className="w-4 h-4 transition-transform duration-200 group-hover:translate-y-0.5" />
          </a>

          <a
            href="#contact"
            className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-neutral-300 bg-white/80 backdrop-blur-xs text-neutral-800 font-medium text-sm transition-all duration-200 hover:bg-neutral-50 hover:border-neutral-400 active:scale-98"
          >
            <span>Get in Touch</span>
            <ArrowUpRight className="w-4 h-4 text-neutral-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-neutral-900" />
          </a>
        </div>

        {/* Subtle Tech Stack Badges */}
        <div className="flex items-center gap-2 mt-10 text-xs text-neutral-400">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span>Three.js • WebGL • Next.js 15 • TypeScript • Tailwind</span>
        </div>
      </div>

      {/* Right Column: Reserved Viewport Container for the 3D Robot Head */}
      <div className="lg:col-span-6 h-[450px] lg:h-[550px] w-full relative pointer-events-auto flex items-center justify-center">
        {robotSlot || <RobotCanvas />}
      </div>

      {/* Subtle Scroll Down Indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-auto opacity-70 hover:opacity-100 transition-opacity">
        <a href="#projects" className="flex flex-col items-center gap-1.5 text-xs font-mono text-neutral-400">
          <span className="tracking-widest uppercase text-[10px]">Scroll down</span>
          <ArrowDown className="w-3.5 h-3.5 animate-bounce text-neutral-500" />
        </a>
      </div>
    </section>
  );
}
