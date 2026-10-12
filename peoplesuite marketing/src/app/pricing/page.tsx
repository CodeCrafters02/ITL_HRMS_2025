"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookDemoModal from "@/components/BookDemoModal";
import FaqAccordion from "@/components/FaqAccordion";
import RoiCalculator from "@/components/RoiCalculator";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"annual" | "monthly">("annual");
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const starterPrice = billingCycle === "annual" ? 4 : 5;
  const growthPrice = billingCycle === "annual" ? 7 : 9;
  const billingPeriodText = billingCycle === "annual" ? "billed annually" : "billed monthly";

  return (
    <div className="min-h-screen bg-[#F5F8FF] text-[#0B0F2E] flex flex-col selection:bg-[#EAF0FF] selection:text-[#0B5BD3]">
      {/* Global Navbar */}
      <Navbar onOpenDemo={() => setIsDemoModalOpen(true)} />

      <main className="w-full pt-[72px]">
        {/* ============================================================== */}
        {/* 1. PRICING HEADER & BILLING TOGGLE                             */}
        {/* ============================================================== */}
        <section className="relative w-full overflow-hidden py-16 lg:py-24 bg-[#F5F8FF]">
          {/* Ambient Glow */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-b from-[#0B5BD3]/10 to-transparent blur-3xl pointer-events-none rounded-full" />

          <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
            {/* Header copy */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EAF0FF] border border-[#DCE4F5] text-[#0B5BD3] shadow-xs">
                <span
                  className="material-symbols-outlined text-[16px] text-[#0B5BD3]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified
                </span>
                <span className="font-label-md text-label-md uppercase tracking-wider font-semibold">
                  Transparent, Predictable Pricing
                </span>
              </div>

              <h1 className="font-display text-display text-[#0B0F2E] tracking-tight">
                Simple, flexible plans that scale with your team
              </h1>
              <p className="font-body-lg text-body-lg text-[#5B6488] max-w-2xl mx-auto leading-relaxed">
                No hidden setup fees. Transparent per-employee pricing with 14-day risk-free trial.
                Upgrade, downgrade, or cancel anytime.
              </p>

              {/* Billing Toggle Pill */}
              <div className="pt-6 pb-2 flex items-center justify-center">
                <div className="inline-flex items-center p-1.5 rounded-full bg-[#EAF0FF] border border-[#DCE4F5] shadow-inner">
                  <button
                    type="button"
                    onClick={() => setBillingCycle("monthly")}
                    className={`px-5 py-2.5 rounded-full font-label-lg text-label-lg transition-all duration-200 cursor-pointer ${
                      billingCycle === "monthly"
                        ? "bg-white text-[#0B5BD3] shadow-sm font-bold"
                        : "text-[#5B6488] hover:text-[#0B0F2E]"
                    }`}
                  >
                    Monthly Billing
                  </button>

                  <button
                    type="button"
                    onClick={() => setBillingCycle("annual")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-label-lg text-label-lg transition-all duration-200 cursor-pointer ${
                      billingCycle === "annual"
                        ? "bg-white text-[#0B5BD3] shadow-sm font-bold"
                        : "text-[#5B6488] hover:text-[#0B0F2E]"
                    }`}
                  >
                    <span>Annual Billing</span>
                    <span className="bg-[#0B5BD3] text-white font-label-md text-label-md px-2.5 py-0.5 rounded-full font-bold">
                      Save 20% + 2 Mo Free
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* 2. 3 TIER PRICING CARDS GRID                                  */}
            {/* ============================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12 items-stretch">
              {/* TIER 1: Starter */}
              <div className="flex flex-col rounded-3xl bg-white border border-[#DCE4F5] shadow-md hover:shadow-xl transition-all duration-300 p-8 sm:p-9 relative">
                <div className="space-y-2 mb-6">
                  <div className="inline-flex items-center gap-1.5 text-[#5B6488] font-label-md text-label-md uppercase tracking-wider font-semibold">
                    <span className="w-2 h-2 rounded-full bg-[#5B6488]"></span>
                    Starter Plan
                  </div>
                  <h2 className="font-headline-sm text-headline-sm font-bold text-[#0B0F2E]">
                    Starter
                  </h2>
                  <p className="font-body-sm text-body-sm text-[#5B6488] min-h-[44px] leading-relaxed">
                    For early-stage startups, boutique agencies, and retail shops up to 50 staff.
                  </p>
                </div>

                {/* Price Indicator */}
                <div className="p-4 rounded-2xl bg-[#F5F8FF] border border-[#DCE4F5] mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="font-headline-lg text-4xl font-bold text-[#0B0F2E]">
                      ${starterPrice}
                    </span>
                    <span className="font-body-sm text-body-sm text-[#5B6488]">
                      / employee / month
                    </span>
                  </div>
                  <div className="font-caption text-caption text-[#5B6488] mt-1">
                    +$49/mo base platform fee ({billingPeriodText})
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  type="button"
                  onClick={() => setIsDemoModalOpen(true)}
                  className="w-full inline-flex items-center justify-center py-3.5 px-6 rounded-xl bg-[#EAF0FF] hover:bg-[#DCE4F5] text-[#0B5BD3] font-label-lg text-label-lg transition-colors font-bold border border-[#DCE4F5] cursor-pointer"
                >
                  Start 14-Day Free Trial
                </button>
                <p className="text-center font-caption text-caption text-[#5B6488] mt-2 mb-6">
                  No credit card required
                </p>

                <div className="w-full h-px bg-[#DCE4F5] my-2"></div>

                {/* Features List */}
                <div className="space-y-3.5 pt-4 flex-1">
                  <span className="font-label-md text-label-md uppercase tracking-wider text-[#5B6488] block font-semibold">
                    Included Essentials
                  </span>
                  {[
                    "Core HR & employee directory",
                    "Leave & PTO tracking & accruals",
                    "Mobile self-service app (iOS & Android)",
                    "Standard shift scheduling & calendars",
                    "Basic headcount & attrition reports",
                    "Email support (24-hour SLA response)",
                    "Document storage (5GB secure cloud)",
                    "Standard employee onboarding checklists",
                  ].map((feat) => (
                    <div key={feat} className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[20px] text-[#0B5BD3] mt-0.5 shrink-0">
                        check_circle
                      </span>
                      <span className="font-body-sm text-body-sm text-[#0B0F2E]">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* TIER 2: Growth (Highlighted / Most Popular) */}
              <div className="flex flex-col rounded-3xl bg-white shadow-2xl ring-2 ring-[#0B5BD3] relative p-8 sm:p-9 -mt-2 lg:-mt-4 mb-2 lg:mb-0">
                {/* Top Badge */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#EAF0FF] text-[#0B5BD3] border border-[#0B5BD3]/40 font-label-md text-label-md px-4 py-1 rounded-full shadow-md font-bold tracking-wide whitespace-nowrap">
                  MOST POPULAR • BEST FOR 50–250 EMPLOYEES
                </div>

                <div className="space-y-2 mb-6 mt-2">
                  <div className="inline-flex items-center gap-1.5 text-[#1E1AB8] font-label-md text-label-md uppercase tracking-wider font-semibold">
                    <span className="w-2 h-2 rounded-full bg-[#1E1AB8] animate-pulse"></span>
                    Growth Plan
                  </div>
                  <h2 className="font-headline-sm text-headline-sm font-bold text-[#0B0F2E]">
                    Growth
                  </h2>
                  <p className="font-body-sm text-body-sm text-[#5B6488] min-h-[44px] leading-relaxed">
                    Complete automation for mid-sized organizations scaling rapidly across regions.
                  </p>
                </div>

                {/* Price Indicator */}
                <div className="p-4 rounded-2xl bg-[#EAF0FF] border border-[#DCE4F5] mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="font-headline-lg text-4xl font-bold text-[#0B5BD3]">
                      ${growthPrice}
                    </span>
                    <span className="font-body-sm text-body-sm text-[#0B0F2E] font-medium">
                      / employee / month
                    </span>
                  </div>
                  <div className="font-caption text-caption text-[#5B6488] mt-1">
                    +$99/mo base platform fee ({billingPeriodText})
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  type="button"
                  onClick={() => setIsDemoModalOpen(true)}
                  className="w-full inline-flex items-center justify-center py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#1E1AB8] to-[#0B5BD3] hover:opacity-95 text-white font-label-lg text-label-lg shadow-md hover:shadow-lg transition-all font-bold cursor-pointer"
                >
                  Get Started with Growth
                </button>
                <p className="text-center font-caption text-caption text-[#5B6488] mt-2 mb-6">
                  14 days free full-feature access
                </p>

                <div className="w-full h-px bg-[#DCE4F5] my-2"></div>

                {/* Features List */}
                <div className="space-y-3.5 pt-4 flex-1">
                  <span className="font-label-md text-label-md uppercase tracking-wider text-[#0B5BD3] font-bold block">
                    Everything in Starter, plus:
                  </span>
                  {[
                    "Automated multi-state payroll run in <90s",
                    "Statutory tax filing & digital e-signatures",
                    "Geofenced mobile clock-in & biometric ready",
                    "Performance reviews & 360 OKR tracking",
                    "ATS recruitment pipeline (5 active job postings)",
                    "Native Slack & Microsoft Teams integrations",
                    "Multi-level approval workflows & delegates",
                    "Dedicated Customer Success Manager",
                  ].map((feat) => (
                    <div key={feat} className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[20px] text-[#0B5BD3] mt-0.5 shrink-0">
                        check_circle
                      </span>
                      <span className="font-body-sm text-body-sm text-[#0B0F2E] font-medium">
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* TIER 3: Enterprise */}
              <div className="flex flex-col rounded-3xl bg-white border border-[#DCE4F5] shadow-md hover:shadow-xl transition-all duration-300 p-8 sm:p-9 relative">
                <div className="space-y-2 mb-6">
                  <div className="inline-flex items-center gap-1.5 text-[#0B0F2E] font-label-md text-label-md uppercase tracking-wider font-semibold">
                    <span className="w-2 h-2 rounded-full bg-[#0B0F2E]"></span>
                    Enterprise
                  </div>
                  <h2 className="font-headline-sm text-headline-sm font-bold text-[#0B0F2E]">
                    Enterprise
                  </h2>
                  <p className="font-body-sm text-body-sm text-[#5B6488] min-h-[44px] leading-relaxed">
                    For mid-market and global enterprises (250 to 10,000+ employees) needing bespoke compliance.
                  </p>
                </div>

                {/* Price Indicator */}
                <div className="p-4 rounded-2xl bg-[#F5F8FF] border border-[#DCE4F5] mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="font-headline-lg text-4xl font-bold text-[#0B0F2E]">
                      Custom
                    </span>
                    <span className="font-body-sm text-body-sm text-[#5B6488]">
                      / volume tiers
                    </span>
                  </div>
                  <div className="font-caption text-caption text-[#5B6488] mt-1">
                    Approx. $11/employee with custom SLAs & architecture
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  type="button"
                  onClick={() => setIsDemoModalOpen(true)}
                  className="w-full inline-flex items-center justify-center py-3.5 px-6 rounded-xl bg-[#0B0F2E] hover:bg-[#1E1AB8] text-white font-label-lg text-label-lg transition-colors font-bold cursor-pointer"
                >
                  Contact Enterprise Sales
                </button>
                <p className="text-center font-caption text-caption text-[#5B6488] mt-2 mb-6">
                  Custom pilot & contract billing
                </p>

                <div className="w-full h-px bg-[#DCE4F5] my-2"></div>

                {/* Features List */}
                <div className="space-y-3.5 pt-4 flex-1">
                  <span className="font-label-md text-label-md uppercase tracking-wider text-[#5B6488] block font-semibold">
                    Everything in Growth, plus:
                  </span>
                  {[
                    "Unlimited ATS job requisitions & talent pools",
                    "Multi-entity & multi-currency payroll consoles",
                    "Full REST API access, Webhooks & ERP connectors",
                    "Enterprise SSO (SAML 2.0, Okta, Azure AD, Ping)",
                    "Granular audit logs & custom role permissions",
                    "99.99% Uptime SLA & 24/7 priority phone support",
                    "Dedicated Solution Architect & Data Migration squad",
                    "Custom data residency & HIPAA BAA agreements",
                  ].map((feat) => (
                    <div key={feat} className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[20px] text-[#0B5BD3] mt-0.5 shrink-0">
                        check_circle
                      </span>
                      <span className="font-body-sm text-body-sm text-[#0B0F2E]">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 3. MODULAR EXPANSION ADD-ONS                                   */}
        {/* ============================================================== */}
        <section className="w-full py-16 bg-[#F5F8FF] border-y border-[#DCE4F5]/70">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div>
                <div className="font-label-md text-label-md uppercase tracking-wider text-[#0B5BD3] font-bold">
                  Modular Expansion
                </div>
                <h2 className="font-headline-md text-headline-md text-[#0B0F2E] font-bold">
                  Add-on Modules
                </h2>
                <p className="font-body-md text-body-md text-[#5B6488] mt-1">
                  Plug in capabilities only when your organization needs them.
                </p>
              </div>
              <div className="font-body-sm text-body-sm text-[#5B6488]">
                Can be activated or turned off on any monthly billing cycle.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Addon 1 */}
              <div className="p-6 rounded-3xl bg-white border border-[#DCE4F5] shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#EAF0FF] flex items-center justify-center text-[#0B5BD3]">
                    <span className="material-symbols-outlined text-[28px]">payments</span>
                  </div>
                  <div className="text-right">
                    <div className="font-title-md text-title-md text-[#0B0F2E] font-bold">+$3</div>
                    <div className="font-caption text-caption text-[#5B6488]">
                      / contractor / mo
                    </div>
                  </div>
                </div>
                <h3 className="font-title-md text-title-md text-[#0B0F2E] font-bold mb-2">
                  Global Contractor Payouts
                </h3>
                <p className="font-body-sm text-body-sm text-[#5B6488] leading-relaxed">
                  Automate 1099 contracts, W-9 generation, cross-border localized currency
                  disbursements, and automated invoice clearance in 130+ countries.
                </p>
              </div>

              {/* Addon 2 */}
              <div className="p-6 rounded-3xl bg-white border border-[#DCE4F5] shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#EAF0FF] flex items-center justify-center text-[#0B5BD3]">
                    <span className="material-symbols-outlined text-[28px]">psychology</span>
                  </div>
                  <div className="text-right">
                    <div className="font-title-md text-title-md text-[#0B0F2E] font-bold">+$49</div>
                    <div className="font-caption text-caption text-[#5B6488]">/ company / mo</div>
                  </div>
                </div>
                <h3 className="font-title-md text-title-md text-[#0B0F2E] font-bold mb-2">
                  Advanced AI Candidate Sourcing
                </h3>
                <p className="font-body-sm text-body-sm text-[#5B6488] leading-relaxed">
                  Smart semantic resume matching, AI job description generation, automated candidate
                  screening questions, and predictive hiring scorecards.
                </p>
              </div>

              {/* Addon 3 */}
              <div className="p-6 rounded-3xl bg-white border border-[#DCE4F5] shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#EAF0FF] flex items-center justify-center text-[#1E1AB8]">
                    <span className="material-symbols-outlined text-[28px]">fingerprint</span>
                  </div>
                  <div className="text-right">
                    <div className="font-title-md text-title-md text-[#0B0F2E] font-bold">+$29</div>
                    <div className="font-caption text-caption text-[#5B6488]">/ location / mo</div>
                  </div>
                </div>
                <h3 className="font-title-md text-title-md text-[#0B0F2E] font-bold mb-2">
                  Hardware Biometric Sync Gateway
                </h3>
                <p className="font-body-sm text-body-sm text-[#5B6488] leading-relaxed">
                  Real-time bridge connecting physical fingerprint scanners, RFID badges, and
                  facial-recognition turnstiles directly into PeopleSuite shifts.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 4. DYNAMIC ROI & PRICING CALCULATOR                            */}
        {/* ============================================================== */}
        <section id="calculator" className="py-20 lg:py-24 bg-[#0A0B14]">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <RoiCalculator onOpenDemo={() => setIsDemoModalOpen(true)} />
          </div>
        </section>

        {/* ============================================================== */}
        {/* 5. COMPREHENSIVE SIDE-BY-SIDE FEATURE COMPARISON TABLE         */}
        {/* ============================================================== */}
        <section className="w-full py-16 lg:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <div className="font-label-md text-label-md uppercase tracking-wider text-[#0B5BD3] font-bold">
                Deep Dive
              </div>
              <h2 className="font-headline-lg text-headline-lg text-[#0B0F2E] font-bold">
                Compare all features side-by-side
              </h2>
              <p className="font-body-md text-body-md text-[#5B6488]">
                Detailed transparency into our modules, capabilities, security baselines, and
                support tiers.
              </p>
            </div>

            {/* Feature Table Container */}
            <div className="rounded-3xl bg-white border border-[#DCE4F5] shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[760px]">
                  <thead>
                    <tr className="bg-[#F5F8FF] text-[#0B0F2E] border-b border-[#DCE4F5]">
                      <th className="py-5 px-6 font-label-lg text-label-lg w-2/5 font-bold">
                        Platform Features
                      </th>
                      <th className="py-5 px-4 font-label-lg text-label-lg text-center w-1/5 font-bold">
                        Starter
                      </th>
                      <th className="py-5 px-4 font-label-lg text-label-lg text-center w-1/5 bg-[#EAF0FF] text-[#0B5BD3] font-bold">
                        Growth
                      </th>
                      <th className="py-5 px-4 font-label-lg text-label-lg text-center w-1/5 font-bold">
                        Enterprise
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-[#0B0F2E] font-body-sm text-body-sm">
                    {/* CATEGORY 1: Core HR */}
                    <tr className="bg-[#EAF0FF]/60 font-label-md text-label-md uppercase tracking-wider text-[#0B5BD3] font-bold border-y border-[#DCE4F5]/70">
                      <td className="py-3 px-6" colSpan={4}>
                        1. Core HR & Directory
                      </td>
                    </tr>
                    <tr className="hover:bg-[#F5F8FF] border-b border-[#DCE4F5]/50">
                      <td className="py-3.5 px-6 font-medium">
                        Employee Profiles & Document Vault
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                      <td className="py-3.5 px-4 text-center bg-[#EAF0FF]/40">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#F5F8FF] border-b border-[#DCE4F5]/50">
                      <td className="py-3.5 px-6 font-medium">
                        Interactive Org Chart & Directory
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                      <td className="py-3.5 px-4 text-center bg-[#EAF0FF]/40">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#F5F8FF] border-b border-[#DCE4F5]/50">
                      <td className="py-3.5 px-6 font-medium">
                        Custom Field Builder & Asset Management
                      </td>
                      <td className="py-3.5 px-4 text-center text-[#DCE4F5] font-caption">—</td>
                      <td className="py-3.5 px-4 text-center bg-[#EAF0FF]/40">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#F5F8FF] border-b border-[#DCE4F5]/50">
                      <td className="py-3.5 px-6 font-medium">
                        Automated Offboarding & Exit Workflows
                      </td>
                      <td className="py-3.5 px-4 text-center text-[#DCE4F5] font-caption">—</td>
                      <td className="py-3.5 px-4 text-center bg-[#EAF0FF]/40">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                    </tr>

                    {/* CATEGORY 2: Time & Attendance */}
                    <tr className="bg-[#EAF0FF]/60 font-label-md text-label-md uppercase tracking-wider text-[#0B5BD3] font-bold border-y border-[#DCE4F5]/70">
                      <td className="py-3 px-6" colSpan={4}>
                        2. Time, Shifts & Attendance
                      </td>
                    </tr>
                    <tr className="hover:bg-[#F5F8FF] border-b border-[#DCE4F5]/50">
                      <td className="py-3.5 px-6 font-medium">
                        Self-Service PTO Request & Approval
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                      <td className="py-3.5 px-4 text-center bg-[#EAF0FF]/40">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#F5F8FF] border-b border-[#DCE4F5]/50">
                      <td className="py-3.5 px-6 font-medium">Geofenced GPS Mobile Clock-in</td>
                      <td className="py-3.5 px-4 text-center text-[#DCE4F5] font-caption">—</td>
                      <td className="py-3.5 px-4 text-center bg-[#EAF0FF]/40">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#F5F8FF] border-b border-[#DCE4F5]/50">
                      <td className="py-3.5 px-6 font-medium">
                        Overtime Rules & Complex Shift Rotations
                      </td>
                      <td className="py-3.5 px-4 text-center text-[#DCE4F5] font-caption">—</td>
                      <td className="py-3.5 px-4 text-center bg-[#EAF0FF]/40">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#F5F8FF] border-b border-[#DCE4F5]/50">
                      <td className="py-3.5 px-6 font-medium">
                        Hardware Biometric Clocks Direct Hook
                      </td>
                      <td className="py-3.5 px-4 text-center text-[#DCE4F5] font-caption">—</td>
                      <td className="py-3.5 px-4 text-center bg-[#EAF0FF]/40 text-[#5B6488] font-caption">
                        Add-on
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                    </tr>

                    {/* CATEGORY 3: Payroll & Tax */}
                    <tr className="bg-[#EAF0FF]/60 font-label-md text-label-md uppercase tracking-wider text-[#0B5BD3] font-bold border-y border-[#DCE4F5]/70">
                      <td className="py-3 px-6" colSpan={4}>
                        3. Payroll & Statutory Compliance
                      </td>
                    </tr>
                    <tr className="hover:bg-[#F5F8FF] border-b border-[#DCE4F5]/50">
                      <td className="py-3.5 px-6 font-medium">Single-State Payroll Processing</td>
                      <td className="py-3.5 px-4 text-center text-[#5B6488] font-caption">
                        Basic Export
                      </td>
                      <td className="py-3.5 px-4 text-center bg-[#EAF0FF]/40">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#F5F8FF] border-b border-[#DCE4F5]/50">
                      <td className="py-3.5 px-6 font-medium">
                        Multi-State Automated Tax Filing (W-2, 1099)
                      </td>
                      <td className="py-3.5 px-4 text-center text-[#DCE4F5] font-caption">—</td>
                      <td className="py-3.5 px-4 text-center bg-[#EAF0FF]/40">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#F5F8FF] border-b border-[#DCE4F5]/50">
                      <td className="py-3.5 px-6 font-medium">
                        Direct Deposit & Split Bank Accounts
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                      <td className="py-3.5 px-4 text-center bg-[#EAF0FF]/40">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#F5F8FF] border-b border-[#DCE4F5]/50">
                      <td className="py-3.5 px-6 font-medium">
                        Multi-Entity & International Currencies
                      </td>
                      <td className="py-3.5 px-4 text-center text-[#DCE4F5] font-caption">—</td>
                      <td className="py-3.5 px-4 text-center text-[#DCE4F5] bg-[#EAF0FF]/40 font-caption">
                        —
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                    </tr>

                    {/* CATEGORY 4: Security & Support */}
                    <tr className="bg-[#EAF0FF]/60 font-label-md text-label-md uppercase tracking-wider text-[#0B5BD3] font-bold border-y border-[#DCE4F5]/70">
                      <td className="py-3 px-6" colSpan={4}>
                        4. Security & Technical Support
                      </td>
                    </tr>
                    <tr className="hover:bg-[#F5F8FF] border-b border-[#DCE4F5]/50">
                      <td className="py-3.5 px-6 font-medium">Customer Support SLA</td>
                      <td className="py-3.5 px-4 text-center text-[#5B6488] font-caption">
                        Email (24h)
                      </td>
                      <td className="py-3.5 px-4 text-center bg-[#EAF0FF]/40 font-caption font-semibold text-[#0B5BD3]">
                        Priority Chat & CSM (4h)
                      </td>
                      <td className="py-3.5 px-4 text-center font-caption font-semibold">
                        24/7 Phone + 15m SLA
                      </td>
                    </tr>
                    <tr className="hover:bg-[#F5F8FF] border-b border-[#DCE4F5]/50">
                      <td className="py-3.5 px-6 font-medium">
                        Enterprise SSO (SAML 2.0 / Okta / Azure AD)
                      </td>
                      <td className="py-3.5 px-4 text-center text-[#DCE4F5] font-caption">—</td>
                      <td className="py-3.5 px-4 text-center text-[#DCE4F5] bg-[#EAF0FF]/40 font-caption">
                        —
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#F5F8FF]">
                      <td className="py-3.5 px-6 font-medium">
                        SOC 2 Type II & ISO 27001 Infrastructure
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                      <td className="py-3.5 px-4 text-center bg-[#EAF0FF]/40">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="material-symbols-outlined text-[#0B5BD3]">check</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 6. FREQUENTLY ASKED QUESTIONS ACCORDION                        */}
        {/* ============================================================== */}
        <section id="faq" className="w-full py-20 bg-[#F5F8FF]">
          <div className="max-w-4xl mx-auto px-6 lg:px-12">
            <div className="text-center mb-14 space-y-2">
              <div className="font-label-md text-label-md uppercase tracking-wider text-[#0B5BD3] font-bold">
                Answers Ready
              </div>
              <h2 className="font-headline-md text-headline-md text-[#0B0F2E] font-bold">
                Frequently Asked Questions
              </h2>
              <p className="font-body-md text-body-md text-[#5B6488]">
                Clear answers about pricing, contracts, compliance, and onboarding.
              </p>
            </div>

            <FaqAccordion />
          </div>
        </section>

        {/* ============================================================== */}
        {/* 7. ENTERPRISE ADVISORY TEAM BANNER                             */}
        {/* ============================================================== */}
        <section id="contact" className="w-full py-16 lg:py-20 bg-[#F5F8FF]">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div
              className="rounded-3xl p-8 lg:p-14 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-10 text-white"
              style={{
                background:
                  "linear-gradient(135deg, rgb(21, 25, 56) 0%, rgb(30, 26, 184) 50%, rgb(11, 91, 211) 100%)",
              }}
            >
              <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6 relative z-10 max-w-2xl">
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#1E1AB8] via-[#0B5BD3] to-[#7DC8FF] flex items-center justify-center font-bold text-2xl text-white shadow-lg ring-4 ring-white/20">
                    ER
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0B5BD3] border-2 border-white flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-white"></span>
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-[#EAF0FF] font-label-md text-label-md uppercase tracking-wider font-semibold border border-white/20">
                    Enterprise Advisory Team
                  </div>
                  <h2 className="font-headline-md text-headline-md text-white tracking-tight font-bold">
                    Need a tailored quote for 500+ employees?
                  </h2>
                  <p className="font-body-md text-body-md text-[#EAF0FF]/90 leading-relaxed">
                    Connect directly with an HR operations specialist. We will benchmark your
                    current software stack, analyze data migration, and craft a volume discount
                    package.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDemoModalOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-4 px-8 rounded-xl bg-white text-[#0B5BD3] hover:bg-[#EAF0FF] font-label-lg text-label-lg shadow-md hover:shadow-xl transition-all font-bold cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-[#0B5BD3]">
                    calendar_month
                  </span>
                  <span>Schedule Custom Demo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDemoModalOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center py-4 px-7 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 font-label-lg text-label-lg transition-colors font-semibold cursor-pointer"
                >
                  Talk to Sales
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer (Light theme for Pricing) */}
      <Footer theme="light" />

      {/* Book Demo Modal */}
      <BookDemoModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />
    </div>
  );
}
