'use client';

import { usePortfolioStore } from '@/components/providers/PortfolioStoreProvider';
import { ProjectsSection } from './ProjectsSection';

export function ProjectsData() {
  const projects = usePortfolioStore((state) => state.projects);

  return <ProjectsSection projects={projects.slice(0, 6)} />;
}
