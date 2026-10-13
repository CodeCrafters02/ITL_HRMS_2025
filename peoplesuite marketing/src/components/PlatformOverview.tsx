import React from "react";
import Link from "next/link";

const products = [
  {
    name: "TalentFlow",
    tag: "Recruitment Automation · Modern ATS",
    href: "/#talentflow",
    pageHref: "/talentflow",
    cta: "Explore TalentFlow",
    icon: "person_search",
    steps: [
      ["extension", "1-Click Naukri Sourcing with Chrome Companion"],
      ["content_copy", "3-Tier Deduplication (30%–40% Credit Savings)"],
      ["query_stats", "AI Match & Skill Gap Scoring (0–100%)"],
      ["picture_as_pdf", "Instant Playwright PDF Dossiers (Contact Masked)"],
      ["forum", "Tokenized Client Portal with 1-Click Decisions"],
    ],
  },
  {
    name: "PeopleSuite",
    tag: "Enterprise Workforce · Statutory Operations",
    href: "/#pillars",
    pageHref: "/#pillars",
    cta: "Explore PeopleSuite",
    icon: "groups",
    steps: [
      ["badge", "Core HR Directory & Organization Vault"],
      ["pin_drop", "GPS Geofenced Mobile Attendance & Shift Rules"],
      ["account_balance_wallet", "Indian Statutory Payroll (EPF, ESIC, PT, TDS)"],
      ["meeting_room", "2D Interactive Floorplan & Hot Desk Booking"],
      ["track_changes", "360° PMS Appraisals & Corporate LMS"],
    ],
  },
];

export default function PlatformOverview() {
  return (
    <section id="platform" className="bg-white py-20 border-b border-[#DCE4F5]/60">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="max-w-2xl mb-12">
          <p className="text-xs font-semibold text-[#0B5BD3] uppercase tracking-wider mb-2">
            One Unified Platform, Two Powerful Engines
          </p>
          <h2 className="font-display text-3xl lg:text-4xl tracking-tight text-[#0B0F2E]">
            From first candidate sourced to every day of work.
          </h2>
          <p className="mt-3 text-[#5B6488] leading-relaxed">
            TalentFlow finds, screens, and delivers the hire. PeopleSuite onboards, equips, manages, and pays them. One connected data pipeline with zero manual handoffs.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-6 items-stretch">
          {products.map((p, idx) => (
            <div key={p.name} className="contents">
              <div className="bg-[#141834] text-[#E8ECFF] border border-[#232A4E] rounded-3xl p-6 sm:p-8 hover:border-[#7DC8FF] hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-10px_rgba(74,108,255,0.4)] transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3.5">
                    <span className="w-12 h-12 rounded-2xl bg-[#0F1226] border border-[#232A4E] flex items-center justify-center text-[#7DC8FF]">
                      <span className="material-symbols-outlined text-[28px]">{p.icon}</span>
                    </span>
                    <div>
                      <h3 className="font-bold text-xl text-white">{p.name}</h3>
                      <p className="text-xs text-[#7DC8FF]">{p.tag}</p>
                    </div>
                  </div>

                  <ul className="mt-6 space-y-3.5 flex-1">
                    {p.steps.map(([icon, text]) => (
                      <li key={text} className="flex items-center gap-3 text-xs sm:text-sm text-[#C5D0F5]">
                        <span className="material-symbols-outlined text-[18px] text-[#7DC8FF] shrink-0">
                          {icon}
                        </span>
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-[#232A4E] flex items-center gap-3">
                  <Link
                    href={p.href}
                    className="flex-1 text-center py-3 rounded-xl bg-white hover:bg-[#EAF0FF] text-[#141834] font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                  >
                    {p.cta}
                  </Link>
                  {p.pageHref !== p.href && (
                    <Link
                      href={p.pageHref}
                      className="px-3.5 py-3 rounded-xl border border-[#232A4E] hover:border-[#7DC8FF] text-white text-xs font-semibold transition-colors"
                      title="Open Dedicated Page"
                    >
                      <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                    </Link>
                  )}
                </div>
              </div>

              {idx === 0 && (
                <div className="flex lg:flex-col items-center justify-center gap-2 py-4 lg:py-0">
                  <div className="flex items-center lg:flex-col gap-2 bg-[#F5F8FF] border border-[#DCE4F5] px-4 py-3 rounded-2xl">
                    <span className="material-symbols-outlined text-[24px] text-[#0B5BD3] rotate-90 lg:rotate-0">
                      arrow_forward
                    </span>
                    <span className="text-[11px] font-bold text-center max-w-[110px] text-[#0B0F2E] leading-tight">
                      Offer Accepted ➔ DPDP Pre-Onboarding ➔ Core HR
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
