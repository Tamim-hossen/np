import 'server-only';

import { ObjectId } from 'mongodb';
import { getMongoClient } from './mongodb';
import type { Testimonial } from '@/data/testimonials';

interface StoredTestimonial {
  _id: ObjectId;
  name: string;
  role: string;
  quote: string;
  rating: number;
  avatar?: string;
  avatar_image?: string;
  order?: number;
}

function requireString(value: unknown, field: string, id: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Testimonial ${id} has an invalid ${field}`);
  }

  return value.trim();
}

function getOptionalAvatarImage(value: unknown, id: string): string | null {
  if (value === undefined || value === null || value === '') return null;

  if (typeof value !== 'string') {
    throw new Error(`Testimonial ${id} has an invalid avatar_image`);
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Testimonial ${id} has an invalid avatar_image URL`);
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`Testimonial ${id} has an unsupported avatar_image URL protocol`);
  }

  return parsed.toString();
}

function getAvatarInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function mapTestimonial(testimonial: StoredTestimonial): Testimonial {
  const id = testimonial._id.toHexString();
  const name = requireString(testimonial.name, 'name', id);

  if (
    typeof testimonial.rating !== 'number' ||
    !Number.isFinite(testimonial.rating) ||
    testimonial.rating < 1 ||
    testimonial.rating > 5
  ) {
    throw new Error(`Testimonial ${id} has an invalid rating`);
  }

  return {
    id,
    name,
    role: requireString(testimonial.role, 'role', id),
    quote: requireString(testimonial.quote, 'quote', id),
    rating: testimonial.rating,
    avatar:
      typeof testimonial.avatar === 'string' && testimonial.avatar.trim()
        ? testimonial.avatar.trim()
        : getAvatarInitials(name),
    avatarImage: getOptionalAvatarImage(testimonial.avatar_image, id),
  };
}

export async function getTestimonials(): Promise<Testimonial[]> {
  try {
    const client = await getMongoClient();
    const testimonials = await client
      .db()
      .collection<StoredTestimonial>('testimonials')
      .find({})
      .sort({ order: 1, _id: 1 })
      .toArray();

    return testimonials.map(mapTestimonial);
  } catch (error) {
    console.error('getTestimonials database error:', error);
    return [];
  }
}
