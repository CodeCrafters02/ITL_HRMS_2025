import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/talentflow`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/peoplesuite`, changeFrequency: "weekly", priority: 0.9 },
  ];
}
