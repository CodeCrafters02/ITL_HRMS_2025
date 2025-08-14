import { useState, useEffect, useRef } from "react";
import { axiosInstance } from "../Employee/api";
import { FaBellSlash } from "react-icons/fa";
import { GiCoffeeCup, GiMeal } from "react-icons/gi";

interface BreakIconsProps {
  onBreakClick: (breakType: string) => void;
  disabled?: boolean;
  activeBreak?: string | null;
}


const BreakIcons = ({ onBreakClick, disabled = false, activeBreak }: BreakIconsProps) => {
  const [selectedBreak, setSelectedBreak] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [breakConfigs, setBreakConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch break configs when dropdown is opened
  useEffect(() => {
    if (dropdownOpen && breakConfigs.length === 0) {
      setLoading(true);
      axiosInstance.get("employee-breaks/")
        .then(res => setBreakConfigs(res.data))
        .finally(() => setLoading(false));
    }
  }, [dropdownOpen, breakConfigs.length]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  const handleBreakClick = (breakType: string) => {
    if (disabled) return;
    const newSelection = selectedBreak === breakType ? "" : breakType;
    setSelectedBreak(newSelection);
    // Only open dropdown for tea icon
    if (breakType === "tea") {
      setDropdownOpen((open) => !open);
    } else {
      // Map the break types to match backend expectations
      const breakMapping: { [key: string]: string } = {
        "dnd": "shortbreak",
        "meal": "meal"
      };
      onBreakClick(breakMapping[breakType] || breakType);
      setDropdownOpen(false);
    }
  };

  const handleDropdownSelect = (breakConfigId: number) => {
    setDropdownOpen(false);
    onBreakClick(breakConfigId.toString());
  };

  return (
    <div className="flex items-center gap-3 relative" ref={dropdownRef}>
      {/* Do Not Disturb */}
      <button
        className={`p-2 rounded-full transition-all duration-200 ${
          activeBreak === "short" || selectedBreak === "dnd"
            ? 'bg-red-100 text-red-600 ring-2 ring-red-300'
            : 'bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => handleBreakClick("dnd")}
        title="Do Not Disturb"
        disabled={disabled}
      >
        <FaBellSlash size={20} />
      </button>

      {/* Tea Break (shows dropdown) */}
      <div className="relative">
        <button
          className={`p-2 rounded-full transition-all duration-200 ${
            activeBreak === "short" || selectedBreak === "tea"
              ? 'bg-yellow-100 text-yellow-600 ring-2 ring-yellow-300'
              : 'bg-gray-100 hover:bg-yellow-50 text-gray-600 hover:text-yellow-500'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => handleBreakClick("tea")}
          title="Tea Break"
          disabled={disabled}
        >
          <GiCoffeeCup size={20} />
        </button>
        {dropdownOpen && (
          <div className="absolute left-0 mt-2 w-30 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            {loading ? (
              <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
            ) : breakConfigs.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No breaks available</div>
            ) : (
              <ul>
                {breakConfigs.map(cfg => (
                  <li key={cfg.id}>
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-yellow-50 text-gray-700"
                      onClick={() => handleDropdownSelect(cfg.id)}
                      disabled={disabled}
                    >
                      {cfg.duration_minutes} min
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Meal Break */}
      <button
        className={`p-2 rounded-full transition-all duration-200 ${
          activeBreak === "meal" || selectedBreak === "meal"
            ? 'bg-orange-100 text-orange-600 ring-2 ring-orange-300'
            : 'bg-gray-100 hover:bg-orange-50 text-gray-600 hover:text-orange-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => handleBreakClick("meal")}
        title="Meal Break"
        disabled={disabled}
      >
        <GiMeal size={20} />
      </button>
    </div>
  );
};

export default BreakIcons;
