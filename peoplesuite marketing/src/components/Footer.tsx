"use client";

import React from "react";
import Link from "next/link";

interface FooterProps {
  theme?: "dark" | "light";
}

export default function Footer({ theme = "dark" }: FooterProps) {
  const isDark = theme === "dark";

  return (
    <footer
      className={`w-full pt-16 pb-12 transition-colors ${
        isDark
          ? "bg-[#0A0B14] border-t border-[#4A6CFF]/25 text-[#9AA3D1]"
          : "bg-white border-t border-[#DCE4F5] text-[#5B6488]"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Top 5-Column Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-16">
          {/* Brand info column */}
          <div className="lg:col-span-1 space-y-5">
            <Link href="/" className="flex items-center">
              <img src="/logo.png" alt="PeopleSuite" className="h-14 w-auto" />
            </Link>

            <p className="font-body-sm text-body-sm leading-relaxed">
              Everything People. One Suite. Cloud HRMS empowering progressive workforces worldwide.
            </p>

            {/* Live Operational Status */}
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-xs ${
                isDark
                  ? "bg-[#121528] border-[#4A6CFF]/30 text-[#E8ECFF]"
                  : "bg-[#F5F8FF] border-[#DCE4F5] text-[#0B0F2E]"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#7DC8FF] "></span>
              <span className="font-caption text-caption font-medium">System Operational (99.99%)</span>
            </div>

            {/* Social channels */}
            <div className="flex items-center gap-2 pt-1">
              <a
                href="#social"
                aria-label="LinkedIn"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  isDark
                    ? "hover:bg-[#1E1AB8]/30 hover:text-[#7DC8FF]"
                    : "hover:bg-[#EAF0FF] hover:text-[#0B5BD3]"
                }`}
              >
                <span className="material-symbols-outlined text-[19px]">share</span>
              </a>
              <a
                href="#social"
                aria-label="Community"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  isDark
                    ? "hover:bg-[#1E1AB8]/30 hover:text-[#7DC8FF]"
                    : "hover:bg-[#EAF0FF] hover:text-[#0B5BD3]"
                }`}
              >
                <span className="material-symbols-outlined text-[19px]">forum</span>
              </a>
              <a
                href="#social"
                aria-label="Video Tutorials"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  isDark
                    ? "hover:bg-[#1E1AB8]/30 hover:text-[#7DC8FF]"
                    : "hover:bg-[#EAF0FF] hover:text-[#0B5BD3]"
                }`}
              >
                <span className="material-symbols-outlined text-[19px]">play_circle</span>
              </a>
              <a
                href="#social"
                aria-label="Developer Docs"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  isDark
                    ? "hover:bg-[#1E1AB8]/30 hover:text-[#7DC8FF]"
                    : "hover:bg-[#EAF0FF] hover:text-[#0B5BD3]"
                }`}
              >
                <span className="material-symbols-outlined text-[19px]">terminal</span>
              </a>
            </div>

            {/* Security Badges */}
            <div className="pt-2 space-y-1.5">
              <div className="font-label-md text-label-md text-[#7DC8FF] tracking-wider uppercase font-semibold">
                Security Certified
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["ISO 27001", "GDPR Ready", "SOC 2 Type II", "HIPAA"].map((cert) => (
                  <span
                    key={cert}
                    className={`border px-2 py-0.5 rounded font-caption text-[11px] font-medium ${
                      isDark
                        ? "bg-[#121528] border-[#4A6CFF]/30 text-[#E8ECFF]"
                        : "bg-[#F5F8FF] border-[#DCE4F5] text-[#5B6488]"
                    }`}
                  >
                    {cert}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Product links */}
          <div className="space-y-4">
            <h4
              className={`font-label-lg text-label-lg font-semibold ${
                isDark ? "text-[#E8ECFF]" : "text-[#0B0F2E]"
              }`}
            >
              Product
            </h4>
            <ul className="space-y-2.5 font-body-sm text-body-sm">
              <li>
                <Link href="/#pillars" className="hover:text-[#7DC8FF] transition-colors">
                  Core HR & Directory
                </Link>
              </li>
              <li>
                <Link href="/#attendance" className="hover:text-[#7DC8FF] transition-colors">
                  Attendance & Geofencing
                </Link>
              </li>
              <li>
                <Link href="/#payroll" className="hover:text-[#7DC8FF] transition-colors">
                  Payroll & Tax Compliance
                </Link>
              </li>
              <li>
                <Link href="/#pillars" className="hover:text-[#7DC8FF] transition-colors">
                  Performance & OKRs
                </Link>
              </li>
              <li>
                <Link href="/#pillars" className="hover:text-[#7DC8FF] transition-colors">
                  Recruitment ATS
                </Link>
              </li>
              <li>
                <Link href="/#mobile-app" className="hover:text-[#7DC8FF] transition-colors">
                  Employee Mobile App
                </Link>
              </li>
              <li>
                <Link href="/#integrations" className="hover:text-[#7DC8FF] transition-colors">
                  API & Integrations
                </Link>
              </li>
            </ul>
          </div>

          {/* Solutions links */}
          <div className="space-y-4">
            <h4
              className={`font-label-lg text-label-lg font-semibold ${
                isDark ? "text-[#E8ECFF]" : "text-[#0B0F2E]"
              }`}
            >
              Solutions
            </h4>
            <ul className="space-y-2.5 font-body-sm text-body-sm">
              <li>
                <Link href="/#enterprise-scale" className="hover:text-[#7DC8FF] transition-colors">
                  Mid-market Enterprises
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-[#7DC8FF] transition-colors">
                  High-Growth Startups
                </Link>
              </li>
              <li>
                <Link href="/#pillars" className="hover:text-[#7DC8FF] transition-colors">
                  Healthcare & Clinics
                </Link>
              </li>
              <li>
                <Link href="/#pillars" className="hover:text-[#7DC8FF] transition-colors">
                  Tech & Remote Teams
                </Link>
              </li>
              <li>
                <Link href="/#attendance" className="hover:text-[#7DC8FF] transition-colors">
                  Manufacturing & Shifts
                </Link>
              </li>
              <li>
                <Link href="/#attendance" className="hover:text-[#7DC8FF] transition-colors">
                  Retail Chains
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources links */}
          <div className="space-y-4">
            <h4
              className={`font-label-lg text-label-lg font-semibold ${
                isDark ? "text-[#E8ECFF]" : "text-[#0B0F2E]"
              }`}
            >
              Resources
            </h4>
            <ul className="space-y-2.5 font-body-sm text-body-sm">
              <li>
                <Link href="/#testimonials" className="hover:text-[#7DC8FF] transition-colors">
                  Customer Stories
                </Link>
              </li>
              <li>
                <Link href="/pricing#calculator" className="hover:text-[#7DC8FF] transition-colors">
                  HR Tech ROI Calculator
                </Link>
              </li>
              <li>
                <Link href="/#security" className="hover:text-[#7DC8FF] transition-colors">
                  State Compliance 2025
                </Link>
              </li>
              <li>
                <Link href="/#hero" className="hover:text-[#7DC8FF] transition-colors">
                  Release Notes v2.4
                </Link>
              </li>
              <li>
                <Link href="/#integrations" className="hover:text-[#7DC8FF] transition-colors">
                  API Documentation
                </Link>
              </li>
              <li>
                <Link href="/pricing#faq" className="hover:text-[#7DC8FF] transition-colors">
                  Help Center & FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Company links */}
          <div className="space-y-4">
            <h4
              className={`font-label-lg text-label-lg font-semibold ${
                isDark ? "text-[#E8ECFF]" : "text-[#0B0F2E]"
              }`}
            >
              Company & Legal
            </h4>
            <ul className="space-y-2.5 font-body-sm text-body-sm">
              <li>
                <Link href="/#about" className="hover:text-[#7DC8FF] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/#careers"
                  className="flex items-center gap-1.5 hover:text-[#7DC8FF] transition-colors"
                >
                  <span>Careers</span>
                  <span className="bg-[#0B5BD3]/30 border border-[#4A6CFF]/40 text-[#7DC8FF] font-label-md text-[11px] px-1.5 py-0.2 rounded-full">
                    Hiring
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/#press" className="hover:text-[#7DC8FF] transition-colors">
                  Press & Media
                </Link>
              </li>
              <li>
                <Link href="/pricing#contact" className="hover:text-[#7DC8FF] transition-colors">
                  Contact Sales
                </Link>
              </li>
              <li>
                <Link href="/#privacy" className="hover:text-[#7DC8FF] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/#terms" className="hover:text-[#7DC8FF] transition-colors">
                  Terms of Service
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
            <span>© 2025 PeopleSuite Technologies, Inc. All rights reserved.</span>
            <div className="inline-flex items-center gap-1.5 text-[#0B5BD3] dark:text-[#7DC8FF] font-label-md text-label-md font-semibold">
              <span className="material-symbols-outlined text-[16px]">lock</span>
              <span>SSL 256-bit secure</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                isDark
                  ? "bg-[#121528] border-[#4A6CFF]/30 hover:border-[#7DC8FF] text-[#E8ECFF]"
                  : "bg-[#F5F8FF] border-[#DCE4F5] hover:border-[#0B5BD3] text-[#0B0F2E]"
              }`}
            >
              <span className="material-symbols-outlined text-[16px] text-[#0B5BD3] dark:text-[#7DC8FF]">
                language
              </span>
              <span className="font-body-sm text-body-sm font-medium">United States (USD)</span>
              <span className="material-symbols-outlined text-[16px]">unfold_more</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
