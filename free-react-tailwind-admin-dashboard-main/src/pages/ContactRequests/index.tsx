import React, { useEffect, useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "../../components/ui/table";
import { getContactRequests, ContactRequest } from "./api";

const ContactRequestPage: React.FC = () => {
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchContactRequests();
  }, []);

  const fetchContactRequests = async () => {
    try {
      const data = await getContactRequests();
      setContactRequests(data);
    } catch (err: any) {
      setError(err.message || "Failed to load contact requests");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading contact requests...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <>
      <PageMeta title="Contact Requests" description="List of contact requests" />
      <PageBreadcrumb pageTitle="Contact Requests" />

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
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Message</TableCell>
                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Submitted At</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {contactRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No contact requests found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    contactRequests.map((req, idx) => (
                      <TableRow key={req.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.08]">
                        <TableCell className="px-5 py-4 text-start dark:text-gray-400">{idx + 1}</TableCell>
                        <TableCell className="px-5 py-4 text-start dark:text-gray-400">{req.name}</TableCell>
                        <TableCell className="px-5 py-4 text-start dark:text-gray-400">{req.email}</TableCell>
                        <TableCell className="px-5 py-4 text-start dark:text-gray-400">{req.contact_number}</TableCell>
                        <TableCell className="px-5 py-4 text-start dark:text-gray-400">{req.message || "-"}</TableCell>
                        <TableCell className="px-5 py-4 text-start dark:text-gray-400">{new Date(req.created_at).toLocaleString()}</TableCell>
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

export default ContactRequestPage;
