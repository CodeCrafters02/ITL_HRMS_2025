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
        desc: "Zero lost candidates — one Kanban from Applied to Offer with real-time stage alerts.",
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
        title: "Resdex to ATS in Minutes",
        desc: "Sourcing-to-submission drops from 3–4 hours to under 10 minutes per candidate.",
        screen: {
          kind: "stats",
          stats: [["312", "Profiles Synced"], ["96", "Duplicates Blocked"], ["0", "Credits Burned"], ["2 min", "Avg. Dossier Time"]],
          listTitle: "Recent Sync",
          rows: [["Cloud Platform JD", "Verified Unique", "ok"], ["Email + phone match", "Duplicate", "warn"], ["Profile ingested", "Synced", "info"]],
        },
      },
      {
        title: "Portal Credit Protection",
        desc: "Stop paying twice for the same CV — duplicates are caught before credits are debited.",
        screen: {
          kind: "stats",
          stats: [["96", "Duplicates Blocked"], ["0", "Credits Burned"], ["3", "Dedup Checks"], ["312", "Profiles Synced"]],
          listTitle: "Dedup Checks",
          rows: [["Email match", "Primary", "info"], ["Phone match", "Secondary", "info"], ["Name + company", "Tertiary", "info"]],
        },
      },
      {
        title: "Objective Screening Scorecards",
        desc: "Standardized rubrics remove recruiter bias and make every shortlist comparable.",
        screen: {
          kind: "scores",
          headline: "Siddharth Verma · Senior Backend Lead",
          badge: "89% AI Match",
          items: [["Skills", 92], ["Experience", 88], ["Education", 84], ["Location", 90]],
        },
      },
      {
        title: "Instant Client-Ready Dossiers",
        desc: "Branded, contact-masked PDF profiles rendered on demand by pre-warmed workers.",
        screen: {
          kind: "stats",
          stats: [["< 2 min", "Dossier Time"], ["24", "Dossiers Today"], ["100%", "Contacts Masked"], ["0", "Cold Starts"]],
          listTitle: "Recent Dossiers",
          rows: [["Backend Lead", "Branded PDF", "ok"], ["QA Engineer", "Contact masked", "info"], ["DevOps", "Rendering", "warn"]],
        },
      },
      {
        title: "3x Faster Client Decisions",
        desc: "Client feedback lands in hours, not days — straight from a secure review link.",
        screen: {
          kind: "stats",
          stats: [["24", "Dossiers Shared"], ["19", "Reviewed"], ["7", "Interviews Requested"], ["6 h", "Avg. Feedback"]],
          listTitle: "Client Decisions",
          rows: [["Backend Lead · 89%", "Interview", "ok"], ["QA Engineer · 81%", "Pending", "warn"], ["DevOps · 77%", "Rejected", "info"]],
        },
      },
      {
        title: "Quality Gates & Role Control",
        desc: "No unvetted candidate reaches a client — every submission passes TL and DM sign-off.",
        screen: {
          kind: "scores",
          headline: "Submission Approvals",
          badge: "DM Sign-off",
          items: [["Recruiter screening", 100], ["TL verification", 92], ["DM quality sign-off", 85]],
        },
      },
      {
        title: "Audit-Ready Onboarding",
        desc: "From offer to day-one joining with zero compliance risk and a full audit trail.",
        screen: {
          kind: "scores",
          headline: "Pre-Onboarding Checklist",
          badge: "Verified",
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

export interface Spotlight {
  icon: string;
  stat: [string, string];
  points: [string, string, string];
  chip: [string, string];
}

/** Marketing spotlight per carousel slide, keyed by slide title. */
export const SPOTLIGHTS: Record<string, Spotlight> = {
  "Live Attendance Dashboard": {
    icon: "pin_drop",
    stat: ["GPS", "Geofenced check-ins"],
    points: ["Geofence check-in & check-out", "Shift rosters and break discipline", "Multi-level leave approvals"],
    chip: ["notifications_active", "Leave request approved"],
  },
  "Statutory Payroll Engine": {
    icon: "account_balance_wallet",
    stat: ["4-in-1", "EPF · ESIC · PT · TDS"],
    points: ["Indian statutory slabs built in", "Attendance-linked salary runs", "Branded PDF payslips"],
    chip: ["receipt_long", "Payslips locked & disbursed"],
  },
  "2D Desk & Room Booking": {
    icon: "meeting_room",
    stat: ["2D", "Interactive floor plans"],
    points: ["Hot desk booking", "Conflict-free meeting rooms", "Permanent & flexible seating"],
    chip: ["event_seat", "Desk B-14 booked"],
  },
  "Performance & 360° Appraisals": {
    icon: "track_changes",
    stat: ["360°", "Multi-rater reviews"],
    points: ["KRA / KPI library", "Self, manager & peer reviews", "Rating-to-hike matrix"],
    chip: ["trending_up", "Appraisal cycle in review"],
  },
  "IT Assets & Inventory": {
    icon: "devices",
    stat: ["Live", "Low-stock alerts"],
    points: ["Serialized hardware & warranties", "Custodian hand-offs", "Consumable reorder alerts"],
    chip: ["inventory_2", "Reorder alert · cables"],
  },
  "Corporate LMS & HR Letters": {
    icon: "school",
    stat: ["Auto", "Offer & relieving letters"],
    points: ["Learning paths & certificates", "Compliance training tracking", "Automated HR letters"],
    chip: ["workspace_premium", "Certificate issued"],
  },
  "Candidate Pipeline": {
    icon: "view_kanban",
    stat: ["0", "Lost candidates"],
    points: ["Centralized Kanban across every stage", "Real-time stage notifications", "Scheduled management reports"],
    chip: ["notifications_active", "Moved to Interview"],
  },
  "Resdex to ATS in Minutes": {
    icon: "bolt",
    stat: ["75%", "Shorter sourcing cycle"],
    points: ["Profiles captured straight from Resdex", "Zero manual re-typing", "Per-recruiter weekly & monthly quotas"],
    chip: ["extension", "Profile synced in 1 click"],
  },
  "Portal Credit Protection": {
    icon: "savings",
    stat: ["30–40%", "Saved on portal spend"],
    points: ["Email → Phone → Name + Company checks", "Duplicates flagged before credits debit", "Concurrency limits prevent portal lockouts"],
    chip: ["block", "Duplicate blocked · credit saved"],
  },
  "Objective Screening Scorecards": {
    icon: "fact_check",
    stat: ["0–100%", "Multivariate fit score"],
    points: ["Skills, experience, education & location", "Confirmed vs. missing skills side by side", "One rating rubric for every recruiter"],
    chip: ["psychology", "89% AI match"],
  },
  "Instant Client-Ready Dossiers": {
    icon: "picture_as_pdf",
    stat: ["< 2 min", "Per client submission"],
    points: ["Pre-warmed workers — no cold starts", "Agency branding injected automatically", "Contact details masked by default"],
    chip: ["description", "Dossier ready · contact masked"],
  },
  "3x Faster Client Decisions": {
    icon: "speed",
    stat: ["3x", "Faster client responses"],
    points: ["From 4 days to under 12 hours", "No login — works on mobile & desktop", "Rejection reasons captured in the ATS"],
    chip: ["thumb_up", "Client requested interview"],
  },
  "Quality Gates & Role Control": {
    icon: "account_tree",
    stat: ["4", "Roles: Recruiter · TL · DM · Admin"],
    points: ["Recruiter scorecards & screening", "TL verification & pipeline assignment", "DM quality sign-off before release"],
    chip: ["verified", "DM sign-off complete"],
  },
  "Audit-Ready Onboarding": {
    icon: "verified_user",
    stat: ["100%", "Audit compliance"],
    points: ["Draft → Submitted → Verified lifecycle", "Aadhaar, PAN, payslips, degrees & relieving letters", "Tamper-evident audit trail"],
    chip: ["task_alt", "11/11 documents verified"],
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
