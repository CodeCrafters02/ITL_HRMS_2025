"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavbarProps {
  onOpenDemo?: () => void;
}

export default function Navbar({ onOpenDemo }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const talentDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        talentDropdownRef.current &&
        !talentDropdownRef.current.contains(event.target as Node)
      ) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Close menus on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveDropdown(null);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const closeDropdown = () => setActiveDropdown(null);

  const isDarkNav = false;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        isDarkNav
          ? "bg-[#0A0B14]/95 backdrop-blur-md shadow-[0_1px_12px_rgba(74,108,255,0.12)] border-b border-[#4A6CFF]/20"
          : "bg-white/95 backdrop-blur-md shadow-[0_1px_8px_rgba(11,91,211,0.06)] border-b border-[#DCE4F5]/70"
      }`}
    >
      <div className="h-[72px] max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between gap-6">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-7">
          <Link href="/" onClick={closeDropdown} className="flex items-center gap-3">
            <img src="/logo.png" alt="PeopleSuite" className="h-12 w-auto bg-white rounded-lg p-1" />
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-sm tracking-tight text-[#0B0F2E] leading-tight">
                PeopleSuite <span className="text-[#0B5BD3]">+ TalentFlow</span>
              </span>
              <span className="text-[10px] text-[#5B6488] font-medium leading-none">
                by Innovyx Tech Labs LLP
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            {/* TalentFlow Dropdown */}
            <div
              ref={talentDropdownRef}
              className="relative py-2"
              onMouseEnter={() => setActiveDropdown("talentflow")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                type="button"
                onClick={() =>
                  setActiveDropdown((prev) => (prev === "talentflow" ? null : "talentflow"))
                }
                aria-expanded={activeDropdown === "talentflow"}
                aria-haspopup="true"
                className={`flex items-center gap-1 font-label-lg text-label-lg transition-colors cursor-pointer select-none ${
                  activeDropdown === "talentflow" || pathname === "/talentflow"
                    ? "text-[#0B5BD3] font-semibold"
                    : "text-[#5B6488] hover:text-[#0B0F2E]"
                }`}
              >
                <span>TalentFlow</span>
                <span
                  className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${
                    activeDropdown === "talentflow" ? "rotate-180 text-[#0B5BD3]" : ""
                  }`}
                >
                  expand_more
                </span>
              </button>

              <div
                className={`absolute top-full left-0 w-[420px] pt-2 transition-all duration-200 ${
                  activeDropdown === "talentflow"
                    ? "opacity-100 translate-y-0 visible pointer-events-auto"
                    : "opacity-0 translate-y-1 invisible pointer-events-none"
                }`}
              >
                <div className="rounded-2xl p-4 shadow-xl border bg-white border-[#DCE4F5] shadow-[0_10px_25px_-5px_rgba(11,91,211,0.12)] space-y-1.5">
                  <div className="px-2 py-1 text-[11px] font-bold text-[#0B5BD3] uppercase tracking-wider">
                    Candidate Sourcing & Screening
                  </div>

                  <Link
                    href="/#talentflow"
                    onClick={closeDropdown}
                    className="flex items-start gap-3 p-2.5 rounded-xl font-body-sm text-body-sm transition-colors cursor-pointer text-[#0B0F2E] hover:bg-[#F5F8FF] hover:text-[#0B5BD3]"
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#0B5BD3] mt-0.5">
                      extension
                    </span>
                    <div>
                      <div className="font-semibold text-sm">1-Click Sourcing Gateway</div>
                      <div className="text-[11px] text-[#5B6488]">
                        Chrome MV3 sync for Naukri Resdex + 3-tier dedup
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/#talentflow"
                    onClick={closeDropdown}
                    className="flex items-start gap-3 p-2.5 rounded-xl font-body-sm text-body-sm transition-colors cursor-pointer text-[#0B0F2E] hover:bg-[#F5F8FF] hover:text-[#0B5BD3]"
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#4A6CFF] mt-0.5">
                      query_stats
                    </span>
                    <div>
                      <div className="font-semibold text-sm">AI Fit & Gap Scorecards</div>
                      <div className="text-[11px] text-[#5B6488]">
                        0-100% multivariate match against Job Description
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/#talentflow"
                    onClick={closeDropdown}
                    className="flex items-start gap-3 p-2.5 rounded-xl font-body-sm text-body-sm transition-colors cursor-pointer text-[#0B0F2E] hover:bg-[#F5F8FF] hover:text-[#0B5BD3]"
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#1E1AB8] mt-0.5">
                      picture_as_pdf
                    </span>
                    <div>
                      <div className="font-semibold text-sm">Playwright PDF Dossiers</div>
                      <div className="text-[11px] text-[#5B6488]">
                        Branded candidate CVs with contact privacy masking
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/#talentflow"
                    onClick={closeDropdown}
                    className="flex items-start gap-3 p-2.5 rounded-xl font-body-sm text-body-sm transition-colors cursor-pointer text-[#0B0F2E] hover:bg-[#F5F8FF] hover:text-[#0B5BD3]"
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#0B5BD3] mt-0.5">
                      forum
                    </span>
                    <div>
                      <div className="font-semibold text-sm">Tokenized Client Portal</div>
                      <div className="text-[11px] text-[#5B6488]">
                        Passwordless links with 1-click Accept / Reject
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/#talentflow"
                    onClick={closeDropdown}
                    className="flex items-start gap-3 p-2.5 rounded-xl font-body-sm text-body-sm transition-colors cursor-pointer text-[#0B0F2E] hover:bg-[#F5F8FF] hover:text-[#0B5BD3]"
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#0B5BD3] mt-0.5">
                      verified_user
                    </span>
                    <div>
                      <div className="font-semibold text-sm">DPDP Pre-Onboarding Verification</div>
                      <div className="text-[11px] text-[#5B6488]">
                        11-point doc checklist ➔ converts directly to PeopleSuite
                      </div>
                    </div>
                  </Link>

                  <div className="pt-2 border-t border-[#DCE4F5]/60 mt-1">
                    <Link
                      href="/talentflow"
                      onClick={closeDropdown}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#0B5BD3] hover:bg-[#EAF0FF] transition-colors"
                    >
                      <span>Explore Dedicated TalentFlow Page</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* PeopleSuite Platform Modules Dropdown */}
            <div
              ref={dropdownRef}
              className="relative py-2"
              onMouseEnter={() => setActiveDropdown("product")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                type="button"
                onClick={() =>
                  setActiveDropdown((prev) => (prev === "product" ? null : "product"))
                }
                aria-expanded={activeDropdown === "product"}
                aria-haspopup="true"
                className={`flex items-center gap-1 font-label-lg text-label-lg transition-colors cursor-pointer select-none ${
                  activeDropdown === "product"
                    ? "text-[#0B5BD3] font-semibold"
                    : "text-[#5B6488] hover:text-[#0B0F2E]"
                }`}
              >
                <span>PeopleSuite</span>
                <span
                  className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${
                    activeDropdown === "product" ? "rotate-180 text-[#0B5BD3]" : ""
                  }`}
                >
                  expand_more
                </span>
              </button>
              <div
                className={`absolute top-full left-0 w-[580px] pt-2 transition-all duration-200 ${
                  activeDropdown === "product"
                    ? "opacity-100 translate-y-0 visible pointer-events-auto"
                    : "opacity-0 translate-y-1 invisible pointer-events-none"
                }`}
              >
                <div className="rounded-2xl p-4 shadow-xl border grid grid-cols-2 gap-2 bg-white border-[#DCE4F5] shadow-[0_10px_25px_-5px_rgba(11,91,211,0.12)]">
                  <Link
                    href="/#pillars"
                    onClick={closeDropdown}
                    className="flex items-start gap-3 p-2.5 rounded-xl font-body-sm text-body-sm transition-colors cursor-pointer text-[#0B0F2E] hover:bg-[#F5F8FF] hover:text-[#0B5BD3]"
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#0B5BD3] mt-0.5">
                      badge
                    </span>
                    <div>
                      <div className="font-semibold text-sm">Core HR & Directory</div>
                      <div className="text-[11px] opacity-75">Profiles, hierarchy & vault</div>
                    </div>
                  </Link>

                  <Link
                    href="/#attendance"
                    onClick={closeDropdown}
                    className="flex items-start gap-3 p-2.5 rounded-xl font-body-sm text-body-sm transition-colors cursor-pointer text-[#0B0F2E] hover:bg-[#F5F8FF] hover:text-[#0B5BD3]"
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#4A6CFF] mt-0.5">
                      pin_drop
                    </span>
                    <div>
                      <div className="font-semibold text-sm">Geofenced Attendance</div>
                      <div className="text-[11px] opacity-75">GPS perimeter & Wi-Fi IP sync</div>
                    </div>
                  </Link>

                  <Link
                    href="/#payroll"
                    onClick={closeDropdown}
                    className="flex items-start gap-3 p-2.5 rounded-xl font-body-sm text-body-sm transition-colors cursor-pointer text-[#0B0F2E] hover:bg-[#F5F8FF] hover:text-[#0B5BD3]"
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#1E1AB8] mt-0.5">
                      account_balance_wallet
                    </span>
                    <div>
                      <div className="font-semibold text-sm">Statutory Payroll</div>
                      <div className="text-[11px] opacity-75">EPF, ESIC, PT, TDS & Payslips</div>
                    </div>
                  </Link>

                  <Link
                    href="/#workspace"
                    onClick={closeDropdown}
                    className="flex items-start gap-3 p-2.5 rounded-xl font-body-sm text-body-sm transition-colors cursor-pointer text-[#0B0F2E] hover:bg-[#F5F8FF] hover:text-[#0B5BD3]"
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#0B5BD3] mt-0.5">
                      meeting_room
                    </span>
                    <div>
                      <div className="font-semibold text-sm">2D Desk & Rooms</div>
                      <div className="text-[11px] opacity-75">Visual interactive floor map</div>
                    </div>
                  </Link>

                  <Link
                    href="/#assets"
                    onClick={closeDropdown}
                    className="flex items-start gap-3 p-2.5 rounded-xl font-body-sm text-body-sm transition-colors cursor-pointer text-[#0B0F2E] hover:bg-[#F5F8FF] hover:text-[#0B5BD3]"
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#4A6CFF] mt-0.5">
                      laptop_mac
                    </span>
                    <div>
                      <div className="font-semibold text-sm">Fixed IT Assets</div>
                      <div className="text-[11px] opacity-75">Hardware lifecycle & custody</div>
                    </div>
                  </Link>

                  <Link
                    href="/#performance"
                    onClick={closeDropdown}
                    className="flex items-start gap-3 p-2.5 rounded-xl font-body-sm text-body-sm transition-colors cursor-pointer text-[#0B0F2E] hover:bg-[#F5F8FF] hover:text-[#0B5BD3]"
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#4A6CFF] mt-0.5">
                      track_changes
                    </span>
                    <div>
                      <div className="font-semibold text-sm">Performance & PMS</div>
                      <div className="text-[11px] opacity-75">KRA/KPIs & 360° appraisals</div>
                    </div>
                  </Link>

                  <Link
                    href="/#lms"
                    onClick={closeDropdown}
                    className="flex items-start gap-3 p-2.5 rounded-xl font-body-sm text-body-sm transition-colors cursor-pointer text-[#0B0F2E] hover:bg-[#F5F8FF] hover:text-[#0B5BD3]"
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#0B5BD3] mt-0.5">
                      school
                    </span>
                    <div>
                      <div className="font-semibold text-sm">Corporate LMS</div>
                      <div className="text-[11px] opacity-75">Courses & digital certificates</div>
                    </div>
                  </Link>

                  <Link
                    href="/#payroll"
                    onClick={closeDropdown}
                    className="flex items-start gap-3 p-2.5 rounded-xl font-body-sm text-body-sm transition-colors cursor-pointer text-[#0B0F2E] hover:bg-[#F5F8FF] hover:text-[#0B5BD3]"
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#1E1AB8] mt-0.5">
                      request_quote
                    </span>
                    <div>
                      <div className="font-semibold text-sm">Loans & Advances</div>
                      <div className="text-[11px] opacity-75">Approval workflow & EMI deduct</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Unified Pipeline Link */}
            <Link
              href="/#pipeline"
              onClick={closeDropdown}
              className="font-label-lg text-label-lg text-[#5B6488] hover:text-[#0B0F2E] transition-colors cursor-pointer"
            >
              Unified Pipeline
            </Link>

            {/* Direct 2D Desk Link */}
            <Link
              href="/#workspace"
              onClick={closeDropdown}
              className="font-label-lg text-label-lg text-[#5B6488] hover:text-[#0B0F2E] transition-colors cursor-pointer"
            >
              2D Desk Booking
            </Link>

            {/* Real FAQ link */}
            <Link
              href="/#faq"
              onClick={closeDropdown}
              className="font-label-lg text-label-lg text-[#5B6488] hover:text-[#0B0F2E] transition-colors cursor-pointer"
            >
              FAQ
            </Link>
          </nav>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              closeDropdown();
              onOpenDemo?.();
            }}
            className="inline-flex items-center justify-center bg-[#141834] hover:bg-[#232A4E] hover:border-[#7DC8FF] hover:shadow-[0_6px_20px_rgba(20,24,52,0.35)] text-white border border-[#4A6CFF]/40 font-label-lg text-label-lg px-5 py-2.5 rounded-xl shadow-[0_4px_16px_rgba(11,91,211,0.4)] transition-all active:scale-[0.98] cursor-pointer"
          >
            Book a Demo
          </button>

          {/* Mobile menu hamburger toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-[#0B0F2E] hover:bg-[#F5F8FF] transition-colors cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            <span className="material-symbols-outlined text-[24px]">
              {mobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b px-6 py-5 space-y-4 shadow-xl bg-white border-[#DCE4F5] text-[#0B0F2E]">
          <div className="flex flex-col space-y-3 font-label-lg">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#0B5BD3] transition-colors cursor-pointer font-medium"
            >
              Home
            </Link>

            <div className="pt-2 pb-1 border-t border-gray-100 font-bold text-xs text-[#0B5BD3] uppercase tracking-wider">
              TalentFlow (Recruitment)
            </div>

            <Link
              href="/#talentflow"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#0B5BD3] transition-colors cursor-pointer flex items-center justify-between"
            >
              <span>TalentFlow</span>
              <span className="text-[10px] bg-[#EAF0FF] text-[#0B5BD3] px-2 py-0.5 rounded font-bold">
                NEW
              </span>
            </Link>

            <Link
              href="/#pipeline"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#0B5BD3] transition-colors cursor-pointer"
            >
              Unified Sourcing-to-Payroll Flow
            </Link>

            <Link
              href="/talentflow"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 text-sm text-[#5B6488] hover:text-[#0B5BD3] transition-colors cursor-pointer pl-3"
            >
              ➔ Dedicated TalentFlow Page
            </Link>

            <div className="pt-2 pb-1 border-t border-gray-100 font-bold text-xs text-[#0B5BD3] uppercase tracking-wider">
              PeopleSuite (Workforce Operations)
            </div>

            <Link
              href="/#pillars"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#0B5BD3] transition-colors cursor-pointer"
            >
              All 12 Modules
            </Link>
            <Link
              href="/#attendance"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#0B5BD3] transition-colors cursor-pointer"
            >
              Attendance & Geofencing
            </Link>
            <Link
              href="/#payroll"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#0B5BD3] transition-colors cursor-pointer"
            >
              Statutory Payroll Engine
            </Link>
            <Link
              href="/#workspace"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#0B5BD3] transition-colors cursor-pointer"
            >
              2D Desk & Room Booking
            </Link>
            <Link
              href="/#assets"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#0B5BD3] transition-colors cursor-pointer"
            >
              Fixed IT Assets & Consumables
            </Link>
            <Link
              href="/#performance"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#0B5BD3] transition-colors cursor-pointer"
            >
              Performance & Appraisals
            </Link>
            <Link
              href="/#lms"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#0B5BD3] transition-colors cursor-pointer"
            >
              Corporate LMS & Letters
            </Link>

            <Link
              href="/#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#0B5BD3] transition-colors cursor-pointer"
            >
              Frequently Asked Questions
            </Link>
          </div>

          <div className="pt-3 border-t border-gray-200 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenDemo?.();
              }}
              className="w-full py-3 bg-[#141834] hover:bg-[#232A4E] hover:border-[#7DC8FF] transition-all text-white border border-[#4A6CFF]/40 font-label-lg rounded-xl text-center shadow-md font-semibold cursor-pointer"
            >
              Book a 1-on-1 Demo
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
