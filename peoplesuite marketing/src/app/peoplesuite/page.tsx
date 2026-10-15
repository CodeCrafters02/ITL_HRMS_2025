"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookDemoModal from "@/components/BookDemoModal";
import FaqAccordion from "@/components/FaqAccordion";
import { ProductMedia } from "@/components/home/HomeSections";
import RoiCalculator from "@/components/RoiCalculator";
import { AudienceGrid, ComparisonTable, CrossSell, RolloutSteps, TrustBar, ValueStrip } from "@/components/ProductMarketing";
import { hrmsModules, hrmsStories } from "@/data/peoplesuite";

export default function PeopleSuitePage() {
  const [demo, setDemo] = useState(false);
  const openDemo = () => setDemo(true);

  return (
    <div className="min-h-screen bg-white text-[#0B0F2E] flex flex-col">
      <Navbar onOpenDemo={openDemo} />
      <main className="w-full pt-[76px]">
        <section className="relative overflow-hidden bg-white border-b border-[#DCE4F5]/60">
          <div aria-hidden className="pointer-events-none absolute -right-24 top-0 h-80 w-[34rem] rounded-full bg-[#4A6CFF]/15 blur-3xl" />
          <div className="relative mx-auto max-w-3xl px-6 py-14 text-center space-y-5 lg:py-20">
            <div className="text-xs font-semibold text-[#0B5BD3] uppercase tracking-wider">PeopleSuite &bull; Workforce Management</div>
            <h1 className="font-display text-4xl sm:text-5xl tracking-tight">
              Run workforce operations{" "}
              <span className="bg-gradient-to-r from-[#1E1AB8] to-[#4A6CFF] bg-clip-text text-transparent">with precision.</span>
            </h1>
            <p className="text-[#5B6488] leading-relaxed">
              Geofenced attendance, Indian statutory payroll, 2D hot desking, IT assets, performance and LMS &mdash; one connected engine for the full employee lifecycle.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={openDemo}
                className="px-6 py-3 rounded-full bg-[#141834] hover:bg-[#232A4E] border border-[#4A6CFF]/40 text-white font-semibold shadow-md transition-all cursor-pointer"
              >
                Book a PeopleSuite Walkthrough
              </button>
              <a href="#modules" className="px-6 py-3 rounded-full border border-[#C9D3EE] hover:border-[#0B5BD3] font-semibold transition-all">
                See all modules
              </a>
            </div>
          </div>
        </section>

        <ValueStrip product="hrms" />

        <ProductMedia product="hrms" onDemo={openDemo} />

        <section id="modules" className="scroll-mt-20 bg-[#F5F8FF] py-20 border-y border-[#DCE4F5]">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="max-w-2xl mb-12">
              <div className="text-xs font-semibold text-[#0B5BD3] uppercase tracking-wider mb-2">Workforce Management Suite</div>
              <h2 className="font-display text-3xl lg:text-4xl tracking-tight">Twelve core modules. One connected engine.</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {hrmsModules.map((m) => (
                <div key={m.title} className="bg-white border border-[#DCE4F5] rounded-2xl p-6 hover:-translate-y-1 hover:shadow-md transition-all">
                  <div className="w-10 h-10 rounded-xl bg-[#EAF0FF] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px] text-[#1E1AB8]">{m.icon}</span>
                  </div>
                  <h3 className="mt-4 font-semibold">{m.title}</h3>
                  <p className="mt-1 text-xs text-[#5B6488] leading-relaxed">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <AudienceGrid product="hrms" />

        <section className="max-w-7xl mx-auto px-6 lg:px-12 py-20 space-y-24">
          {hrmsStories.map((s) => (
            <div key={s.id} id={s.id} className="scroll-mt-28 grid lg:grid-cols-2 gap-12 items-center">
              <div className={s.flip ? "lg:order-2 space-y-4" : "space-y-4"}>
                <div className="text-xs font-semibold text-[#0B5BD3] uppercase tracking-wider">{s.tag}</div>
                <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight">{s.title}</h2>
                <p className="text-sm text-[#5B6488] leading-relaxed">{s.subtitle}</p>
                <ul className="space-y-3 pt-2">
                  {s.points.map((pt) => (
                    <li key={pt} className="flex gap-3 text-sm text-[#5B6488]">
                      <span className="material-symbols-outlined text-[20px] text-[#0B5BD3] shrink-0 mt-0.5">check_circle</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`bg-[#F5F8FF] border border-[#DCE4F5] rounded-3xl p-6 sm:p-8 ${s.flip ? "lg:order-1" : ""}`}>
                <div className="bg-[#141834] border border-[#232A4E] rounded-2xl text-[#E8ECFF] p-6 max-w-md mx-auto shadow-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-[#232A4E]">
                    <span className="text-xs font-semibold text-[#9AA3D1]">{s.cardTitle}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#0B5BD3]/25 text-[#7DC8FF] border border-[#4A6CFF]/30">{s.statusPill}</span>
                  </div>
                  <dl className="mt-4 divide-y divide-[#232A4E]/60">
                    {s.rows.map(([k, v]) => (
                      <div key={k} className="flex justify-between py-2.5 text-xs sm:text-sm">
                        <dt className="text-[#9AA3D1]">{k}</dt>
                        <dd className="font-semibold">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </div>
          ))}
        </section>

        <ComparisonTable product="hrms" />

        <section id="roi" className="scroll-mt-24 bg-white py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <RoiCalculator onOpenDemo={openDemo} />
          </div>
        </section>

        <RolloutSteps product="hrms" onDemo={openDemo} />

        <TrustBar product="hrms" />

        <section id="faq" className="scroll-mt-20 bg-[#F5F8FF] border-y border-[#DCE4F5] py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <h2 className="font-display text-3xl lg:text-4xl tracking-tight text-center mb-10">Frequently asked questions</h2>
            <FaqAccordion />
          </div>
        </section>

        <CrossSell product="hrms" />

        <section className="bg-[#141834] text-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h2 className="font-display text-3xl tracking-tight max-w-xl">See PeopleSuite on your own workforce data.</h2>
            <button
              type="button"
              onClick={openDemo}
              className="px-6 py-3.5 rounded-full bg-white text-[#141834] font-semibold hover:bg-[#EAF0FF] transition-all cursor-pointer"
            >
              Book a Demo
            </button>
          </div>
        </section>
      </main>
      <Footer theme="dark" onOpenDemo={openDemo} />
      <BookDemoModal isOpen={demo} onClose={() => setDemo(false)} defaultPlatform="peoplesuite" />
    </div>
  );
}
