import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import Script from 'next/script';
import { ProjectDetailContent } from '@/components/projects/ProjectDetailContent';
import { ProjectDetailSkeleton } from '@/components/skeletons/ProjectDetailSkeleton';
import { getProjectById } from '@/lib/projects';
import { absoluteUrl, createMetaDescription, OG_IMAGE, TWITTER_DEFAULTS, SITE_URL } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    return {
      title: 'Project Not Found',
      robots: { index: false, follow: true },
    };
  }

  const description = createMetaDescription(project.description);
  const canonical = `/projects/${project.id}`;
  const canonicalUrl = absoluteUrl(canonical);
  const ogImage = project.image
    ? { url: project.image, alt: `${project.title} project preview` }
    : { url: OG_IMAGE.url, width: OG_IMAGE.width, height: OG_IMAGE.height, alt: project.title };

  return {
    title: project.title,
    description,
    keywords: [
      ...project.techStack,
      'web project',
      'portfolio project',
      'Tamim Hossen',
    ],
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: 'article',
      title: `${project.title} | Tamim Hossen`,
      description,
      url: canonicalUrl,
      siteName: 'Tamim Hossen',
      images: [ogImage],
    },
    twitter: {
      card: TWITTER_DEFAULTS.card,
      title: `${project.title} | Tamim Hossen`,
      description,
      images: [project.image || OG_IMAGE.url],
      creator: TWITTER_DEFAULTS.creator,
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) notFound();

  const canonicalUrl = absoluteUrl(`/projects/${project.id}`);

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
        name: 'Projects',
        item: absoluteUrl('/projects'),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: project.title,
        item: canonicalUrl,
      },
    ],
  };

  const creativeWorkStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.title,
    description: project.description,
    url: canonicalUrl,
    image: project.image,
    creator: {
      '@type': 'Person',
      name: 'Tamim Hossen',
      url: SITE_URL.toString(),
    },
    keywords: project.techStack.join(', '),
  };

  return (
    <>
      <Script
        id={`ld-breadcrumb-project-${project.id}`}
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbStructuredData).replace(/</g, '\\u003c'),
        }}
      />
      <Script
        id={`ld-creative-work-${project.id}`}
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(creativeWorkStructuredData).replace(/</g, '\\u003c'),
        }}
      />
      <Suspense fallback={<ProjectDetailSkeleton />}>
        <ProjectDetailContent projectId={project.id} />
      </Suspense>
    </>
  );
}
