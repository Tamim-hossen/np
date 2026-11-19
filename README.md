This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Project data

The homepage showcase and `/projects` archive load records from MongoDB's
`projects` collection using the server-only `MongoDB_URI` environment variable.
Records use `name`, `description`, `link`, `image_url`, `tech_stack`, and
`order` fields. The homepage displays the first six records by order; the
archive displays the full collection. On each initial page load, the root
server layout fetches the full `projects`, `casestudies`, and `skills`
collections and seeds a Zustand store shared by the client-side routes, so
navigating between these pages does not query MongoDB again. Case studies use
`title`, `slug`, `category`, `executiveSummary`, `technicalChallenges`,
`architecturalSolution`, `implementationSnippet`, `results`, and `createdAt`.
Skills use `name`, an image URL in `image_url` (or `image`/`icon`), and an
optional `order` field. Services use `title`, `description`, `bullets` (strings),
`image` (an HTTP(S) URL), and `order`; they are shown in the home page's bento
services section.

## Search engine metadata

Set `NEXT_PUBLIC_SITE_URL` to the canonical public URL when deploying (currently
`https://tamimhossen.vercel.app`). The site uses it for canonical metadata,
structured data, and the generated `robots.txt` and `sitemap.xml` routes. The
sitemap includes project and case-study URLs from MongoDB.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
