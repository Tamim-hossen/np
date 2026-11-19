import 'server-only';

import { ObjectId } from 'mongodb';
import { getMongoClient } from './mongodb';
import type { Service } from '@/data/services';

interface StoredService {
  _id: ObjectId;
  title: string;
  description: string;
  bullets: string[];
  image: string;
  order: number;
}

function requireString(value: unknown, field: string, id: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Service ${id} has an invalid ${field}`);
  }

  return value.trim();
}

function requireImageUrl(value: unknown, id: string): string {
  const image = requireString(value, 'image', id);
  let parsed: URL;

  try {
    parsed = new URL(image);
  } catch {
    throw new Error(`Service ${id} has an invalid image URL`);
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`Service ${id} has an unsupported image URL protocol`);
  }

  return parsed.toString();
}

function mapService(service: StoredService): Service {
  const id = service._id.toHexString();

  if (
    !Array.isArray(service.bullets) ||
    service.bullets.some((bullet) => typeof bullet !== 'string' || bullet.trim().length === 0)
  ) {
    throw new Error(`Service ${id} has invalid bullets`);
  }

  if (typeof service.order !== 'number' || !Number.isFinite(service.order)) {
    throw new Error(`Service ${id} has an invalid order`);
  }

  return {
    id,
    title: requireString(service.title, 'title', id),
    description: requireString(service.description, 'description', id),
    bullets: service.bullets.map((bullet) => bullet.trim()),
    image: requireImageUrl(service.image, id),
  };
}

export async function getServices(): Promise<Service[]> {
  try {
    const client = await getMongoClient();
    const services = await client
      .db()
      .collection<StoredService>('services')
      .find({})
      .sort({ order: 1, _id: 1 })
      .toArray();

    return services.map(mapService);
  } catch (error) {
    console.error('getServices database error:', error);
    return [];
  }
}
