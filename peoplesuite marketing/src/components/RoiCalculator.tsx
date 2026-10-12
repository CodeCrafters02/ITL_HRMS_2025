"use client";

import React, { useState } from "react";

interface RoiCalculatorProps {
  onOpenDemo?: () => void;
}

export default function RoiCalculator({ onOpenDemo }: RoiCalculatorProps) {
  const [employees, setEmployees] = useState<number>(120);
  const [currentSystem, setCurrentSystem] = useState<string>("legacy");

  // Calculations
  const ratePerEmployee = employees < 50 ? 5 : employees < 250 ? 7 : 10;
  const monthlySoftwareCost = employees * ratePerEmployee + (employees < 50 ? 49 : 99);
  
  // Hours saved: ~1.2 hrs per employee/year in admin overhead
  const monthlyAdminHoursSaved = Math.round((employees * 1.4) / 1.2);
  
  // Dollar savings based on $42/hr blended HR admin rate + payroll penalty insurance
  const grossMonthlySavings = monthlyAdminHoursSaved * 42 + (employees * 12);
  const netAnnualSavings = Math.max(0, (grossMonthlySavings - monthlySoftwareCost) * 12);

  return (
    <div className="w-full bg-[#0F1226] text-[#E8ECFF] border border-[#4A6CFF]/30 rounded-3xl p-6 sm:p-10 shadow-[0_20px_50px_rgba(11,91,211,0.25)] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#0B5BD3]/20 blur-3xl pointer-events-none"></div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Interactive Sliders */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141834] border border-[#4A6CFF]/30 text-[#7DC8FF] font-label-md text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px]">calculate</span>
            <span>Interactive ROI & Savings Modeler</span>
          </div>

          <h3 className="font-headline-sm text-headline-sm font-bold text-white leading-tight">
            Calculate your organization&apos;s efficiency multiplier with PeopleSuite
          </h3>
          <p className="font-body-sm text-body-sm text-[#9AA3D1]">
            Based on average verified data from 2,400+ customers migrating from legacy vendors or fragmented spreadsheets.
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
                { id: "payroll-only", label: "Payroll Bureau Only" },
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
              Estimated Net Annual Gain
            </span>
            <div className="font-display text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-[#7DC8FF] to-[#4A6CFF] mt-1">
              ${netAnnualSavings.toLocaleString()}
            </div>
            <span className="text-xs text-[#9AA3D1] block mt-1">
              Net savings after all PeopleSuite software license costs
            </span>
          </div>

          {/* Key Metric Gauges */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0F1226] border border-[#4A6CFF]/20">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#7DC8FF] text-[20px]">schedule</span>
                <span className="text-xs text-[#E8ECFF] font-medium">Admin Hours Saved/Mo</span>
              </div>
              <span className="font-title-md font-bold text-white">
                ~{monthlyAdminHoursSaved} hrs
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0F1226] border border-[#4A6CFF]/20">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#7DC8FF] text-[20px]">speed</span>
                <span className="text-xs text-[#E8ECFF] font-medium">Payroll Run Speedup</span>
              </div>
              <span className="font-title-md font-bold text-[#7DC8FF]">
                95% Faster
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0F1226] border border-[#4A6CFF]/20">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#7DC8FF] text-[20px]">credit_card</span>
                <span className="text-xs text-[#E8ECFF] font-medium">Monthly PeopleSuite Cost</span>
              </div>
              <span className="font-title-md font-bold text-white">
                ${monthlySoftwareCost.toLocaleString()}/mo
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenDemo}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#1E1AB8] to-[#0B5BD3] hover:from-[#0B5BD3] hover:to-[#4A6CFF] text-white font-label-lg font-bold shadow-[0_4px_16px_rgba(11,91,211,0.4)] transition-all cursor-pointer"
          >
            Get Custom ROI Breakdown & Demo
          </button>
        </div>
      </div>
    </div>
  );
}
