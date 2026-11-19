import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tamim Hossen — Full-Stack Engineer & Creative Developer',
    short_name: 'Tamim Hossen',
    description:
      'Tamim Hossen is a full-stack engineer and creative developer building performant websites, digital products, and interactive web experiences.',
    start_url: '/',
    display: 'standalone',
    background_color: '#e8e8ea',
    theme_color: '#080b10',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
    scope: SITE_URL.toString(),
  };
}
