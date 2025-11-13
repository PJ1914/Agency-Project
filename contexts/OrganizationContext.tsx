'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Organization, OrganizationMember } from '@/types/organization.d';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  memberRole: OrganizationMember | null;
  loading: boolean;
  switchOrganization: (orgId: string) => Promise<void>;
  refetchOrganization: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  canAccessFeature: (feature: string) => boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [memberRole, setMemberRole] = useState<OrganizationMember | null>(null);
  const [loading, setLoading] = useState(true);

  // Load all organizations from Firestore on mount
  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      
      console.log('Loading organizations from Firestore...');
      
      // Fetch all organizations from Firestore
      const orgsSnapshot = await getDocs(collection(db, 'organizations'));
      console.log('Organizations snapshot size:', orgsSnapshot.size);
      
      const orgs = orgsSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Organization found:', doc.id, data);
        return {
          id: doc.id,
          ...data
        } as Organization;
      });

      console.log('Total organizations loaded:', orgs.length);
      setOrganizations(orgs);

      // Get saved organization ID from localStorage or use first one
      const savedOrgId = localStorage.getItem('currentOrganizationId');
      let selectedOrg: Organization | undefined;

      if (savedOrgId) {
        selectedOrg = orgs.find(o => o.id === savedOrgId);
        console.log('Saved org found:', selectedOrg?.name);
      }
      
      // If no saved org or saved org not found, use first one
      if (!selectedOrg && orgs.length > 0) {
        selectedOrg = orgs[0];
        console.log('Using first org:', selectedOrg.name);
      }

      if (selectedOrg) {
        setCurrentOrganization(selectedOrg);
        localStorage.setItem('currentOrganizationId', selectedOrg.id);
        
        // Set default admin role
        setMemberRole({
          id: 'admin-member',
          organizationId: selectedOrg.id,
          userId: 'admin-user',
          email: selectedOrg.email || 'admin@organization.com',
          name: 'Admin',
          role: 'owner',
          permissions: ['*'],
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as OrganizationMember);
      } else {
        console.log('No organizations found in database');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading organizations:', error);
      setLoading(false);
    }
  };



  // Switch to a different organization
  const switchOrganization = async (orgId: string) => {
    try {
      const orgDoc = await getDoc(doc(db, 'organizations', orgId));
      if (!orgDoc.exists()) {
        throw new Error('Organization not found');
      }

      const org = { id: orgDoc.id, ...orgDoc.data() } as Organization;
      setCurrentOrganization(org);
      localStorage.setItem('currentOrganizationId', orgId);

      // Set admin role for the switched organization
      setMemberRole({
        id: 'admin-member',
        organizationId: orgId,
        userId: 'admin-user',
        email: org.email || 'admin@organization.com',
        name: 'Admin',
        role: 'owner',
        permissions: ['*'],
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as OrganizationMember);
    } catch (error) {
      console.error('Error switching organization:', error);
      throw error;
    }
  };

  // Refetch current organization data and all organizations
  const refetchOrganization = async () => {
    await loadOrganizations();
  };

  // Check if user has specific permission
  const hasPermission = (permission: string): boolean => {
    if (!memberRole) return false;
    
    // Owner and Admin have all permissions
    if (memberRole.role === 'owner' || memberRole.role === 'admin') return true;
    
    return memberRole.permissions.includes(permission);
  };

  // Check if organization has access to feature
  const canAccessFeature = (feature: string): boolean => {
    if (!currentOrganization) return false;
    return currentOrganization.features.includes(feature);
  };

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        organizations,
        memberRole,
        loading,
        switchOrganization,
        refetchOrganization,
        hasPermission,
        canAccessFeature,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
}
