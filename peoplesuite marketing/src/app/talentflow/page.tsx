"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PlatformOverview from "@/components/PlatformOverview";
import BookDemoModal from "@/components/BookDemoModal";
import { ProductMedia } from "@/components/home/HomeSections";

const beforeList = [
  "Sourcing credits wasted on candidates already in your database.",
  "Hours spent reformatting resumes into agency Word templates.",
  "Lost submissions trapped in client inbox clutter and email chains.",
  "Zero visibility into recruiter team activity or candidate drop-off.",
  "Manual redacting of candidate phone numbers and email addresses.",
  "Chasing joining proofs via WhatsApp and unencrypted email threads.",
];

const afterList = [
  ["Intelligent 3-Tier Deduplication", "Never re-purchase an existing candidate—saves 30%–40% on portal subscriptions."],
  ["Instant Playwright PDF Dossiers", "Render branded, standardized CVs with contact privacy masking in under 2 minutes."],
  ["Tokenized Client Approval Links", "Clients review match scores and accept candidates in seconds with zero login friction."],
  ["Hierarchical Quality Gates", "Enforce Recruiter ➔ Team Lead ➔ Delivery Manager sign-offs before client release."],
  ["Full Team Governance & Quotas", "Manage recruiter portal credit allocations and real-time candidate Kanban pipelines."],
  ["Stateless DPDP-Compliant Onboarding", "Structured 11-point document checklist transitions seamlessly to PeopleSuite."],
];

const features = [
  {
    icon: "extension",
    title: "1-Click Sourcing Gateway",
    badge: "Manifest V3 Chrome Companion",
    desc: "From job board to ATS in seconds. Seamlessly detects candidate profiles on Naukri Resdex, running real-time deduplication and ingesting rich candidate profiles with one click.",
  },
  {
    icon: "query_stats",
    title: "AI Match & Gap Analysis",
    badge: "0–100% Multivariate Scoring",
    desc: "Know candidate-JD fit before submitting. Objective match scoring across skills, experience, and education. Identify competency strengths and critical skill gaps before the interview.",
  },
  {
    icon: "picture_as_pdf",
    title: "Instant Branded CV Generation",
    badge: "Playwright Headless Chromium",
    desc: "Pixel-perfect client dossiers without the hassle. Transform raw candidate data into agency-branded, redacted PDF resumes formatted specifically for client presentations.",
  },
  {
    icon: "forum",
    title: "Frictionless Client Feedback Portal",
    badge: "Zero Password Barrier",
    desc: "Ditch the endless email threads. Give hiring managers private, password-free review links where they can view scores, inspect dossiers, and approve or reject candidates with one tap.",
  },
  {
    icon: "account_tree",
    title: "Role Hierarchy & Approval Gates",
    badge: "Quality Governance",
    desc: "Protect candidate quality at scale. Built-in quality checkpoints allow Team Leads and Delivery Managers to review and approve candidate pools before they reach clients.",
  },
  {
    icon: "verified_user",
    title: "DPDP-Compliant Pre-Onboarding",
    badge: "11-Point Verification",
    desc: "From offer to day-one joining without the paperwork. Automated document collection checklists for PAN, Aadhaar, salary slips, and credentials with clear verification workflows.",
  },
];

const steps = [
  {
    step: "1",
    title: "Source & Sync",
    desc: "Find candidates on Naukri Resdex and sync them instantly via the TalentFlow Companion with zero manual data entry and real-time dedup.",
  },
  {
    step: "2",
    title: "AI Scoring & Screening",
    desc: "Evaluate alignment against job descriptions with AI fit scores (0–100%), skill gap analysis, and structured recruiter scorecards.",
  },
  {
    step: "3",
    title: "Internal Quality Sign-off",
    desc: "Team Leads and Delivery Managers review and approve candidate submissions through dedicated governance dashboards.",
  },
  {
    step: "4",
    title: "Client Review & Onboarding",
    desc: "Clients click their personalized review link to approve candidates, triggering automated 11-point document collection for PeopleSuite.",
  },
];

const roles = [
  {
    role: "Recruiters",
    tagline: "More interviews, zero manual data entry",
    text: "Spend your day interviewing top talent, not copying resume text into spreadsheets or manually creating PDF templates.",
  },
  {
    role: "Team Leads & Delivery Managers",
    tagline: "Total pipeline visibility & quality control",
    text: "Get complete pipeline visibility, prevent credit leakage, and ensure zero unvetted candidates ever reach your clients.",
  },
  {
    role: "Agency Founders & Directors",
    tagline: "Scale placements by 3x with lower portal spend",
    text: "Scale your team's placement capacity by 3x while cutting sourcing overhead and safeguarding client data integrity.",
  },
  {
    role: "Client Hiring Managers",
    tagline: "Password-free reviews with clear match scores",
    text: "Review candidate submissions with transparent match scores and clean dossiers directly from your mobile or desktop browser.",
  },
];

const metrics = [
  { stat: "75%", label: "Shorter Sourcing Cycle", desc: "From 3–4 hours down to under 10 minutes per candidate." },
  { stat: "30%–40%", label: "Savings on Portal Spend", desc: "Intelligent 3-tier deduplication prevents duplicate CV purchases." },
  { stat: "3x", label: "Faster Client Decisions", desc: "Interactive approval links cut client evaluation latency from 4 days to hours." },
  { stat: "100%", label: "DPDP & Audit Compliance", desc: "Automated activity logs and structured pre-onboarding eliminate liabilities." },
];

const faqs = [
  {
    q: "How does TalentFlow prevent duplicate credit usage on job portals?",
    a: "TalentFlow's browser companion runs automated 3-tier deduplication against your database (by Email as Primary, Phone as Secondary, and Name + Company as Tertiary) before you trigger an import, alerting you if the candidate already exists.",
  },
  {
    q: "Do client hiring managers need to create an account to review candidates?",
    a: "No. Clients receive a secure, tokenized web link allowing them to review candidate summaries, match breakdowns, and formatted CVs with instant Accept/Reject actions without password friction.",
  },
  {
    q: "Can we customize resume branding and field privacy?",
    a: "Yes. TalentFlow's Playwright PDF engine automatically injects your agency branding and redacts candidate contact information to safeguard business interests.",
  },
  {
    q: "Is candidate data secure and compliant?",
    a: "Absolutely. TalentFlow includes full immutable audit logging, role-based access control, and a dedicated DPDP-compliant onboarding workflow.",
  },
];

export default function TalentFlowPage() {
  const [demo, setDemo] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const openDemo = () => setDemo(true);

  return (
    <div className="min-h-screen bg-white text-[#0B0F2E] flex flex-col selection:bg-[#EAF0FF] selection:text-[#0B5BD3]">
      <Navbar onOpenDemo={openDemo} />

      <main className="w-full pt-[76px]">
        {/* ============================================================== */}
        {/* 1. HERO SECTION                                                */}
        {/* ============================================================== */}
        <section className="bg-white border-b border-[#DCE4F5]/60 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="font-display text-3xl sm:text-4xl lg:text-[40px] leading-[1.12] tracking-tight text-[#0B0F2E]">
                Stop sourcing in silos.
                <br />
                <span className="text-shimmer">Start closing hires at scale.</span>
              </h1>

              <p className="text-lg text-[#5B6488] max-w-xl leading-relaxed">
                TalentFlow bridges the gap between sourcing portals, recruiter pipelines, and client hiring managers with automated candidate ingestion, AI-powered match scoring, and self-serve client approval portals.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={openDemo}
                  className="px-6 py-3 rounded-full bg-[#141834] hover:bg-[#232A4E] hover:border-[#7DC8FF] hover:shadow-[0_6px_20px_rgba(20,24,52,0.35)] text-white border border-[#4A6CFF]/40 font-semibold transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <span>Book a Product Demo</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
                <a
                  href="#how"
                  className="px-6 py-3 rounded-full border border-[#C9D3EE] hover:border-[#0B5BD3] text-[#0B0F2E] font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>See 2-Minute Workflow Demo</span>
                  <span className="material-symbols-outlined text-[18px]">play_circle</span>
                </a>
              </div>

              <div className="pt-2 flex items-center gap-4 text-xs text-[#5B6488]">
                <span>Category: Recruitment Automation Platform / Modern ATS</span>
                <span>•</span>
                <span>For Agencies, Staffing Firms & Enterprise TA</span>
              </div>
            </div>

            {/* Interactive Candidate Dossier Card */}
            <div>
              <div className="bg-[#141834] text-[#E8ECFF] border border-[#232A4E] rounded-2xl p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#232A4E]">
                  <div>
                    <span className="text-xs font-semibold text-[#9AA3D1]">Candidate Dossier</span>
                    <h3 className="font-bold text-base text-white">Siddharth Verma</h3>
                    <p className="text-xs text-[#7DC8FF]">Lead Backend Engineer • 7.5 Yrs Exp</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#86EFAC]/20 text-[#86EFAC] border border-[#86EFAC]/30">
                      89% AI Fit
                    </span>
                  </div>
                </div>

                <dl className="divide-y divide-[#232A4E] text-xs sm:text-sm">
                  {[
                    ["Sourcing Channel", "Naukri Resdex (1-Click Sync)"],
                    ["3-Tier Deduplication", "Passed (0 Duplicate Credits Used)"],
                    ["Playwright Dossier", "Generated (Contact Masked)"],
                    ["TL / DM Sign-off", "Approved by Team Lead"],
                    ["Client Review Portal", "Token Link Delivered (Pending Decision)"],
                    ["DPDP Pre-Onboarding", "11/11 Verification Checklist Active"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-2.5">
                      <dt className="text-[#9AA3D1]">{k}</dt>
                      <dd className="font-semibold text-[#E8ECFF]">{v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="pt-2 flex gap-2">
                  <span className="flex-1 text-center py-2 rounded-lg bg-[#86EFAC]/20 text-[#86EFAC] font-bold text-xs border border-[#86EFAC]/30">
                    Accept Candidate
                  </span>
                  <span className="flex-1 text-center py-2 rounded-lg bg-[#7DC8FF]/20 text-[#7DC8FF] font-bold text-xs border border-[#7DC8FF]/30">
                    Request Interview
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 2. BEFORE VS. AFTER TALENTFLOW                                 */}
        {/* ============================================================== */}
        <ProductMedia product="ats" onDemo={openDemo} />

        <section className="bg-[#F5F8FF] py-20 border-b border-[#DCE4F5]">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="max-w-2xl mb-12">
              <p className="text-xs font-semibold text-[#0B5BD3] uppercase tracking-wider mb-2">
                Before vs. After TalentFlow
              </p>
              <h2 className="font-display text-3xl lg:text-4xl tracking-tight text-[#0B0F2E]">
                Recruitment, without the operational bottlenecks.
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Before Column */}
              <div className="bg-white border border-[#DCE4F5] rounded-3xl p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-2 text-red-600 font-bold text-base pb-3 border-b border-[#DCE4F5]">
                  <span className="material-symbols-outlined text-[22px]">cancel</span>
                  <span>Before TalentFlow</span>
                </div>
                <ul className="space-y-4">
                  {beforeList.map((t) => (
                    <li key={t} className="flex items-start gap-3 text-sm text-[#5B6488]">
                      <span className="material-symbols-outlined text-[18px] text-red-500 shrink-0 mt-0.5">
                        close
                      </span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* After Column */}
              <div className="bg-[#141834] text-[#E8ECFF] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl border border-[#232A4E]">
                <div className="flex items-center gap-2 text-[#7DC8FF] font-bold text-base pb-3 border-b border-[#232A4E]">
                  <span className="material-symbols-outlined text-[22px]">check_circle</span>
                  <span>With TalentFlow Automated Solution</span>
                </div>
                <ul className="space-y-4">
                  {afterList.map(([t, d]) => (
                    <li key={t} className="flex items-start gap-3 text-sm text-[#9AA3D1]">
                      <span className="material-symbols-outlined text-[18px] text-[#86EFAC] shrink-0 mt-0.5">
                        check
                      </span>
                      <div>
                        <strong className="text-white block">{t}</strong>
                        <span className="text-xs text-[#C5D0F5]">{d}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 3. CORE FEATURE GRID                                           */}
        {/* ============================================================== */}
        <section id="features" className="bg-white py-20 border-b border-[#DCE4F5]/60">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="max-w-2xl mb-12">
              <p className="text-xs font-semibold text-[#0B5BD3] uppercase tracking-wider mb-2">
                Core Feature Breakdown
              </p>
              <h2 className="font-display text-3xl lg:text-4xl tracking-tight text-[#0B0F2E]">
                Built for high-volume staffing and corporate TA.
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="bg-[#141834] text-[#E8ECFF] border border-[#232A4E] rounded-2xl p-6 hover:border-[#7DC8FF] hover:-translate-y-1.5 hover:shadow-[0_16px_36px_-10px_rgba(74,108,255,0.4)] transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <span className="material-symbols-outlined text-[30px] text-[#7DC8FF]">{f.icon}</span>
                    <span className="block mt-3 text-[10px] font-bold text-[#7DC8FF] uppercase tracking-wider">
                      {f.badge}
                    </span>
                    <h3 className="mt-1 font-semibold text-lg text-white">{f.title}</h3>
                    <p className="mt-2 text-xs text-[#9AA3D1] leading-relaxed">{f.desc}</p>
                  </div>
                  <div className="mt-6 pt-3 border-t border-[#232A4E] text-[11px] text-[#7DC8FF] flex items-center justify-between">
                    <span>Active Gateway</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 4. HOW IT WORKS (4-STEP JOURNEY)                               */}
        {/* ============================================================== */}
        <section id="how" className="bg-[#F5F8FF] py-20 border-b border-[#DCE4F5]">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="max-w-2xl mb-12">
              <p className="text-xs font-semibold text-[#0B5BD3] uppercase tracking-wider mb-2">
                How It Works
              </p>
              <h2 className="font-display text-3xl lg:text-4xl tracking-tight text-[#0B0F2E]">
                Four steps from portal sourcing to client offer.
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {steps.map((st) => (
                <div
                  key={st.step}
                  className="bg-[#141834] text-[#E8ECFF] border border-[#232A4E] rounded-2xl p-6 flex flex-col justify-between shadow-md"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#1E1AB8] text-white flex items-center justify-center font-bold text-sm">
                      {st.step}
                    </div>
                    <h3 className="mt-4 font-semibold text-lg text-white">{st.title}</h3>
                    <p className="mt-2 text-xs text-[#9AA3D1] leading-relaxed">{st.desc}</p>
                  </div>
                  <div className="mt-6 pt-3 border-t border-[#232A4E] text-[11px] text-[#7DC8FF]">
                    Step {st.step} Complete ✓
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 5. ROLE-SPECIFIC VALUE PROPOSITIONS                            */}
        {/* ============================================================== */}
        <section className="bg-white py-20 border-b border-[#DCE4F5]/60">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="max-w-2xl mb-12">
              <p className="text-xs font-semibold text-[#0B5BD3] uppercase tracking-wider mb-2">
                Role-Specific Value Propositions
              </p>
              <h2 className="font-display text-3xl lg:text-4xl tracking-tight text-[#0B0F2E]">
                Tailored for every member of the hiring chain.
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {roles.map((r) => (
                <div
                  key={r.role}
                  className="bg-[#141834] text-[#E8ECFF] border border-[#232A4E] rounded-2xl p-6 sm:p-8 space-y-3 shadow-md"
                >
                  <div className="text-xs font-bold text-[#7DC8FF] uppercase tracking-wider">
                    {r.tagline}
                  </div>
                  <h3 className="font-semibold text-xl text-white">For {r.role}</h3>
                  <p className="text-sm text-[#C5D0F5] leading-relaxed italic border-l-2 border-[#4A6CFF] pl-3 py-1">
                    "{r.text}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 6. MEASURABLE BUSINESS EFFICIENCY & ROI METRICS                */}
        {/* ============================================================== */}
        <section className="bg-[#F5F8FF] py-20 border-b border-[#DCE4F5]">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="max-w-2xl text-center mx-auto mb-12">
              <p className="text-xs font-semibold text-[#0B5BD3] uppercase tracking-wider mb-2">
                Business ROI & Impact
              </p>
              <h2 className="font-display text-3xl lg:text-4xl tracking-tight text-[#0B0F2E]">
                Measurable efficiency gains across the board.
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {metrics.map((m) => (
                <div
                  key={m.label}
                  className="bg-[#141834] text-[#E8ECFF] border border-[#232A4E] rounded-2xl p-6 shadow-sm"
                >
                  <div className="font-display text-4xl text-[#7DC8FF] font-bold">{m.stat}</div>
                  <h3 className="mt-3 font-semibold text-base text-white">{m.label}</h3>
                  <p className="mt-1 text-xs text-[#9AA3D1] leading-relaxed">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* 7. TALENTFLOW SPECIFIC FAQS                                    */}
        {/* ============================================================== */}
        <section id="faq" className="bg-white py-20 border-b border-[#DCE4F5]/60">
          <div className="max-w-4xl mx-auto px-6 lg:px-12">
            <div className="text-center mb-10">
              <p className="text-xs font-semibold text-[#0B5BD3] uppercase tracking-wider mb-2">
                Frequently Asked Questions
              </p>
              <h2 className="font-display text-3xl lg:text-4xl tracking-tight text-[#0B0F2E]">
                Clear answers on architecture & compliance.
              </h2>
            </div>

            <div className="space-y-3.5">
              {faqs.map((f, i) => (
                <div
                  key={f.q}
                  className="rounded-2xl border bg-[#141834] border-[#232A4E] hover:border-[#4A6CFF]/40 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between text-left p-5 sm:p-6 gap-4 cursor-pointer"
                  >
                    <span className="text-base font-semibold text-[#E8ECFF]">{f.q}</span>
                    <span
                      className={`material-symbols-outlined text-[#9AA3D1] transition-transform ${
                        openFaq === i ? "rotate-180 text-[#7DC8FF]" : ""
                      }`}
                    >
                      expand_more
                    </span>
                  </button>
                  {openFaq === i && (
                    <div className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm text-[#9AA3D1] border-t border-[#232A4E] leading-relaxed">
                      {f.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Unified Bridge to PeopleSuite */}
        <PlatformOverview />

        {/* Closing Action Banner */}
        <section className="bg-[#141834] text-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h2 className="font-display text-3xl lg:text-4xl tracking-tight">
                Close hires faster with TalentFlow.
              </h2>
              <p className="mt-2 text-white/70 text-sm">
                Engineered by Innovyx Tech Labs LLP. See the full sourcing-to-offer workflow in a short walkthrough.
              </p>
            </div>
            <button
              type="button"
              onClick={openDemo}
              className="px-6 py-3.5 rounded-xl bg-white text-[#141834] font-semibold hover:bg-[#EAF0FF] transition-colors cursor-pointer shadow-md"
            >
              Book a Product Demo
            </button>
          </div>
        </section>
      </main>

      <Footer theme="light" onOpenDemo={openDemo} />
      <BookDemoModal isOpen={demo} onClose={() => setDemo(false)} defaultPlatform="talentflow" />
    </div>
  );
}
