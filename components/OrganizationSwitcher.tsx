'use client';

import { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Building2, Check, ChevronDown } from 'lucide-react';

export function OrganizationSwitcher() {
  const { currentOrganization, organizations, switchOrganization, loading } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);

  // Show loading state
  if (loading) {
    return (
      <div className="w-full px-3 py-2 bg-gray-700 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-gray-400 animate-pulse" />
          <span className="text-sm text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  // Show message if no organization
  if (!currentOrganization) {
    return (
      <div className="w-full px-3 py-2 bg-gray-700 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">No Organization</span>
        </div>
      </div>
    );
  }

  const handleSwitch = async (orgId: string) => {
    await switchOrganization(orgId);
    setIsOpen(false);
    window.location.reload(); // Reload to fetch new org data
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <Building2 className="w-4 h-4 text-gray-300 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm truncate">
                {currentOrganization.name}
              </p>
              <p className="text-xs text-gray-400 capitalize truncate">
                {currentOrganization.planType} Plan
              </p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && organizations.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{org.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{org.planType} Plan</p>
                </div>
                {org.id === currentOrganization.id && (
                  <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
