'use client';

import { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Building2, Check, ChevronDown } from 'lucide-react';

export function OrganizationSwitcher() {
  const { currentOrganization, organizations, switchOrganization } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);

  if (!currentOrganization) return null;

  const handleSwitch = async (orgId: string) => {
    await switchOrganization(orgId);
    setIsOpen(false);
    window.location.reload(); // Reload to fetch new org data
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4" />
          <span className="font-semibold truncate max-w-[150px]">
            {currentOrganization.name}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 ml-2" />
      </Button>

      {isOpen && organizations.length > 1 && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex-1">
                  <p className="font-medium">{org.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{org.planType} Plan</p>
                </div>
                {org.id === currentOrganization.id && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
