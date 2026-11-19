import { connection } from 'next/server';
import { getCaseStudies } from '@/lib/case-studies';
import { getProjects } from '@/lib/projects';
import { getSkills } from '@/lib/skills';
import { getServices } from '@/lib/services';
import { getTestimonials } from '@/lib/testimonials';
import { PortfolioStoreProvider } from './PortfolioStoreProvider';

export async function PortfolioStoreBootstrap({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const [projects, caseStudies, skills, services, testimonials] = await Promise.all([
    getProjects(),
    getCaseStudies(),
    getSkills(),
    getServices(),
    getTestimonials(),
  ]);

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
