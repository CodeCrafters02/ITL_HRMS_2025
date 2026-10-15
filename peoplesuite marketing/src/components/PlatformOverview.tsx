import React from "react";
import Link from "next/link";

const products = [
  {
    name: "TalentFlow",
    tag: "AI-Powered Recruitment · Modern ATS",
    href: "/talentflow",
    pageHref: "/talentflow",
    cta: "Explore TalentFlow ATS",
    icon: "person_search",
    desc: "Next-generation recruitment platform for agency recruiters and talent acquisition teams to source, evaluate, and deliver top talent.",
    highlights: [
      ["extension", "1-Click Naukri Sourcing with Chrome Companion"],
      ["content_copy", "3-Tier Deduplication (30%–40% Credit Savings)"],
      ["query_stats", "AI Match & Skill Gap Scoring (0–100%)"],
      ["picture_as_pdf", "Instant Playwright PDF Dossiers (Contact Masked)"],
      ["forum", "Tokenized Client Portal with 1-Click Decisions"],
    ],
  },
  {
    name: "PeopleSuite",
    tag: "Enterprise Workforce · Statutory HRMS",
    href: "/peoplesuite#modules",
    pageHref: "/peoplesuite#modules",
    cta: "Explore PeopleSuite HRMS",
    icon: "groups",
    desc: "Comprehensive cloud HRMS engineered for Indian workforce operations, geofenced attendance, automated statutory payroll, and desk booking.",
    highlights: [
      ["badge", "Core HR Directory & Organization Vault"],
      ["pin_drop", "GPS Geofenced Mobile Attendance & Shift Rules"],
      ["account_balance_wallet", "Indian Statutory Payroll (EPF, ESIC, PT, TDS)"],
      ["meeting_room", "2D Interactive Floorplan & Hot Desk Booking"],
      ["track_changes", "360° PMS Appraisals & Performance Matrices"],
    ],
  },
];

export default function PlatformOverview() {
  return (
    <section id="platform" className="scroll-mt-24 bg-white py-20 border-b border-[#DCE4F5]/60">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="max-w-3xl mb-12">
          <p className="text-xs font-semibold text-[#0B5BD3] uppercase tracking-wider mb-2">
            Enterprise Solutions by Innovyx Tech Labs
          </p>
          <h2 className="font-display text-3xl lg:text-4xl tracking-tight text-[#0B0F2E]">
            Modern software for recruitment and workforce management.
          </h2>
          <p className="mt-3 text-[#5B6488] leading-relaxed">
            Discover <strong>TalentFlow</strong> for intelligent candidate sourcing and applicant tracking, and <strong>PeopleSuite</strong> for enterprise employee operations and payroll.
          </p>
        </div>

        {/* Two Separate Platform Cards Side-by-Side */}
        <div className="grid md:grid-cols-2 gap-8 items-stretch">
          {products.map((p) => (
            <div
              key={p.name}
              className="bg-[#141834] text-[#E8ECFF] border border-[#232A4E] rounded-3xl p-6 sm:p-8 hover:border-[#7DC8FF] hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(74,108,255,0.35)] transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3.5">
                  <span className="w-12 h-12 rounded-2xl bg-[#0F1226] border border-[#232A4E] flex items-center justify-center text-[#7DC8FF]">
                    <span className="material-symbols-outlined text-[28px]">{p.icon}</span>
                  </span>
                  <div>
                    <h3 className="font-bold text-2xl text-white tracking-tight">{p.name}</h3>
                    <p className="text-xs text-[#7DC8FF] font-medium">{p.tag}</p>
                  </div>
                </div>

                <p className="mt-4 text-xs text-[#9AA3D1] leading-relaxed">
                  {p.desc}
                </p>

                <ul className="mt-6 space-y-3.5 border-t border-[#232A4E] pt-5">
                  {p.highlights.map(([icon, text]) => (
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
                    className="px-3.5 py-3 rounded-xl border border-[#232A4E] hover:border-[#7DC8FF] text-white text-xs font-semibold transition-colors flex items-center justify-center"
                    title="Open Dedicated Page"
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
