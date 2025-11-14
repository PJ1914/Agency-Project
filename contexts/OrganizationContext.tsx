'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Organization, OrganizationMember } from '@/types/organization.d';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

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

  // Load organizations when authentication state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // User is authenticated, load organizations
        loadOrganizations();
      } else {
        // User is not authenticated
        setLoading(false);
        setCurrentOrganization(null);
        setOrganizations([]);
        setMemberRole(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      
      console.log('Loading organizations from Firestore...');
      
      // Get current user from auth
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('No authenticated user found');
        setLoading(false);
        return;
      }

      console.log('Current user email:', currentUser.email);
      
      // Check if user is admin
      const isAdmin = currentUser.email === 'pranay.jumbarthi1905@gmail.com';
      
      // If admin, load all organizations (with pagination limit for performance)
      if (isAdmin) {
        // Load organizations with a reasonable limit
        const orgsQuery = query(
          collection(db, 'organizations'),
          orderBy('createdAt', 'desc'),
          limit(100) // Limit to 100 organizations for initial load
        );
        const orgsSnapshot = await getDocs(orgsQuery);
        console.log('Organizations snapshot size (admin):', orgsSnapshot.size);
        
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
        }
      } else {
        // For non-admin users, get their organization from appUsers collection
        console.log('Non-admin user, fetching from appUsers...');
        
        // Try to get user by UID first
        let userOrgId: string | null = null;
        const appUserRef = doc(db, 'appUsers', currentUser.uid);
        const appUserDoc = await getDoc(appUserRef);
        
        if (appUserDoc.exists()) {
          const appUserData = appUserDoc.data();
          userOrgId = appUserData.organizationId;
          console.log('Found user organizationId by UID:', userOrgId);
        } else {
          // Try to find by email
          const appUsersQuery = query(
            collection(db, 'appUsers'),
            where('email', '==', currentUser.email)
          );
          const appUsersSnapshot = await getDocs(appUsersQuery);
          
          if (!appUsersSnapshot.empty) {
            const appUserData = appUsersSnapshot.docs[0].data();
            userOrgId = appUserData.organizationId;
            console.log('Found user organizationId by email:', userOrgId);
          }
        }

        if (userOrgId) {
          // Fetch only the user's organization
          const orgRef = doc(db, 'organizations', userOrgId);
          const orgDoc = await getDoc(orgRef);
          
          if (orgDoc.exists()) {
            const userOrg = {
              id: orgDoc.id,
              ...orgDoc.data()
            } as Organization;
            
            console.log('User organization loaded:', userOrg.name);
            setOrganizations([userOrg]); // Only show user's org
            setCurrentOrganization(userOrg);
            localStorage.setItem('currentOrganizationId', userOrg.id);
            
            // Set user's role in their organization
            setMemberRole({
              id: currentUser.uid,
              organizationId: userOrg.id,
              userId: currentUser.uid,
              email: currentUser.email || '',
              name: currentUser.displayName || currentUser.email || '',
              role: 'staff',
              permissions: ['view', 'edit'],
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as OrganizationMember);
          } else {
            console.log('Organization not found for user');
          }
        } else {
          console.log('No organization found for user in appUsers collection');
        }
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
