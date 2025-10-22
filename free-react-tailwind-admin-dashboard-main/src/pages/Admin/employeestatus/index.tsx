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
    <div className="grid grid-cols-8 gap-2">
      {employees.map((emp) => {
        const tooltipContent = `${emp.full_name}`;

        return (
          <div
            key={emp.id}
            className="flex items-center justify-center p-2 border rounded-lg shadow-sm hover:bg-gray-50 cursor-pointer"
            data-tooltip-id={`emp-${emp.id}`}
            data-tooltip-content={tooltipContent}
          >
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-white font-semibold">
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
                className={`absolute bottom-0 right-0 w-5 h-5 ${getStatusColor(
                  emp.status
                )} border-2 border-white rounded-full`}
              />
            </div>

            <Tooltip id={`emp-${emp.id}`} place="bottom" />
          </div>
        );
      })}
    </div>
  );
};

export default EmployeeStatusList;
