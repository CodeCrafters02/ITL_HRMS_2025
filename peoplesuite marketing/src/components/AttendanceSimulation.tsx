"use client";

import React, { useState } from "react";

export default function AttendanceSimulation() {
  const [punched, setPunched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "roster">("map");

  const handleSimulatePunch = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setPunched(true);
    }, 1200);
  };

  return (
    <div className="bg-[#F5F8FF] border border-[#DCE4F5] rounded-3xl p-6 lg:p-8 shadow-xl">
      <div className="bg-white border border-[#DCE4F5] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DCE4F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EAF0FF] text-[#0B5BD3] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">explore</span>
            </div>
            <div>
              <div className="font-label-lg text-label-lg font-bold text-[#0B0F2E]">
                Austin Operations Hub • Perimeter #1
              </div>
              <span className="text-[11px] text-[#5B6488]">GPS Polygon ID: GEO-TX-0442</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-[#EAF0FF] text-[#0B5BD3] border border-[#DCE4F5] font-label-md text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0B5BD3] animate-pulse"></span>
              Active Geofence
            </span>
          </div>
        </div>

        {/* Radar & Polygon Display */}
        <div className="relative w-full h-64 bg-[#EAF0FF] rounded-2xl overflow-hidden flex items-center justify-center border border-[#DCE4F5]">
          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#0B5BD3_1px,transparent_1px)] [background-size:16px_16px]"></div>

          {/* Concentric Radar Scan */}
          <div className="w-56 h-56 rounded-full border border-[#4A6CFF]/30 animate-ping absolute pointer-events-none"></div>
          <div className="w-48 h-48 rounded-full bg-[#4A6CFF]/10 border-2 border-[#4A6CFF]/30 flex items-center justify-center relative">
            <div className="w-28 h-28 rounded-full bg-[#0B5BD3]/15 border border-[#0B5BD3]/40 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-[#1E1AB8] text-white flex items-center justify-center shadow-lg relative">
                <span className="material-symbols-outlined text-[22px]">store</span>
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#7DC8FF] border-2 border-white"></span>
              </div>
            </div>
          </div>

          {/* Worker Ping 1 */}
          <div className="absolute top-8 left-8 sm:left-14 bg-white/95 backdrop-blur-sm px-2.5 py-1.5 rounded-xl shadow-md border border-[#DCE4F5] flex items-center gap-2 animate-float">
            <div className="w-2.5 h-2.5 rounded-full bg-[#0B5BD3] shadow-[0_0_8px_#0B5BD3]"></div>
            <div>
              <span className="font-caption text-xs font-bold text-[#0B0F2E] block">Alex M.</span>
              <span className="text-[10px] text-[#5B6488]">08:55 AM • In Bounds</span>
            </div>
          </div>

          {/* Worker Ping 2 */}
          <div className="absolute bottom-8 right-8 sm:right-12 bg-white/95 backdrop-blur-sm px-2.5 py-1.5 rounded-xl shadow-md border border-[#DCE4F5] flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#4A6CFF] shadow-[0_0_8px_#4A6CFF]"></div>
            <div>
              <span className="font-caption text-xs font-bold text-[#0B0F2E] block">David K.</span>
              <span className="text-[10px] text-[#5B6488]">08:58 AM • Biometric Verified</span>
            </div>
          </div>

          {/* Newly punched user badge if active */}
          {punched && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0B0F2E] text-white px-4 py-2.5 rounded-2xl shadow-2xl border-2 border-[#7DC8FF] flex items-center gap-2.5 animate-in zoom-in-95 duration-200 z-20">
              <div className="w-6 h-6 rounded-full bg-[#14B8A6] flex items-center justify-center text-white font-bold text-xs">
                ✓
              </div>
              <div>
                <span className="text-xs font-bold block text-[#7DC8FF]">Your Punch Approved!</span>
                <span className="text-[10px] text-gray-300">Geofence (12m radius) • 09:00 AM On-Time</span>
              </div>
            </div>
          )}
        </div>

        {/* Verification Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#F5F8FF] border border-[#DCE4F5]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0B5BD3] text-[20px]">verified_user</span>
              <span className="font-label-md text-xs font-semibold text-[#0B0F2E]">AI Facial Liveness</span>
            </div>
            <span className="font-caption text-xs text-[#0B5BD3] font-bold">99.8% Match</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#F5F8FF] border border-[#DCE4F5]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#4A6CFF] text-[20px]">schedule</span>
              <span className="font-label-md text-xs font-semibold text-[#0B0F2E]">Auto Shift Overtime</span>
            </div>
            <span className="font-caption text-xs text-[#5B6488]">Zero Penalties</span>
          </div>
        </div>

        {/* Interactive action */}
        <div className="pt-2">
          {!punched ? (
            <button
              type="button"
              onClick={handleSimulatePunch}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#1E1AB8] to-[#0B5BD3] hover:from-[#0B5BD3] hover:to-[#4A6CFF] text-white font-label-lg text-sm font-semibold rounded-xl transition-all shadow-[0_4px_16px_rgba(11,91,211,0.35)] flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                  <span>Verifying GPS Polygon & Anti-Spoofing...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">touch_app</span>
                  <span>Test Live Geofenced Clock-In Simulation</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#E6FAF7] border border-[#14B8A6]/30">
              <span className="text-xs text-[#006B5F] font-semibold">
                Shift started. Synced to May Payroll batch automatically.
              </span>
              <button
                type="button"
                onClick={() => setPunched(false)}
                className="text-xs text-[#0B5BD3] font-bold hover:underline cursor-pointer"
              >
                Reset Test
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
