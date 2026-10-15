import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { JsonLd, ORG, SITE_NAME, SITE_URL } from "@/lib/seo";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const DESCRIPTION =
  "Innovyx Tech Labs: TalentFlow ATS (1-click Naukri sourcing, 3-tier dedup, AI fit scoring, client review portals) and PeopleSuite HRMS (geofenced attendance, Indian statutory payroll, 2D desk booking, IT assets, LMS).";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Talent Acquisition | Innovyx TechLabs", template: `%s | ${SITE_NAME}` },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    title: "Talent Acquisition | Innovyx TechLabs",
    description: DESCRIPTION,
    url: "/",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  keywords: [
    "Innovyx Tech Labs",
    "Innovyx Tech Labs LLP",
    "PeopleSuite",
    "TalentFlow",
    "Applicant Tracking System",
    "ATS",
    "Recruitment Automation",
    "Naukri Resdex Sync",
    "Indian Statutory Payroll",
    "EPF ESIC PT TDS",
    "Geofenced Attendance",
    "2D Desk Booking",
    "Hot Desking",
    "Performance Management",
    "Corporate LMS",
    "DPDP Compliance",
  ],
  authors: [{ name: "Innovyx Tech Labs LLP" }],
  creator: "Innovyx Tech Labs LLP",
  publisher: "Innovyx Tech Labs LLP",
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${sora.variable} scroll-smooth`}>
      <head>
        <link rel="icon" type="image/png" sizes="any" href="/logo.png" />
        <link rel="shortcut icon" type="image/png" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#0A0B14] text-[#E8ECFF] antialiased selection:bg-[#4A6CFF]/40 selection:text-white">
        <JsonLd data={{ "@context": "https://schema.org", "@graph": [ORG, { "@type": "WebSite", name: SITE_NAME, url: SITE_URL }] }} />
        {children}
      </body>
    </html>
  );
}
