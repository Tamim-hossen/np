import type { Metadata } from 'next';
import { HomePageContent } from '@/components/home/HomePageContent';
import { ProjectsData } from '@/components/projects/ProjectsData';
import { absoluteUrl, SITE_URL } from '@/lib/seo';

export const metadata: Metadata = {
  alternates: {
    canonical: SITE_URL.toString(),
  },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/'),
  },
};

export default function Home() {
  return <HomePageContent projectsSection={<ProjectsData />} />;
}
