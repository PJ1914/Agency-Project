'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Plus, Shield, Edit, Trash2, X } from 'lucide-react';

const ADMIN_EMAIL = 'pranay.jumbarthi1905@gmail.com';

interface OrganizationFormData {
  name: string;
  slug: string;
  email: string;
  phone: string;
  industry: string;
  planType: 'free' | 'basic' | 'premium' | 'enterprise';
}

export default function OrganizationsManagePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { organizations, currentOrganization, switchOrganization, refetchOrganization } = useOrganization();
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<OrganizationFormData>({
    name: '',
    slug: '',
    email: '',
    phone: '',
    industry: '',
    planType: 'premium',
  });

  // Check if user is admin
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (user.email !== ADMIN_EMAIL) {
      alert('Access denied. Organizations page is admin only.');
      router.push('/dashboard');
      return;
    }
  }, [user, router]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const planLimits = {
        free: { maxUsers: 3, maxOrders: 100, maxInventoryItems: 50 },
        basic: { maxUsers: 10, maxOrders: 1000, maxInventoryItems: 500 },
        premium: { maxUsers: 50, maxOrders: 10000, maxInventoryItems: 5000 },
        enterprise: { maxUsers: -1, maxOrders: -1, maxInventoryItems: -1 },
      };

      const limits = planLimits[formData.planType];

      // Create new organization
      const orgRef = await addDoc(collection(db, 'organizations'), {
        name: formData.name,
        slug: formData.slug,
        email: formData.email || null,
        phone: formData.phone || null,
        industry: formData.industry || null,
        planType: formData.planType,
        maxUsers: limits.maxUsers,
        maxOrders: limits.maxOrders,
        maxInventoryItems: limits.maxInventoryItems,
        features: formData.planType === 'free' ? ['basic'] : ['basic', 'advanced', 'analytics'],
        status: 'active',
        subscriptionStartDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'admin',
        settings: {
          currency: 'INR',
          timezone: 'Asia/Kolkata',
          dateFormat: 'DD-MM-YYYY',
          notifications: true,
        },
      });

      // Refresh organizations list
      await refetchOrganization();

      // Switch to new organization
      await switchOrganization(orgRef.id);

      // Reset form
      setFormData({
        name: '',
        slug: '',
        email: '',
        phone: '',
        industry: '',
        planType: 'premium',
      });
      setIsAdding(false);

      alert('Organization created successfully!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error creating organization:', error);
      alert('Failed to create organization. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = async (orgId: string) => {
    try {
      await switchOrganization(orgId);
      router.push('/dashboard');
    } catch (error) {
      console.error('Error switching organization:', error);
      alert('Failed to switch organization');
    }
  };

  const handleEdit = (org: any) => {
    setEditingOrgId(org.id);
    setFormData({
      name: org.name || '',
      slug: org.slug || '',
      email: org.email || '',
      phone: org.phone || '',
      industry: org.industry || '',
      planType: org.planType || 'premium',
    });
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrgId) return;
    
    setLoading(true);

    try {
      const planLimits = {
        free: { maxUsers: 3, maxOrders: 100, maxInventoryItems: 50 },
        basic: { maxUsers: 10, maxOrders: 1000, maxInventoryItems: 500 },
        premium: { maxUsers: 50, maxOrders: 10000, maxInventoryItems: 5000 },
        enterprise: { maxUsers: -1, maxOrders: -1, maxInventoryItems: -1 },
      };

      const limits = planLimits[formData.planType];

      await updateDoc(doc(db, 'organizations', editingOrgId), {
        name: formData.name,
        slug: formData.slug,
        email: formData.email || null,
        phone: formData.phone || null,
        industry: formData.industry || null,
        planType: formData.planType,
        maxUsers: limits.maxUsers,
        maxOrders: limits.maxOrders,
        maxInventoryItems: limits.maxInventoryItems,
        features: formData.planType === 'free' ? ['basic'] : ['basic', 'advanced', 'analytics'],
        updatedAt: serverTimestamp(),
      });

      await refetchOrganization();

      setFormData({
        name: '',
        slug: '',
        email: '',
        phone: '',
        industry: '',
        planType: 'premium',
      });
      setIsEditing(false);
      setEditingOrgId(null);

      alert('Organization updated successfully!');
    } catch (error) {
      console.error('Error updating organization:', error);
      alert('Failed to update organization. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (orgId: string, orgName: string) => {
    if (!confirm(`Are you sure you want to delete "${orgName}"? This action cannot be undone and will affect all users in this organization.`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteDoc(doc(db, 'organizations', orgId));
      await refetchOrganization();
      
      // If deleted org was current, switch to first available org
      if (currentOrganization?.id === orgId && organizations.length > 1) {
        const nextOrg = organizations.find(o => o.id !== orgId);
        if (nextOrg) {
          await switchOrganization(nextOrg.id);
        }
      }

      alert('Organization deleted successfully!');
    } catch (error) {
      console.error('Error deleting organization:', error);
      alert('Failed to delete organization. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      email: '',
      phone: '',
      industry: '',
      planType: 'premium',
    });
    setIsAdding(false);
    setIsEditing(false);
    setEditingOrgId(null);
  };

  // Show access denied if not admin
  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 mx-auto text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400">This page is restricted to administrators only.</p>
          <Button onClick={() => router.push('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Organizations (Admin Only)
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your organizations and workspaces</p>
        </div>

        <div className="mb-6">
          <Button 
            onClick={() => {
              resetForm();
              setIsAdding(!isAdding);
            }} 
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Organization</span>
          </Button>
        </div>

        {(isAdding || isEditing) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold dark:text-gray-100">
                {isEditing ? 'Edit Organization' : 'Create New Organization'}
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <form onSubmit={isEditing ? handleUpdate : handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Pawar Agency"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="pawar-agency"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@pawar.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="E-commerce, Retail, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="planType">Plan Type</Label>
                  <select
                    id="planType"
                    value={formData.planType}
                    onChange={(e) => setFormData({ ...formData, planType: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="free">Free</option>
                    <option value="basic">Basic</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-4">
                <Button type="submit" disabled={loading}>
                  {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Organization' : 'Create Organization')}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading organizations...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && organizations.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Organizations Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Get started by creating your first organization
            </p>
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Organization
            </Button>
          </div>
        )}

        {/* Organizations Grid */}
        {!loading && organizations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map((org) => (
            <div
              key={org.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-all hover:shadow-lg ${
                currentOrganization?.id === org.id ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div 
                  className="flex items-center space-x-3 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleSwitch(org.id)}
                >
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg dark:text-gray-100">{org.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{org.planType} Plan</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {currentOrganization?.id === org.id && (
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
                      Active
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(org);
                    }}
                    className="hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(org.id, org.name);
                    }}
                    className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                {org.email && (
                  <p className="flex items-center">
                    <span className="font-medium mr-2">Email:</span> {org.email}
                  </p>
                )}
                {org.phone && (
                  <p className="flex items-center">
                    <span className="font-medium mr-2">Phone:</span> {org.phone}
                  </p>
                )}
                {org.industry && (
                  <p className="flex items-center">
                    <span className="font-medium mr-2">Industry:</span> {org.industry}
                  </p>
                )}
                <p className="flex items-center">
                  <span className="font-medium mr-2">Status:</span>
                  <span className={`capitalize ${
                    org.status === 'active' 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {org.status}
                  </span>
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="font-semibold dark:text-gray-100">{org.maxUsers === -1 ? '∞' : org.maxUsers}</p>
                    <p className="text-gray-500 dark:text-gray-400">Users</p>
                  </div>
                  <div>
                    <p className="font-semibold dark:text-gray-100">{org.maxOrders === -1 ? '∞' : org.maxOrders}</p>
                    <p className="text-gray-500 dark:text-gray-400">Orders</p>
                  </div>
                  <div>
                    <p className="font-semibold dark:text-gray-100">{org.maxInventoryItems === -1 ? '∞' : org.maxInventoryItems}</p>
                    <p className="text-gray-500 dark:text-gray-400">Items</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>
    </div>
  );
}
