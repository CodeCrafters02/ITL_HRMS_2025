import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Unified HRMS + ATS Platform | People & Talent Cloud by Innovyx Tech Labs LLP",
  description:
    "Innovyx Tech Labs People & Talent Cloud: TalentFlow (1-click Naukri sync, 3-tier dedup, AI fit scoring, tokenized client portals) with PeopleSuite (geofenced attendance, Indian statutory payroll, 2D hot desking, IT assets, and LMS). Engineered by Innovyx Tech Labs LLP.",
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
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable} scroll-smooth`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#0A0B14] text-[#E8ECFF] antialiased selection:bg-[#4A6CFF]/40 selection:text-white">
        {children}
      </body>
    </html>
  );
}
