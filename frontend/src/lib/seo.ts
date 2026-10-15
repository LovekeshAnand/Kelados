import type { Metadata } from "next";

export const SITE = "https://kelados.in";
export const GITHUB = "https://github.com/LovekeshAnand/Kelados";
export const NPM = "https://www.npmjs.com/package/kelados";

/** Page metadata with a canonical URL and matching Open Graph / Twitter cards. */
export function pageMeta({ path, title, description, social }: { path: string; title: string; description: string; social?: string }): Metadata {
  const t = social ?? `${title} · Kelados`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: t, description, url: path, type: "website", siteName: "Kelados", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Kelados" }] },
    twitter: { card: "summary_large_image", title: t, description, images: ["/og.png"] },
  };
}

/** FAQPage structured data; the same Q&A must be visible on the page. */
export const faqSchema = (items: readonly (readonly [string, string])[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
});

export const breadcrumbSchema = (name: string, path: string) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Kelados", item: SITE + "/" },
    { "@type": "ListItem", position: 2, name, item: SITE + path },
  ],
});

/** Free software, described for search and answer engines. */
export const appSchema = ({ name, path, description, category, os, features }: {
  name: string; path: string; description: string; category: string; os: string; features: string[];
}) => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name,
  url: SITE + path,
  description,
  applicationCategory: category,
  operatingSystem: os,
  featureList: features,
  isAccessibleForFree: true,
  license: "https://opensource.org/licenses/MIT",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@id": `${SITE}/#org` },
});
