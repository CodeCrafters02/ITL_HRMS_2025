import { useState } from "react";
import { FaBellSlash } from "react-icons/fa";
import { GiCoffeeCup, GiMeal } from "react-icons/gi";

const BreakIcons = () => {
  const [selectedBreak, setSelectedBreak] = useState<string>("");

  const handleBreakClick = (breakType: string) => {
    setSelectedBreak(selectedBreak === breakType ? "" : breakType);
    console.log(`${breakType} selected`);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Do Not Disturb */}
      <button
        className={`p-2 rounded-full transition-all duration-200 ${
          selectedBreak === "dnd"
            ? 'bg-red-100 text-red-600 ring-2 ring-red-300'
            : 'bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-500'
        }`}
        onClick={() => handleBreakClick("dnd")}
        title="Do Not Disturb"
      >
        <FaBellSlash size={16} />
      </button>

      {/* Tea Break */}
      <button
        className={`p-2 rounded-full transition-all duration-200 ${
          selectedBreak === "tea"
            ? 'bg-yellow-100 text-yellow-600 ring-2 ring-yellow-300'
            : 'bg-gray-100 hover:bg-yellow-50 text-gray-600 hover:text-yellow-500'
        }`}
        onClick={() => handleBreakClick("tea")}
        title="Tea Break"
      >
        <GiCoffeeCup size={16} />
      </button>

      {/* Meal Break */}
      <button
        className={`p-2 rounded-full transition-all duration-200 ${
          selectedBreak === "meal"
            ? 'bg-orange-100 text-orange-600 ring-2 ring-orange-300'
            : 'bg-gray-100 hover:bg-orange-50 text-gray-600 hover:text-orange-500'
        }`}
        onClick={() => handleBreakClick("meal")}
        title="Meal Break"
      >
        <GiMeal size={16} />
      </button>
    </div>
  );
};

export default BreakIcons;
