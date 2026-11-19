'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { MinimalHero } from '@/components/hero/MinimalHero';
import { CaseStudiesCarousel } from '@/components/home/CaseStudiesCarousel';
import { AboutSection } from '@/components/sections/AboutSection';
import { ContactSection } from '@/components/sections/ContactSection';
import { ReviewsSection } from '@/components/sections/ReviewsSection';
import { ServicesSection } from '@/components/sections/ServicesSection';
import { SkillsSection } from '@/components/sections/SkillsSection';
import { usePortfolioStore } from '@/components/providers/PortfolioStoreProvider';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { useEffect, useState } from 'react';

const BackgroundCanvas = dynamic(
  () => import('@/components/canvas/BackgroundCanvas'),
  { ssr: false }
);

export function HomePageContent({
  projectsSection,
}: {
  projectsSection: ReactNode;
}) {
  const { activeSection } = useScrollProgress();
  const skills = usePortfolioStore((state) => state.skills);
  const services = usePortfolioStore((state) => state.services);
  const [heroAnimationStarted, setHeroAnimationStarted] = useState(false);

  useEffect(() => {
    const startHeroAnimation = () => setHeroAnimationStarted(true);
    window.addEventListener('site-loader:complete', startHeroAnimation);
    if (!document.documentElement.hasAttribute('data-site-loading')) {
      startHeroAnimation();
    }

    return () => {
      window.removeEventListener('site-loader:complete', startHeroAnimation);
    };
  }, []);

  return (
    <main className="relative w-full min-h-screen bg-[#e8e8ea] text-[#000000] selection:bg-[#000000] selection:text-white">
      <BackgroundCanvas />

      <div className="relative z-10 w-full pointer-events-none">
        <MinimalHero isActive={heroAnimationStarted} />

        <AboutSection />

        {projectsSection}

        <CaseStudiesCarousel isActive={activeSection === 'section-4'} />

        <SkillsSection skills={skills} />

        <ReviewsSection />

        <ServicesSection services={services} />

        <ContactSection />
      </div>
    </main>
  );
}
