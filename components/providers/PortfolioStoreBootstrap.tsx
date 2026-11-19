import { connection } from 'next/server';
import { getCaseStudies } from '@/lib/case-studies';
import { getProjects } from '@/lib/projects';
import { getSkills } from '@/lib/skills';
import { getServices } from '@/lib/services';
import { getTestimonials } from '@/lib/testimonials';
import type { Project } from '@/data/projects';
import type { CaseStudy } from '@/data/case-studies';
import type { Skill } from '@/data/skills';
import type { Service } from '@/data/services';
import type { Testimonial } from '@/data/testimonials';
import { PortfolioStoreProvider } from './PortfolioStoreProvider';

export async function PortfolioStoreBootstrap({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  let projects: Project[] = [];
  let caseStudies: CaseStudy[] = [];
  let skills: Skill[] = [];
  let services: Service[] = [];
  let testimonials: Testimonial[] = [];

  try {
    const results = await Promise.allSettled([
      getProjects(),
      getCaseStudies(),
      getSkills(),
      getServices(),
      getTestimonials(),
    ]);

    if (results[0].status === 'fulfilled') {
      projects = results[0].value;
    } else {
      console.error('Failed to load projects:', results[0].reason);
    }

    if (results[1].status === 'fulfilled') {
      caseStudies = results[1].value;
    } else {
      console.error('Failed to load case studies:', results[1].reason);
    }

    if (results[2].status === 'fulfilled') {
      skills = results[2].value;
    } else {
      console.error('Failed to load skills:', results[2].reason);
    }

    if (results[3].status === 'fulfilled') {
      services = results[3].value;
    } else {
      console.error('Failed to load services:', results[3].reason);
    }

    if (results[4].status === 'fulfilled') {
      testimonials = results[4].value;
    } else {
      console.error('Failed to load testimonials:', results[4].reason);
    }
  } catch (error) {
    console.error('Failed to bootstrap portfolio data:', error);
  }

  return (
    <PortfolioStoreProvider
      initialProjects={projects}
      initialCaseStudies={caseStudies}
      initialSkills={skills}
      initialServices={services}
      initialTestimonials={testimonials}
    >
      {children}
    </PortfolioStoreProvider>
  );
}
