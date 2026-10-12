"use client";

import React, { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
  category?: string;
}

const faqData: FaqItem[] = [
  {
    question: "Can we switch plans or cancel at any time?",
    answer:
      "Yes. You can upgrade, downgrade, or cancel your subscription directly from your Account Settings. If you upgrade mid-cycle, your new features activate instantly with prorated billing. If you downgrade or cancel, your changes will take effect at the end of your current billing period without penalty.",
  },
  {
    question: "How does the 14-day free trial work?",
    answer:
      "Your 14-day trial gives you unrestricted access to all Growth tier features. No credit card is required to begin. You can invite team members, configure approval workflows, test sample payroll runs, and connect integrations. At any point, you can activate your chosen plan.",
  },
  {
    question: "Do you assist with historical employee data migration from our old HR system?",
    answer:
      "Absolutely. Every Growth customer receives guided onboarding with CSV/Excel bulk import mapping tools. For Enterprise teams, our dedicated Solution Architecture squad handles end-to-end data cleansing, past payroll balance reconciliations, and custom migration from systems like ADP, BambooHR, Workday, or spreadsheets.",
  },
  {
    question: "Are payroll tax filings included in the Growth plan?",
    answer:
      "Yes. Growth and Enterprise plans include automated federal, state, and local payroll tax calculations, quarterly filings, year-end Form W-2 and 1099 generation, as well as electronic distribution to employees without third-party fees.",
  },
  {
    question: "How does per-employee pricing adjust when headcounts change?",
    answer:
      "PeopleSuite calculates your active headcount on your monthly billing date. Only active employees on the roster incur the per-employee rate. Offboarded or archived employees do not count toward your active license total, while their records remain safely retained for regulatory compliance.",
  },
  {
    question: "What security certifications does PeopleSuite maintain?",
    answer:
      "We are SOC 2 Type II certified annually, ISO 27001 certified, and fully compliant with GDPR and CCPA. All data is encrypted in transit using TLS 1.3 and at rest with AES-256. For healthcare customers, we provide signed HIPAA Business Associate Agreements (BAA).",
  },
  {
    question: "Can PeopleSuite connect with our biometric fingerprint or face scanners?",
    answer:
      "Yes! Our Hardware Biometric Sync Gateway API provides direct, real-time webhooks connecting physical biometric hardware, RFID turnstiles, and facial recognition terminals directly into the PeopleSuite attendance engine.",
  },
  {
    question: "How does geofenced GPS clock-in protect employee privacy?",
    answer:
      "PeopleSuite only samples GPS coordinates at the exact instant an employee taps 'Clock In' or 'Clock Out'. We do not track, poll, or store location data at any other point during the day, fully complying with strict state and European worker privacy regulations.",
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-3.5 max-w-4xl mx-auto">
      {faqData.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
              isOpen
                ? "bg-white border-[#0B5BD3]/40 shadow-md ring-1 ring-[#0B5BD3]/20"
                : "bg-white border-[#DCE4F5] hover:border-[#4A6CFF]/40 shadow-xs"
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(index)}
              className="w-full flex items-center justify-between text-left p-5 sm:p-6 gap-4 cursor-pointer"
            >
              <span className="font-title-md text-title-md text-[#0B0F2E] font-semibold">
                {item.question}
              </span>
              <span
                className={`material-symbols-outlined text-[#5B6488] transition-transform duration-200 shrink-0 ${
                  isOpen ? "rotate-180 text-[#0B5BD3]" : ""
                }`}
              >
                expand_more
              </span>
            </button>

            {isOpen && (
              <div className="px-5 sm:px-6 pb-6 pt-1 font-body-md text-body-md text-[#5B6488] leading-relaxed border-t border-[#F5F8FF] animate-in fade-in duration-200">
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
