"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { usePathname } from "next/navigation";

interface NavbarProps {
  onOpenDemo?: () => void;
  onSelectProduct?: (p: "hrms" | "ats") => void;
}

type NavItem = { icon: string; title: string; desc: string; href: string };
type MenuId = "products" | "solutions" | "resources";

const PRODUCTS: { name: string; tag: string; href: string; cta: string; items: NavItem[] }[] = [
  {
    name: "TalentFlow",
    tag: "AI-Powered ATS",
    href: "/talentflow",
    cta: "Explore TalentFlow",
    items: [
      { icon: "extension", title: "1-Click Sourcing", desc: "Naukri Resdex sync with 3-tier dedup", href: "/talentflow#features" },
      { icon: "query_stats", title: "AI Fit Scoring", desc: "0–100% match & skill-gap analysis", href: "/talentflow#features" },
      { icon: "forum", title: "Client Review Portal", desc: "Password-free, 1-click decisions", href: "/talentflow#features" },
      { icon: "verified_user", title: "DPDP Pre-Onboarding", desc: "11-point verified document checklist", href: "/talentflow#how" },
    ],
  },
  {
    name: "PeopleSuite",
    tag: "Statutory HRMS",
    href: "/peoplesuite",
    cta: "Explore PeopleSuite",
    items: [
      { icon: "pin_drop", title: "Geofenced Attendance", desc: "GPS check-ins, shifts & breaks", href: "/peoplesuite#attendance" },
      { icon: "account_balance_wallet", title: "Statutory Payroll", desc: "EPF · ESIC · PT · TDS & payslips", href: "/peoplesuite#payroll" },
      { icon: "meeting_room", title: "Desk & Asset Hub", desc: "2D floor plans & IT inventory", href: "/peoplesuite#workspace" },
      { icon: "track_changes", title: "Performance & LMS", desc: "360° appraisals & learning paths", href: "/peoplesuite#performance" },
    ],
  },
];

const SOLUTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Recruitment · TalentFlow",
    items: [
      { icon: "groups", title: "Recruitment Agencies & RPO", desc: "Cut portal spend and submit faster", href: "/talentflow" },
      { icon: "work", title: "Enterprise Talent Acquisition", desc: "Governed hiring with TL & DM gates", href: "/talentflow#how" },
      { icon: "handshake", title: "Client Delivery Teams", desc: "Branded dossiers & password-free reviews", href: "/talentflow#features" },
    ],
  },
  {
    label: "Workforce · PeopleSuite",
    items: [
      { icon: "badge", title: "HR & People Operations", desc: "12 modules for the full employee lifecycle", href: "/peoplesuite#modules" },
      { icon: "gavel", title: "Payroll & Compliance", desc: "Indian statutory payroll, audit-ready", href: "/peoplesuite#payroll" },
      { icon: "chair_alt", title: "Hybrid Workplaces", desc: "Hot desks, rooms and asset custody", href: "/peoplesuite#workspace" },
    ],
  },
];

const RESOURCES: NavItem[] = [
  { icon: "play_circle", title: "Product Tour", desc: "Watch TalentFlow and PeopleSuite tours", href: "/#video" },
  { icon: "calculate", title: "ROI Calculator", desc: "Estimate HR hours saved", href: "/peoplesuite#roi" },
  { icon: "compare_arrows", title: "Why Switch", desc: "Compare against spreadsheets & legacy tools", href: "/peoplesuite#compare" },
  { icon: "shield_lock", title: "Security & Compliance", desc: "SSL, RBAC, audit trails, DPDP", href: "/peoplesuite#security" },
  { icon: "help", title: "FAQ", desc: "Answers on architecture & rollout", href: "/#faq" },
];

const MENUS: { id: MenuId; label: string }[] = [
  { id: "products", label: "Products" },
  { id: "solutions", label: "Solutions" },
  { id: "resources", label: "Resources" },
];

const Icon = ({ name, className = "" }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`} aria-hidden="true">
    {name}
  </span>
);

const ItemLink = ({ item, onClick }: { item: NavItem; onClick: () => void }) => (
  <Link href={item.href} onClick={onClick} className="group flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-[#F5F8FF]">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF0FF] text-[#1E1AB8] transition-colors group-hover:bg-[#1E1AB8] group-hover:text-white">
      <Icon name={item.icon} className="!text-[20px]" />
    </span>
    <span>
      <span className="block text-sm font-semibold text-[#0B0F2E] group-hover:text-[#0B5BD3]">{item.title}</span>
      <span className="block text-[11px] text-[#5B6488]">{item.desc}</span>
    </span>
  </Link>
);

export default function Navbar({ onOpenDemo }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [open, setOpen] = useState<MenuId | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => !navRef.current?.contains(e.target as Node) && setOpen(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(null);
      setMobileMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const close = () => {
    setOpen(null);
    setMobileMenuOpen(false);
  };
  const isActive = (id: MenuId) => open === id || (id === "products" && (pathname === "/talentflow" || pathname === "/peoplesuite"));

  const panel = (id: MenuId) => {
    if (id === "products")
      return (
        <div className="w-[640px]">
          <div className="grid grid-cols-2 gap-4 p-4">
            {PRODUCTS.map((p) => (
              <div key={p.name}>
                <Link href={p.href} onClick={close} className="mb-1 flex items-baseline justify-between rounded-lg px-2.5 py-1.5 hover:bg-[#F5F8FF]">
                  <span className="font-display text-base text-[#0B0F2E]">{p.name}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0B5BD3]">{p.tag}</span>
                </Link>
                {p.items.map((it) => (
                  <ItemLink key={it.title} item={it} onClick={close} />
                ))}
                <Link href={p.href} onClick={close} className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#0B5BD3] hover:underline">
                  {p.cta}
                  <Icon name="arrow_forward" className="!text-[14px]" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      );
    if (id === "solutions")
      return (
        <div className="grid w-[600px] grid-cols-2 gap-4 p-4">
          {SOLUTIONS.map((g) => (
            <div key={g.label}>
              <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#0B5BD3]">{g.label}</div>
              {g.items.map((it) => (
                <ItemLink key={it.title} item={it} onClick={close} />
              ))}
            </div>
          ))}
        </div>
      );
    return (
      <div className="grid w-[320px] gap-1 p-3">
        {RESOURCES.map((it) => (
          <ItemLink key={it.title} item={it} onClick={close} />
        ))}
      </div>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#DCE4F5]/70 bg-white/95 shadow-[0_1px_8px_rgba(11,91,211,0.06)] backdrop-blur-md transition-all duration-200">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-6 px-6 lg:px-12">
        <div className="flex items-center gap-8">
          <Link href="/" onClick={close} aria-label="Innovyx Tech Labs home">
            <BrandLogo className="h-14 -translate-y-2" />
          </Link>

          <nav ref={navRef} aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {MENUS.map(({ id, label }) => (
              <div key={id} className="relative py-2" onMouseEnter={() => setOpen(id)} onMouseLeave={() => setOpen(null)}>
                <button
                  type="button"
                  onClick={() => setOpen((o) => (o === id ? null : id))}
                  aria-expanded={open === id}
                  aria-haspopup="true"
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 font-label-lg text-label-lg transition-colors ${
                    isActive(id) ? "font-semibold text-[#0B5BD3]" : "text-[#5B6488] hover:text-[#0B0F2E]"
                  }`}
                >
                  {label}
                  <Icon name="expand_more" className={`!text-[18px] transition-transform duration-200 ${open === id ? "rotate-180" : ""}`} />
                </button>
                <div
                  className={`absolute left-0 top-full pt-2 transition-all duration-200 ${
                    open === id ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible translate-y-1 opacity-0"
                  }`}
                >
                  <div className="rounded-2xl border border-[#DCE4F5] bg-white shadow-[0_10px_25px_-5px_rgba(11,91,211,0.15)]">{panel(id)}</div>
                </div>
              </div>
            ))}
            <Link href="/#video" onClick={close} className="rounded-full px-3 py-1.5 font-label-lg text-label-lg text-[#5B6488] transition-colors hover:text-[#0B0F2E]">
              Product Tour
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              close();
              onOpenDemo?.();
            }}
            className="inline-flex items-center justify-center rounded-full bg-[#141834] px-5 py-2.5 font-label-lg text-label-lg text-white shadow-md transition-all hover:bg-[#232A4E] hover:shadow-lg hover:shadow-[#4A6CFF]/30 active:scale-[0.98]"
          >
            Book a Demo
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="rounded-xl p-2 text-[#0B0F2E] transition-colors hover:bg-[#F5F8FF] lg:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <Icon name={mobileMenuOpen ? "close" : "menu"} className="!text-[24px]" />
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="max-h-[calc(100vh-76px)] space-y-5 overflow-y-auto border-b border-[#DCE4F5] bg-white px-6 py-5 shadow-xl lg:hidden">
          {PRODUCTS.map((p) => (
            <div key={p.name}>
              <Link href={p.href} onClick={close} className="flex items-baseline justify-between pb-1">
                <span className="font-display text-base text-[#0B0F2E]">{p.name}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0B5BD3]">{p.tag}</span>
              </Link>
              {p.items.map((it) => (
                <ItemLink key={it.title} item={it} onClick={close} />
              ))}
            </div>
          ))}
          {[...SOLUTIONS.map((g) => [`Solutions · ${g.label.split(" · ")[1]}`, g.items] as const), ["Resources", RESOURCES] as const].map(([label, items]) => (
            <div key={label} className="border-t border-[#DCE4F5] pt-4">
              <div className="pb-1 text-xs font-bold uppercase tracking-wider text-[#0B5BD3]">{label}</div>
              {items.map((it) => (
                <ItemLink key={it.title} item={it} onClick={close} />
              ))}
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              close();
              onOpenDemo?.();
            }}
            className="w-full rounded-xl border border-[#4A6CFF]/40 bg-[#141834] py-3 text-center font-semibold text-white shadow-md transition-all hover:bg-[#232A4E]"
          >
            Book a 1-on-1 Demo
          </button>
        </div>
      )}
    </header>
  );
}
