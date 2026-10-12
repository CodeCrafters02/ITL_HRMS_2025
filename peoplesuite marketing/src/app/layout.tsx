import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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
  title: "PeopleSuite | Modern Enterprise Cloud HRMS Platform",
  description:
    "Everything People. One Suite. Streamline core HR, automate multi-state payroll, track shift attendance with geofencing, and empower 100 to 10,000+ employees with PeopleSuite.",
  keywords: [
    "HRMS",
    "Human Resource Management",
    "Payroll Software",
    "Time and Attendance",
    "Geofencing Punch",
    "Employee Self-Service",
    "Applicant Tracking",
    "Performance Management",
  ],
  authors: [{ name: "PeopleSuite Technologies" }],
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
    <html lang="en" className={`${inter.variable} scroll-smooth`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#FFFFFF] text-[#0B0F2E] antialiased selection:bg-[#EAF0FF] selection:text-[#0B5BD3]">
        {children}
      </body>
    </html>
  );
}
