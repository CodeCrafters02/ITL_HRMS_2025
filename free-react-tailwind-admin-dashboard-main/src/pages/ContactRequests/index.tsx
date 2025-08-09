import React, { useEffect, useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
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
        <ComponentCard title="Contact Requests List">
          <table
            className="min-w-full bg-white dark:bg-white/[0.03] rounded-xl overflow-hidden"
            aria-label="Contact Requests List"
          >
            <thead className="bg-gray-100 dark:bg-white/[0.05]">
              <tr>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">#</th>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Name</th>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Email</th>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Contact</th>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Message</th>
                <th className="px-5 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Submitted At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {contactRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-4 text-gray-400">
                    No contact requests found.
                  </td>
                </tr>
              ) : (
                contactRequests.map((req, idx) => (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.08]">
                    <td className="px-5 py-3">{idx + 1}</td>
                    <td className="px-5 py-3">{req.name}</td>
                    <td className="px-5 py-3">{req.email}</td>
                    <td className="px-5 py-3">{req.contact_number}</td>
                    <td className="px-5 py-3">{req.message || "-"}</td>
                    <td className="px-5 py-3">{new Date(req.created_at).toLocaleString()}</td>
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

export default ContactRequestPage;
