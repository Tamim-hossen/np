import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProjectsArchiveContent } from '@/components/projects/ProjectsArchiveContent';
import { ProjectsArchiveSkeleton } from '@/components/skeletons/ProjectsArchiveSkeleton';
import { absoluteUrl, OG_IMAGE, TWITTER_DEFAULTS } from '@/lib/seo';

const title = 'Projects';
const description =
  'Explore selected websites and digital products built by Tamim Hossen — including hand-coded Next.js applications, Shopify stores, and WordPress sites.';
const url = absoluteUrl('/projects');

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    'web projects',
    'Next.js projects',
    'Shopify development',
    'WordPress development',
    'full-stack projects',
    'Tamim Hossen projects',
  ],
  alternates: { canonical: url },
  openGraph: {
    type: 'website',
    title: `${title} | Tamim Hossen`,
    description,
    url,
    images: [
      {
        url: OG_IMAGE.url,
        width: OG_IMAGE.width,
        height: OG_IMAGE.height,
        alt: 'Projects by Tamim Hossen',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: TWITTER_DEFAULTS.card,
    title: `${title} | Tamim Hossen`,
    description,
    images: [OG_IMAGE.url],
    creator: TWITTER_DEFAULTS.creator,
  },
};

export default function ProjectsArchivePage() {
  return (
    <Suspense fallback={<ProjectsArchiveSkeleton />}>
      <ProjectsArchiveContent />
    </Suspense>
  );
}
