import ProfileMetaCard from "../../components/UserProfile/ProfileMetaCard";
import ProfileInfoCard from "../../components/UserProfile/ProfileInfoCard";
import ProfileAddressCard from "../../components/UserProfile/ProfileAddressCard";
import ProfessionalCard from "../../components/UserProfile/ProfessionalCard";
import HierarchyCard from "../../components/UserProfile/HierarchyCard";
import PageMeta from "../../components/common/PageMeta";
import * as React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';

export default function EmployeeProfiles() {
  const [tab, setTab] = React.useState('personal');

  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    setTab(newValue);
  };

  return (
    <>
      <PageMeta
        title="React.js Profile Dashboard | TailAdmin - Next.js Admin Dashboard Template"
        description="This is React.js Profile Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
          Profile
        </h3>
        <div className="space-y-6">
          <ProfileMetaCard />
          <Box sx={{ width: '100%' }}>
            <Tabs
              value={tab}
              onChange={handleTabChange}
              textColor="primary"
              indicatorColor="primary"
              aria-label="profile tabs"
            >
              <Tab value="personal" label="Personal" />
              <Tab value="professional" label="Professional" />
              <Tab value="hierarchy" label="Hierarchy" />
            </Tabs>
          </Box>
          {tab === 'personal' && (
            <div className="space-y-6">
              <ProfileInfoCard />
              <ProfileAddressCard />
            </div>
          )}
          {tab === 'professional' && (
            <div className="space-y-6">
              <ProfessionalCard />
            </div>
          )}
          {tab === 'hierarchy' && (
            <div className="space-y-6">
              <HierarchyCard />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
