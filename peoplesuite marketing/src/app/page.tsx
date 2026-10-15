"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PlatformOverview from "@/components/PlatformOverview";
import BookDemoModal from "@/components/BookDemoModal";
import FaqAccordion from "@/components/FaqAccordion";
import { HeroDashboard, ProductExplorer, BenefitsRow, Reveal, WordReveal, ProductVideoSection, SecondaryShowcase, CtaBanner } from "@/components/home/HomeSections";
import type { ProductId } from "@/data/showcase";

export default function HomePage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoPlatform, setDemoPlatform] = useState<"talentflow" | "peoplesuite" | "both">("both");
  const [product, setProduct] = useState<ProductId>("hrms");

  const selectProduct = (p: ProductId) => {
    setProduct(p);
    setTimeout(() => document.getElementById("explorer")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    if (h === "hrms" || h === "ats") selectProduct(h);
  }, []);

  const openDemo = (platform: "talentflow" | "peoplesuite" | "both" = "both") => {
    setDemoPlatform(platform);
    setIsDemoModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white text-[#0B0F2E] flex flex-col selection:bg-[#EAF0FF] selection:text-[#0B5BD3]">
      <Navbar onOpenDemo={() => openDemo("both")} onSelectProduct={selectProduct} />

      <main className="w-full pt-[76px]">
        {/* ============================================================== */}
        {/* HERO SECTION: COMBINED PLATFORM POWER                         */}
        {/* ============================================================== */}
        <section id="hero" className="relative bg-white overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -right-24 top-0 h-80 w-[34rem] rounded-full bg-[#4A6CFF]/20 blur-3xl" />
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10 lg:py-14 grid lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <h1 className="font-display text-3xl sm:text-4xl lg:text-[36px] xl:text-[42px] leading-[1.12] tracking-tight text-[#0B0F2E]">
                <WordReveal text="People operations. Hiring." />
                <br />
                <span className="text-shimmer">Engineered for how India works.</span>
              </h1>

              <p className="text-base text-[#5B6488] max-w-lg leading-relaxed">
                From Innovyx Tech Labs: PeopleSuite HRMS to manage your workforce with geofenced attendance, Indian statutory payroll and 2D hot desking, and TalentFlow ATS to streamline recruitment with 1-click sourcing, AI fit scoring and tokenized client portals.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => document.getElementById("explorer")?.scrollIntoView({ behavior: "smooth" })}
                  className="px-6 py-3 rounded-full bg-[#141834] hover:bg-[#232A4E] hover:shadow-lg hover:shadow-[#4A6CFF]/30 text-white font-semibold transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <span>Explore the Platform</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById("video")?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  className="px-6 py-3 rounded-full border border-[#C9D3EE] bg-white/70 hover:border-[#0B5BD3] text-[#0B0F2E] font-semibold transition-all cursor-pointer flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px] text-[#1E1AB8]">play_circle</span>
                  <span>Watch Product Tour</span>
                </button>
              </div>

              {/* Verified Platform Badges */}
              <div className="pt-4 flex flex-wrap items-center gap-5 text-xs text-[#5B6488] font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#0B5BD3]">check_circle</span>
                  <span>1-Click Chrome Portal Sync</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#0B5BD3]">check_circle</span>
                  <span>3-Tier Deduplication</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#0B5BD3]">check_circle</span>
                  <span>Indian Statutory Compliant</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-[#0B5BD3]">check_circle</span>
                  <span>DPDP-Compliant Onboarding</span>
                </div>
              </div>
            </div>

            <HeroDashboard onPlay={(p) => { setProduct(p); document.getElementById("video")?.scrollIntoView({ behavior: "smooth", block: "center" }); }} />
          </div>
        </section>


        <Reveal><ProductExplorer product={product} onChange={setProduct} /></Reveal>
        <BenefitsRow />
        <Reveal><ProductVideoSection product={product} onDemo={() => openDemo("both")} /></Reveal>
        <Reveal><SecondaryShowcase product={product === "hrms" ? "ats" : "hrms"} onDemo={() => openDemo(product === "hrms" ? "talentflow" : "peoplesuite")} /></Reveal>
        <Reveal><PlatformOverview /></Reveal>

        {/* ============================================================== */}
        {/* TALENTFLOW: BEFORE VS. AFTER COMPARISON                        */}
        {/* ============================================================== */}
        <section id="faq" className="scroll-mt-20 bg-[#F5F8FF] border-t border-b border-[#DCE4F5] py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="max-w-2xl text-center mx-auto mb-12 space-y-3">
              <div className="text-xs font-semibold text-[#0B5BD3] uppercase tracking-wider">
                Platform FAQ
              </div>
              <h2 className="font-display text-3xl lg:text-4xl tracking-tight text-[#0B0F2E]">
                Answers based on our real architecture
              </h2>
              <p className="text-[#5B6488] text-sm leading-relaxed">
                Learn how TalentFlow deduplication, Chrome sourcing, DPDP compliance, GPS geofencing, statutory payroll, and 2D hot desking are built.
              </p>
            </div>

            <FaqAccordion />
          </div>
        </section>

        <Reveal><CtaBanner onDemo={() => openDemo("both")} /></Reveal>
      </main>

      <Footer theme="dark" onOpenDemo={() => openDemo("both")} />
      <BookDemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        defaultPlatform={demoPlatform}
      />
    </div>
  );
}
