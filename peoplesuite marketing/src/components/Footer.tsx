"use client";

import React from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

interface FooterProps {
  theme?: "dark" | "light";
  onOpenDemo?: () => void;
}

export default function Footer({ theme = "dark", onOpenDemo }: FooterProps) {
  const isDark = theme === "dark";
  const linkHoverClass = isDark ? "hover:text-[#7DC8FF]" : "hover:text-[#0B5BD3]";

  return (
    <footer
      className={`w-full pt-16 pb-12 transition-colors ${
        isDark
          ? "bg-[#141834] border-t border-[#4A6CFF]/25 text-[#9AA3D1]"
          : "bg-white border-t border-[#DCE4F5] text-[#5B6488]"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Top 5-Column Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-16">
          {/* Brand info column */}
          <div className="lg:col-span-1 space-y-5">
            <Link href="/" className="inline-block" aria-label="Innovyx Tech Labs home">
              <BrandLogo dark={isDark} className="h-16" />
            </Link>

            <p className="font-body-sm text-body-sm leading-relaxed">
              <strong>TalentFlow</strong> ATS and <strong>PeopleSuite</strong> HRMS, developed and engineered by <strong>Innovyx Tech Labs LLP</strong>.
            </p>

            {/* Live Operational Status */}
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-xs ${
                isDark
                  ? "bg-[#0F1226] border-[#4A6CFF]/30 text-[#E8ECFF]"
                  : "bg-[#F5F8FF] border-[#DCE4F5] text-[#0B0F2E]"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-caption text-caption font-medium">System Operational (99.99%)</span>
            </div>

            {/* Social & Developer Channels */}
            <div className="flex items-center gap-2 pt-1">
              <a
                href="https://www.linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                title="LinkedIn"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  isDark
                    ? "hover:bg-[#1E1AB8]/30 hover:text-[#7DC8FF]"
                    : "hover:bg-[#EAF0FF] hover:text-[#0B5BD3]"
                }`}
              >
                <span className="material-symbols-outlined text-[19px]">share</span>
              </a>
              <a
                href="https://github.com/CodeCrafters02/ITL_HRMS_2025"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub Repository"
                title="GitHub Codebase"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  isDark
                    ? "hover:bg-[#1E1AB8]/30 hover:text-[#7DC8FF]"
                    : "hover:bg-[#EAF0FF] hover:text-[#0B5BD3]"
                }`}
              >
                <span className="material-symbols-outlined text-[19px]">code</span>
              </a>
              <Link
                href="/peoplesuite"
                aria-label="Feature Walkthroughs"
                title="Feature Walkthroughs"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  isDark
                    ? "hover:bg-[#1E1AB8]/30 hover:text-[#7DC8FF]"
                    : "hover:bg-[#EAF0FF] hover:text-[#0B5BD3]"
                }`}
              >
                <span className="material-symbols-outlined text-[19px]">play_circle</span>
              </Link>
              <Link
                href="/#faq"
                aria-label="Technical Documentation & Architecture FAQ"
                title="Technical Architecture FAQ"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  isDark
                    ? "hover:bg-[#1E1AB8]/30 hover:text-[#7DC8FF]"
                    : "hover:bg-[#EAF0FF] hover:text-[#0B5BD3]"
                }`}
              >
                <span className="material-symbols-outlined text-[19px]">terminal</span>
              </Link>
            </div>

            {/* Enterprise Security Badges */}
            <div className="pt-2 space-y-1.5">
              <div
                className={`font-label-md text-label-md tracking-wider uppercase font-semibold ${
                  isDark ? "text-[#7DC8FF]" : "text-[#0B5BD3]"
                }`}
              >
                Enterprise Platform
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["DPDP-Compliant", "SSL 256-Bit", "Role-Based RBAC", "Audit Logs"].map((cert) => (
                  <span
                    key={cert}
                    className={`border px-2 py-0.5 rounded font-caption text-[11px] font-medium ${
                      isDark
                        ? "bg-[#0F1226] border-[#4A6CFF]/30 text-[#E8ECFF]"
                        : "bg-[#F5F8FF] border-[#DCE4F5] text-[#5B6488]"
                    }`}
                  >
                    {cert}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* TalentFlow Column */}
          <div className="space-y-4">
            <h4
              className={`font-label-lg text-label-lg font-semibold flex items-center gap-1.5 ${
                isDark ? "text-[#E8ECFF]" : "text-[#0B0F2E]"
              }`}
            >
              <span>TalentFlow</span>
            </h4>
            <ul className="space-y-2.5 font-body-sm text-body-sm">
              <li>
                <Link href="/talentflow" className={`transition-colors cursor-pointer ${linkHoverClass}`}>
                  1-Click Sourcing Gateway
                </Link>
              </li>
              <li>
                <Link href="/talentflow" className={`transition-colors cursor-pointer ${linkHoverClass}`}>
                  3-Tier Deduplication Engine
                </Link>
              </li>
              <li>
                <Link href="/talentflow" className={`transition-colors cursor-pointer ${linkHoverClass}`}>
                  AI Fit Score & Skill Gap
                </Link>
              </li>
              <li>
                <Link href="/talentflow" className={`transition-colors cursor-pointer ${linkHoverClass}`}>
                  Playwright Chromium Dossiers
                </Link>
              </li>
              <li>
                <Link href="/talentflow" className={`transition-colors cursor-pointer ${linkHoverClass}`}>
                  Tokenized Client Review Portal
                </Link>
              </li>
              <li>
                <Link href="/talentflow" className={`transition-colors cursor-pointer ${linkHoverClass}`}>
                  DPDP Pre-Onboarding Checklist
                </Link>
              </li>
              <li>
                <Link href="/talentflow" className={`transition-colors cursor-pointer font-semibold text-[#0B5BD3]`}>
                  ➔ Dedicated TalentFlow Page
                </Link>
              </li>
              <li>
                <Link href="/peoplesuite" className={`transition-colors cursor-pointer font-semibold text-[#0B5BD3]`}>
                  ➔ Dedicated PeopleSuite Page
                </Link>
              </li>
            </ul>
          </div>

          {/* PeopleSuite Column */}
          <div className="space-y-4">
            <h4
              className={`font-label-lg text-label-lg font-semibold ${
                isDark ? "text-[#E8ECFF]" : "text-[#0B0F2E]"
              }`}
            >
              PeopleSuite
            </h4>
            <ul className="space-y-2.5 font-body-sm text-body-sm">
              <li>
                <Link href="/peoplesuite#modules" className={`transition-colors cursor-pointer ${linkHoverClass}`}>
                  Core HR & Organization Vault
                </Link>
              </li>
              <li>
                <Link href="/peoplesuite#attendance" className={`transition-colors cursor-pointer ${linkHoverClass}`}>
                  Geofence Attendance & Shifts
                </Link>
              </li>
              <li>
                <Link href="/peoplesuite#payroll" className={`transition-colors cursor-pointer ${linkHoverClass}`}>
                  Statutory Payroll & Payslips
                </Link>
              </li>
              <li>
                <Link href="/peoplesuite#workspace" className={`transition-colors cursor-pointer ${linkHoverClass}`}>
                  2D Desk & Conference Booking
                </Link>
              </li>
              <li>
                <Link href="/peoplesuite#assets" className={`transition-colors cursor-pointer ${linkHoverClass}`}>
                  Fixed IT Assets & Inventory
                </Link>
              </li>
              <li>
                <Link href="/peoplesuite#performance" className={`transition-colors cursor-pointer ${linkHoverClass}`}>
                  Performance & 360° Appraisals
                </Link>
              </li>
              <li>
                <Link href="/peoplesuite#lms" className={`transition-colors cursor-pointer ${linkHoverClass}`}>
                  Corporate LMS & Certifications
                </Link>
              </li>
            </ul>
          </div>

          {/* Product Resources links */}
          <div className="space-y-4">
            <h4
              className={`font-label-lg text-label-lg font-semibold ${
                isDark ? "text-[#E8ECFF]" : "text-[#0B0F2E]"
              }`}
            >
              Product Resources
            </h4>
            <ul className="space-y-2.5 font-body-sm text-body-sm">
              <li>
                <Link href="/talentflow" className={`transition-colors cursor-pointer ${linkHoverClass}`}>
                  TalentFlow ATS Features
                </Link>
              </li>
              <li>
                <Link href="/peoplesuite#modules" className={`transition-colors cursor-pointer ${linkHoverClass}`}>
                  12 Platform Modules
                </Link>
              </li>
              <li>
                <Link href="/peoplesuite#workspace" className={`transition-colors cursor-pointer ${linkHoverClass}`}>
                  2D Desk & Floorplan Demo
                </Link>
              </li>
              <li>
                <Link href="/peoplesuite" className={`transition-colors cursor-pointer ${linkHoverClass}`}>
                  Feature Walkthroughs
                </Link>
              </li>
              <li>
                <Link href="/#faq" className={`transition-colors cursor-pointer ${linkHoverClass}`}>
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link href="/#faq" className={`transition-colors cursor-pointer ${linkHoverClass}`}>
                  Enterprise Security & SLAs
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Support links */}
          <div className="space-y-4">
            <h4
              className={`font-label-lg text-label-lg font-semibold ${
                isDark ? "text-[#E8ECFF]" : "text-[#0B0F2E]"
              }`}
            >
              Support & Security
            </h4>
            <ul className="space-y-2.5 font-body-sm text-body-sm">
              <li>
                <Link href="/#faq" className={`transition-colors cursor-pointer ${linkHoverClass}`}>
                  Implementation & FAQs
                </Link>
              </li>
              <li>
                {onOpenDemo ? (
                  <button
                    type="button"
                    onClick={onOpenDemo}
                    className={`transition-colors cursor-pointer text-left ${linkHoverClass}`}
                  >
                    Schedule 1-on-1 Walkthrough
                  </button>
                ) : (
                  <Link href="/peoplesuite#modules" className={`transition-colors cursor-pointer ${linkHoverClass}`}>
                    Schedule 1-on-1 Walkthrough
                  </Link>
                )}
              </li>
              <li>
                <Link href="/peoplesuite#attendance" className={`transition-colors cursor-pointer ${linkHoverClass}`}>
                  Multi-Shift Setup Guide
                </Link>
              </li>
              <li>
                <Link href="/peoplesuite#modules" className={`transition-colors cursor-pointer ${linkHoverClass}`}>
                  Role-Based Security (Admin/Staff)
                </Link>
              </li>
              <li>
                <Link href="/#faq" className={`transition-colors cursor-pointer ${linkHoverClass}`}>
                  DPDP Compliance & Encryption
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          className={`pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 font-body-sm text-body-sm ${
            isDark ? "border-[#4A6CFF]/20" : "border-[#DCE4F5]"
          }`}
        >
          <div className="flex items-center gap-4 flex-wrap">
            <span>
              © 2026 Innovyx HRMS & ATS Platform. Developed and engineered by{" "}
              <strong className="font-semibold text-current">Innovyx Tech Labs LLP</strong>. All rights reserved.
            </span>
            <div
              className={`inline-flex items-center gap-1.5 font-label-md text-label-md font-semibold ${
                isDark ? "text-[#7DC8FF]" : "text-[#0B5BD3]"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">lock</span>
              <span>Enterprise Grade Security</span>
            </div>
            <div className="flex items-center gap-3 text-xs opacity-80 pl-2">
              <Link href="/#faq" className={linkHoverClass}>
                Privacy Policy
              </Link>
              <span>•</span>
              <Link href="/#faq" className={linkHoverClass}>
                Security & Compliance
              </Link>
              <span>•</span>
              <Link href="/#faq" className={linkHoverClass}>
                Terms of Service
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-body-sm text-body-sm ${
                isDark
                  ? "bg-[#0F1226] border-[#4A6CFF]/30 text-[#E8ECFF]"
                  : "bg-[#F5F8FF] border-[#DCE4F5] text-[#0B0F2E]"
              }`}
            >
              <span
                className={`material-symbols-outlined text-[16px] ${
                  isDark ? "text-[#7DC8FF]" : "text-[#0B5BD3]"
                }`}
              >
                verified_user
              </span>
              <span>All Systems Operational</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
