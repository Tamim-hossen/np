import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CaseStudiesArchiveContent } from '@/components/case-studies/CaseStudiesArchiveContent';
import { CaseStudiesArchiveSkeleton } from '@/components/skeletons/CaseStudiesArchiveSkeleton';
import { absoluteUrl, OG_IMAGE, TWITTER_DEFAULTS } from '@/lib/seo';

const title = 'Case Studies';
const description =
  'Deep dives into the challenges, technical decisions, architecture, and outcomes behind selected projects by Tamim Hossen.';
const url = absoluteUrl('/case-studies');

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    'case studies',
    'software architecture',
    'technical deep dive',
    'web development process',
    'Tamim Hossen case studies',
    'project retrospectives',
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
        alt: 'Case Studies by Tamim Hossen',
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

export default function CaseStudiesArchivePage() {
  return (
    <Suspense fallback={<CaseStudiesArchiveSkeleton />}>
      <CaseStudiesArchiveContent />
    </Suspense>
  );
}
