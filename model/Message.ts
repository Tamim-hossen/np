export const PROJECT_TYPES = [
  'Website design & development',
  'Full-stack application',
  'Creative development',
  'Something else',
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];
export type MessageSource = 'home' | 'contact';

export interface MessageDocument {
  name: string;
  email: string;
  phone: string | null;
  projectType: ProjectType;
  message: string;
  consent: boolean;
  source: MessageSource;
  createdAt: Date;
}

export interface ContactMessagePayload {
  name: string;
  email: string;
  phone: string;
  projectType: string;
  message: string;
  consent: boolean;
  source: MessageSource;
}
