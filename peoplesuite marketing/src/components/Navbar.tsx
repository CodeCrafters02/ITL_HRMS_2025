"use client";

import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <img src="/logo.png" alt="PeopleSuite" className="h-14 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-7">
            {/* Product Dropdown */}
            <div
              className="relative group py-2"
              onMouseEnter={() => setActiveDropdown("product")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                type="button"
                className={`flex items-center gap-1 font-label-lg text-label-lg transition-colors cursor-pointer ${
                  isDarkNav
                    ? "text-[#9AA3D1] hover:text-[#E8ECFF]"
                    : "text-[#5B6488] hover:text-[#0B0F2E]"
                }`}
              >
                <span>Product</span>
                <span className="material-symbols-outlined text-[18px] group-hover:rotate-180 transition-transform duration-200">
                  expand_more
                </span>
              </button>
              <div
                className={`absolute top-full left-0 w-72 pt-2 transition-all duration-200 ${
                  activeDropdown === "product"
                    ? "opacity-100 translate-y-0 visible"
                    : "opacity-0 translate-y-1 invisible pointer-events-none"
                }`}
              >
                <div
                  className={`rounded-2xl p-3 shadow-xl border space-y-1 ${
                    isDarkNav
                      ? "bg-[#0F1122] border-[#4A6CFF]/25 shadow-[0_10px_25px_-5px_rgba(11,91,211,0.35)]"
                      : "bg-white border-[#DCE4F5] shadow-[0_10px_25px_-5px_rgba(11,91,211,0.12)]"
                  }`}
                >
                  <Link
                    href="/#pillars"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-body-sm text-body-sm transition-colors ${
                      isDarkNav
                        ? "text-[#E8ECFF] hover:bg-[#1E1AB8]/30 hover:text-[#7DC8FF]"
                        : "text-[#0B0F2E] hover:bg-[#F5F8FF] hover:text-[#0B5BD3]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#0B5BD3]">badge</span>
                    <div>
                      <div className="font-semibold">Core HR & Directory</div>
                      <div className="text-[11px] opacity-75">Profiles, hierarchy & vaults</div>
                    </div>
                  </Link>

                  <Link
                    href="/#attendance"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-body-sm text-body-sm transition-colors ${
                      isDarkNav
                        ? "text-[#E8ECFF] hover:bg-[#1E1AB8]/30 hover:text-[#7DC8FF]"
                        : "text-[#0B0F2E] hover:bg-[#F5F8FF] hover:text-[#0B5BD3]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#4A6CFF]">pin_drop</span>
                    <div>
                      <div className="font-semibold">Attendance & Geofencing</div>
                      <div className="text-[11px] opacity-75">GPS radius & facial match</div>
                    </div>
                  </Link>

                  <Link
                    href="/#payroll"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-body-sm text-body-sm transition-colors ${
                      isDarkNav
                        ? "text-[#E8ECFF] hover:bg-[#1E1AB8]/30 hover:text-[#7DC8FF]"
                        : "text-[#0B0F2E] hover:bg-[#F5F8FF] hover:text-[#0B5BD3]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#0B5BD3]">account_balance_wallet</span>
                    <div>
                      <div className="font-semibold">Payroll & Compliance</div>
                      <div className="text-[11px] opacity-75">Automated tax & ACH deposits</div>
                    </div>
                  </Link>

                  <Link
                    href="/#mobile-app"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-body-sm text-body-sm transition-colors ${
                      isDarkNav
                        ? "text-[#E8ECFF] hover:bg-[#1E1AB8]/30 hover:text-[#7DC8FF]"
                        : "text-[#0B0F2E] hover:bg-[#F5F8FF] hover:text-[#0B5BD3]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#1E1AB8]">phone_iphone</span>
                    <div>
                      <div className="font-semibold">Mobile Self-Service App</div>
                      <div className="text-[11px] opacity-75">iOS & Android with 4.9★ rating</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Solutions Dropdown */}
            <div
              className="relative group py-2"
              onMouseEnter={() => setActiveDropdown("solutions")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                type="button"
                className={`flex items-center gap-1 font-label-lg text-label-lg transition-colors cursor-pointer ${
                  isDarkNav
                    ? "text-[#9AA3D1] hover:text-[#E8ECFF]"
                    : "text-[#5B6488] hover:text-[#0B0F2E]"
                }`}
              >
                <span>Solutions</span>
                <span className="material-symbols-outlined text-[18px] group-hover:rotate-180 transition-transform duration-200">
                  expand_more
                </span>
              </button>
              <div
                className={`absolute top-full left-0 w-64 pt-2 transition-all duration-200 ${
                  activeDropdown === "solutions"
                    ? "opacity-100 translate-y-0 visible"
                    : "opacity-0 translate-y-1 invisible pointer-events-none"
                }`}
              >
                <div
                  className={`rounded-2xl p-3 shadow-xl border space-y-1 ${
                    isDarkNav
                      ? "bg-[#0F1122] border-[#4A6CFF]/25 shadow-[0_10px_25px_-5px_rgba(11,91,211,0.35)]"
                      : "bg-white border-[#DCE4F5] shadow-[0_10px_25px_-5px_rgba(11,91,211,0.12)]"
                  }`}
                >
                  <Link
                    href="/#enterprise-scale"
                    className={`block px-3 py-2 rounded-lg font-body-sm text-body-sm transition-colors ${
                      isDarkNav
                        ? "text-[#E8ECFF] hover:bg-[#1E1AB8]/30 hover:text-[#7DC8FF]"
                        : "text-[#0B0F2E] hover:bg-[#F5F8FF] hover:text-[#0B5BD3]"
                    }`}
                  >
                    Mid-Market & Enterprise (250-10k)
                  </Link>
                  <Link
                    href="/pricing"
                    className={`block px-3 py-2 rounded-lg font-body-sm text-body-sm transition-colors ${
                      isDarkNav
                        ? "text-[#E8ECFF] hover:bg-[#1E1AB8]/30 hover:text-[#7DC8FF]"
                        : "text-[#0B0F2E] hover:bg-[#F5F8FF] hover:text-[#0B5BD3]"
                    }`}
                  >
                    High-Growth Startups & SMB
                  </Link>
                  <Link
                    href="/#attendance"
                    className={`block px-3 py-2 rounded-lg font-body-sm text-body-sm transition-colors ${
                      isDarkNav
                        ? "text-[#E8ECFF] hover:bg-[#1E1AB8]/30 hover:text-[#7DC8FF]"
                        : "text-[#0B0F2E] hover:bg-[#F5F8FF] hover:text-[#0B5BD3]"
                    }`}
                  >
                    Multi-Shift & Field Operations
                  </Link>
                </div>
              </div>
            </div>

            {/* Pricing Link */}
            <Link
              href="/pricing"
              className={`flex items-center gap-2 font-label-lg text-label-lg transition-colors ${
                pathname === "/pricing"
                  ? "text-[#0B5BD3] font-bold"
                  : isDarkNav
                  ? "text-[#9AA3D1] hover:text-[#E8ECFF]"
                  : "text-[#5B6488] hover:text-[#0B0F2E]"
              }`}
            >
              <span>Pricing</span>
              <span
                className={`font-label-md text-label-md px-2 py-0.5 rounded-full border text-[11px] font-semibold ${
                  isDarkNav
                    ? "bg-[#0B5BD3]/25 text-[#7DC8FF] border-[#4A6CFF]/30"
                    : "bg-[#EAF0FF] text-[#0B5BD3] border-[#DCE4F5]"
                }`}
              >
                Save 20% Annual
              </span>
            </Link>

            {/* Testimonials & Security anchor */}
            <Link
              href="/#testimonials"
              className={`font-label-lg text-label-lg transition-colors ${
                isDarkNav
                  ? "text-[#9AA3D1] hover:text-[#E8ECFF]"
                  : "text-[#5B6488] hover:text-[#0B0F2E]"
              }`}
            >
              Customers
            </Link>

            <Link
              href="/#security"
              className={`font-label-lg text-label-lg transition-colors ${
                isDarkNav
                  ? "text-[#9AA3D1] hover:text-[#E8ECFF]"
                  : "text-[#5B6488] hover:text-[#0B0F2E]"
              }`}
            >
              Security
            </Link>
          </nav>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-4">
          <Link
            href="/#login"
            onClick={(e) => {
              e.preventDefault();
              alert("PeopleSuite Portal: Please use 'Book a Demo' to request immediate sandbox tenant access.");
            }}
            className={`hidden sm:inline-flex font-label-lg text-label-lg transition-colors px-3 py-2 ${
              isDarkNav
                ? "text-[#E8ECFF] hover:text-[#7DC8FF]"
                : "text-[#0B0F2E] hover:text-[#0B5BD3]"
            }`}
          >
            Login
          </Link>

          <button
            type="button"
            onClick={onOpenDemo}
            className="inline-flex items-center justify-center bg-[#0B5BD3] hover:bg-[#1E1AB8] text-white font-label-lg text-label-lg px-5 py-2.5 rounded-xl shadow-[0_4px_16px_rgba(11,91,211,0.4)] hover:shadow-[0_4px_22px_rgba(74,108,255,0.6)] transition-all active:scale-[0.98] cursor-pointer"
          >
            Book a Demo
          </button>

          {/* Mobile menu hamburger toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`lg:hidden p-2 rounded-xl transition-colors ${
              isDarkNav
                ? "text-[#E8ECFF] hover:bg-[#1E1AB8]/20"
                : "text-[#0B0F2E] hover:bg-[#F5F8FF]"
            }`}
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
        <div
          className={`lg:hidden border-b px-6 py-5 space-y-4 shadow-xl ${
            isDarkNav
              ? "bg-[#0F1226] border-[#4A6CFF]/20 text-[#E8ECFF]"
              : "bg-white border-[#DCE4F5] text-[#0B0F2E]"
          }`}
        >
          <div className="flex flex-col space-y-3 font-label-lg">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#0B5BD3] transition-colors"
            >
              Home
            </Link>
            <Link
              href="/#pillars"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#0B5BD3] transition-colors"
            >
              Platform Modules
            </Link>
            <Link
              href="/#payroll"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#0B5BD3] transition-colors"
            >
              Payroll Automation
            </Link>
            <Link
              href="/#attendance"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#0B5BD3] transition-colors"
            >
              Attendance & Geofencing
            </Link>
            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 flex items-center justify-between text-[#0B5BD3] font-bold"
            >
              <span>Pricing Plans</span>
              <span className="bg-[#EAF0FF] text-[#0B5BD3] text-xs px-2 py-0.5 rounded-full font-semibold">
                Save 20%
              </span>
            </Link>
            <Link
              href="/#testimonials"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#0B5BD3] transition-colors"
            >
              Customer Reviews
            </Link>
            <Link
              href="/#security"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-[#0B5BD3] transition-colors"
            >
              Compliance & Security
            </Link>
          </div>

          <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenDemo?.();
              }}
              className="w-full py-3 bg-[#0B5BD3] text-white font-label-lg rounded-xl text-center shadow-md font-semibold"
            >
              Book a 1-on-1 Demo
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
