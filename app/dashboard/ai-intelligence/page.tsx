'use client';

import AIDashboard from '@/components/AIDashboard';

export default function AIIntelligencePage() {
  const organizationId = 'org_001'; // Get from auth context

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <AIDashboard organizationId={organizationId} />
      </div>
    </div>
  );
}
