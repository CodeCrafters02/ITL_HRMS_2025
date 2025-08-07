
import React from "react";

const summaryData = [
  { label: "Employees", value: 120, color: "bg-blue-500" },
  { label: "Departments", value: 8, color: "bg-green-500" },
  { label: "Leaves Today", value: 3, color: "bg-yellow-500" },
  { label: "Pending Approvals", value: 5, color: "bg-red-500" },
];

const recentActivities = [
  { id: 1, activity: "John Doe applied for leave", date: "2025-07-25" },
  { id: 2, activity: "Payroll processed for June", date: "2025-07-24" },
  { id: 3, activity: "New employee Priya added", date: "2025-07-23" },
  { id: 4, activity: "Department meeting scheduled", date: "2025-07-22" },
];

const AdminDashboard: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {summaryData.map((item) => (
          <div
            key={item.label}
            className={`rounded-lg shadow p-6 text-white ${item.color}`}
          >
            <div className="text-lg font-semibold">{item.label}</div>
            <div className="text-3xl font-bold mt-2">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activities</h2>
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="text-left p-2">Activity</th>
              <th className="text-left p-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {recentActivities.map((act) => (
              <tr key={act.id} className="border-t">
                <td className="p-2">{act.activity}</td>
                <td className="p-2">{act.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
