import { useState } from "react";
import { FaBellSlash } from "react-icons/fa";
import { GiCoffeeCup, GiMeal } from "react-icons/gi";

interface BreakIconsProps {
  onBreakClick: (breakType: string) => void;
  disabled?: boolean;
  activeBreak?: string | null;
}

const BreakIcons = ({ onBreakClick, disabled = false, activeBreak }: BreakIconsProps) => {
  const [selectedBreak, setSelectedBreak] = useState<string>("");

  const handleBreakClick = (breakType: string) => {
    if (disabled) return;
    
    const newSelection = selectedBreak === breakType ? "" : breakType;
    setSelectedBreak(newSelection);
    
    // Map the break types to match backend expectations
    const breakMapping: { [key: string]: string } = {
      "dnd": "shortbreak",
      "tea": "shortbreak", 
      "meal": "meal"
    };
    
    onBreakClick(breakMapping[breakType] || breakType);
    console.log(`${breakType} selected`);
  };

  return (
    <div className="flex items-center gap-3">
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

      {/* Tea Break */}
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
