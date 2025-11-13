'use client';

import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { DataProvider } from '@/contexts/DataContext';
import { DashboardGuard } from '@/components/DashboardGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardGuard>
      <DataProvider>
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden w-full">
            <Navbar />
            <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
              {children}
            </main>
          </div>
        </div>
      </DataProvider>
    </DashboardGuard>
  );
}
