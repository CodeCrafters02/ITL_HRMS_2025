import type React from "react";
import { useState, useEffect } from "react";

interface Option {
  value: string;
  text: string;
}

interface MultiSelectProps {
  label: string;
  options: Option[];
  value?: string[]; // Controlled selected values
  defaultSelected?: string[]; // For uncontrolled usage
  onChange?: (selected: string[]) => void;
  disabled?: boolean;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  value,
  defaultSelected = [],
  onChange,
  disabled = false,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>(defaultSelected);

  // Sync internal state if controlled via `value` prop
  useEffect(() => {
    if (value !== undefined) {
      setSelectedOptions(value);
    }
  }, [value]);

  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    if (!disabled) setIsOpen((prev) => !prev);
  };

  const handleSelect = (optionValue: string) => {
    const newSelected = selectedOptions.includes(optionValue)
      ? selectedOptions.filter((v) => v !== optionValue)
      : [...selectedOptions, optionValue];

    if (value === undefined) {
      setSelectedOptions(newSelected); // uncontrolled
    }
    onChange?.(newSelected);
  };

  const removeOption = (optionValue: string) => {
    const newSelected = selectedOptions.filter((v) => v !== optionValue);
    if (value === undefined) setSelectedOptions(newSelected);
    onChange?.(newSelected);
  };

  const selectedTexts = selectedOptions
    .map((v) => options.find((o) => o.value === v)?.text || "")
    .filter(Boolean);

  return (
    <div className="w-full">
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
        {label}
      </label>

      <div className="relative z-20 w-full">
        <div className="relative flex flex-col">
          <div onClick={toggleDropdown} className="w-full cursor-pointer">
            <div className="mb-2 flex h-11 w-full flex-wrap items-center gap-2 rounded-lg border border-gray-300 py-1.5 pl-3 pr-3 shadow-theme-xs outline-hidden transition focus:border-brand-300 focus:shadow-focus-ring dark:border-gray-700 dark:bg-gray-900 dark:focus:border-brand-300">
              {selectedTexts.length > 0 ? (
                selectedTexts.map((text, idx) => (
                  <div
                    key={idx}
                    className="group flex items-center justify-center rounded-full border-[0.7px] border-transparent bg-gray-100 py-1 pl-2.5 pr-2 text-sm text-gray-800 hover:border-gray-200 dark:bg-gray-800 dark:text-white/90 dark:hover:border-gray-800"
                  >
                    <span className="max-w-full">{text}</span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        removeOption(selectedOptions[idx]);
                      }}
                      className="ml-2 cursor-pointer text-gray-500 group-hover:text-gray-400 dark:text-gray-400"
                    >
                      ✕
                    </span>
                  </div>
                ))
              ) : (
                <input
                  placeholder="Select option"
                  className="w-full bg-transparent p-1 text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:placeholder:text-white/90"
                  readOnly
                  value="Select option"
                />
              )}

              <div className="ml-auto flex h-5 w-5 items-center justify-center">
                <svg
                  onClick={toggleDropdown}
                  className={`stroke-current transition-transform ${isOpen ? "rotate-180" : ""}`}
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4.79175 7.39551L10.0001 12.6038L15.2084 7.39551"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          {isOpen && (
            <div
              className="absolute left-0 top-full z-40 w-full max-h-60 overflow-y-auto rounded-lg bg-white shadow-sm dark:bg-gray-900"
              onClick={(e) => e.stopPropagation()}
            >
              {options.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`cursor-pointer px-2 py-2 hover:bg-primary/5 ${
                    selectedOptions.includes(option.value) ? "bg-primary/10" : ""
                  }`}
                >
                  <span className="text-gray-800 dark:text-white/90">{option.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiSelect;
