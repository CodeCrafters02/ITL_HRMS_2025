import { useEffect, useState } from "react";
import { axiosInstance } from "../../pages/Employee/api";

export default function HierarchyCard() {
  const [hierarchy, setHierarchy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    axiosInstance
      .get("/employee-hierarchy/")
      .then((res) => {
        setHierarchy(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || err.message || "Failed to fetch hierarchy");
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!hierarchy) return null;

  // Timeline data
  const timeline = [
    {
      key: 'employee',
      label: 'You',
      color: 'bg-blue-500',
      content: (
        <>
          <b>{hierarchy.employee.name}</b> <span className="ml-2">({hierarchy.employee.level})</span>
          <div className="text-xs text-gray-500">{hierarchy.employee.designation}</div>
        </>
      ),
    },
    hierarchy.reporting_manager && {
      key: 'reporting_manager',
      label: 'Reporting Manager',
      color: 'bg-green-500',
      content: (
        <>
          <b>{hierarchy.reporting_manager.name}</b> <span className="ml-2">({hierarchy.reporting_manager.level})</span>
          <div className="text-xs text-gray-500">{hierarchy.reporting_manager.designation}</div>
          {/* Show reportees if any */}
          {Array.isArray(hierarchy.reporting_manager.reportees) && hierarchy.reporting_manager.reportees.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Reportees:</div>
              <div className="flex flex-wrap gap-2">
                {hierarchy.reporting_manager.reportees.map((rep: any) => (
                  <div key={rep.id} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                    {rep.name} <span className="text-gray-400">({rep.designation})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ),
    },
    hierarchy.higher_authority && {
      key: 'higher_authority',
      label: 'Higher Authority',
      color: 'bg-yellow-500',
      content: hierarchy.higher_authority.employee_name ? (
        <>
          <b>{hierarchy.higher_authority.employee_name}</b> <span className="ml-2">({hierarchy.higher_authority.level})</span>
          <div className="text-xs text-gray-500">{hierarchy.higher_authority.designation}</div>
        </>
      ) : (
        <>
          <span className="font-medium">{hierarchy.higher_authority.level}</span>
          <div className="text-xs text-gray-500">{hierarchy.higher_authority.designation}</div>
          {hierarchy.higher_authority.employee_count && (
            <div className="text-xs text-gray-400">({hierarchy.higher_authority.employee_count} employees)</div>
          )}
        </>
      ),
    },
  ].filter(Boolean);

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">Hierarchy</h4>
      <div className="relative flex flex-col items-start ml-6">
        {timeline.map((item, idx) => (
          <div key={item.key} className="flex items-start w-full relative mb-8 last:mb-0">
            {/* Dot */}
            <div className="absolute -left-6 flex flex-col items-center">
              <span className={`w-4 h-4 rounded-full border-4 border-white dark:border-gray-800 shadow ${item.color}`}></span>
              {/* Line (except last) */}
              {idx < timeline.length - 1 && (
                <span className="w-1 h-8 bg-gray-300 dark:bg-gray-700 mt-0.5"></span>
              )}
            </div>
            <div className="pl-4">
              <div className="font-semibold mb-1 text-sm">{item.label}</div>
              <div className="text-sm text-gray-700 dark:text-gray-200">{item.content}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Show own reportees if any */}
      {Array.isArray(hierarchy.reportees) && hierarchy.reportees.length > 0 && (
        <div className="mt-8">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Your Reportees:</div>
          <div className="flex flex-wrap gap-2">
            {hierarchy.reportees.map((rep: any) => (
              <div key={rep.id} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                {rep.name} <span className="text-gray-400">({rep.designation})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}