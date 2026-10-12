"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookDemoModal from "@/components/BookDemoModal";

const modules = [
  { icon: "badge", title: "Core HR", desc: "Profiles, documents and org chart in one place." },
  { icon: "pin_drop", title: "Attendance", desc: "Geofenced check-ins and shift rosters." },
  { icon: "date_range", title: "Leave", desc: "Policies, approvals and a shared team calendar." },
  { icon: "account_balance_wallet", title: "Payroll", desc: "One-click runs, payslips and statutory filings." },
  { icon: "person_search", title: "Hiring", desc: "Job posts, candidates and offer letters." },
  { icon: "assignment_turned_in", title: "Onboarding", desc: "Paperless joining with simple checklists." },
  { icon: "track_changes", title: "Performance", desc: "Goals, reviews and ongoing feedback." },
  { icon: "phone_iphone", title: "Mobile app", desc: "Everything employees need, in their pocket." },
];

const stories = [
  {
    id: "payroll",
    tag: "Payroll",
    title: "Payday without the panic.",
    points: ["Salary, bonuses and deductions calculated for you", "Payslips delivered straight to employees", "Statutory reports ready when you need them"],
    rows: [["Gross pay", "₹ 48,20,000"], ["Deductions", "₹ 6,10,500"], ["Net payable", "₹ 42,09,500"]],
    cardTitle: "March payroll",
  },
  {
    id: "attendance",
    tag: "Attendance",
    title: "Know who's in, wherever they are.",
    points: ["Check in from office, field or home", "Geofences and shifts that match your sites", "Late marks and overtime flow into payroll"],
    rows: [["Present today", "212"], ["On leave", "9"], ["Late arrivals", "6"]],
    cardTitle: "Today",
    flip: true,
  },
  {
    id: "mobile",
    tag: "Mobile",
    title: "HR that fits in a pocket.",
    points: ["Apply for leave in two taps", "Download payslips and tax documents", "Get approvals and alerts instantly"],
    rows: [["Leave balance", "14 days"], ["Next payday", "30 Mar"], ["Pending approvals", "3"]],
    cardTitle: "My space",
  },
];

export default function HomePage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const openDemo = () => setIsDemoModalOpen(true);

  return (
    <div className="min-h-screen bg-white text-[#0B0F2E] flex flex-col selection:bg-[#EAF0FF] selection:text-[#0B5BD3]">
      <Navbar onOpenDemo={openDemo} />

      <main className="w-full pt-[72px]">
        <section id="hero" className="bg-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <p className="text-sm font-semibold text-[#0B5BD3]">HR software, made human</p>
              <h1 className="font-display text-5xl lg:text-6xl leading-[1.05] tracking-tight text-[#0B0F2E]">
                <span className="relative inline-block">
                  People first.
                  <svg viewBox="0 0 300 12" className="absolute left-0 -bottom-2 w-full" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M2 8c60-6 120-6 180-2s80 2 116-2" fill="none" stroke="#4A6CFF" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </span>
                <br />
                <span className="text-[#5B6488]">Paperwork last.</span>
              </h1>
              <p className="text-lg text-[#5B6488] max-w-md leading-relaxed">
                Attendance, leave, payroll and hiring in one simple suite, so your team can spend time on people, not spreadsheets.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={openDemo}
                  className="px-6 py-3 rounded-lg bg-[#0B5BD3] hover:bg-[#1E1AB8] text-white font-semibold transition-colors cursor-pointer"
                >
                  Book a demo
                </button>
                <Link
                  href="/pricing"
                  className="px-6 py-3 rounded-lg border border-[#DCE4F5] hover:border-[#0B5BD3] text-[#0B0F2E] font-semibold transition-colors"
                >
                  See pricing
                </Link>
              </div>
            </div>

            <div className="relative h-[360px] sm:h-[420px]">
              <div className="absolute inset-0 rounded-[2rem] bg-[#F5F8FF]" />
              <img src="/logo.png" alt="PeopleSuite" className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto w-3/4 max-w-[380px] mix-blend-multiply" />
              <div className="absolute top-6 right-6 bg-white border border-[#DCE4F5] rounded-xl px-4 py-2.5 text-sm shadow-sm">
                <span className="text-[#5B6488]">Leave</span> <span className="font-semibold">approved ✓</span>
              </div>
              <div className="absolute bottom-6 left-6 bg-white border border-[#DCE4F5] rounded-xl px-4 py-2.5 text-sm shadow-sm">
                <span className="text-[#5B6488]">Payroll</span> <span className="font-semibold">248 paid</span>
              </div>
            </div>
          </div>
        </section>

        <section id="pillars" className="bg-[#F5F8FF] py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="max-w-xl mb-12">
              <h2 className="font-display text-3xl lg:text-4xl tracking-tight">Everything your people team needs.</h2>
              <p className="mt-3 text-[#5B6488]">Eight modules, one login. Start with one and add the rest when you're ready.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {modules.map((m) => (
                <div key={m.title} className="bg-white border border-[#DCE4F5] rounded-2xl p-6 hover:border-[#0B5BD3] transition-colors">
                  <span className="material-symbols-outlined text-[28px] text-[#0B5BD3]">{m.icon}</span>
                  <h3 className="mt-4 font-semibold text-lg">{m.title}</h3>
                  <p className="mt-1 text-sm text-[#5B6488] leading-relaxed">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 space-y-24">
          {stories.map((s) => (
            <section key={s.id} id={s.id} className="grid lg:grid-cols-2 gap-12 items-center">
              <div className={s.flip ? "lg:order-2" : ""}>
                <p className="text-sm font-semibold text-[#0B5BD3]">{s.tag}</p>
                <h2 className="mt-2 font-display text-3xl lg:text-4xl tracking-tight">{s.title}</h2>
                <ul className="mt-6 space-y-3">
                  {s.points.map((p) => (
                    <li key={p} className="flex gap-3 text-[#5B6488]">
                      <span className="material-symbols-outlined text-[20px] text-[#0B5BD3]">check</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`bg-[#F5F8FF] rounded-[2rem] p-8 ${s.flip ? "lg:order-1" : ""}`}>
                <div className="bg-white border border-[#DCE4F5] rounded-2xl p-6 max-w-sm mx-auto">
                  <p className="text-sm font-semibold text-[#5B6488]">{s.cardTitle}</p>
                  <dl className="mt-4 divide-y divide-[#DCE4F5]">
                    {s.rows.map(([k, v]) => (
                      <div key={k} className="flex justify-between py-3 text-sm">
                        <dt className="text-[#5B6488]">{k}</dt>
                        <dd className="font-semibold">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </section>
          ))}
        </div>

        <section className="bg-[#121B33] text-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h2 className="font-display text-3xl lg:text-4xl tracking-tight">See PeopleSuite in 20 minutes.</h2>
              <p className="mt-2 text-white/70">A short walkthrough, tailored to your team.</p>
            </div>
            <button
              type="button"
              onClick={openDemo}
              className="px-6 py-3 rounded-lg bg-[#3B5BDB] text-white font-semibold hover:bg-[#4C6BE8] transition-colors cursor-pointer"
            >
              Book a demo
            </button>
          </div>
        </section>
      </main>

      <Footer theme="light" />
      <BookDemoModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />
    </div>
  );
}
