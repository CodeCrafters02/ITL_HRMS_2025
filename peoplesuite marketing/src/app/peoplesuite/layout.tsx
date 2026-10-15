import type { Metadata } from "next";
import { JsonLd, softwareLd } from "@/lib/seo";

const description =
  "PeopleSuite is a cloud HRMS for Indian workforces: GPS geofenced attendance, statutory payroll (EPF, ESIC, PT, TDS), 2D desk booking, IT assets, 360° appraisals and corporate LMS.";

export const metadata: Metadata = {
  title: "PeopleSuite HRMS — Statutory Payroll, Attendance & Workforce Management",
  description,
  alternates: { canonical: "/peoplesuite" },
  openGraph: { title: "PeopleSuite HRMS by Innovyx Tech Labs", description, url: "/peoplesuite", images: "/opengraph-image" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={softwareLd("PeopleSuite", "/peoplesuite", "Human Resource Management System", description, [
          "GPS geofenced attendance",
          "Indian statutory payroll (EPF, ESIC, PT, TDS)",
          "2D desk and meeting room booking",
          "IT asset and inventory management",
          "360° performance appraisals",
          "Corporate LMS and automated HR letters",
        ])}
      />
      {children}
    </>
  );
}
