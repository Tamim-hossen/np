import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import Script from 'next/script';
import { CaseStudyDetailContent } from '@/components/case-studies/CaseStudyDetailContent';
import { CaseStudyDetailSkeleton } from '@/components/skeletons/CaseStudyDetailSkeleton';
import { getCaseStudyBySlug } from '@/lib/case-studies';
import { absoluteUrl, createMetaDescription, OG_IMAGE, TWITTER_DEFAULTS, SITE_URL } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const study = await getCaseStudyBySlug(slug);

  if (!study) {
    return {
      title: 'Case Study Not Found',
      robots: { index: false, follow: true },
    };
  }

  const description = createMetaDescription(study.executiveSummary);
  const canonical = `/case-studies/${encodeURIComponent(study.slug)}`;
  const canonicalUrl = absoluteUrl(canonical);
  const ogImage = study.image
    ? { url: study.image, alt: `${study.title} case study` }
    : { url: OG_IMAGE.url, width: OG_IMAGE.width, height: OG_IMAGE.height, alt: study.title };

  return {
    title: study.title,
    description,
    keywords: [
      study.category,
      'case study',
      'software development',
      'technical deep dive',
      'Tamim Hossen',
    ],
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: 'article',
      title: `${study.title} | Tamim Hossen`,
      description,
      url: canonicalUrl,
      siteName: 'Tamim Hossen',
      images: [ogImage],
      publishedTime: study.createdAt ?? undefined,
      authors: ['Tamim Hossen'],
      section: study.category,
      tags: [study.category, 'case study'],
    },
    twitter: {
      card: TWITTER_DEFAULTS.card,
      title: `${study.title} | Tamim Hossen`,
      description,
      images: [study.image || OG_IMAGE.url],
      creator: TWITTER_DEFAULTS.creator,
    },
  };
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const study = await getCaseStudyBySlug(slug);

  if (!study) notFound();

  const canonicalUrl = absoluteUrl(`/case-studies/${encodeURIComponent(study.slug)}`);

  const breadcrumbStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL.toString(),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Case Studies',
        item: absoluteUrl('/case-studies'),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: study.title,
        item: canonicalUrl,
      },
    ],
  };

  const articleStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: study.title,
    description: createMetaDescription(study.executiveSummary),
    url: canonicalUrl,
    image: study.image,
    author: {
      '@type': 'Person',
      name: 'Tamim Hossen',
      url: SITE_URL.toString(),
    },
    publisher: {
      '@type': 'Person',
      name: 'Tamim Hossen',
      url: SITE_URL.toString(),
    },
    datePublished: study.createdAt ?? undefined,
    dateModified: study.createdAt ?? undefined,
    articleSection: study.category,
    keywords: [study.category, 'case study', 'software development'].join(', '),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
  };

  return (
    <>
      <Script
        id={`ld-breadcrumb-case-study-${study.slug}`}
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbStructuredData).replace(/</g, '\\u003c'),
        }}
      />
      <Script
        id={`ld-article-${study.slug}`}
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleStructuredData).replace(/</g, '\\u003c'),
        }}
      />
      <Suspense fallback={<CaseStudyDetailSkeleton />}>
        <CaseStudyDetailContent slug={study.slug} />
      </Suspense>
    </>
  );
}
