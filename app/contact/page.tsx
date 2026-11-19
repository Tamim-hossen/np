import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ContactPageContent } from '@/components/contact/ContactPageContent';
import { ContactPageSkeleton } from '@/components/skeletons/ContactPageSkeleton';
import { absoluteUrl, OG_IMAGE, TWITTER_DEFAULTS } from '@/lib/seo';

const title = 'Contact';
const description =
  'Get in touch with Tamim Hossen to discuss a website, digital product, or creative development project. Available for freelance and contract work.';
const url = absoluteUrl('/contact');

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    'hire full-stack developer',
    'freelance web developer',
    'contact Tamim Hossen',
    'web development inquiry',
    'creative developer for hire',
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
        alt: 'Contact Tamim Hossen',
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

export default function ContactPage() {
  return (
    <Suspense fallback={<ContactPageSkeleton />}>
      <ContactPageContent />
    </Suspense>
  );
}
