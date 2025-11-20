export interface Organization {
  id: string;
  name: string;
  slug: string; // URL-friendly identifier (e.g., 'pawar-agency')
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  industry?: string;
  planType: 'free' | 'basic' | 'premium' | 'enterprise';
  maxUsers: number;
  maxOrders: number;
  maxInventoryItems: number;
  features: string[]; // Array of enabled feature flags
  status: 'active' | 'suspended' | 'trial' | 'cancelled';
  trialEndsAt?: Date | string;
  subscriptionStartDate: Date | string;
  subscriptionEndDate?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string;
  settings?: {
    currency: string;
    timezone: string;
    dateFormat: string;
    theme?: 'light' | 'dark';
    notifications?: boolean;
    twoFactorAuth?: boolean;
    invoice?: {
      companyName?: string;
      companyAddress?: string;
      companyPhone?: string;
      companyEmail?: string;
      companyLogo?: string;
      gstin?: string;
      pan?: string;
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
      invoicePrefix?: string;
      termsAndConditions?: string;
      footerText?: string;
      taxRates?: {
        gst5: number;
        gst12: number;
        gst18: number;
        gst28: number;
      };
    };
  };
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'manager' | 'staff' | 'viewer';
  permissions: string[];
  status: 'active' | 'invited' | 'suspended';
  invitedBy?: string;
  invitedAt?: Date | string;
  joinedAt?: Date | string;
  lastLoginAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string;
  photoURL?: string;
  currentOrganizationId?: string; // Active organization
  organizations: string[]; // Array of organization IDs user belongs to
  role?: 'super-admin' | 'admin' | 'manager' | 'user'; // User role across the system
  isSuperAdmin?: boolean; // Super admin has access to all organizations
  emailVerified: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastLoginAt?: Date | string;
}

export interface Subscription {
  id: string;
  organizationId: string;
  planType: 'free' | 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  amount: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  startDate: Date | string;
  endDate?: Date | string;
  nextBillingDate?: Date | string;
  autoRenew: boolean;
  paymentMethod?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Plan {
  id: string;
  name: string;
  type: 'free' | 'basic' | 'premium' | 'enterprise';
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: string[];
  limits: {
    maxUsers: number;
    maxOrders: number;
    maxInventoryItems: number;
    storageGB: number;
  };
  isPopular?: boolean;
  isActive: boolean;
}
