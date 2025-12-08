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
      color: 'from-blue-500 to-indigo-500',
      dotColor: 'bg-gradient-to-r from-blue-500 to-indigo-500',
      content: (
        <>
          <b>{hierarchy.employee.name}</b> <span className="ml-2">({hierarchy.employee.level})</span>
          <div className="text-xs text-gray-500 mt-1">{hierarchy.employee.designation}</div>
        </>
      ),
    },
    hierarchy.reporting_manager && {
      key: 'reporting_manager',
      label: 'Reporting Manager',
      color: 'from-emerald-500 to-teal-500',
      dotColor: 'bg-gradient-to-r from-emerald-500 to-teal-500',
      content: (
        <>
          <b>{hierarchy.reporting_manager.name}</b> <span className="ml-2">({hierarchy.reporting_manager.level})</span>
          <div className="text-xs text-gray-500 mt-1">{hierarchy.reporting_manager.designation}</div>
          {/* Show reportees if any */}
          {Array.isArray(hierarchy.reporting_manager.reportees) && hierarchy.reporting_manager.reportees.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Reportees:</div>
              <div className="flex flex-wrap gap-2">
                {hierarchy.reporting_manager.reportees.map((rep: any) => (
                  <div key={rep.id} className="group px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 border border-emerald-200 dark:border-emerald-800 hover:shadow-md transition-all duration-300 hover:scale-105">
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
      color: 'from-amber-500 to-orange-500',
      dotColor: 'bg-gradient-to-r from-amber-500 to-orange-500',
      content: hierarchy.higher_authority.employee_name ? (
        <>
          <b>{hierarchy.higher_authority.employee_name}</b> <span className="ml-2">({hierarchy.higher_authority.level})</span>
          <div className="text-xs text-gray-500 mt-1">{hierarchy.higher_authority.designation}</div>
        </>
      ) : (
        <>
          <span className="font-medium">{hierarchy.higher_authority.level}</span>
          <div className="text-xs text-gray-500 mt-1">{hierarchy.higher_authority.designation}</div>
          {hierarchy.higher_authority.employee_count && (
            <div className="text-xs text-gray-400 mt-1">({hierarchy.higher_authority.employee_count} employees)</div>
          )}
        </>
      ),
    },
  ].filter(Boolean);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 shadow-lg">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 p-[2px]">
        <div className="bg-white dark:bg-gray-900 px-6 py-4">
          <h4 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            Organizational Hierarchy
          </h4>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="relative flex flex-col items-start ml-8">
          {timeline.map((item, idx) => (
            <div key={item.key} className="flex items-start w-full relative mb-8 last:mb-4 group animate-fadeIn" style={{ animationDelay: `${idx * 100}ms` }}>
              {/* Dot with gradient */}
              <div className="absolute -left-8 flex flex-col items-center">
                <div className={`relative w-5 h-5 rounded-full ${item.dotColor} shadow-lg group-hover:scale-125 transition-transform duration-300 flex items-center justify-center`}>
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                {/* Gradient Line (except last) */}
                {idx < timeline.length - 1 && (
                  <div className={`w-1 h-12 bg-gradient-to-b ${item.color} mt-1 opacity-60`}></div>
                )}
              </div>

              {/* Content Card */}
              <div className="flex-1 pl-6">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${item.color} text-white text-xs font-bold mb-2 shadow-md`}>
                  {item.label}
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                  <div className="text-sm text-gray-700 dark:text-gray-200">{item.content}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Show own reportees if any */}
        {Array.isArray(hierarchy.reportees) && hierarchy.reportees.length > 0 && (
          <div className="mt-8 p-5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-md">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
              <h5 className="text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">Your Reportees</h5>
            </div>
            <div className="flex flex-wrap gap-2">
              {hierarchy.reportees.map((rep: any) => (
                <div key={rep.id} className="group px-4 py-2 bg-white dark:bg-gray-800 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300 hover:scale-105 hover:bg-gradient-to-r hover:from-blue-500 hover:to-indigo-500 hover:text-white hover:border-transparent">
                  {rep.name} <span className="opacity-70">({rep.designation})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
