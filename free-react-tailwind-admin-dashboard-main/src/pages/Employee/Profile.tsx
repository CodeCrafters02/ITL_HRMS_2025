import ProfileMetaCard from "../../components/UserProfile/ProfileMetaCard";
import ProfileInfoCard from "../../components/UserProfile/ProfileInfoCard";
import ProfileAddressCard from "../../components/UserProfile/ProfileAddressCard";
import ProfessionalCard from "../../components/UserProfile/ProfessionalCard";
import HierarchyCard from "../../components/UserProfile/HierarchyCard";
import PageMeta from "../../components/common/PageMeta";
import * as React from 'react';

export default function EmployeeProfiles() {
  const [tab, setTab] = React.useState('personal');
  const [isAnimating, setIsAnimating] = React.useState(false);

  const handleTabChange = (newValue: string) => {
    if (newValue !== tab) {
      setIsAnimating(true);
      setTimeout(() => {
        setTab(newValue);
        setIsAnimating(false);
      }, 200);
    }
  };

  const tabs = [
    {
      id: 'personal',
      label: 'Personal',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      id: 'professional',
      label: 'Professional',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'hierarchy',
      label: 'Hierarchy',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    }
  ];

  return (
    <>
      <PageMeta
        title=" Profile Dashboard "
        description="This is React.js Profile Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <div className="space-y-6">
        {/* Profile Header */}
        <ProfileMetaCard />

        {/* Main Content Card */}
        <div className="rounded-3xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] lg:p-7 p-5 shadow-lg">
          {/* Custom Tabs */}
          <div className="mb-8">
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
              {tabs.map((tabItem) => (
                <button
                  key={tabItem.id}
                  onClick={() => handleTabChange(tabItem.id)}
                  className={`relative flex items-center gap-2 px-6 py-3 font-medium transition-all duration-300 ${tab === tabItem.id
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                  <span className={`transition-transform duration-300 ${tab === tabItem.id ? 'scale-110' : ''}`}>
                    {tabItem.icon}
                  </span>
                  <span className="text-sm font-semibold">{tabItem.label}</span>
                  {tab === tabItem.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full animate-slideIn" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className={`transition-all duration-300 ${isAnimating ? 'opacity-0 transform translate-y-2' : 'opacity-100 transform translate-y-0'}`}>
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
      </div>
    </>
  );
}
