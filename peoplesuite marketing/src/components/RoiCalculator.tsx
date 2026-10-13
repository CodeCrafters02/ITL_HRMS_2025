"use client";

import React, { useState } from "react";

interface RoiCalculatorProps {
  onOpenDemo?: () => void;
}

export default function RoiCalculator({ onOpenDemo }: RoiCalculatorProps) {
  const [employees, setEmployees] = useState<number>(120);
  const [currentSystem, setCurrentSystem] = useState<string>("legacy");

  // Calculations based on headcount
  const monthlyAdminHoursSaved = Math.round(employees * 1.5);
  const annualAdminHoursSaved = monthlyAdminHoursSaved * 12;
  const payCyclesProcessed = 12;

  return (
    <div className="w-full bg-[#0F1226] text-[#E8ECFF] border border-[#4A6CFF]/30 rounded-3xl p-6 sm:p-10 shadow-[0_20px_50px_rgba(11,91,211,0.25)] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#0B5BD3]/20 blur-3xl pointer-events-none"></div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Interactive Sliders */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141834] border border-[#4A6CFF]/30 text-[#7DC8FF] font-label-md text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px]">calculate</span>
            <span>Productivity & Operations Modeler</span>
          </div>

          <h3 className="font-headline-sm text-headline-sm font-bold text-white leading-tight">
            Estimate workforce hours saved with PeopleSuite automation
          </h3>
          <p className="font-body-sm text-body-sm text-[#9AA3D1]">
            Automating statutory payroll calculations, GPS geofenced punch verification, 2D hot desking, and IT asset allocation eliminates manual spreadsheet overhead.
          </p>

          {/* Slider 1: Employees */}
          <div className="space-y-3 bg-[#141834] border border-[#4A6CFF]/20 p-5 rounded-2xl">
            <div className="flex justify-between items-center">
              <span className="font-label-lg text-label-lg font-semibold text-[#E8ECFF]">
                Active Headcount
              </span>
              <span className="px-3 py-1 rounded-xl bg-[#0B5BD3]/30 border border-[#4A6CFF]/40 text-[#7DC8FF] font-title-md font-bold">
                {employees.toLocaleString()} employees
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="2000"
              step="5"
              value={employees}
              onChange={(e) => setEmployees(parseInt(e.target.value, 10))}
              className="w-full h-2.5 bg-[#0A0B14] rounded-lg appearance-none cursor-pointer accent-[#7DC8FF]"
            />
            <div className="flex justify-between text-[11px] text-[#9AA3D1]">
              <span>10 staff (Startups)</span>
              <span>250 staff (Growth)</span>
              <span>2,000+ staff (Enterprise)</span>
            </div>
          </div>

          {/* System Selection Buttons */}
          <div className="space-y-2">
            <span className="font-label-md text-label-md text-[#9AA3D1] block font-medium">
              Current HR Management Approach:
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "sheets", label: "Spreadsheets & Paper" },
                { id: "legacy", label: "Legacy Disconnected Apps" },
                { id: "payroll-only", label: "Manual Payroll Filing" },
              ].map((sys) => (
                <button
                  key={sys.id}
                  type="button"
                  onClick={() => setCurrentSystem(sys.id)}
                  className={`p-3 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                    currentSystem === sys.id
                      ? "bg-[#0B5BD3] text-white border-[#7DC8FF]"
                      : "bg-[#141834] text-[#9AA3D1] border-[#4A6CFF]/20 hover:border-[#4A6CFF]/40"
                  }`}
                >
                  {sys.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Dynamic Projected Returns Card */}
        <div className="lg:col-span-5 bg-gradient-to-b from-[#141834] to-[#0A0B14] border border-[#4A6CFF]/35 rounded-2xl p-6 sm:p-7 shadow-xl space-y-6">
          <div className="border-b border-[#4A6CFF]/20 pb-4">
            <span className="text-xs font-bold text-[#7DC8FF] tracking-wider uppercase block">
              Projected Annual Admin Time Reclaimed
            </span>
            <div className="font-display text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#E8ECFF] via-[#7DC8FF] to-[#4A6CFF] mt-1">
              ~{annualAdminHoursSaved.toLocaleString()} hrs / yr
            </div>
            <span className="text-xs text-[#9AA3D1] block mt-1">
              Reinvested directly into hiring, talent strategy & employee coaching
            </span>
          </div>

          {/* Key Metric Gauges */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0F1226] border border-[#4A6CFF]/20">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#7DC8FF] text-[20px]">schedule</span>
                <span className="text-xs text-[#E8ECFF] font-medium">Monthly Time Reclaimed</span>
              </div>
              <span className="font-title-md font-bold text-white">
                ~{monthlyAdminHoursSaved.toLocaleString()} hrs / mo
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0F1226] border border-[#4A6CFF]/20">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#7DC8FF] text-[20px]">speed</span>
                <span className="text-xs text-[#E8ECFF] font-medium">Statutory Payroll Run</span>
              </div>
              <span className="font-title-md font-bold text-[#7DC8FF]">
                Under 30 Mins (95% Faster)
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0F1226] border border-[#4A6CFF]/20">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#7DC8FF] text-[20px]">verified_user</span>
                <span className="text-xs text-[#E8ECFF] font-medium">Attendance & Geofencing</span>
              </div>
              <span className="font-title-md font-bold text-emerald-400">
                100% Proxy Elimination
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenDemo}
            className="w-full py-3.5 rounded-xl bg-[#141834] hover:bg-[#232A4E] hover:border-[#7DC8FF] hover:shadow-[0_6px_20px_rgba(20,24,52,0.35)] text-white border border-[#4A6CFF]/40 font-label-lg font-bold shadow-[0_4px_16px_rgba(11,91,211,0.4)] transition-all cursor-pointer"
          >
            Request Custom Quotation & Demo
          </button>
        </div>
      </div>
    </div>
  );
}
