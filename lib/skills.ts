import 'server-only';

import { ObjectId } from 'mongodb';
import { getMongoClient } from './mongodb';
import type { Skill } from '@/data/skills';

interface StoredSkill {
  _id: ObjectId;
  name: string;
  image_url?: string;
  image?: string;
  icon?: string;
  order?: number;
}

function mapSkill(skill: StoredSkill): Skill {
  const id = skill._id.toHexString();
  const name = skill.name;

  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error(`Skill ${id} has an invalid name`);
  }

  const image = skill.image_url ?? skill.image ?? skill.icon;
  if (typeof image !== 'string' || image.trim().length === 0) {
    throw new Error(`Skill ${id} has no image_url, image, or icon`);
  }

  let parsedImage: URL;
  try {
    parsedImage = new URL(image);
  } catch {
    throw new Error(`Skill ${id} has an invalid image URL`);
  }

  if (parsedImage.protocol !== 'https:' && parsedImage.protocol !== 'http:') {
    throw new Error(`Skill ${id} has an unsupported image URL protocol`);
  }

  return {
    id,
    name: name.trim(),
    image: parsedImage.toString(),
  };
}

export async function getSkills(): Promise<Skill[]> {
  try {
    const client = await getMongoClient();
    const skills = await client
      .db()
      .collection<StoredSkill>('skills')
      .find({})
      .sort({ order: 1, _id: 1 })
      .toArray();

    return skills.map(mapSkill);
  } catch (error) {
    console.error('getSkills database error:', error);
    return [];
  }
}
