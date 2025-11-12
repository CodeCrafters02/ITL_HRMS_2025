import React, { useEffect, useState } from "react";
import { getAllEmployeeStatuses, EmployeeStatusData } from "./api";
import { BsCircleFill } from "react-icons/bs";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

const getInitials = (fullName: string) => {
  const names = fullName.split(" ");
  if (names.length === 1) return names[0][0].toUpperCase();
  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "online":
      return "text-green-500";
    case "away":
      return "text-yellow-500";
    case "dnd":
      return "text-red-500";
    case "offline":
      return "text-gray-400";
    default:
      return "text-gray-400";
  }
};

const formatStatusText = (status: string) => {
  switch (status) {
    case "online":
      return "Online";
    case "away":
      return "Away";
    case "dnd":
      return "Do Not Disturb";
    case "offline":
      return "Offline";
    default:
      return "Unknown";
  }
};

const EmployeeStatusList = () => {
  const [employees, setEmployees] = useState<EmployeeStatusData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const data = await getAllEmployeeStatuses();
        setEmployees(data);
      } catch (err) {
        console.error("Error fetching employee statuses:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatuses();
  }, []);

  if (loading) return <div className="text-center p-4">Loading...</div>;

  return (
    <div className="grid grid-cols-8 gap-3">
      {employees.map((emp) => {
        const tooltipContent = `
          ${emp.full_name}
          — ${formatStatusText(emp.status)}
        `;

        return (
          <div
            key={emp.id}
            className="flex items-center justify-center p-2 border rounded-lg shadow-sm hover:bg-gray-50 cursor-pointer transition-all duration-200"
            data-tooltip-id={`emp-${emp.id}`}
            data-tooltip-content={tooltipContent}
          >
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-300 flex items-center justify-center text-white font-semibold text-sm">
              {emp.photo ? (
                <img
                  src={emp.photo}
                  alt={emp.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitials(emp.full_name)
              )}

              {/* Bigger status circle */}
              <BsCircleFill
                className={`absolute bottom-0 right-0 w-4 h-4 ${getStatusColor(
                  emp.status
                )} border-2 border-white rounded-full transition-transform duration-200 group-hover:scale-110`}
              />
            </div>

            <Tooltip
              id={`emp-${emp.id}`}
              place="bottom"
              className="!bg-gray-800 !text-white !text-sm !rounded-md !px-3 !py-1 shadow-md"
            />
          </div>
        );
      })}
    </div>
  );
};

export default EmployeeStatusList;
