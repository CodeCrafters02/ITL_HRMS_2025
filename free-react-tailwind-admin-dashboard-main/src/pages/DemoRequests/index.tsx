import React, { useEffect, useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "../../components/ui/table";
import { getDemoRequests, DemoRequest } from "./api";

const DemoRequestPage: React.FC = () => {
  const [demoRequests, setDemoRequests] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchDemoRequests();
  }, []);

  const fetchDemoRequests = async () => {
    try {
      const data = await getDemoRequests();
      setDemoRequests(data);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("Failed to load demo requests");
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
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/[0.05] bg-white dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-100 dark:bg-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">#</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Email</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Contact</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Service</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Preferred Date & Time</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Message</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {demoRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No demo requests found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    demoRequests.map((req, idx) => (
                      <TableRow key={req.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.08]">
                        <TableCell className="px-5 py-4 text-start dark:text-gray-400">{idx + 1}</TableCell>
                        <TableCell className="px-5 py-4 text-start dark:text-gray-400">{req.name}</TableCell>
                        <TableCell className="px-5 py-4 text-start dark:text-gray-400">{req.email}</TableCell>
                        <TableCell className="px-5 py-4 text-start dark:text-gray-400">{req.contact_number}</TableCell>
                        <TableCell className="px-5 py-4 text-start dark:text-gray-400">{req.service?.name || "-"}</TableCell>
                        <TableCell className="px-5 py-4 text-start dark:text-gray-400">{new Date(req.preferred_datetime).toLocaleString()}</TableCell>
                        <TableCell className="px-5 py-4 text-start dark:text-gray-400">{req.message || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
      </div>
    </>
  );
};

export default DemoRequestPage;
