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
    <div className="bg-[#F5F8FF] border border-[#DCE4F5] rounded-3xl p-6 lg:p-8 shadow-xl">
      <div className="bg-white border border-[#DCE4F5] rounded-2xl p-6 shadow-sm space-y-6">
        {/* Card Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#DCE4F5]">
          <div>
            <span className="font-caption text-caption text-[#5B6488] block uppercase tracking-wider text-[11px] font-semibold">
              Live Payroll Batch #2025-05B
            </span>
            <h4 className="font-title-md text-title-md font-bold text-[#0B0F2E]">
              Bi-Weekly Engineering & Operations
            </h4>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              status === "transmitted"
                ? "bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]"
                : "bg-[#EAF0FF] text-[#0B5BD3] border-[#DCE4F5]"
            }`}
          >
            {status === "transmitted" ? "Disbursed via NACHA" : "100% Calculated"}
          </span>
        </div>

        {/* 4-Step Stepper */}
        <div className="py-2 flex items-center justify-between">
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-[#0B5BD3] text-white flex items-center justify-center font-bold text-xs shadow-sm">
              ✓
            </div>
            <span className="font-caption text-[11px] font-semibold text-[#0B0F2E]">
              Time Synced
            </span>
          </div>

          <div className="flex-1 h-0.5 bg-[#0B5BD3] mx-2"></div>

          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-[#0B5BD3] text-white flex items-center justify-center font-bold text-xs shadow-sm">
              ✓
            </div>
            <span className="font-caption text-[11px] font-semibold text-[#0B0F2E]">
              Taxes Checked
            </span>
          </div>

          <div className="flex-1 h-0.5 bg-[#4A6CFF] mx-2"></div>

          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs ${
                status === "transmitted"
                  ? "bg-[#14B8A6]"
                  : "bg-[#1E1AB8] ring-4 ring-[#4A6CFF]/30"
              }`}
            >
              {status === "transmitted" ? "✓" : "3"}
            </div>
            <span className="font-caption text-[11px] font-semibold text-[#0B5BD3]">
              {status === "transmitted" ? "Sent" : "Disbursement"}
            </span>
          </div>

          <div className="flex-1 h-0.5 bg-[#DCE4F5] mx-2"></div>

          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full border text-xs font-bold flex items-center justify-center ${
                status === "transmitted"
                  ? "bg-[#0B5BD3] text-white border-transparent"
                  : "bg-[#EAF0FF] text-[#5B6488] border-[#DCE4F5]"
              }`}
            >
              {status === "transmitted" ? "✓" : "4"}
            </div>
            <span className="font-caption text-[11px] text-[#5B6488]">
              Auto Filing
            </span>
          </div>
        </div>

        {/* Financial Breakdown Table */}
        <div className="space-y-3 bg-[#F5F8FF] border border-[#DCE4F5] p-4 rounded-2xl">
          <div className="flex justify-between items-center text-body-sm font-body-sm">
            <span className="text-[#5B6488]">Gross Pay ({employeeCount} employees)</span>
            <span className="font-semibold text-[#0B0F2E]">
              ${grossPay.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between items-center text-body-sm font-body-sm">
            <span className="text-[#5B6488]">Federal & State Withholding (50 States)</span>
            <span className="font-semibold text-[#ba1a1a]">
              -${withholding.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between items-center text-body-sm font-body-sm">
            <span className="text-[#5B6488]">401(k), HSA & Medical Benefit Deductions</span>
            <span className="font-semibold text-[#ba1a1a]">
              -${deductions.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="pt-2 border-t border-[#DCE4F5] flex justify-between items-center font-title-md text-title-md font-bold">
            <span className="text-[#0B0F2E]">Net Disbursed via ACH Direct Rail</span>
            <span className="text-[#0B5BD3]">
              ${netPay.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Action Button */}
        {status !== "transmitted" ? (
          <button
            type="button"
            onClick={handleTransmit}
            disabled={status === "processing"}
            className="w-full py-3.5 bg-gradient-to-r from-[#1E1AB8] to-[#0B5BD3] hover:from-[#0B5BD3] hover:to-[#4A6CFF] text-white font-label-lg text-sm font-semibold rounded-xl transition-all shadow-[0_4px_16px_rgba(11,91,211,0.35)] flex items-center justify-center gap-2 cursor-pointer"
          >
            {status === "processing" ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                <span>Submitting to Federal Reserve Clearinghouse Rail...</span>
              </>
            ) : (
              <>
                <span>Approve & Transmit Payroll Batch</span>
                <span className="material-symbols-outlined text-[18px]">send</span>
              </>
            )}
          </button>
        ) : (
          <div className="p-3.5 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-[#15803D] font-bold text-sm">
              <span className="material-symbols-outlined text-[20px]">task_alt</span>
              <span>Batch Transmitted in 1.2s • Zero Manual Filing Required</span>
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
