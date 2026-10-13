"use client";

import React, { useEffect, useRef, useState } from "react";

export type DemoPlatform = "talentflow" | "peoplesuite" | "both";

interface BookDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlatform?: DemoPlatform;
}

const sizes = ["1-50", "51-250", "251-1000", "1000+"];

const platformModules: Record<DemoPlatform, string[]> = {
  talentflow: [
    "Naukri 1-Click Sourcing",
    "3-Tier Deduplication",
    "AI Fit & Gap Scorecards",
    "Playwright PDF Dossiers",
    "Tokenized Client Portal",
    "DPDP Pre-Onboarding Checklist",
  ],
  peoplesuite: [
    "Core HR & Directory",
    "Geofence Attendance & Shifts",
    "Statutory Payroll & Payslips",
    "2D Desk & Room Booking",
    "Fixed IT Assets & Inventory",
    "Performance & 360° PMS",
    "Corporate LMS",
    "Loans & Advances",
  ],
  both: [
    "End-to-End Pipeline (Sourcing to Payroll)",
    "TalentFlow Sourcing & ATS",
    "PeopleSuite Core HR",
    "Geofenced Attendance",
    "Indian Statutory Payroll",
    "2D Workspace & Hot Desking",
    "IT Assets & Inventory",
    "Performance & LMS",
  ],
};

const field =
  "w-full px-4 py-2.5 rounded-xl border border-[#DCE4F5] bg-white text-[#0B0F2E] placeholder:text-[#9AA3D1] hover:border-[#141834] focus:outline-none focus:border-[#141834] focus:ring-2 focus:ring-[#141834]/20 transition-all";
const label = "block text-xs font-semibold uppercase tracking-wider text-[#5B6488] mb-1.5";

export default function BookDemoModal({
  isOpen,
  onClose,
  defaultPlatform = "both",
}: BookDemoModalProps) {
  const [step, setStep] = useState<"form" | "success">("form");
  const [platform, setPlatform] = useState<DemoPlatform>(defaultPlatform);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [employees, setEmployees] = useState("51-250");
  const [isTeamSizeOpen, setIsTeamSizeOpen] = useState(false);
  const teamSizeRef = useRef<HTMLDivElement>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // Sync defaultPlatform when modal opens
  useEffect(() => {
    if (isOpen) {
      setPlatform(defaultPlatform);
      setSelectedModules(platformModules[defaultPlatform].slice(0, 2));
      setIsTeamSizeOpen(false);
    }
  }, [isOpen, defaultPlatform]);

  // Close team size dropdown when clicking outside
  useEffect(() => {
    if (!isTeamSizeOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (teamSizeRef.current && !teamSizeRef.current.contains(e.target as Node)) {
        setIsTeamSizeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isTeamSizeOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePlatformChange = (p: DemoPlatform) => {
    setPlatform(p);
    setSelectedModules(platformModules[p].slice(0, 2));
  };

  const toggleModule = (m: string) => {
    setSelectedModules((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const close = () => {
    setStep("form");
    setName("");
    setEmail("");
    setCompany("");
    setNotes("");
    setIsTeamSizeOpen(false);
    onClose();
  };

  const getPlatformLabel = () => {
    if (platform === "talentflow") return "TalentFlow";
    if (platform === "peoplesuite") return "PeopleSuite";
    return "TalentFlow + PeopleSuite";
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0A0B14]/80 backdrop-blur-xs"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-4xl bg-white rounded-2xl border border-[#DCE4F5] shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-lg text-[#5B6488] hover:bg-[#F5F8FF] hover:text-[#0B0F2E] flex items-center justify-center cursor-pointer transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {step === "form" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep("success");
            }}
            className="p-6 sm:p-7 md:p-8"
          >
            <div className="grid md:grid-cols-12 gap-6 md:gap-7 items-start">
              {/* Left Column: Platform & Capabilities (5 cols) */}
              <div className="md:col-span-5 space-y-4">
                <div>
                  <h3 className="font-display text-xl sm:text-2xl tracking-tight text-[#0B0F2E]">
                    Schedule a 1-on-1 Walkthrough
                  </h3>
                  <p className="mt-1 text-xs text-[#5B6488] leading-relaxed">
                    A tailored 20-minute tour with our engineering team based on your exact sourcing and HR operations.
                  </p>
                </div>

                {/* Platform Selection */}
                <div>
                  <span className={label}>Select Platform to Explore</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handlePlatformChange("talentflow")}
                      className={`px-2 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 text-center ${
                        platform === "talentflow"
                          ? "border-[#0B5BD3] bg-[#141834] text-white shadow-sm ring-2 ring-[#0B5BD3]/20"
                          : "border-[#DCE4F5] bg-white text-[#5B6488] hover:border-[#0B5BD3] hover:text-[#0B0F2E]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[17px]">person_search</span>
                      <span className="text-[11px] font-bold">TalentFlow</span>
                      <span className="text-[9px] opacity-75 font-normal">Sourcing & ATS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePlatformChange("peoplesuite")}
                      className={`px-2 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 text-center ${
                        platform === "peoplesuite"
                          ? "border-[#0B5BD3] bg-[#141834] text-white shadow-sm ring-2 ring-[#0B5BD3]/20"
                          : "border-[#DCE4F5] bg-white text-[#5B6488] hover:border-[#0B5BD3] hover:text-[#0B0F2E]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[17px]">badge</span>
                      <span className="text-[11px] font-bold">PeopleSuite</span>
                      <span className="text-[9px] opacity-75 font-normal">HR & Payroll</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePlatformChange("both")}
                      className={`px-2 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 text-center ${
                        platform === "both"
                          ? "border-[#0B5BD3] bg-[#141834] text-white shadow-sm ring-2 ring-[#0B5BD3]/20"
                          : "border-[#DCE4F5] bg-white text-[#5B6488] hover:border-[#0B5BD3] hover:text-[#0B0F2E]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[17px]">hub</span>
                      <span className="text-[11px] font-bold">Both</span>
                      <span className="text-[9px] opacity-75 font-normal">Unified Suite</span>
                    </button>
                  </div>
                </div>

                {/* Dynamic Modules Checklist */}
                <div>
                  <span className={label}>
                    {platform === "both"
                      ? "Capabilities to Explore"
                      : `${getPlatformLabel()} Capabilities`}
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {platformModules[platform].map((m) => {
                      const isSelected = selectedModules.includes(m);
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => toggleModule(m)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] cursor-pointer transition-all ${
                            isSelected
                              ? "bg-[#141834] text-white font-semibold border border-[#0B5BD3] shadow-xs"
                              : "border border-[#DCE4F5] bg-white text-[#5B6488] hover:border-[#0B5BD3] hover:text-[#0B0F2E]"
                          }`}
                        >
                          {isSelected ? "✓ " : "+ "}
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Contact Details & Submit (7 cols) */}
              <div className="md:col-span-7 space-y-3 md:border-l md:border-[#EEF2FC] md:pl-6">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Your Name</label>
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className={field}
                    />
                  </div>
                  <div>
                    <label className={label}>Work Email</label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ramesh@company.com"
                      className={field}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Company Name</label>
                    <input
                      required
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className={field}
                    />
                  </div>
                  <div className="relative" ref={teamSizeRef}>
                    <span className={label}>Team Size</span>
                    <button
                      type="button"
                      onClick={() => setIsTeamSizeOpen((prev) => !prev)}
                      className={`w-full px-4 py-2.5 rounded-xl border bg-white text-[#0B0F2E] text-xs sm:text-sm flex items-center justify-between cursor-pointer transition-all ${
                        isTeamSizeOpen
                          ? "border-[#141834] ring-2 ring-[#141834]/20 shadow-xs"
                          : "border-[#DCE4F5] hover:border-[#141834] hover:bg-[#F8FAFF]"
                      }`}
                    >
                      <span className="font-medium">{employees} employees</span>
                      <span
                        className={`material-symbols-outlined text-[18px] text-[#141834] transition-transform duration-200 ${
                          isTeamSizeOpen ? "rotate-180" : ""
                        }`}
                      >
                        expand_more
                      </span>
                    </button>

                    {isTeamSizeOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white rounded-xl border border-[#DCE4F5] shadow-xl overflow-hidden py-1">
                        {sizes.map((s) => {
                          const isSelected = employees === s;
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                setEmployees(s);
                                setIsTeamSizeOpen(false);
                              }}
                              className={`w-full px-3.5 py-2 text-xs sm:text-sm text-left flex items-center justify-between cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-[#141834] text-white font-semibold"
                                  : "text-[#0B0F2E] hover:bg-[#141834] hover:text-white"
                              }`}
                            >
                              <span>{s} employees</span>
                              {isSelected && (
                                <span className="material-symbols-outlined text-[16px] text-white">
                                  check
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className={label}>
                    Specific Questions / Notes{" "}
                    <span className="text-[#5B6488] font-normal lowercase">(optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Tell us about your current shift rules, sourcing portals, or payroll setup..."
                    className={`${field} resize-none text-xs`}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#141834] hover:bg-[#232A4E] hover:border-[#7DC8FF] hover:shadow-[0_6px_20px_rgba(20,24,52,0.35)] text-white font-bold transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
                >
                  <span>Confirm & Book Walkthrough</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>

                <p className="text-[11px] text-center text-[#5B6488]">
                  🔒 No spam. Engineered by Innovyx Tech Labs LLP. Response within 1 business day.
                </p>
              </div>
            </div>
          </form>
        ) : (
          <div className="p-8 sm:p-10 py-16 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-[#EAF0FF] border border-[#DCE4F5] text-[#0B5BD3] flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">check</span>
            </div>
            <h3 className="font-display text-2xl tracking-tight text-[#0B0F2E]">
              Thank you, {name.split(" ")[0]}!
            </h3>
            <p className="text-sm text-[#5B6488] max-w-sm mx-auto">
              We have received your request for a tailored <strong>{getPlatformLabel()}</strong>{" "}
              walkthrough.
            </p>
            <p className="text-xs text-[#5B6488]">
              Our engineering team at <strong>Innovyx Tech Labs LLP</strong> will email you at{" "}
              <strong className="text-[#0B0F2E]">{email}</strong> within one business day with calendar
              availability.
            </p>
            <button
              onClick={close}
              className="mt-4 px-6 py-2.5 rounded-xl border border-[#DCE4F5] hover:border-[#0B5BD3] text-[#0B0F2E] font-semibold cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
