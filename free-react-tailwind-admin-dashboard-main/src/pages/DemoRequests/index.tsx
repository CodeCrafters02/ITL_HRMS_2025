import React, { useEffect, useState } from "react";
import { FiCalendar } from "react-icons/fi";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import { getDemoRequests, DemoRequest } from "./api";

const DemoRequestPage: React.FC = () => {
  const [demoRequests, setDemoRequests] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDemoRequests();
  }, []);

  const fetchDemoRequests = async () => {
    try {
      const data = await getDemoRequests();
      setDemoRequests(data);
    } catch (err: any) {
      setError(err.message || "Failed to load demo requests");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading demo requests...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <>
      <PageMeta title="Demo Requests" description="List of demo requests" />
      <PageBreadcrumb pageTitle="Demo Requests" />
      <div className="space-y-6">
        <ComponentCard title="Demo Requests List">
          <table
            className="min-w-full bg-white dark:bg-white/[0.03] rounded-xl overflow-hidden"
            aria-label="Demo Requests List"
          >
            <thead className="bg-gray-100 dark:bg-white/[0.05]">
              <tr>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">#</th>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Name</th>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Email</th>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Contact</th>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Service</th>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Preferred Date & Time</th>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Message</th>
                {/* <th className="px-5 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Submitted At</th> */}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {demoRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-4 text-gray-400">
                    No demo requests found.
                  </td>
                </tr>
              ) : (
                demoRequests.map((req, idx) => (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.08]">
                    <td className="px-5 py-3">{idx + 1}</td>
                    <td className="px-5 py-3">{req.name}</td>
                    <td className="px-5 py-3">{req.email}</td>
                    <td className="px-5 py-3">{req.contact_number}</td>
                    <td className="px-5 py-3">{req.service?.name || "-"}</td>
                    <td className="px-5 py-3">{new Date(req.preferred_datetime).toLocaleString()}</td>
                    <td className="px-5 py-3">{req.message || "-"}</td>
                    {/* <td className="px-5 py-3">{new Date(req.submitted_at).toLocaleString()}</td> */}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ComponentCard>
      </div>
    </>
  );
};

export default DemoRequestPage;
