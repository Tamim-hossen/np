import 'server-only';

import { cache } from 'react';
import { ObjectId } from 'mongodb';
import { io } from 'next/cache';
import { getMongoClient } from './mongodb';
import type {
  ArchitecturalSolution,
  CaseStudy,
  TechnicalChallenge,
  UnforgeableSignal,
} from '@/data/case-studies';

interface StoredCaseStudy {
  _id: ObjectId;
  title: string;
  image: string;
  slug: string;
  category: string;
  executiveSummary: string;
  technicalChallenges: TechnicalChallenge[];
  architecturalSolution: ArchitecturalSolution;
  implementationSnippet: string;
  results: string[];
  createdAt?: Date | string;
}

function requireString(value: unknown, field: string, id: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Case study ${id} has an invalid ${field}`);
  }

  return value.trim();
}

function getSafeImageUrl(value: unknown, id: string): string {
  const image = requireString(value, 'image', id);
  let parsed: URL;

  try {
    parsed = new URL(image);
  } catch {
    throw new Error(`Case study ${id} has an invalid image URL`);
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`Case study ${id} has an unsupported image URL protocol`);
  }

  return parsed.toString();
}

function mapTechnicalChallenge(
  value: TechnicalChallenge,
  index: number,
  id: string,
): TechnicalChallenge {
  if (!value || typeof value !== 'object') {
    throw new Error(`Case study ${id} has an invalid technicalChallenges entry at ${index}`);
  }

  return {
    challenge: requireString(value.challenge, `technicalChallenges[${index}].challenge`, id),
    details: requireString(value.details, `technicalChallenges[${index}].details`, id),
  };
}

function mapSignal(
  value: UnforgeableSignal,
  index: number,
  id: string,
): UnforgeableSignal {
  if (!value || typeof value !== 'object') {
    throw new Error(`Case study ${id} has an invalid unforgeableSignals entry at ${index}`);
  }

  return {
    signal: requireString(value.signal, `unforgeableSignals[${index}].signal`, id),
    genuineMobile: requireString(
      value.genuineMobile,
      `unforgeableSignals[${index}].genuineMobile`,
      id,
    ),
    desktopEmulation: requireString(
      value.desktopEmulation,
      `unforgeableSignals[${index}].desktopEmulation`,
      id,
    ),
  };
}

function mapCaseStudy(caseStudy: StoredCaseStudy): CaseStudy {
  const id = caseStudy._id.toHexString();
  const solution = caseStudy.architecturalSolution;

  if (!solution || typeof solution !== 'object') {
    throw new Error(`Case study ${id} has an invalid architecturalSolution`);
  }
  if (!Array.isArray(caseStudy.technicalChallenges)) {
    throw new Error(`Case study ${id} has an invalid technicalChallenges`);
  }
  if (!Array.isArray(solution.unforgeableSignals)) {
    throw new Error(`Case study ${id} has invalid architecturalSolution.unforgeableSignals`);
  }
  if (
    !Array.isArray(caseStudy.results) ||
    caseStudy.results.some((result) => typeof result !== 'string' || result.trim().length === 0)
  ) {
    throw new Error(`Case study ${id} has invalid results`);
  }

  let createdAt: string | null = null;
  if (caseStudy.createdAt instanceof Date) {
    if (Number.isNaN(caseStudy.createdAt.getTime())) {
      throw new Error(`Case study ${id} has an invalid createdAt`);
    }
    createdAt = caseStudy.createdAt.toISOString();
  } else if (typeof caseStudy.createdAt === 'string') {
    const parsedDate = new Date(caseStudy.createdAt);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error(`Case study ${id} has an invalid createdAt`);
    }
    createdAt = parsedDate.toISOString();
  }

  return {
    id,
    title: requireString(caseStudy.title, 'title', id),
    image: getSafeImageUrl(caseStudy.image, id),
    slug: requireString(caseStudy.slug, 'slug', id),
    category: requireString(caseStudy.category, 'category', id),
    executiveSummary: requireString(caseStudy.executiveSummary, 'executiveSummary', id),
    technicalChallenges: caseStudy.technicalChallenges.map((challenge, index) =>
      mapTechnicalChallenge(challenge, index, id),
    ),
    architecturalSolution: {
      overview: requireString(solution.overview, 'architecturalSolution.overview', id),
      unforgeableSignals: solution.unforgeableSignals.map((signal, index) =>
        mapSignal(signal, index, id),
      ),
    },
    implementationSnippet: requireString(
      caseStudy.implementationSnippet,
      'implementationSnippet',
      id,
    ),
    results: caseStudy.results.map((result) => result.trim()),
    createdAt,
  };
}

export async function getCaseStudies(): Promise<CaseStudy[]> {
  const client = await getMongoClient();
  const caseStudies = await client
    .db()
    .collection<StoredCaseStudy>('casestudies')
    .find({})
    .sort({ createdAt: -1, _id: 1 })
    .toArray();

  return caseStudies.map(mapCaseStudy);
}

export const getCaseStudyBySlug = cache(
  async (slug: string): Promise<CaseStudy | null> => {
    await io();
    const client = await getMongoClient();
    const caseStudy = await client
      .db()
      .collection<StoredCaseStudy>('casestudies')
      .findOne({ slug });

    return caseStudy ? mapCaseStudy(caseStudy) : null;
  },
);
