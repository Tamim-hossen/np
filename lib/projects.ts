import 'server-only';

import { cache } from 'react';
import { ObjectId } from 'mongodb';
import { io } from 'next/cache';
import { getMongoClient } from './mongodb';
import type { Project } from '@/data/projects';

interface StoredProject {
  _id: ObjectId;
  name: string;
  description: string;
  link?: string;
  image_url: string;
  tech_stack: string[];
  order: number;
  projectImages?: string[];
  project_images?: string[];
}

function requireString(value: unknown, field: string, id: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Project ${id} has an invalid ${field}`);
  }

  return value.trim();
}

function getSafeUrl(value: unknown, field: string, id: string): string {
  const url = requireString(value, field, id);
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Project ${id} has an invalid ${field} URL`);
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`Project ${id} has an unsupported ${field} URL protocol`);
  }

  return parsed.toString();
}

function mapProject(project: StoredProject): Project {
  const id = project._id.toHexString();
  const techStack = project.tech_stack;

  if (!Array.isArray(techStack) || techStack.some((tech) => typeof tech !== 'string')) {
    throw new Error(`Project ${id} has an invalid tech_stack`);
  }

  let link: string | null = null;
  if (typeof project.link === 'string' && project.link.trim().length > 0) {
    link = getSafeUrl(project.link, 'link', id);
  }

  const rawImages = project.projectImages || project.project_images;
  const projectImages: string[] = [];
  if (Array.isArray(rawImages)) {
    for (const img of rawImages) {
      if (typeof img === 'string' && img.trim().length > 0) {
        try {
          projectImages.push(getSafeUrl(img, 'projectImages', id));
        } catch {
          projectImages.push(img.trim());
        }
      }
    }
  }

  const mainImage = getSafeUrl(project.image_url, 'image_url', id);

  return {
    id,
    title: requireString(project.name, 'name', id),
    description: requireString(project.description, 'description', id),
    techStack,
    image: mainImage,
    projectImages: projectImages.length > 0 ? projectImages : [mainImage],
    link,
  };
}

export async function getProjects(): Promise<Project[]> {
  try {
    const client = await getMongoClient();

    const projects = await client
      .db()
      .collection<StoredProject>('projects')
      .find({})
      .sort({ order: 1, _id: 1 })
      .toArray();

    return projects.map(mapProject);
  } catch (error) {
    console.error('getProjects database error:', error);
    return [];
  }
}

export const getProjectById = cache(async (id: string): Promise<Project | null> => {
  if (!/^[\da-f]{24}$/i.test(id)) return null;

  try {
    await io();
    const client = await getMongoClient();
    const project = await client
      .db()
      .collection<StoredProject>('projects')
      .findOne({ _id: new ObjectId(id) });

    return project ? mapProject(project) : null;
  } catch (error) {
    console.error(`getProjectById error for id ${id}:`, error);
    return null;
  }
});
