"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookDemoModal from "@/components/BookDemoModal";
import PlatformOverview from "@/components/PlatformOverview";
import FaqAccordion from "@/components/FaqAccordion";

// 12 PeopleSuite Core Modules
const hrmsModules = [
  {
    icon: "badge",
    title: "Core HR & Directory",
    desc: "Complete employee master register, Aadhaar/PAN vaults, and dynamic organizational hierarchy.",
    href: "/#pillars",
  },
  {
    icon: "pin_drop",
    title: "Geofenced Attendance",
    desc: "GPS radius boundaries, corporate Wi-Fi IP restriction, and shift grace period policies.",
    href: "/#attendance",
  },
  {
    icon: "free_breakfast",
    title: "Break Time Manager",
    desc: "Real-time short break and meal break tracking with daily duration limits and DND mode.",
    href: "/#attendance",
  },
  {
    icon: "account_balance_wallet",
    title: "Statutory Payroll",
    desc: "Dynamic components, EPF, ESIC, Professional Tax, TDS slabs, and automated PDF payslips.",
    href: "/#payroll",
  },
  {
    icon: "meeting_room",
    title: "2D Desk Booking",
    desc: "Visual interactive floor plans for hot desking—reserve daily, weekly, or permanent desks.",
    href: "/#workspace",
  },
  {
    icon: "event_seat",
    title: "Conference Rooms",
    desc: "Schedule meeting rooms with instant conflict resolution and admin approval duration limits.",
    href: "/#workspace",
  },
  {
    icon: "laptop_mac",
    title: "Fixed IT Assets",
    desc: "Track serialized laptops, monitors, warranties, employee custodians, and repair requests.",
    href: "/#assets",
  },
  {
    icon: "inventory_2",
    title: "Consumable Inventory",
    desc: "Manage office supply items, joiner kits, and peripherals with automatic low-stock alerts.",
    href: "/#assets",
  },
  {
    icon: "track_changes",
    title: "Performance & PMS",
    desc: "Department KRA/KPI libraries, 360° multi-rater reviews, and rating-based salary hike matrices.",
    href: "/#performance",
  },
  {
    icon: "school",
    title: "Corporate LMS",
    desc: "Course catalog, structured learning paths, quizzes, and verifiable digital certificates.",
    href: "/#lms",
  },
  {
    icon: "request_quote",
    title: "Loans & Advances",
    desc: "Configurable loan categories, interest slabs, 2-tier approvals, and automated payroll EMI deduction.",
    href: "/#payroll",
  },
  {
    icon: "mail",
    title: "Automated HR Letters",
    desc: "Generate official Offer, Appointment, and Relieving letters with merge fields and email dispatch.",
    href: "/#lms",
  },
];

// TalentFlow Core Architectural Feature Grid
const talentFlowFeatures = [
  {
    icon: "extension",
    title: "1-Click Sourcing Gateway",
    badge: "Manifest V3 Chrome Extension",
    desc: "Seamlessly captures candidate profiles directly from Naukri Resdex drawers into the ATS. Features DOM mutation listeners on /v3/preview/*, SemaphorePool concurrency control, and recruiter credit quota governance.",
  },
  {
    icon: "query_stats",
    title: "AI Fit & Skill Gap Engine",
    badge: "0–100% Multivariate Scoring",
    desc: "Evaluates alignment against Job Descriptions across skills, experience, education, and location. Flags verified strengths vs. critical skill gaps to empower objective scorecard screening before interviews.",
  },
  {
    icon: "picture_as_pdf",
    title: "Instant Branded CV Engine",
    badge: "Playwright Headless Chromium",
    desc: "Generates pixel-perfect, branded client candidate dossiers from raw ATS data with zero cold-start latency. Automatically redacts candidate phone numbers and email addresses to protect agency contracts.",
  },
  {
    icon: "forum",
    title: "Frictionless Client Portal",
    badge: "Passwordless Tokenized Links",
    desc: "Clients receive private, tokenized links on mobile or desktop to review candidate dossiers and match scores with instant 1-click Accept, Reject, or Request Interview decisions—no login required.",
  },
  {
    icon: "account_tree",
    title: "Multi-Tier Quality Gates",
    badge: "Enterprise RBAC Workflows",
    desc: "Standardizes review gates across Recruiters, Team Leads (TL), and Delivery Managers (DM). Enforces strict quality sign-offs before candidate pools are released to external clients.",
  },
  {
    icon: "verified_user",
    title: "DPDP-Compliant Pre-Onboarding",
    badge: "11-Point Verification Checklist",
    desc: "Collects and verifies Aadhaar, PAN, payslips, academic degrees, and relieving letters with immutable audit trails. Verified records seamlessly convert into PeopleSuite employee profiles.",
  },
];

// TalentFlow Problem vs. Solution (Before vs. After)
const problemSolutionPairs = [
  {
    problem: "Manual Data Re-entry & Fragmented Sourcing",
    problemDesc: "Recruiters spend hours manually copying candidate profiles from job boards into spreadsheets and legacy ATSs.",
    solution: "1-Click Browser Sync Extension",
    solutionDesc: "High-performance Chrome extension captures full profiles directly from Naukri Resdex drawers into the ATS.",
    impact: "70%+ Reduction in profile ingestion time",
  },
  {
    problem: "Duplicate Credit Burn on Portals",
    problemDesc: "Recruiters unknowingly purchase candidate resumes already present in the agency database, wasting costly credits.",
    solution: "3-Tier Deduplication Engine",
    solutionDesc: "Real-time verification on Email (Primary), Phone (Secondary), and Name + Company (Tertiary) before debiting credits.",
    impact: "30%–40% Savings on portal credit expenditure",
  },
  {
    problem: "Manual Resume Formatting & Privacy Leaks",
    problemDesc: "Teams spend 30–45 mins per candidate copying text into Word templates and redacting contact information.",
    solution: "Automated Playwright PDF Engine",
    solutionDesc: "Instantly renders branded, standardized client candidate briefs with personal contact details automatically masked.",
    impact: "Turnaround drops from hours to < 2 minutes",
  },
  {
    problem: "Slow Client Review Cycles via Email",
    problemDesc: "Sending PDF attachments leads to lost emails, zero engagement tracking, and days of delayed feedback.",
    solution: "Tokenized Interactive Client Portal",
    solutionDesc: "Hiring managers receive a private, secure link with match scores, skill summaries, and 1-click decision buttons.",
    impact: "Feedback latency drops from 4 days to hours",
  },
  {
    problem: "Low Candidate Quality Control",
    problemDesc: "Unvetted candidate submissions to clients damage agency reputation and relationship retention.",
    solution: "Hierarchical Approval Gates",
    solutionDesc: "Multi-role workflow (Recruiter ➔ Team Lead ➔ Delivery Manager) enforces quality checks before client release.",
    impact: "Drastic rise in client interview conversions",
  },
  {
    problem: "Post-Selection Onboarding Friction",
    problemDesc: "Chasing joining documents, certificates, and compliance checks via WhatsApp and email causes dropout risk.",
    solution: "Stateless DPDP-Compliant Onboarding",
    solutionDesc: "Structured 11-point verification checklist converts candidate directly into PeopleSuite employee directory.",
    impact: "Zero compliance risk & seamless day-one join",
  },
];

// 6-Step End-to-End Unified Process Automation
const unifiedPipelineSteps = [
  {
    step: "01",
    phase: "Sourcing Gateway",
    system: "TalentFlow",
    title: "1-Click Sync & Deduplication",
    desc: "Source on Naukri Resdex with the Chrome companion. Automated 3-tier dedup checks against database before credits burn. Semaphore control manages recruiter quotas.",
    icon: "extension",
  },
  {
    step: "02",
    phase: "ATS Core & AI",
    system: "TalentFlow",
    title: "AI Fit & Skill Gap Scoring",
    desc: "Instant resume ingestion. Multivariate algorithm calculates 0-100% JD alignment across hard skills, experience, and education, generating objective candidate scorecards.",
    icon: "query_stats",
  },
  {
    step: "03",
    phase: "Quality Governance",
    system: "TalentFlow",
    title: "Multi-Tier Approval Gates",
    desc: "Recruiter screening ➔ Team Lead verification ➔ Delivery Manager sign-off. Built-in quality checkpoints guarantee only vetted talent advances to client submission.",
    icon: "account_tree",
  },
  {
    step: "04",
    phase: "Client Submission",
    system: "TalentFlow",
    title: "Tokenized Client Portal Link",
    desc: "Clients open a secure, passwordless link with Playwright-rendered branded dossiers (contact masked) and AI scores. One-click Accept, Reject, or Request Interview.",
    icon: "forum",
  },
  {
    step: "05",
    phase: "Pre-Onboarding",
    system: "TalentFlow",
    title: "DPDP 11-Point Verification",
    desc: "Automated candidate document collection for Aadhaar, PAN, payslips, academic degrees, and past relieving letters with an immutable, tamper-evident audit trail.",
    icon: "verified_user",
  },
  {
    step: "06",
    phase: "Day-One Onboarding",
    system: "PeopleSuite",
    title: "Directory, Attendance & Payroll",
    desc: "Candidate record instantly becomes an active Employee. Assigned GPS geofenced attendance, 2D hot desk allocation, asset custody, and statutory payroll enrollment.",
    icon: "groups",
  },
];

// HRMS Deep-Dive Stories
const hrmsStories = [
  {
    id: "payroll",
    tag: "Indian Statutory Payroll Engine",
    title: "Zero-error payroll, fully linked to attendance.",
    subtitle: "Engineered specifically to handle Indian statutory compliance, deductions, and organizational salary structures without manual spreadsheets.",
    points: [
      "Dynamic Gross salary components (Basic, HRA, Conveyance, Special Allowance) & custom deductions",
      "Automatic EPF (12%), ESIC, Professional Tax, and Income Tax (TDS) slab calculations",
      "Seamless Loss of Pay (LOP) and overtime sync directly from approved attendance logs",
      "Automatic deduction of active Employee Loan EMIs and approved advance repayments",
      "One-click generation of branded PDF payslips and bank disbursement payment statements",
    ],
    cardTitle: "March Payroll Batch (342 Employees)",
    rows: [
      ["Gross Earnings", "₹ 48,20,000"],
      ["Statutory EPF & ESIC", "-₹ 4,12,500"],
      ["TDS & Professional Tax", "-₹ 1,78,000"],
      ["Employee Loan EMIs", "-₹ 1,20,000"],
      ["Net Disbursable", "₹ 41,09,500"],
    ],
    statusPill: "Locked & Disbursed",
  },
  {
    id: "attendance",
    tag: "Attendance & Break Discipline",
    title: "Verifiable check-ins with shift and break discipline.",
    subtitle: "Eliminate proxy attendance and unrecorded downtime with GPS perimeter verification and structured daily break limits.",
    points: [
      "GPS geofence radius check-in ensures staff punch only within verified office grounds",
      "Corporate Wi-Fi public IP address restrictions for high-security workplace verification",
      "Rotational and departmental shifts with configurable grace time, half-day, and full-day cutoffs",
      "Daily break timer tracking short breaks, meal breaks, and Don't Disturb mode with strict caps",
      "Instant multi-level leave approvals from Reporting Manager to HR Admin",
    ],
    cardTitle: "Today's Live Attendance Dashboard",
    rows: [
      ["Total Scheduled Staff", "248"],
      ["Present (Inside Geofence)", "231"],
      ["Approved Remote / WFH", "9"],
      ["On Approved Leave", "8"],
      ["Active Short Breaks", "14 Staff"],
    ],
    statusPill: "98.2% In-Policy",
    flip: true,
  },
  {
    id: "workspace",
    tag: "2D Workspace & Hot Desking",
    title: "Interactive visual floor plans for modern hybrid offices.",
    subtitle: "Empower employees to view live office layouts, select hot desks, and reserve meeting rooms without scheduling chaos.",
    points: [
      "Visual 2D interactive canvas showing office floors, departments, zones, and individual desks",
      "Hot desking options: Reserve flexible desks on daily, weekly, or permanent assignments",
      "Color-coded seat availability: Instant visibility of occupied, vacant, and reserved desks",
      "Conference and meeting room booking engine with time-slot conflict prevention",
      "Admin approval thresholds for extended boardroom and event space bookings",
    ],
    cardTitle: "Floor 2 • Engineering & Ops Zone",
    rows: [
      ["Total Workstations", "140 Desks"],
      ["Permanent Assigned", "88 Desks"],
      ["Daily Hot Desks Booked", "38 Desks"],
      ["Available Hot Desks", "14 Desks"],
      ["Boardroom Status", "Booked (11:00 AM)"],
    ],
    statusPill: "Live Floor Layout",
  },
  {
    id: "performance",
    tag: "Performance & PMS",
    title: "Align goals with 360° appraisals and automated salary hikes.",
    subtitle: "Replace once-a-year anxiety with transparent KRA/KPI tracking, multi-rater feedback, and objective compensation recommendations.",
    points: [
      "Centralized KRA & KPI library mapped by department and organizational level",
      "360-degree appraisal cycles: Self-evaluation, peer nomination, reporting manager rating & HR review",
      "Continuous peer appreciation and coaching wall for year-round recognition",
      "Appraisal deadline extension requests and multi-evaluator scoring rubrics",
      "Automated Rating-to-Salary-Hike recommendation matrix linked directly to payroll planning",
    ],
    cardTitle: "Annual Appraisal Cycle 2025–26",
    rows: [
      ["Eligible Employees", "312 Staff"],
      ["Self Appraisals Submitted", "96%"],
      ["Manager Evaluations Complete", "89%"],
      ["Average Score", "4.15 / 5.0"],
      ["Recommended Hike Range", "8% – 16%"],
    ],
    statusPill: "Review Phase",
    flip: true,
  },
  {
    id: "assets",
    tag: "IT Assets & Supplies",
    title: "Track hardware lifecycles and consumable office supplies.",
    subtitle: "From high-value laptops to joiner peripherals and stationery, keep full accountability across procurement and assignment.",
    points: [
      "Serialized IT Fixed Assets: Serial numbers, asset tags, purchase value, warranty dates, and custodian employee",
      "Consumable Supply Stack: Peripherals, cables, stationery, and joiner kits with UoM tracking",
      "Low stock threshold monitoring with automated reorder level alerts",
      "Employee self-service asset request portal with damage photo uploads and repair intake",
      "Supporting document vaults: Invoice copies, warranty cards, and handover acceptance receipts",
    ],
    cardTitle: "Asset & Inventory Summary",
    rows: [
      ["Serialized Laptops In-Use", "184 Units"],
      ["Available Hardware in Stock", "26 Units"],
      ["Under Warranty Repair", "4 Units"],
      ["Consumable SKUs Tracked", "48 Items"],
      ["Reorder Alerts Pending", "2 Items (Cables)"],
    ],
    statusPill: "Audited & Verified",
  },
  {
    id: "lms",
    tag: "LMS & HR Document Automation",
    title: "Upskill your team and automate official HR documentation.",
    subtitle: "Continuous learning and error-free legal documentation—everything needed to recruit, train, and certify employees.",
    points: [
      "Corporate Course Catalog: Upload video lessons, PDFs, presentations, and external learning resources",
      "Structured Learning Paths: Assign mandatory compliance training with deadline tracking",
      "Knowledge assessments and quizzes with passing grades and retry rules",
      "Verifiable digital completion certificates featuring authorized digital signatures",
      "Automated Letter Generator: Produce official Offer Letters, Appointment Letters, and Relieving Letters with email dispatch",
    ],
    cardTitle: "Corporate Learning & Letters",
    rows: [
      ["Active Courses", "32 Modules"],
      ["Mandatory Compliance Rate", "98.4%"],
      ["Certificates Issued", "168"],
      ["Offer Letters Dispatched", "12 this month"],
      ["Relieving Letters Archived", "4 this month"],
    ],
    statusPill: "Compliance Active",
    flip: true,
  },
];

const roleProps = [
  {
    id: "recruiters",
    title: "For Recruiters",
    tagline: "More interviews, zero manual data entry.",
    quote:
      "Spend your day interviewing top talent, not copying resume text into spreadsheets or manually creating PDF templates.",
    highlights: [
      "1-Click Chrome extension ingests full Naukri Resdex candidate drawers",
      "Automated deduplication prevents accidental duplicate CV purchases",
      "Instant Playwright branded CV generation with candidate contact info masked",
      "Personalized recruiter quota tracking and active pipeline Kanban",
    ],
  },
  {
    id: "leads",
    title: "For Team Leads & Delivery Managers",
    tagline: "Zero credit leakage, total pipeline governance.",
    quote:
      "Get complete pipeline visibility, prevent credit leakage, and ensure zero unvetted candidates ever reach your clients.",
    highlights: [
      "Hierarchical review gates (Recruiter ➔ TL ➔ DM) before client release",
      "Recruiter quota management and real-time portal credit monitoring",
      "Macro pipeline visibility across active job orders, submittals, and client approvals",
      "Objective AI fit scores and competency gap analysis on every profile",
    ],
  },
  {
    id: "founders",
    title: "For Agency Founders & TA Directors",
    tagline: "Scale placement capacity by 3x with lower portal spend.",
    quote:
      "Scale your team's placement capacity by 3x while cutting sourcing overhead and safeguarding client data integrity.",
    highlights: [
      "30% to 40% reduction in external job board credit burn via 3-tier dedup",
      "Client submission turnaround drops from hours to under 2 minutes",
      "Brand protection with automated contact details redacting",
      "End-to-end audit compliance and seamless transition to workforce management",
    ],
  },
  {
    id: "clients",
    title: "For Client Hiring Managers",
    tagline: "Frictionless reviews, zero passwords required.",
    quote:
      "Review candidate submissions with transparent match scores and clean dossiers directly from your mobile or desktop browser.",
    highlights: [
      "Secure, tokenized web links: No login credentials or account setups required",
      "Transparent 0–100% AI fit breakdown against the job description",
      "1-Click action buttons: Accept, Reject (with reason), or Request Interview",
      "Fast response cycle: Evaluation latency cuts from 4 days to hours",
    ],
  },
];

export default function HomePage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoPlatform, setDemoPlatform] = useState<"talentflow" | "peoplesuite" | "both">("both");
  const [heroEngineTab, setHeroEngineTab] = useState<"talentflow" | "hrms">("talentflow");
  const [activeRoleTab, setActiveRoleTab] = useState<string>("recruiters");

  const openDemo = (platform: "talentflow" | "peoplesuite" | "both" = "both") => {
    setDemoPlatform(platform);
    setIsDemoModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white text-[#0B0F2E] flex flex-col selection:bg-[#EAF0FF] selection:text-[#0B5BD3]">
      <Navbar onOpenDemo={() => openDemo("both")} />

      <main className="w-full pt-[72px]">
        {/* ============================================================== */}
        {/* HERO SECTION: COMBINED PLATFORM POWER                         */}
        {/* ============================================================== */}
        <section id="hero" className="bg-white border-b border-[#DCE4F5]/60 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EAF0FF] border border-[#DCE4F5] text-[#0B5BD3] text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#0B5BD3] animate-pulse"></span>
                <span>TalentFlow + PeopleSuite • by Innovyx Tech Labs LLP</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.08] tracking-tight text-[#0B0F2E]">
                <span className="relative inline-block">
                  Stop sourcing in silos.
                  <svg
                    viewBox="0 0 300 12"
                    className="absolute left-0 -bottom-2 w-full"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 8c60-6 120-6 180-2s80 2 116-2"
                      fill="none"
                      stroke="#4A6CFF"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <br />
                <span className="text-[#5B6488]">Run workforce ops with precision.</span>
              </h1>

              <p className="text-lg text-[#5B6488] max-w-lg leading-relaxed">
                The unified cloud platform bridging intelligent recruitment operations (1-click Naukri sync, AI fit scoring, tokenized client portals) with complete PeopleSuite enterprise operations (geofenced attendance, Indian statutory payroll, 2D hot desking, IT assets, and LMS).
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => openDemo("both")}
                  className="px-6 py-3.5 rounded-xl bg-[#141834] hover:bg-[#232A4E] hover:border-[#7DC8FF] hover:shadow-[0_6px_20px_rgba(20,24,52,0.35)] text-white border border-[#4A6CFF]/40 font-semibold transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <span>Book a Product Walkthrough</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
                <a
                  href="#talentflow"
                  className="px-6 py-3.5 rounded-xl border border-[#DCE4F5] hover:border-[#0B5BD3] hover:bg-[#F5F8FF] text-[#0B0F2E] font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Explore TalentFlow</span>
                  <span className="material-symbols-outlined text-[18px]">expand_more</span>
                </a>
                <a
                  href="#pillars"
                  className="px-5 py-3.5 rounded-xl border border-transparent hover:border-[#DCE4F5] text-[#5B6488] hover:text-[#0B0F2E] font-medium transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>PeopleSuite Modules</span>
                </a>
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

            {/* Visual Hero Interactive Dashboard Card */}
            <div className="relative">
              <div className="bg-[#141834] border border-[#232A4E] rounded-3xl p-6 sm:p-8 text-[#E8ECFF] shadow-2xl space-y-6">
                {/* Engine Switcher Tabs */}
                <div className="flex items-center justify-between pb-4 border-b border-[#232A4E]">
                  <div className="inline-flex p-1 rounded-xl bg-[#0F1226] border border-[#232A4E]">
                    <button
                      type="button"
                      onClick={() => setHeroEngineTab("talentflow")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        heroEngineTab === "talentflow"
                          ? "bg-[#1E1AB8] text-white shadow-sm font-bold"
                          : "text-[#9AA3D1] hover:text-[#E8ECFF]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">person_search</span>
                      <span>TalentFlow</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroEngineTab("hrms")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        heroEngineTab === "hrms"
                          ? "bg-[#1E1AB8] text-white shadow-sm font-bold"
                          : "text-[#9AA3D1] hover:text-[#E8ECFF]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">badge</span>
                      <span>PeopleSuite</span>
                    </button>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#0B5BD3]/20 text-[#7DC8FF] border border-[#4A6CFF]/30">
                    Live Engine
                  </span>
                </div>

                {heroEngineTab === "talentflow" ? (
                  // TalentFlow Interactive Live View
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="bg-[#0F1226] border border-[#232A4E] p-4 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1E1AB8] text-white flex items-center justify-center font-bold text-sm">
                          SV
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-[#E8ECFF]">
                            Siddharth Verma • Senior Backend Lead
                          </div>
                          <div className="text-xs text-[#9AA3D1]">
                            Sourced via Naukri Resdex • JD: Cloud Platform
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#86EFAC]/20 text-[#86EFAC] border border-[#86EFAC]/30">
                          89% AI Match
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#0F1226] border border-[#232A4E] p-3.5 rounded-xl">
                        <div className="text-xs text-[#9AA3D1]">3-Tier Deduplication</div>
                        <div className="text-sm font-bold text-[#86EFAC] mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">verified</span>
                          <span>Verified Unique</span>
                        </div>
                        <div className="text-[11px] text-[#9AA3D1] mt-0.5">0 Portal Credits Burned</div>
                      </div>

                      <div className="bg-[#0F1226] border border-[#232A4E] p-3.5 rounded-xl">
                        <div className="text-xs text-[#9AA3D1]">Client Review Portal</div>
                        <div className="text-sm font-bold text-[#7DC8FF] mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">send</span>
                          <span>Tokenized Link Active</span>
                        </div>
                        <div className="text-[11px] text-[#9AA3D1] mt-0.5">Passwordless 1-Click Review</div>
                      </div>

                      <div className="bg-[#0F1226] border border-[#232A4E] p-3.5 rounded-xl">
                        <div className="text-xs text-[#9AA3D1]">Playwright Dossier</div>
                        <div className="text-sm font-bold text-[#E8ECFF] mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                          <span>CV Formatted & Masked</span>
                        </div>
                        <div className="text-[11px] text-[#9AA3D1] mt-0.5">Contact Details Redacted</div>
                      </div>

                      <div className="bg-[#0F1226] border border-[#232A4E] p-3.5 rounded-xl">
                        <div className="text-xs text-[#9AA3D1]">Internal Governance</div>
                        <div className="text-sm font-bold text-[#86EFAC] mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          <span>TL & DM Sign-Off ✓</span>
                        </div>
                        <div className="text-[11px] text-[#9AA3D1] mt-0.5">Quality Gate Enforced</div>
                      </div>
                    </div>

                    <div className="bg-[#0F1226] border border-[#232A4E] p-3.5 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-[#E8ECFF]">
                        <span className="material-symbols-outlined text-[18px] text-[#7DC8FF]">
                          verified_user
                        </span>
                        <span>DPDP Pre-Onboarding Checklist: 11 / 11 Proofs Uploaded</span>
                      </div>
                      <span className="font-bold text-[#86EFAC]">Ready for PeopleSuite</span>
                    </div>
                  </div>
                ) : (
                  // PeopleSuite HRMS Live View
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#0F1226] border border-[#232A4E] p-3.5 rounded-xl">
                        <div className="text-xs text-[#9AA3D1]">Geofenced Attendance</div>
                        <div className="text-xl font-bold text-[#E8ECFF] mt-1">231 / 248</div>
                        <div className="text-[11px] text-[#7DC8FF] mt-0.5">93.1% Verified In Bounds</div>
                      </div>

                      <div className="bg-[#0F1226] border border-[#232A4E] p-3.5 rounded-xl">
                        <div className="text-xs text-[#9AA3D1]">March Statutory Payroll</div>
                        <div className="text-xl font-bold text-[#E8ECFF] mt-1">₹ 41.09 L</div>
                        <div className="text-[11px] text-[#86EFAC] mt-0.5">Payslips Generated ✓</div>
                      </div>

                      <div className="bg-[#0F1226] border border-[#232A4E] p-3.5 rounded-xl">
                        <div className="text-xs text-[#9AA3D1]">2D Desk Allocation</div>
                        <div className="text-xl font-bold text-[#E8ECFF] mt-1">126 Booked</div>
                        <div className="text-[11px] text-[#7DC8FF] mt-0.5">14 Hot Desks Free</div>
                      </div>

                      <div className="bg-[#0F1226] border border-[#232A4E] p-3.5 rounded-xl">
                        <div className="text-xs text-[#9AA3D1]">Active IT Assets</div>
                        <div className="text-xl font-bold text-[#E8ECFF] mt-1">184 Custodians</div>
                        <div className="text-[11px] text-[#86EFAC] mt-0.5">100% Tracked Units</div>
                      </div>
                    </div>

                    <div className="bg-[#0F1226] border border-[#232A4E] p-4 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#7DC8FF] text-[24px]">verified</span>
                        <div>
                          <div className="text-xs font-semibold text-[#E8ECFF]">Statutory Rules Configured</div>
                          <div className="text-[11px] text-[#9AA3D1]">
                            EPF, ESIC, Professional Tax, TDS Slabs & Shift Overtime
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#86EFAC]">Ready</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* UNIFIED PIPELINE: END-TO-END BUSINESS AUTOMATION JOURNEY        */}
        {/* ============================================================== */}
        <section id="pipeline" className="scroll-mt-20 bg-[#F5F8FF] py-20 border-b border-[#DCE4F5]">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="max-w-2xl mb-12">
              <div className="text-xs font-semibold text-[#0B5BD3] uppercase tracking-wider mb-2">
                Unified Lifecycle Automation
              </div>
              <h2 className="font-display text-3xl lg:text-4xl tracking-tight text-[#0B0F2E]">
                From first candidate sourced to day-one payroll.
              </h2>
              <p className="mt-3 text-[#5B6488] leading-relaxed">
                Experience how TalentFlow and PeopleSuite eliminate handoff latency, credit burn, and manual data re-entry across the complete recruitment and workforce lifecycle.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {unifiedPipelineSteps.map((step) => (
                <div
                  key={step.step}
                  className="bg-[#141834] border border-[#232A4E] rounded-2xl p-6 text-[#E8ECFF] hover:border-[#7DC8FF] hover:-translate-y-1 transition-all duration-300 shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#232A4E]">
                      <span className="font-display text-2xl text-[#7DC8FF] font-bold">{step.step}</span>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#0F1226] text-[#9AA3D1] border border-[#232A4E]">
                        {step.system}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-4 text-xs font-semibold text-[#7DC8FF] uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[18px]">{step.icon}</span>
                      <span>{step.phase}</span>
                    </div>

                    <h3 className="mt-2 font-semibold text-lg text-white">{step.title}</h3>
                    <p className="mt-2 text-xs text-[#9AA3D1] leading-relaxed">{step.desc}</p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#232A4E]/60 flex items-center justify-between text-[11px] text-[#7DC8FF]">
                    <span>Automated Governance</span>
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* TALENTFLOW: BEFORE VS. AFTER COMPARISON                        */}
        {/* ============================================================== */}
        <section id="comparison" className="scroll-mt-20 bg-white py-20 border-b border-[#DCE4F5]/60">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="max-w-2xl mb-12">
              <div className="text-xs font-semibold text-[#0B5BD3] uppercase tracking-wider mb-2">
                The Core Problem vs. TalentFlow Automated Solution
              </div>
              <h2 className="font-display text-3xl lg:text-4xl tracking-tight text-[#0B0F2E]">
                Recruitment operations without the manual friction.
              </h2>
              <p className="mt-3 text-[#5B6488] leading-relaxed">
                See the quantifiable business impact when you replace spreadsheets, portal credit waste, and email attachments with TalentFlow automation.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {problemSolutionPairs.map((pair) => (
                <div
                  key={pair.problem}
                  className="rounded-2xl border border-[#DCE4F5] bg-[#F5F8FF] p-6 flex flex-col justify-between hover:border-[#0B5BD3] transition-all duration-200"
                >
                  <div className="space-y-4">
                    {/* The Problem */}
                    <div className="space-y-1.5 pb-4 border-b border-[#DCE4F5]">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#BA1A1A] uppercase">
                        <span className="material-symbols-outlined text-[16px]">cancel</span>
                        <span>Traditional Problem</span>
                      </div>
                      <h4 className="font-semibold text-sm text-[#0B0F2E]">{pair.problem}</h4>
                      <p className="text-xs text-[#5B6488] leading-relaxed">{pair.problemDesc}</p>
                    </div>

                    {/* The Solution */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B5BD3] uppercase">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>TalentFlow Solution</span>
                      </div>
                      <h4 className="font-semibold text-sm text-[#0B0F2E]">{pair.solution}</h4>
                      <p className="text-xs text-[#5B6488] leading-relaxed">{pair.solutionDesc}</p>
                    </div>
                  </div>

                  {/* Measurable Impact Badge */}
                  <div className="mt-5 pt-3 border-t border-[#DCE4F5] flex items-center justify-between bg-white px-3 py-2 rounded-xl border">
                    <span className="text-[11px] font-bold text-[#0B5BD3]">{pair.impact}</span>
                    <span className="material-symbols-outlined text-[16px] text-[#0B5BD3]">trending_up</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* TALENTFLOW CORE ARCHITECTURAL FEATURES                         */}
        {/* ============================================================== */}
        <section id="talentflow" className="scroll-mt-20 bg-[#141834] text-[#E8ECFF] py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="max-w-2xl mb-12">
              <div className="text-xs font-semibold text-[#7DC8FF] uppercase tracking-wider mb-2">
                TalentFlow Architecture
              </div>
              <h2 className="font-display text-3xl lg:text-4xl tracking-tight text-white">
                Engineered for high-volume staffing & corporate TA.
              </h2>
              <p className="mt-3 text-[#9AA3D1] leading-relaxed">
                Eliminate portal credit waste, manual formatting latency, and unvetted candidate submissions with dedicated browser gateways and tokenized client approvals.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {talentFlowFeatures.map((f) => (
                <div
                  key={f.title}
                  className="bg-[#0F1226] border border-[#232A4E] rounded-2xl p-6 hover:border-[#7DC8FF] hover:-translate-y-1.5 hover:shadow-[0_12px_28px_rgba(74,108,255,0.3)] transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-[#1E1AB8]/40 border border-[#4A6CFF]/30 flex items-center justify-center text-[#7DC8FF]">
                      <span className="material-symbols-outlined text-[26px]">{f.icon}</span>
                    </div>
                    <span className="inline-block mt-4 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#141834] text-[#7DC8FF] border border-[#232A4E]">
                      {f.badge}
                    </span>
                    <h3 className="mt-2 font-semibold text-lg text-white">{f.title}</h3>
                    <p className="mt-2 text-xs text-[#9AA3D1] leading-relaxed">{f.desc}</p>
                  </div>

                  <div className="mt-6 pt-3 border-t border-[#232A4E] flex items-center justify-between text-xs text-[#7DC8FF]">
                    <span>Enterprise Ready</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Action to Dedicated TalentFlow Deep Dive */}
            <div className="mt-12 p-6 rounded-2xl bg-[#0F1226] border border-[#232A4E] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-base text-white">
                  Looking for the dedicated Recruitment Management portal?
                </h4>
                <p className="text-xs text-[#9AA3D1]">
                  Explore our dedicated TalentFlow product page designed specifically for recruitment agencies and RPO staffing teams.
                </p>
              </div>
              <Link
                href="/talentflow"
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-[#EAF0FF] text-[#141834] font-semibold text-xs transition-colors shrink-0 flex items-center gap-1.5"
              >
                <span>Visit TalentFlow Page</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* MEASURABLE BUSINESS EFFICIENCY & ROI METRICS                   */}
        {/* ============================================================== */}
        <section id="metrics" className="scroll-mt-20 bg-[#F5F8FF] py-20 border-b border-[#DCE4F5]">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="max-w-2xl text-center mx-auto mb-12">
              <div className="text-xs font-semibold text-[#0B5BD3] uppercase tracking-wider mb-2">
                Measurable Business Efficiency
              </div>
              <h2 className="font-display text-3xl lg:text-4xl tracking-tight text-[#0B0F2E]">
                Proven ROI for agencies and HR teams
              </h2>
              <p className="mt-3 text-[#5B6488] leading-relaxed text-sm">
                Real benchmark improvements achieved when automating sourcing, deduplication, and client approvals.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-[#141834] border border-[#232A4E] rounded-2xl p-6 text-[#E8ECFF] shadow-sm">
                <div className="font-display text-4xl lg:text-5xl font-bold text-[#7DC8FF]">75%</div>
                <h3 className="mt-3 font-semibold text-base text-white">Shorter Sourcing Cycle</h3>
                <p className="mt-1 text-xs text-[#9AA3D1] leading-relaxed">
                  From 3–4 hours down to under 10 minutes per candidate submission.
                </p>
              </div>

              <div className="bg-[#141834] border border-[#232A4E] rounded-2xl p-6 text-[#E8ECFF] shadow-sm">
                <div className="font-display text-4xl lg:text-5xl font-bold text-[#86EFAC]">30%–40%</div>
                <h3 className="mt-3 font-semibold text-base text-white">Savings on Portal Spend</h3>
                <p className="mt-1 text-xs text-[#9AA3D1] leading-relaxed">
                  Intelligent 3-tier deduplication prevents expensive duplicate CV purchases.
                </p>
              </div>

              <div className="bg-[#141834] border border-[#232A4E] rounded-2xl p-6 text-[#E8ECFF] shadow-sm">
                <div className="font-display text-4xl lg:text-5xl font-bold text-[#7DC8FF]">3x</div>
                <h3 className="mt-3 font-semibold text-base text-white">Faster Client Decisions</h3>
                <p className="mt-1 text-xs text-[#9AA3D1] leading-relaxed">
                  Interactive tokenized approval links cut client evaluation latency from 4 days to hours.
                </p>
              </div>

              <div className="bg-[#141834] border border-[#232A4E] rounded-2xl p-6 text-[#E8ECFF] shadow-sm">
                <div className="font-display text-4xl lg:text-5xl font-bold text-[#86EFAC]">100%</div>
                <h3 className="mt-3 font-semibold text-base text-white">DPDP & Audit Compliance</h3>
                <p className="mt-1 text-xs text-[#9AA3D1] leading-relaxed">
                  Tamper-evident activity logs and structured pre-onboarding eliminate compliance liabilities.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* ROLE-SPECIFIC VALUE PROPOSITIONS                               */}
        {/* ============================================================== */}
        <section id="roles" className="scroll-mt-20 bg-white py-20 border-b border-[#DCE4F5]/60">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="max-w-2xl mb-12">
              <div className="text-xs font-semibold text-[#0B5BD3] uppercase tracking-wider mb-2">
                Tailored for Your Entire Organization
              </div>
              <h2 className="font-display text-3xl lg:text-4xl tracking-tight text-[#0B0F2E]">
                Empowering every stakeholder in the hiring chain
              </h2>
            </div>

            {/* Role Tab Buttons */}
            <div className="flex flex-wrap gap-2 pb-8 border-b border-[#DCE4F5]">
              {roleProps.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActiveRoleTab(r.id)}
                  className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
                    activeRoleTab === r.id
                      ? "bg-[#141834] text-white border border-[#7DC8FF] shadow-md"
                      : "bg-[#F5F8FF] text-[#5B6488] border border-[#DCE4F5] hover:text-[#0B0F2E]"
                  }`}
                >
                  {r.title}
                </button>
              ))}
            </div>

            {/* Role Content Card */}
            {roleProps
              .filter((r) => r.id === activeRoleTab)
              .map((r) => (
                <div
                  key={r.id}
                  className="mt-8 bg-[#F5F8FF] border border-[#DCE4F5] rounded-3xl p-6 sm:p-10 grid lg:grid-cols-2 gap-8 items-center animate-in fade-in duration-300"
                >
                  <div className="space-y-4">
                    <span className="text-xs font-bold text-[#0B5BD3] uppercase tracking-wider">
                      {r.tagline}
                    </span>
                    <h3 className="font-display text-2xl sm:text-3xl tracking-tight text-[#0B0F2E]">
                      {r.title}
                    </h3>
                    <p className="text-base text-[#0B0F2E] font-medium italic border-l-4 border-[#0B5BD3] pl-4 py-1">
                      "{r.quote}"
                    </p>
                  </div>

                  <div className="bg-[#141834] text-[#E8ECFF] border border-[#232A4E] rounded-2xl p-6 shadow-xl space-y-3">
                    <div className="text-xs font-bold text-[#7DC8FF] uppercase tracking-wider pb-2 border-b border-[#232A4E]">
                      Key Workflow Advantages
                    </div>
                    <ul className="space-y-2.5 text-xs sm:text-sm">
                      {r.highlights.map((h) => (
                        <li key={h} className="flex items-start gap-2.5">
                          <span className="material-symbols-outlined text-[18px] text-[#7DC8FF] shrink-0 mt-0.5">
                            check_circle
                          </span>
                          <span className="text-[#C5D0F5]">{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
          </div>
        </section>

        {/* ============================================================== */}
        {/* PLATFORM OVERVIEW BRIDGE                                       */}
        {/* ============================================================== */}
        <PlatformOverview />

        {/* ============================================================== */}
        {/* 12 PEOPLESUTE MODULES GRID                                     */}
        {/* ============================================================== */}
        <section id="pillars" className="scroll-mt-20 bg-[#F5F8FF] py-20 border-b border-[#DCE4F5]">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="max-w-2xl mb-12">
              <div className="text-xs font-semibold text-[#0B5BD3] uppercase tracking-wider mb-2">
                Workforce Management Suite
              </div>
              <h2 className="font-display text-3xl lg:text-4xl tracking-tight text-[#0B0F2E]">
                Twelve core modules. One connected engine.
              </h2>
              <p className="mt-3 text-[#5B6488] leading-relaxed">
                Seamlessly govern ongoing workforce operations from verified onboarding to statutory payroll, workplace desk allocation, and continuous performance.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {hrmsModules.map((m) => (
                <Link
                  key={m.title}
                  href={m.href}
                  className="group block bg-[#141834] border border-[#232A4E] rounded-2xl text-[#E8ECFF] p-6 hover:border-[#7DC8FF] hover:bg-[#181D3F] hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(11,91,211,0.25)] transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-[#0F1226] border border-[#232A4E] group-hover:border-[#7DC8FF]/50 flex items-center justify-center transition-colors">
                      <span className="material-symbols-outlined text-[24px] text-[#7DC8FF]">{m.icon}</span>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-[#9AA3D1] group-hover:text-[#7DC8FF] group-hover:translate-x-1 transition-all">
                      arrow_forward
                    </span>
                  </div>
                  <h3 className="mt-4 font-semibold text-base text-[#E8ECFF] group-hover:text-white transition-colors">
                    {m.title}
                  </h3>
                  <p className="mt-1 text-xs text-[#9AA3D1] group-hover:text-[#C5D0F5] leading-relaxed transition-colors">
                    {m.desc}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* DEEP-DIVE FUNCTIONAL STORIES                                   */}
        {/* ============================================================== */}
        <section id="features" className="scroll-mt-20 max-w-7xl mx-auto px-6 lg:px-12 py-20 space-y-24">
          <div className="max-w-xl text-center mx-auto space-y-3">
            <div className="text-xs font-semibold text-[#0B5BD3] uppercase tracking-wider">Functional Deep-Dive</div>
            <h2 className="font-display text-3xl lg:text-4xl tracking-tight text-[#0B0F2E]">
              Engineered for real-world HR operations
            </h2>
            <p className="text-[#5B6488] text-sm">
              Discover how PeopleSuite coordinates attendance, compliance, desks, assets, and talent management.
            </p>
          </div>

          {hrmsStories.map((s) => (
            <div key={s.id} id={s.id} className="scroll-mt-28 grid lg:grid-cols-2 gap-12 items-center relative">
              {s.id === "payroll" && <span id="loans" className="scroll-mt-28 absolute top-0" />}
              {s.id === "lms" && <span id="letters" className="scroll-mt-28 absolute top-0" />}
              {s.id === "attendance" && <span id="integrations" className="scroll-mt-28 absolute top-0" />}
              <div className={s.flip ? "lg:order-2 space-y-4" : "space-y-4"}>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF0FF] border border-[#DCE4F5] text-[#0B5BD3] text-xs font-semibold">
                  <span>{s.tag}</span>
                </div>
                <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight text-[#0B0F2E]">
                  {s.title}
                </h3>
                <p className="text-sm text-[#5B6488] leading-relaxed">{s.subtitle}</p>

                <ul className="mt-6 space-y-3 pt-2">
                  {s.points.map((p) => (
                    <li key={p} className="flex gap-3 text-sm text-[#5B6488]">
                      <span className="material-symbols-outlined text-[20px] text-[#0B5BD3] shrink-0 mt-0.5">
                        check_circle
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className={`bg-[#F5F8FF] border border-[#DCE4F5] rounded-3xl p-6 sm:p-8 ${
                  s.flip ? "lg:order-1" : ""
                }`}
              >
                <div className="bg-[#141834] border border-[#232A4E] rounded-2xl text-[#E8ECFF] p-6 max-w-md mx-auto shadow-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-[#232A4E]">
                    <span className="text-xs font-semibold text-[#9AA3D1]">{s.cardTitle}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#0B5BD3]/25 text-[#7DC8FF] border border-[#4A6CFF]/30">
                      {s.statusPill}
                    </span>
                  </div>

                  <dl className="mt-4 divide-y divide-[#232A4E]/60">
                    {s.rows.map(([k, v]) => (
                      <div key={k} className="flex justify-between py-2.5 text-xs sm:text-sm">
                        <dt className="text-[#9AA3D1]">{k}</dt>
                        <dd className="font-semibold text-[#E8ECFF]">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* ============================================================== */}
        {/* UNIFIED ARCHITECTURAL FAQS                                      */}
        {/* ============================================================== */}
        <section id="faq" className="scroll-mt-20 bg-[#F5F8FF] border-t border-b border-[#DCE4F5] py-20">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="max-w-2xl text-center mx-auto mb-12 space-y-3">
              <div className="text-xs font-semibold text-[#0B5BD3] uppercase tracking-wider">
                Unified Architectural FAQ
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

        {/* ============================================================== */}
        {/* CLOSING CALL TO ACTION                                         */}
        {/* ============================================================== */}
        <section className="bg-[#141834] text-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="max-w-xl space-y-2">
              <h2 className="font-display text-3xl lg:text-4xl tracking-tight">
                Establish a complete People & Talent Cloud.
              </h2>
              <p className="text-white/70 text-sm leading-relaxed">
                Schedule a 20-minute product tour with the Innovyx Tech Labs engineering team. We'll demonstrate both TalentFlow candidate pipelines and PeopleSuite operations tailored to your organization.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => openDemo("both")}
                className="px-6 py-3.5 rounded-xl bg-white text-[#141834] font-semibold hover:bg-[#EAF0FF] transition-all cursor-pointer shadow-md flex items-center gap-2"
              >
                <span>Schedule a 1-on-1 Walkthrough</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer theme="light" onOpenDemo={() => openDemo("both")} />
      <BookDemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        defaultPlatform={demoPlatform}
      />
    </div>
  );
}
