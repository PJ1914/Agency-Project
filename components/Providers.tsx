'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { QueryProvider } from '@/providers/QueryProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <OrganizationProvider>
          {children}
        </OrganizationProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
