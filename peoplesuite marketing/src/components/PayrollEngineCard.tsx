"use client";

import React, { useState } from "react";

export default function PayrollEngineCard() {
  const [status, setStatus] = useState<"ready" | "processing" | "transmitted">("ready");
  const [employeeCount, setEmployeeCount] = useState(342);

  const grossPay = employeeCount * 1732.4;
  const withholding = grossPay * 0.2096;
  const deductions = grossPay * 0.0763;
  const netPay = grossPay - withholding - deductions;

  const handleTransmit = () => {
    setStatus("processing");
    setTimeout(() => {
      setStatus("transmitted");
    }, 1200);
  };

  return (
    <div className="bg-[#0F1226] border border-[#232A4E] rounded-3xl p-6 lg:p-8 shadow-xl">
      <div className="bg-[#141834] border border-[#232A4E] rounded-2xl p-6 shadow-sm space-y-6">
        {/* Card Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#232A4E]">
          <div>
            <span className="font-caption text-caption text-[#9AA3D1] block uppercase tracking-wider text-[11px] font-semibold">
              Live Payroll Batch #2026-03
            </span>
            <h4 className="font-title-md text-title-md font-bold text-[#E8ECFF]">
              Monthly Company Payroll Run
            </h4>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              status === "transmitted"
                ? "bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]"
                : "bg-[#141834] text-[#7DC8FF] border-[#232A4E]"
            }`}
          >
            {status === "transmitted" ? "Bank Statement Generated" : "Attendance Synced"}
          </span>
        </div>

        {/* 4-Step Stepper */}
        <div className="py-2 flex items-center justify-between">
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-[#0B5BD3] text-white flex items-center justify-center font-bold text-xs shadow-sm">
              ✓
            </div>
            <span className="font-caption text-[11px] font-semibold text-[#E8ECFF]">
              LOP & Time Synced
            </span>
          </div>

          <div className="flex-1 h-0.5 bg-[#0B5BD3] mx-2"></div>

          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-[#0B5BD3] text-white flex items-center justify-center font-bold text-xs shadow-sm">
              ✓
            </div>
            <span className="font-caption text-[11px] font-semibold text-[#E8ECFF]">
              PF / ESI / TDS
            </span>
          </div>

          <div className="flex-1 h-0.5 bg-[#4A6CFF] mx-2"></div>

          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs ${
                status === "transmitted"
                  ? "bg-[#0B5BD3]"
                  : "bg-[#1E1AB8] ring-4 ring-[#4A6CFF]/30"
              }`}
            >
              {status === "transmitted" ? "✓" : "3"}
            </div>
            <span className="font-caption text-[11px] font-semibold text-[#7DC8FF]">
              {status === "transmitted" ? "Locked" : "Finalize"}
            </span>
          </div>

          <div className="flex-1 h-0.5 bg-[#232A4E] mx-2"></div>

          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full border text-xs font-bold flex items-center justify-center ${
                status === "transmitted"
                  ? "bg-[#0B5BD3] text-white border-transparent"
                  : "bg-[#141834] text-[#9AA3D1] border-[#232A4E]"
              }`}
            >
              {status === "transmitted" ? "✓" : "4"}
            </div>
            <span className="font-caption text-[11px] text-[#9AA3D1]">
              PDF Payslips
            </span>
          </div>
        </div>

        {/* Financial Breakdown Table */}
        <div className="space-y-3 bg-[#0F1226] border border-[#232A4E] p-4 rounded-2xl">
          <div className="flex justify-between items-center text-body-sm font-body-sm">
            <span className="text-[#9AA3D1]">Total Gross Earnings ({employeeCount} Staff)</span>
            <span className="font-semibold text-[#E8ECFF]">
              ₹ 48,20,000.00
            </span>
          </div>

          <div className="flex justify-between items-center text-body-sm font-body-sm">
            <span className="text-[#9AA3D1]">Statutory Deductions (EPF + ESIC)</span>
            <span className="font-semibold text-[#f87171]">
              -₹ 4,12,500.00
            </span>
          </div>

          <div className="flex justify-between items-center text-body-sm font-body-sm">
            <span className="text-[#9AA3D1]">Income Tax (TDS), PT & Active Loan EMIs</span>
            <span className="font-semibold text-[#f87171]">
              -₹ 2,98,000.00
            </span>
          </div>

          <div className="pt-2 border-t border-[#232A4E] flex justify-between items-center font-title-md text-title-md font-bold">
            <span className="text-[#E8ECFF]">Net Salary Disbursed (Bank Transfer)</span>
            <span className="text-[#7DC8FF]">
              ₹ 41,09,500.00
            </span>
          </div>
        </div>

        {/* Action Button */}
        {status !== "transmitted" ? (
          <button
            type="button"
            onClick={handleTransmit}
            disabled={status === "processing"}
            className="w-full py-3.5 bg-[#1E1AB8] hover:bg-[#0B5BD3] text-white border border-[#4A6CFF]/40 font-label-lg text-sm font-semibold rounded-xl transition-all shadow-[0_4px_16px_rgba(11,91,211,0.35)] flex items-center justify-center gap-2 cursor-pointer"
          >
            {status === "processing" ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                <span>Locking Batch & Generating Payslips...</span>
              </>
            ) : (
              <>
                <span>Approve & Finalize Payroll Batch</span>
                <span className="material-symbols-outlined text-[18px]">verified</span>
              </>
            )}
          </button>
        ) : (
          <div className="p-3.5 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-[#15803D] font-bold text-sm">
              <span className="material-symbols-outlined text-[20px]">task_alt</span>
              <span>Batch Finalized • PDF Payslips Published & Bank Statement Ready</span>
            </div>
            <button
              type="button"
              onClick={() => setStatus("ready")}
              className="text-xs text-[#0B5BD3] font-semibold hover:underline cursor-pointer"
            >
              Reset Simulation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
