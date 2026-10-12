"use client";

import React, { useEffect, useState } from "react";

interface BookDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const sizes = ["1-50", "51-250", "251-1000", "1000+"];
const moduleOptions = ["Payroll", "Attendance", "Leave", "Hiring", "Onboarding", "Performance"];
const initial = { name: "", email: "", company: "", employees: "51-250", modules: ["Payroll", "Attendance"], notes: "" };

const field =
  "w-full px-4 py-2.5 rounded-lg border border-[#DCE4F5] bg-white text-[#0B0F2E] placeholder:text-[#9AA3D1] focus:outline-none focus:border-[#0B5BD3] focus:ring-2 focus:ring-[#EAF0FF]";
const label = "block text-sm font-medium text-[#0B0F2E] mb-1.5";

export default function BookDemoModal({ isOpen, onClose }: BookDemoModalProps) {
  const [step, setStep] = useState<"form" | "success">("form");
  const [data, setData] = useState(initial);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const set = (k: keyof typeof initial) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setData((d) => ({ ...d, [k]: e.target.value }));
  const toggle = (m: string) =>
    setData((d) => ({ ...d, modules: d.modules.includes(m) ? d.modules.filter((x) => x !== m) : [...d.modules, m] }));
  const close = () => {
    setStep("form");
    setData(initial);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0B0F2E]/50" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg bg-white rounded-2xl border border-[#DCE4F5] shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Close"
          className="absolute top-4 right-4 w-9 h-9 rounded-lg text-[#5B6488] hover:bg-[#F5F8FF] flex items-center justify-center cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {step === "form" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep("success");
            }}
            className="p-6 sm:p-8 space-y-5"
          >
            <div>
              <h3 className="font-display text-2xl tracking-tight text-[#0B0F2E]">Book a demo</h3>
              <p className="mt-1 text-sm text-[#5B6488]">A 20-minute walkthrough, tailored to your team.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>Name</label>
                <input required value={data.name} onChange={set("name")} placeholder="Your name" className={field} />
              </div>
              <div>
                <label className={label}>Work email</label>
                <input required type="email" value={data.email} onChange={set("email")} placeholder="you@company.com" className={field} />
              </div>
            </div>

            <div>
              <label className={label}>Company</label>
              <input required value={data.company} onChange={set("company")} placeholder="Company name" className={field} />
            </div>

            <div>
              <span className={label}>Team size</span>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setData((d) => ({ ...d, employees: s }))}
                    className={`px-3.5 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                      data.employees === s
                        ? "border-[#0B5BD3] bg-[#EAF0FF] text-[#0B5BD3] font-semibold"
                        : "border-[#DCE4F5] text-[#5B6488] hover:border-[#0B5BD3]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className={label}>Interested in</span>
              <div className="flex flex-wrap gap-2">
                {moduleOptions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggle(m)}
                    className={`px-3.5 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                      data.modules.includes(m)
                        ? "border-[#0B5BD3] bg-[#EAF0FF] text-[#0B5BD3] font-semibold"
                        : "border-[#DCE4F5] text-[#5B6488] hover:border-[#0B5BD3]"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={label}>
                Anything we should know? <span className="text-[#9AA3D1] font-normal">(optional)</span>
              </label>
              <textarea rows={2} value={data.notes} onChange={set("notes")} className={`${field} resize-none`} />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-[#0B5BD3] hover:bg-[#1E1AB8] text-white font-semibold transition-colors cursor-pointer"
            >
              Request demo
            </button>
          </form>
        ) : (
          <div className="p-8 sm:p-10 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-[#EAF0FF] text-[#0B5BD3] flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">check</span>
            </div>
            <h3 className="font-display text-2xl tracking-tight text-[#0B0F2E]">Thanks, {data.name.split(" ")[0]}!</h3>
            <p className="text-sm text-[#5B6488]">
              We'll email {data.email} within one business day to schedule your walkthrough.
            </p>
            <button
              onClick={close}
              className="px-6 py-2.5 rounded-lg border border-[#DCE4F5] hover:border-[#0B5BD3] text-[#0B0F2E] font-semibold cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
