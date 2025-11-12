import { useState, useEffect, useRef } from "react";
import { axiosInstance, axiosInstances } from "../Employee/api";
import { FaRegCircle } from "react-icons/fa";
import { GiCoffeeCup, GiMeal } from "react-icons/gi";
import { BsCircleFill } from "react-icons/bs";

interface BreakIconsProps {
  onBreakClick: (breakType: string) => void;
  onStatusChange?: (status: string) => void;
  disabled?: boolean;
  activeBreak?: string | null;
  currentStatus?: string | null;
}

const STATUS_OPTIONS = [
  { label: "Online", value: "online", color: "text-green-500" },
  { label: "Away", value: "away", color: "text-yellow-500" },
  { label: "Do Not Disturb", value: "dnd", color: "text-red-500" },
  { label: "Offline", value: "offline", color: "text-gray-400" },
];

const BreakIcons = ({
  onBreakClick,
  onStatusChange,
  disabled = false,
  activeBreak,
  currentStatus,
}: BreakIconsProps) => {
  const [selectedBreak, setSelectedBreak] = useState<string>("");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [teaDropdownOpen, setTeaDropdownOpen] = useState(false);
  const [breakConfigs, setBreakConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState<string | null>(currentStatus || null);
  const dropdownRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  setLoading(true);

  const fetchBreakConfigs = async () => {
    try {
      const res = await axiosInstance.get("employee-breaks/");
      setBreakConfigs(res.data);
    } catch (err) {
      console.error("Error fetching break configs:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeStatus = async () => {
    try {
      const res = await axiosInstances.get("employeestatus/");

      // ✅ Get employeeId from localStorage
      const employeeId = localStorage.getItem("employee_id");

      if (employeeId && Array.isArray(res.data)) {
        const currentEmployee = res.data.find(emp => emp.id === Number(employeeId));
        if (currentEmployee?.status) {
          setLocalStatus(currentEmployee.status);
          onStatusChange?.(currentEmployee.status); // update parent
        }
      }
    } catch (err) {
      console.error("❌ Error fetching Employee Status:", err);
    }
  };

  fetchBreakConfigs();
  fetchEmployeeStatus();
}, []);


  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
        setTeaDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setLocalStatus(currentStatus || null);
  }, [currentStatus]);

  const handleBreakClick = (breakType: string) => {
    if (disabled) return;
    const newSelection = selectedBreak === breakType ? "" : breakType;
    setSelectedBreak(newSelection);

    if (breakType === "tea") {
      setTeaDropdownOpen((open) => !open);
      return;
    }

    const breakConfig = breakConfigs.find((cfg) => {
      if (!cfg.enabled) return false;
      if (breakType === "meal") return cfg.break_choice === "meal_break";
      return false;
    });

    if (breakConfig) {
      onBreakClick(breakConfig.id.toString());
    } else {
      console.warn("Break config not found for:", breakType);
    }

    setTeaDropdownOpen(false);
    setStatusDropdownOpen(false);
  };

  const handleDropdownSelect = (selected: number | string) => {
    if (typeof selected === "string" && isNaN(Number(selected))) {
      setLocalStatus(selected); // Update UI instantly
      onStatusChange?.(selected); // Trigger backend update
    } else {
      onBreakClick(selected.toString());
    }

    setTeaDropdownOpen(false);
    setStatusDropdownOpen(false);
  };

  // Get current status color
  const getStatusColor = () => {
    const status = STATUS_OPTIONS.find((s) => s.value === localStatus);
    return status ? status.color : "text-gray-400";
  };

  return (
    <div className="flex items-center gap-3 relative" ref={dropdownRef}>
      {/* 🔹 Status Dropdown */}
      <div className="relative">
        <button
          className={`p-2 rounded-full transition-all duration-200 ${disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
          onClick={() => setStatusDropdownOpen((open) => !open)}
          title="Status"
          disabled={disabled}
        >
          <FaRegCircle size={20} className={getStatusColor()} />
        </button>

        {statusDropdownOpen && (
          <div className="absolute left-0 mt-2 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2">
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status.value}
                className={`flex items-center w-full px-2 py-1 rounded text-gray-700 hover:bg-gray-100 ${localStatus === status.value ? "bg-gray-200 font-semibold" : ""
                  }`}
                onClick={() => handleDropdownSelect(status.value)}
                disabled={disabled}
              >
                <BsCircleFill className={`w-3 h-3 mr-2 ${status.color}`} />
                {status.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 🔹 Tea Break Dropdown */}
      <div className="relative">
        <button
          className={`p-2 rounded-full transition-all duration-200 ${activeBreak === "short" || selectedBreak === "tea"
              ? "bg-yellow-100 text-yellow-600 ring-2 ring-yellow-300"
              : "bg-gray-100 hover:bg-yellow-50 text-gray-600 hover:text-yellow-500"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => setTeaDropdownOpen((open) => !open)}
          title="Tea Break"
          disabled={disabled}
        >
          <GiCoffeeCup size={20} />
        </button>
        {teaDropdownOpen && (
          <div className="absolute left-0 mt-2 w-30 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            {loading ? (
              <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
            ) : breakConfigs.filter(cfg => cfg.break_choice === "short_break").length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">No short breaks available</div>
            ) : (
              <ul>
                {breakConfigs.filter(cfg => cfg.break_choice === "short_break").map((cfg) => (
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

      {/* 🔹 Meal Break */}
      <button
        className={`p-2 rounded-full transition-all duration-200 ${activeBreak === "meal" || selectedBreak === "meal"
            ? "bg-orange-100 text-orange-600 ring-2 ring-orange-300"
            : "bg-gray-100 hover:bg-orange-50 text-gray-600 hover:text-orange-500"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
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
