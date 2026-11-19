export interface TechnicalChallenge {
  challenge: string;
  details: string;
}

export interface UnforgeableSignal {
  signal: string;
  genuineMobile: string;
  desktopEmulation: string;
}

export interface ArchitecturalSolution {
  overview: string;
  unforgeableSignals: UnforgeableSignal[];
}

export interface CaseStudy {
  id: string;
  title: string;
  image: string;
  slug: string;
  category: string;
  executiveSummary: string;
  technicalChallenges: TechnicalChallenge[];
  architecturalSolution: ArchitecturalSolution;
  implementationSnippet: string;
  results: string[];
  createdAt: string | null;
}
