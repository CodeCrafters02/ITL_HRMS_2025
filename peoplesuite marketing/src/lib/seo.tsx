/** Public site origin. Set NEXT_PUBLIC_SITE_URL in each deployment environment. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://innovyxtechlabs.com").replace(/\/$/, "");
export const SITE_NAME = "Innovyx TechLabs";

export const ORG = {
  "@type": "Organization",
  name: "Innovyx Tech Labs LLP",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
};

export const softwareLd = (name: string, path: string, category: string, description: string, features: string[]) => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name,
  url: `${SITE_URL}${path}`,
  applicationCategory: "BusinessApplication",
  applicationSubCategory: category,
  operatingSystem: "Web",
  description,
  featureList: features,
  publisher: ORG,
});

export const JsonLd = ({ data }: { data: object }) => (
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />
);
