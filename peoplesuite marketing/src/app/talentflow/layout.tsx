import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/seo";

const description =
  "TalentFlow is an AI-powered ATS for recruitment agencies and talent acquisition teams: 1-click Naukri Resdex sourcing, 3-tier deduplication, AI fit scoring, branded PDF dossiers and password-free client review portals.";

export const metadata: Metadata = {
  title: "Talent Acquisition",
  description,
  alternates: { canonical: "/talentflow" },
  openGraph: { title: "Talent Acquisition | Innovyx TechLabs", description, url: "/talentflow", images: "/opengraph-image" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={softwareLd("TalentFlow", "/talentflow", "Applicant Tracking System", description, [
          "1-click Naukri Resdex sourcing via Chrome extension",
          "3-tier candidate deduplication",
          "AI fit scoring and skill-gap analysis",
          "Branded, contact-masked PDF dossiers",
          "Tokenized client review portal",
          "DPDP-compliant pre-onboarding verification",
        ])}
      />
      {children}
    </>
  );
}
