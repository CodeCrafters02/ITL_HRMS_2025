"use client";

import React from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

interface FooterProps {
  theme?: "dark" | "light";
  onOpenDemo?: () => void;
}

type FooterLink = [label: string, href: string];

const COLUMNS: { title: string; links: FooterLink[]; more?: FooterLink }[] = [
  {
    title: "TalentFlow",
    links: [
      ["1-Click Sourcing & Dedup", "/talentflow#features"],
      ["AI Fit Score & Skill Gap", "/talentflow#features"],
      ["Branded PDF Dossiers", "/talentflow#features"],
      ["Client Review Portal", "/talentflow#features"],
      ["DPDP Pre-Onboarding", "/talentflow#how"],
    ],
    more: ["Explore TalentFlow", "/talentflow"],
  },
  {
    title: "PeopleSuite",
    links: [
      ["Geofenced Attendance", "/peoplesuite#attendance"],
      ["Statutory Payroll", "/peoplesuite#payroll"],
      ["2D Desk & Room Booking", "/peoplesuite#workspace"],
      ["IT Assets & Inventory", "/peoplesuite#assets"],
      ["Performance & Appraisals", "/peoplesuite#performance"],
      ["Corporate LMS", "/peoplesuite#lms"],
    ],
    more: ["Explore PeopleSuite", "/peoplesuite"],
  },
  {
    title: "Resources",
    links: [
      ["Product Tour", "/#video"],
      ["ROI Calculator", "/peoplesuite#roi"],
      ["Security & Compliance", "/peoplesuite#security"],
      ["FAQ", "/#faq"],
    ],
  },
];

export default function Footer({ theme = "dark", onOpenDemo }: FooterProps) {
  const isDark = theme === "dark";
  const hover = isDark ? "hover:text-[#7DC8FF]" : "hover:text-[#0B5BD3]";
  const heading = `font-label-lg text-label-lg font-semibold ${isDark ? "text-[#E8ECFF]" : "text-[#0B0F2E]"}`;
  const accent = isDark ? "text-[#7DC8FF]" : "text-[#0B5BD3]";

  return (
    <footer
      className={`w-full pt-16 pb-10 transition-colors ${
        isDark ? "bg-[#141834] border-t border-[#4A6CFF]/25 text-[#9AA3D1]" : "bg-white border-t border-[#DCE4F5] text-[#5B6488]"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12">
          <div className="lg:col-span-2 space-y-5 max-w-sm">
            <Link href="/" className="inline-block" aria-label="Innovyx Tech Labs home">
              <BrandLogo dark={isDark} className="h-16" />
            </Link>
            <p className="font-body-sm text-body-sm leading-relaxed">
              <strong>TalentFlow</strong> ATS and <strong>PeopleSuite</strong> HRMS, developed and engineered by Innovyx Tech Labs LLP.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["DPDP-Ready", "256-bit SSL", "RBAC", "Audit Logs"].map((b) => (
                <span
                  key={b}
                  className={`border px-2 py-0.5 rounded text-[11px] font-medium ${
                    isDark ? "bg-[#0F1226] border-[#4A6CFF]/30 text-[#E8ECFF]" : "bg-[#F5F8FF] border-[#DCE4F5] text-[#5B6488]"
                  }`}
                >
                  {b}
                </span>
              ))}
            </div>
            {onOpenDemo && (
              <button
                type="button"
                onClick={onOpenDemo}
                className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${accent} hover:underline`}
              >
                Book a Demo
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
              </button>
            )}
          </div>

          {COLUMNS.map((c) => (
            <nav key={c.title} aria-label={c.title} className="space-y-4">
              <h2 className={heading}>{c.title}</h2>
              <ul className="space-y-2.5 font-body-sm text-body-sm">
                {c.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className={`transition-colors ${hover}`}>
                      {label}
                    </Link>
                  </li>
                ))}
                {c.more && (
                  <li>
                    <Link href={c.more[1]} className={`inline-flex items-center gap-1 font-semibold ${accent} hover:underline`}>
                      {c.more[0]}
                      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
          ))}
        </div>

        <div className={`pt-6 border-t text-xs ${isDark ? "border-[#4A6CFF]/20" : "border-[#DCE4F5]"}`}>
          © 2026 Innovyx Tech Labs LLP. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
