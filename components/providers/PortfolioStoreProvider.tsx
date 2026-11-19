'use client';

import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { CaseStudy } from '@/data/case-studies';
import type { Project } from '@/data/projects';
import type { Skill } from '@/data/skills';
import type { Service } from '@/data/services';
import type { Testimonial } from '@/data/testimonials';

interface PortfolioState {
  projects: Project[];
  caseStudies: CaseStudy[];
  skills: Skill[];
  services: Service[];
  testimonials: Testimonial[];
  setProjects: (projects: Project[]) => void;
  setCaseStudies: (caseStudies: CaseStudy[]) => void;
  setSkills: (skills: Skill[]) => void;
  setServices: (services: Service[]) => void;
  setTestimonials: (testimonials: Testimonial[]) => void;
}

type PortfolioStore = StoreApi<PortfolioState>;

const PortfolioStoreContext = createContext<PortfolioStore | null>(null);

function createPortfolioStore(
  initialProjects: Project[],
  initialCaseStudies: CaseStudy[],
  initialSkills: Skill[],
  initialServices: Service[],
  initialTestimonials: Testimonial[],
): PortfolioStore {
  return createStore<PortfolioState>()((set) => ({
    projects: initialProjects,
    caseStudies: initialCaseStudies,
    skills: initialSkills,
    services: initialServices,
    testimonials: initialTestimonials,
    setProjects: (projects) => set({ projects }),
    setCaseStudies: (caseStudies) => set({ caseStudies }),
    setSkills: (skills) => set({ skills }),
    setServices: (services) => set({ services }),
    setTestimonials: (testimonials) => set({ testimonials }),
  }));
}

export function PortfolioStoreProvider({
  initialProjects,
  initialCaseStudies,
  initialSkills,
  initialServices,
  initialTestimonials,
  children,
}: {
  initialProjects: Project[];
  initialCaseStudies: CaseStudy[];
  initialSkills: Skill[];
  initialServices: Service[];
  initialTestimonials: Testimonial[];
  children: ReactNode;
}) {
  const [store] = useState(() =>
    createPortfolioStore(
      initialProjects,
      initialCaseStudies,
      initialSkills,
      initialServices,
      initialTestimonials,
    ),
  );

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-portfolio-data-ready', '');
    window.dispatchEvent(new Event('portfolio-data:ready'));
  }, []);

  return (
    <PortfolioStoreContext.Provider value={store}>
      {children}
    </PortfolioStoreContext.Provider>
  );
}

export function usePortfolioStore<T>(
  selector: (state: PortfolioState) => T,
): T {
  const store = useContext(PortfolioStoreContext);

  if (!store) {
    throw new Error('usePortfolioStore must be used within PortfolioStoreProvider');
  }

  return useStore(store, selector);
}
