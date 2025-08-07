import { useEffect, useState } from "react";
import { axiosInstance } from "./api";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";

interface AdminUser {
  username: string;
  email: string;
}

interface Company {
  id: number;
  name: string;
  address: string;
  location: string;
  email: string;
  phone_number: string;
  logo: string | null;
  admins: AdminUser[];
}

const MasterDashboard = () => {
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await axiosInstance.get("/master-dashboard/");
        setCompanies(res.data.companies);
      } catch (error) {
        console.error("Failed to fetch:", error);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <>
      <PageMeta title="Master Dashboard" description="" />
      <PageBreadcrumb pageTitle="Master Dashboard" />
      <div className="space-y-6">
        <ComponentCard title="Companies">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Logo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin Email</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {companies.map((company) => (
                    <tr key={company.id}>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold">{company.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{company.address}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{company.location}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {company.logo ? (
                          <img src={company.logo}  className="w-10 h-10 rounded-full" />
                        ) : (
                          <span className="text-gray-400">No logo</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{company.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{company.phone_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {company.admins.length > 0 ? (
                          company.admins[0].username
                        ) : (
                          <span className="text-gray-400">No admin assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {company.admins.length > 0 ? (
                          company.admins[0].email
                        ) : (
                          <span className="text-gray-400">No admin assigned</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </ComponentCard>

       
      </div>
    </>
  );
};

export default MasterDashboard;
