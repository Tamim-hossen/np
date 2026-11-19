import type { MetadataRoute } from 'next';
import { connection } from 'next/server';
import { getCaseStudies } from '@/lib/case-studies';
import { getProjects } from '@/lib/projects';
import { absoluteUrl } from '@/lib/seo';

/** ISO-8601 date strings for static pages (update when content changes) */
const STATIC_LAST_MODIFIED = '2026-11-01T00:00:00.000Z';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  let projects: Awaited<ReturnType<typeof getProjects>> = [];
  let caseStudies: Awaited<ReturnType<typeof getCaseStudies>> = [];

  try {
    [projects, caseStudies] = await Promise.all([
      getProjects(),
      getCaseStudies(),
    ]);
  } catch (error) {
    console.error('Failed to load dynamic routes for sitemap:', error);
  }

  return [
    {
      url: absoluteUrl('/'),
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: absoluteUrl('/projects'),
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/case-studies'),
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/contact'),
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    ...projects.map((project) => ({
      url: absoluteUrl(`/projects/${project.id}`),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...caseStudies.map((study) => ({
      url: absoluteUrl(`/case-studies/${encodeURIComponent(study.slug)}`),
      lastModified: study.createdAt ?? undefined,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
