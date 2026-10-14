export type ProductId = "hrms" | "ats";
export type Tone = "ok" | "warn" | "info";

export type Screen =
  | { kind: "stats"; stats: [string, string][]; chart?: number[]; listTitle: string; rows: [string, string, Tone?][] }
  | { kind: "pipeline"; cols: { label: string; count: number; people: string[] }[] }
  | { kind: "desks"; legend: [string, string][]; free: number; booked: number }
  | { kind: "scores"; headline: string; badge: string; items: [string, number][] };

export interface Slide {
  title: string;
  desc: string;
  screen: Screen;
}

export interface Feature {
  icon: string;
  title: string;
  desc: string;
}

export interface ProductConfig {
  id: ProductId;
  brand: string;
  tab: string;
  tabIcon: string;
  heading: [string, string, string];
  intro: string;
  sidebar: string[];
  slides: Slide[];
  features: Feature[];
  ctaLabel: string;
  ctaHref: string;
  video: { src: string; poster: string; captions: string; title: string; blurb: string };
}

export const PRODUCTS: Record<ProductId, ProductConfig> = {
  hrms: {
    id: "hrms",
    brand: "PeopleSuite",
    tab: "PeopleSuite · HRMS",
    tabIcon: "badge",
    heading: ["Powerful ", "HRMS", " for a Productive Workforce"],
    intro:
      "Geofenced attendance, Indian statutory payroll, 2D hot desking, IT assets, performance and LMS — manage the entire employee lifecycle.",
    sidebar: ["Dashboard", "Employees", "Attendance", "Payroll", "Workspace", "Assets", "Performance", "Learning"],
    slides: [
      {
        title: "Live Attendance Dashboard",
        desc: "GPS geofence check-ins and break discipline across every shift.",
        screen: {
          kind: "stats",
          stats: [["248", "Scheduled Staff"], ["231", "Present in Geofence"], ["8", "On Approved Leave"], ["14", "Active Short Breaks"]],
          chart: [62, 70, 66, 78, 84, 80, 92, 96, 90, 94],
          listTitle: "Leave Requests",
          rows: [["Annual leave · 2 days", "Pending", "warn"], ["Sick leave · 1 day", "Approved", "ok"], ["Casual leave · 1 day", "Pending", "warn"]],
        },
      },
      {
        title: "Statutory Payroll Engine",
        desc: "EPF, ESIC, PT and TDS slabs linked to attendance, with branded payslips.",
        screen: {
          kind: "stats",
          stats: [["₹ 48.2 L", "Gross Earnings"], ["₹ 4.12 L", "EPF & ESIC"], ["₹ 1.78 L", "TDS & PT"], ["₹ 41.09 L", "Net Disbursable"]],
          listTitle: "March Payroll Batch · 342 Employees",
          rows: [["Gross Earnings", "₹ 48,20,000"], ["Employee Loan EMIs", "-₹ 1,20,000"], ["Payslips generated", "Locked & Disbursed", "ok"]],
        },
      },
      {
        title: "2D Desk & Room Booking",
        desc: "Interactive floor plans for hot desking and conflict-free meeting rooms.",
        screen: {
          kind: "desks",
          legend: [["Permanent", "#1E1AB8"], ["Booked", "#4A6CFF"], ["Available", "#DCE4F5"]],
          free: 14,
          booked: 38,
        },
      },
      {
        title: "Performance & 360° Appraisals",
        desc: "KRA/KPI tracking, multi-rater reviews and a rating-to-hike matrix.",
        screen: {
          kind: "scores",
          headline: "Annual Appraisal Cycle 2025–26",
          badge: "Review Phase",
          items: [["Self appraisals submitted", 96], ["Manager evaluations complete", 89], ["Peer reviews complete", 74]],
        },
      },
      {
        title: "IT Assets & Inventory",
        desc: "Serialized hardware, warranties, custodians and low-stock alerts.",
        screen: {
          kind: "stats",
          stats: [["184", "Laptops In-Use"], ["26", "In Stock"], ["4", "Warranty Repair"], ["48", "Consumable SKUs"]],
          listTitle: "Asset Requests",
          rows: [["Laptop · custodian change", "Approved", "ok"], ["Cables · reorder alert", "2 items", "warn"], ["Monitor · repair intake", "In review", "info"]],
        },
      },
      {
        title: "Corporate LMS & HR Letters",
        desc: "Learning paths, certificates and automated offer / relieving letters.",
        screen: {
          kind: "scores",
          headline: "Corporate Learning & Letters",
          badge: "Compliance Active",
          items: [["Mandatory compliance rate", 98], ["Courses completed", 81], ["Letters dispatched on time", 100]],
        },
      },
    ],
    features: [
      { icon: "pin_drop", title: "Attendance & Leave", desc: "Geofenced check-ins, shifts, breaks and multi-level leave approvals." },
      { icon: "account_balance_wallet", title: "Payroll Management", desc: "EPF, ESIC, PT and TDS with automated PDF payslips." },
      { icon: "track_changes", title: "Performance & Growth", desc: "KRA/KPI library, 360° appraisals and hike matrix." },
      { icon: "meeting_room", title: "Workspace & Assets", desc: "2D desk booking, meeting rooms and IT asset tracking." },
    ],
    ctaLabel: "Explore PeopleSuite Details",
    ctaHref: "/peoplesuite",
    video: {
      src: "",
      poster: "",
      captions: "",
      title: "PeopleSuite product walkthrough",
      blurb: "Watch how attendance, payroll, workspace and performance work together in PeopleSuite.",
    },
  },
  ats: {
    id: "ats",
    brand: "TalentFlow",
    tab: "TalentFlow · ATS",
    tabIcon: "person_search",
    heading: ["Find. Hire. Grow with ", "TalentFlow", ""],
    intro:
      "1-click Naukri sourcing, 3-tier deduplication, AI fit scoring and tokenized client portals — one pipeline from sourcing to onboarding.",
    sidebar: ["Dashboard", "Jobs", "Candidates", "Pipeline", "Client Portal", "Onboarding", "Reports"],
    slides: [
      {
        title: "Candidate Pipeline",
        desc: "Applied → Screening → Interview → Offer with recruiter, TL and DM gates.",
        screen: {
          kind: "pipeline",
          cols: [
            { label: "Applied", count: 142, people: ["Siddharth Verma", "Ananya Nair", "Vikram S"] },
            { label: "Screening", count: 68, people: ["Arjun Kumar", "Sneha Reddy", "Rahul Das"] },
            { label: "Interview", count: 37, people: ["Divya Menon", "Karthik S", "Farhan Ali"] },
            { label: "Offer", count: 18, people: ["Neha Iyer", "Rohit B", "Priya S"] },
          ],
        },
      },
      {
        title: "AI Fit & Skill Gap Engine",
        desc: "0–100% scoring across skills, experience, education and location.",
        screen: {
          kind: "scores",
          headline: "Siddharth Verma · Senior Backend Lead",
          badge: "89% AI Match",
          items: [["Skills", 92], ["Experience", 88], ["Education", 84], ["Location", 90]],
        },
      },
      {
        title: "1-Click Sourcing & Dedup",
        desc: "Naukri Resdex capture with 3-tier deduplication before credits are spent.",
        screen: {
          kind: "stats",
          stats: [["312", "Profiles Synced"], ["96", "Duplicates Blocked"], ["0", "Credits Burned"], ["2 min", "Avg. Dossier Time"]],
          listTitle: "Recent Sync",
          rows: [["Cloud Platform JD", "Verified Unique", "ok"], ["Email + phone match", "Duplicate", "warn"], ["Profile ingested", "Synced", "info"]],
        },
      },
      {
        title: "Tokenized Client Portal",
        desc: "Passwordless links with match scores and 1-click Accept, Reject or Interview.",
        screen: {
          kind: "stats",
          stats: [["24", "Dossiers Shared"], ["19", "Reviewed"], ["7", "Interviews Requested"], ["6 h", "Avg. Feedback"]],
          listTitle: "Client Decisions",
          rows: [["Backend Lead · 89%", "Interview", "ok"], ["QA Engineer · 81%", "Pending", "warn"], ["DevOps · 77%", "Rejected", "info"]],
        },
      },
      {
        title: "DPDP Pre-Onboarding",
        desc: "11-point verification checklist converting into PeopleSuite employees.",
        screen: {
          kind: "scores",
          headline: "Pre-Onboarding Checklist",
          badge: "Ready for PeopleSuite",
          items: [["Identity proofs", 100], ["Academic degrees", 100], ["Relieving letters", 82]],
        },
      },
    ],
    features: [
      { icon: "extension", title: "1-Click Sourcing", desc: "Capture Naukri Resdex profiles straight into the pipeline." },
      { icon: "query_stats", title: "AI Fit Scoring", desc: "Objective match scores and skill-gap flags per profile." },
      { icon: "forum", title: "Client Portal", desc: "Tokenized review links with 1-click client decisions." },
      { icon: "verified_user", title: "Compliant Onboarding", desc: "DPDP-aware verification with immutable audit trails." },
    ],
    ctaLabel: "Explore TalentFlow Details",
    ctaHref: "/talentflow",
    video: {
      src: "",
      poster: "",
      captions: "",
      title: "TalentFlow product walkthrough",
      blurb: "Watch how sourcing, AI scoring and client review work together in TalentFlow.",
    },
  },
};

export const BENEFITS: Feature[] = [
  { icon: "groups", title: "Streamline HR Operations", desc: "Automate routine tasks and focus on what matters." },
  { icon: "verified_user", title: "Ensure Compliance", desc: "Stay aligned with labor laws and company policies." },
  { icon: "bar_chart", title: "Gain Actionable Insights", desc: "Make data-driven decisions with powerful reports." },
  { icon: "rocket_launch", title: "Build a Better Workplace", desc: "Create a positive and productive environment." },
];

export const TESTIMONIALS = [
  { quote: "Placeholder testimonial — replace with a verified customer quote.", name: "Sample Name", role: "HR Manager", company: "Sample Company" },
  { quote: "Placeholder testimonial — replace with a verified customer quote.", name: "Sample Name", role: "Head of Talent", company: "Sample Company" },
  { quote: "Placeholder testimonial — replace with a verified customer quote.", name: "Sample Name", role: "People Operations", company: "Sample Company" },
];
