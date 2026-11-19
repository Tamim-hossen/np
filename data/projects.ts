export interface Project {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  image: string;
  projectImages: string[];
  link: string | null;
}
