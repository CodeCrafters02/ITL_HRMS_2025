"use client";

import React, { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
  category: "talentflow" | "payroll" | "attendance" | "security";
}

const faqData: FaqItem[] = [
  // TalentFlow RMS FAQs
  {
    category: "talentflow",
    question: "How does TalentFlow prevent duplicate credit usage on job portals like Naukri?",
    answer:
      "TalentFlow's browser companion extension runs an automated 3-tier deduplication check against your centralized candidate database (verifying Email as Primary, Phone as Secondary, and Name + Current Company as Tertiary) before triggering an import. If a profile already exists, recruiters receive an immediate visual alert and direct link to the existing profile, saving 30% to 40% on external portal credit spend.",
  },
  {
    category: "talentflow",
    question: "Do client hiring managers need to create an account or login to review candidates?",
    answer:
      "No. Hiring managers receive a secure, tokenized web link allowing frictionless, password-free access directly from desktop or mobile browsers. They can review candidate dossiers, view AI match scores and skill gap analyses, and execute 1-click decisions (Accept, Reject, Request Interview) without login barriers.",
  },
  {
    category: "talentflow",
    question: "Can we customize candidate resume branding and redact sensitive contact details?",
    answer:
      "Yes. TalentFlow includes an automated Playwright Chromium PDF rendering engine with pre-warmed headless workers. It dynamically transforms candidate profiles into pixel-perfect, agency-branded candidate dossiers while automatically redacting personal phone numbers, emails, and residential addresses to protect your business relationships.",
  },
  {
    category: "talentflow",
    question: "How does TalentFlow's Chrome Extension Companion work with Naukri Resdex?",
    answer:
      "Built on Manifest V3, the companion extension utilizes intelligent DOM mutation listeners and network stream interceptors on `/v3/preview/*` endpoints. It safely captures full candidate profiles with one click while enforcing SemaphorePool concurrency controls and recruiter credit quotas to safeguard your corporate portal accounts from lockouts.",
  },
  {
    category: "talentflow",
    question: "How does pre-onboarding candidate document verification work in TalentFlow?",
    answer:
      "Once an offer is accepted, TalentFlow initiates a DPDP-compliant 11-point document collection workflow (Aadhaar, PAN, payslips, academic degrees). Recruiters and hiring managers can verify all candidate proofs with structured checklists and immutable audit trails before day-one joining.",
  },

  // Payroll & Core HR FAQs
  {
    category: "payroll",
    question: "How does the payroll engine handle statutory deductions and Loss of Pay (LOP)?",
    answer:
      "Our payroll engine automatically syncs approved attendance logs, late marks, and unpaid leaves to compute Loss of Pay (LOP) and overtime compensation. It supports fully dynamic Gross earning components (Basic, HRA, Conveyance, Allowances) and statutory deduction components (EPF 12%, ESIC, Professional Tax, TDS/Income Tax slabs), generating automated PDF payslips and bank disbursement statements.",
  },
  {
    category: "payroll",
    question: "Can employees request company loans or salary advances with automated EMI deduction?",
    answer:
      "Yes. Admins can configure Loan Categories with tenure rules and interest slabs. Employees apply with supporting documents, and upon 2-tier approval (Reporting Manager followed by Admin), the loan EMI is automatically calculated and deducted every month from their payroll until fully cleared.",
  },
  {
    category: "payroll",
    question: "Can we generate and email official offer letters and relieving letters automatically?",
    answer:
      "Yes. Using our Letter Templates engine, admins can generate official Offer Letters, Appointment Letters, and Relieving Letters with pre-mapped employee/candidate variables, download print-ready PDFs, and dispatch them directly to candidate or employee email addresses with one click.",
  },

  // Attendance & Workspace FAQs
  {
    category: "attendance",
    question: "How does GPS Geofencing and Office IP attendance tracking work?",
    answer:
      "PeopleSuite allows HR admins to configure custom geofence perimeters (latitude, longitude, and radius in meters) for each office branch, along with allowed corporate Wi-Fi IP addresses. Employees can check in and out securely from web or mobile only when within the verified boundary, preventing remote proxy punches while supporting shift policies and overtime tracking.",
  },
  {
    category: "attendance",
    question: "What is the Interactive 2D Desk and Conference Room Booking feature?",
    answer:
      "PeopleSuite features an interactive canvas floor map of your office floors and department sections. Employees can visually select and reserve hot desks on a daily, weekly, or permanent basis. Teams can also book conference and meeting rooms with automated duration checks and admin approval workflows.",
  },
  {
    category: "attendance",
    question: "How does PeopleSuite manage IT assets and consumable inventory?",
    answer:
      "PeopleSuite tracks both serialized Fixed IT Assets (laptops, monitors, servers with serial numbers, asset tags, warranty dates, and custodian employee) and variable Supply Items (cables, peripherals, joiner kits with stock levels and reorder thresholds). Employees can submit repair or replacement tickets directly from their portal.",
  },
  {
    category: "attendance",
    question: "How does the 360-degree appraisal and KRA/KPI performance module work?",
    answer:
      "You can define department-specific KRA & KPI libraries, assign weightages, and run structured Appraisal Cycles. The system supports self-evaluations, peer reviews, manager reviews, and HR ratings. It also features a continuous feedback wall and an automated rating-to-salary-hike recommendation matrix.",
  },

  // Security & Compliance FAQs
  {
    category: "security",
    question: "Is candidate and employee data DPDP-compliant and securely protected?",
    answer:
      "Yes. Both TalentFlow and PeopleSuite adhere strictly to enterprise data privacy principles. The platform features 256-bit SSL encryption, tamper-evident immutable audit trails for every profile access and status change, granular role-based access control (RBAC), and stateless DPDP-ready pre-onboarding document storage.",
  },
  {
    category: "security",
    question: "Who develops and supports the unified HRMS + ATS platform?",
    answer:
      "PeopleSuite and TalentFlow are engineered and developed by Innovyx Tech Labs LLP. We deliver enterprise architecture, cloud deployment, custom statutory rule configurations, continuous compliance updates, and dedicated technical support.",
  },
];

const categories = [
  { id: "all", label: "All Questions" },
  { id: "talentflow", label: "TalentFlow" },
  { id: "payroll", label: "Statutory Payroll & Letters" },
  { id: "attendance", label: "Attendance & 2D Desks" },
  { id: "security", label: "Security & Compliance" },
];

export default function FaqAccordion() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filteredFaqs =
    activeCategory === "all"
      ? faqData
      : faqData.filter((item) => item.category === activeCategory);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 pb-2">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setActiveCategory(c.id);
              setOpenIndex(0);
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeCategory === c.id
                ? "bg-[#141834] text-white border border-[#7DC8FF] shadow-[0_4px_14px_rgba(20,24,52,0.3)]"
                : "bg-white text-[#5B6488] border border-[#DCE4F5] hover:text-[#0B0F2E] hover:border-[#0B5BD3]"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Accordion Items */}
      <div className="space-y-3.5">
        {filteredFaqs.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={item.question}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isOpen
                  ? "bg-[#141834] border-[#7DC8FF]/40 shadow-md ring-1 ring-[#0B5BD3]/20"
                  : "bg-[#141834] border-[#232A4E] hover:border-[#4A6CFF]/40 shadow-xs"
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(index)}
                className="w-full flex items-center justify-between text-left p-5 sm:p-6 gap-4 cursor-pointer"
              >
                <span className="font-label-lg text-base text-[#E8ECFF] font-semibold">
                  {item.question}
                </span>
                <span
                  className={`material-symbols-outlined text-[#9AA3D1] transition-transform duration-200 shrink-0 ${
                    isOpen ? "rotate-180 text-[#7DC8FF]" : ""
                  }`}
                >
                  expand_more
                </span>
              </button>

              {isOpen && (
                <div className="px-5 sm:px-6 pb-6 pt-1 font-body-md text-body-md text-[#9AA3D1] leading-relaxed border-t border-[#232A4E] animate-in fade-in duration-200">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
