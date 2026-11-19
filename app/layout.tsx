import type { Metadata } from "next";
import { Suspense } from "react";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { PortfolioStoreBootstrap } from "@/components/providers/PortfolioStoreBootstrap";
import { SiteNavigation } from "@/components/navigation/SiteNavigation";
import { SiteLoadingScreen } from "@/components/loading/SiteLoadingScreen";
import { ResourceHints } from "@/components/seo/ResourceHints";
import { SITE_URL, OG_IMAGE, TWITTER_DEFAULTS } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE_NAME = "Tamim Hossen";
const SITE_TITLE = "Tamim Hossen — Full-Stack Engineer & Creative Developer";
const SITE_DESCRIPTION =
  "Tamim Hossen is a full-stack engineer and creative developer building performant websites, digital products, and interactive web experiences.";

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: "Tamim Hossen Portfolio",
  authors: [{ name: SITE_NAME, url: SITE_URL.toString() }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  keywords: [
    "Tamim Hossen",
    "full-stack engineer",
    "creative developer",
    "web development",
    "digital products",
    "interactive websites",
    "Next.js developer",
    "React developer",
    "TypeScript developer",
    "portfolio",
    "freelance web developer",
    "frontend developer",
    "backend developer",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: SITE_URL.toString(),
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description:
      "Performant websites, digital products, and interactive web experiences by Tamim Hossen.",
    url: SITE_URL.toString(),
    images: [
      {
        url: OG_IMAGE.url,
        width: OG_IMAGE.width,
        height: OG_IMAGE.height,
        alt: SITE_TITLE,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: TWITTER_DEFAULTS.card,
    title: SITE_TITLE,
    description:
      "Performant websites, digital products, and interactive web experiences by Tamim Hossen.",
    images: [{ url: OG_IMAGE.url, alt: SITE_TITLE }],
    creator: TWITTER_DEFAULTS.creator,
    site: TWITTER_DEFAULTS.site,
  },
  category: "technology",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

/* -------------------------------------------------------------------------- */
/*  Structured data (JSON-LD)                                                 */
/* -------------------------------------------------------------------------- */

const personStructuredData = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${SITE_URL.toString()}#person`,
  name: SITE_NAME,
  url: SITE_URL.toString(),
  jobTitle: "Full-Stack Engineer and Creative Developer",
  description: SITE_DESCRIPTION,
  knowsAbout: [
    "React",
    "Next.js",
    "TypeScript",
    "Node.js",
    "MongoDB",
    "Full-Stack Development",
    "Creative Web Development",
  ],
  sameAs: [
    "https://github.com/tamim",
  ],
};

const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL.toString()}#website`,
  name: SITE_NAME,
  url: SITE_URL.toString(),
  description: SITE_DESCRIPTION,
  author: {
    "@id": `${SITE_URL.toString()}#person`,
  },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL.toString()}projects?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-site-loading=""
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-neutral-900">
        {/*
         * JSON-LD structured data — use next/script with beforeInteractive so
         * the data is in the initial HTML and React 19 can reconcile it correctly
         * without a dangerouslySetInnerHTML mismatch in the RSC body.
         */}
        <Script
          id="ld-person"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(personStructuredData).replace(/</g, "\\u003c"),
          }}
        />
        <Script
          id="ld-website"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteStructuredData).replace(/</g, "\\u003c"),
          }}
        />
        {/* Resource hints via React 19 imperative APIs — no manual <head> needed */}
        <ResourceHints />
        <SmoothScrollProvider>
          <SiteNavigation />
          <SiteLoadingScreen />
          <Suspense
            fallback={
              <main
                aria-label="Loading portfolio"
                aria-busy="true"
                className="min-h-screen bg-[#e8e8ea]"
              />
            }
          >
            <PortfolioStoreBootstrap>{children}</PortfolioStoreBootstrap>
          </Suspense>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
