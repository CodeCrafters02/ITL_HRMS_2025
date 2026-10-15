"use client";

import React from "react";
import Link from "next/link";
import type { ProductId } from "@/data/showcase";

const Icon = ({ name, className = "" }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`} aria-hidden="true">
    {name}
  </span>
);

type Mark = "yes" | "partial" | "no";

interface MarketingConfig {
  values: [string, string][];
  audience: { icon: string; role: string; tagline: string; text: string }[];
  compare: { cols: [string, string, string]; rows: [string, Mark, Mark][] };
  rollout: { icon: string; title: string; desc: string }[];
  trust: [string, string, string][];
  crossSell: { eyebrow: string; title: string; text: string; points: string[]; href: string; cta: string };
}

const CONFIG: Record<ProductId, MarketingConfig> = {
  hrms: {
    values: [
      ["12", "Core HR modules in one engine"],
      ["4-in-1", "EPF · ESIC · PT · TDS payroll"],
      ["360°", "Multi-rater appraisals"],
      ["1", "Connected record per employee"],
    ],
    audience: [
      { icon: "admin_panel_settings", role: "HR Admins", tagline: "Policies on autopilot", text: "Configure shifts, leave rules and HR letters once — approvals and reminders run themselves." },
      { icon: "account_balance", role: "Finance & Payroll", tagline: "Statutory-ready every month", text: "EPF, ESIC, PT and TDS computed from live attendance, with locked batches and branded payslips." },
      { icon: "supervisor_account", role: "Managers", tagline: "Team visibility, no spreadsheets", text: "Approve leave, track KRAs and run appraisals from a single dashboard." },
      { icon: "badge", role: "Employees", tagline: "Self-service from day one", text: "Geofenced check-ins, leave, desk booking, asset requests and learning in one place." },
    ],
    compare: {
      cols: ["Spreadsheets & email", "Generic HR tools", "PeopleSuite"],
      rows: [
        ["Geofenced GPS attendance & break limits", "no", "partial"],
        ["Indian statutory payroll (EPF · ESIC · PT · TDS)", "no", "partial"],
        ["2D desk & meeting-room booking", "no", "no"],
        ["IT asset & consumable inventory", "no", "partial"],
        ["360° appraisals with rating-to-hike matrix", "no", "partial"],
        ["Corporate LMS & automated HR letters", "no", "partial"],
        ["Employee loans & advances with EMI deduction", "no", "partial"],
      ],
    },
    rollout: [
      { icon: "forum", title: "Discovery walkthrough", desc: "We map your org structure, policies and payroll components." },
      { icon: "upload_file", title: "Data import", desc: "Employees, salary structures, assets and leave balances move in." },
      { icon: "tune", title: "Configure rules", desc: "Shifts, geofences, leave policies and statutory slabs set up for you." },
      { icon: "rocket_launch", title: "Go live", desc: "Admins trained, first payroll validated, employees onboarded." },
    ],
    trust: [
      ["lock", "256-bit SSL", "Encrypted in transit"],
      ["admin_panel_settings", "Granular RBAC", "Role-based access control"],
      ["history", "Audit trails", "Tamper-evident activity logs"],
      ["gavel", "Statutory ready", "EPF · ESIC · PT · TDS"],
    ],
    crossSell: {
      eyebrow: "Also from Innovyx Tech Labs",
      title: "Hiring too? Meet TalentFlow, our dedicated ATS.",
      text: "A separate recruitment platform for agencies and talent acquisition teams — sold and deployed on its own.",
      points: ["1-click Naukri Resdex sourcing with 3-tier dedup", "AI fit scoring and skill-gap analysis", "Password-free client review portal"],
      href: "/talentflow",
      cta: "Explore TalentFlow ATS",
    },
  },
  ats: {
    values: [],
    audience: [],
    compare: { cols: ["", "", ""], rows: [] },
    rollout: [],
    trust: [
      ["lock", "256-bit SSL", "Encrypted in transit"],
      ["admin_panel_settings", "Granular RBAC", "Recruiter, TL & DM roles"],
      ["history", "Immutable audit logs", "Every profile access tracked"],
      ["shield_lock", "DPDP-ready", "Compliant pre-onboarding"],
    ],
    crossSell: {
      eyebrow: "Also from Innovyx Tech Labs",
      title: "Managing a workforce? Meet PeopleSuite, our dedicated HRMS.",
      text: "A separate HR platform engineered for Indian workforce operations — sold and deployed on its own.",
      points: ["GPS geofenced attendance and shift rules", "Indian statutory payroll (EPF · ESIC · PT · TDS)", "2D desk booking, IT assets and 360° appraisals"],
      href: "/peoplesuite",
      cta: "Explore PeopleSuite HRMS",
    },
  },
};

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#0B5BD3]">{children}</div>
);

export function ValueStrip({ product }: { product: ProductId }) {
  return (
    <section className="border-b border-[#DCE4F5]/60 bg-white">
      <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-10 lg:grid-cols-4 lg:px-12">
        {CONFIG[product].values.map(([v, l]) => (
          <div key={l} className="text-center lg:border-r lg:border-[#DCE4F5] lg:last:border-0">
            <dt className="font-display text-3xl tracking-tight text-[#1E1AB8] lg:text-4xl">{v}</dt>
            <dd className="mt-1 text-xs text-[#5B6488]">{l}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function AudienceGrid({ product }: { product: ProductId }) {
  return (
    <section className="border-b border-[#DCE4F5]/60 bg-white py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="mb-12 max-w-2xl">
          <Eyebrow>Built for every team</Eyebrow>
          <h2 className="font-display text-3xl tracking-tight lg:text-4xl">One platform. Value for everyone who touches HR.</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CONFIG[product].audience.map((a) => (
            <div key={a.role} className="group rounded-2xl border border-[#DCE4F5] bg-white p-6 transition-all hover:-translate-y-1 hover:border-[#4A6CFF]/50 hover:shadow-md">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#1E1AB8] to-[#4A6CFF] text-white">
                <Icon name={a.icon} className="!text-[22px]" />
              </span>
              <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#5B6488]">{a.role}</div>
              <h3 className="mt-1 font-semibold text-[#0B0F2E]">{a.tagline}</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#5B6488]">{a.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const MarkCell = ({ m, hl = false }: { m: Mark; hl?: boolean }) => {
  const [icon, cls, label] =
    m === "yes" ? ["check_circle", hl ? "text-[#1E1AB8]" : "text-[#16A34A]", "Included"] : m === "partial" ? ["remove_circle", "text-[#D97706]", "Partial / add-on"] : ["cancel", "text-[#C9D3EE]", "Not available"];
  return (
    <td className={`px-4 py-3 text-center ${hl ? "bg-[#EAF0FF]" : ""}`}>
      <Icon name={icon} className={`!text-[22px] ${cls}`} />
      <span className="sr-only">{label}</span>
    </td>
  );
};

export function ComparisonTable({ product }: { product: ProductId }) {
  const { cols, rows } = CONFIG[product].compare;
  return (
    <section id="compare" className="scroll-mt-24 border-b border-[#DCE4F5] bg-[#F5F8FF] py-20">
      <div className="mx-auto max-w-5xl px-6 lg:px-12">
        <div className="mb-10 text-center">
          <Eyebrow>Why switch</Eyebrow>
          <h2 className="font-display text-3xl tracking-tight lg:text-4xl">Everything your current stack is missing.</h2>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-[#DCE4F5] bg-white shadow-sm">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-[#DCE4F5]">
                <th className="px-4 py-4 text-left font-semibold text-[#5B6488]">Capability</th>
                {cols.map((c, i) => (
                  <th key={c} className={`px-4 py-4 text-center font-semibold ${i === 2 ? "bg-[#1E1AB8] text-white" : "text-[#5B6488]"}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE4F5]">
              {rows.map(([cap, a, b]) => (
                <tr key={cap}>
                  <th scope="row" className="px-4 py-3 text-left font-medium text-[#0B0F2E]">{cap}</th>
                  <MarkCell m={a} />
                  <MarkCell m={b} />
                  <MarkCell m="yes" hl />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function RolloutSteps({ product, onDemo }: { product: ProductId; onDemo: () => void }) {
  return (
    <section id="onboarding" className="scroll-mt-24 border-b border-[#DCE4F5]/60 bg-white py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <Eyebrow>Guided onboarding</Eyebrow>
            <h2 className="font-display text-3xl tracking-tight lg:text-4xl">Live in four guided steps.</h2>
          </div>
          <button
            type="button"
            onClick={onDemo}
            className="inline-flex items-center gap-2 self-start rounded-full bg-[#141834] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#232A4E] md:self-auto"
          >
            Start with a walkthrough
            <Icon name="arrow_forward" className="!text-[18px]" />
          </button>
        </div>
        <ol className="grid gap-6 md:grid-cols-4">
          {CONFIG[product].rollout.map((s, i) => (
            <li key={s.title} className="relative">
              {i < 3 && <span aria-hidden className="absolute left-14 right-0 top-6 hidden h-px bg-gradient-to-r from-[#4A6CFF]/60 to-transparent md:block" />}
              <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF0FF] text-[#1E1AB8] ring-4 ring-white">
                <Icon name={s.icon} className="!text-[24px]" />
              </span>
              <div className="mt-4 text-xs font-bold text-[#4A6CFF]">STEP {i + 1}</div>
              <h3 className="mt-1 font-semibold text-[#0B0F2E]">{s.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#5B6488]">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function TrustBar({ product }: { product: ProductId }) {
  return (
    <section id="security" className="scroll-mt-24 border-b border-[#DCE4F5]/60 bg-white py-14">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <p className="mb-8 text-center text-xs font-semibold uppercase tracking-wider text-[#5B6488]">Enterprise-grade security & compliance</p>
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {CONFIG[product].trust.map(([icon, title, sub]) => (
            <li key={title} className="flex items-center gap-3 rounded-2xl border border-[#DCE4F5] bg-[#F5F8FF] px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#1E1AB8] shadow-sm">
                <Icon name={icon} className="!text-[20px]" />
              </span>
              <div>
                <div className="text-sm font-bold text-[#0B0F2E]">{title}</div>
                <div className="text-[11px] text-[#5B6488]">{sub}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function CrossSell({ product }: { product: ProductId }) {
  const c = CONFIG[product].crossSell;
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="grid items-center gap-8 rounded-3xl bg-gradient-to-br from-[#EAF0FF] via-[#EFEBFF] to-[#DDE6FF] p-8 sm:p-10 lg:grid-cols-2">
          <div className="space-y-3">
            <Eyebrow>{c.eyebrow}</Eyebrow>
            <h2 className="font-display text-2xl tracking-tight text-[#0B0F2E] lg:text-3xl">{c.title}</h2>
            <p className="text-sm leading-relaxed text-[#5B6488]">{c.text}</p>
            <Link href={c.href} className="inline-flex items-center gap-2 pt-2 text-sm font-bold text-[#1E1AB8] hover:underline">
              {c.cta}
              <Icon name="arrow_forward" className="!text-[18px]" />
            </Link>
          </div>
          <ul className="space-y-3">
            {c.points.map((pt, i) => (
              <li key={pt} className="flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 shadow-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1E1AB8] text-xs font-bold text-white">{i + 1}</span>
                <span className="text-sm font-medium text-[#0B0F2E]">{pt}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
