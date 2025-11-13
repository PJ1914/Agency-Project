'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, ArrowRight } from 'lucide-react';

export default function OrganizationSetupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    industry: '',
    phone: '',
    email: user?.email || '',
    planType: 'free' as 'free' | 'basic' | 'premium' | 'enterprise',
  });

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
    if (!user) return;

    setLoading(true);
    try {
      const orgId = doc(collection(db, 'organizations')).id;

      // Plan limits
      const planLimits = {
        free: { maxUsers: 3, maxOrders: 100, maxInventoryItems: 50 },
        basic: { maxUsers: 10, maxOrders: 1000, maxInventoryItems: 500 },
        premium: { maxUsers: 50, maxOrders: 10000, maxInventoryItems: 5000 },
        enterprise: { maxUsers: -1, maxOrders: -1, maxInventoryItems: -1 }, // unlimited
      };

      const limits = planLimits[formData.planType];

      // Create organization
      await setDoc(doc(db, 'organizations', orgId), {
        name: formData.name,
        slug: formData.slug,
        phone: formData.phone || null,
        email: formData.email,
        industry: formData.industry || null,
        planType: formData.planType,
        maxUsers: limits.maxUsers,
        maxOrders: limits.maxOrders,
        maxInventoryItems: limits.maxInventoryItems,
        features: formData.planType === 'free' ? ['basic'] : ['basic', 'advanced', 'analytics'],
        status: formData.planType === 'free' ? 'active' : 'trial',
        trialEndsAt: formData.planType !== 'free' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() : null,
        subscriptionStartDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        settings: {
          currency: 'INR',
          timezone: 'Asia/Kolkata',
          dateFormat: 'DD-MM-YYYY',
          notifications: true,
        },
      });

      // Add user as owner
      await setDoc(doc(collection(db, 'organizationMembers')), {
        organizationId: orgId,
        userId: user.uid,
        email: user.email,
        name: user.displayName || 'Admin',
        role: 'owner',
        permissions: ['*'], // All permissions
        status: 'active',
        joinedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update user document
      await setDoc(
        doc(db, 'users', user.uid),
        {
          currentOrganizationId: orgId,
          organizations: [orgId],
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error creating organization:', error);
      alert('Failed to create organization. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Your Organization
          </h1>
          <p className="text-gray-600">
            Set up your workspace and start managing your business
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
            <div className="flex items-center">
              <span className="text-sm text-gray-500 mr-2">dashboard.app/</span>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="pawar-agency"
                required
              />
            </div>
            <p className="text-xs text-gray-500">
              This will be your unique workspace URL
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@pawar.com"
                required
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Select
              value={formData.industry}
              onValueChange={(value: string) => setFormData({ ...formData, industry: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ecommerce">E-commerce</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="wholesale">Wholesale</SelectItem>
                <SelectItem value="manufacturing">Manufacturing</SelectItem>
                <SelectItem value="logistics">Logistics</SelectItem>
                <SelectItem value="healthcare">Healthcare</SelectItem>
                <SelectItem value="technology">Technology</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Choose Your Plan</Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, planType: 'free' })}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  formData.planType === 'free'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <h3 className="font-semibold text-lg mb-1">Free</h3>
                <p className="text-sm text-gray-600 mb-2">Perfect for getting started</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• 3 users</li>
                  <li>• 100 orders/month</li>
                  <li>• 50 inventory items</li>
                </ul>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, planType: 'premium' })}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  formData.planType === 'premium'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <h3 className="font-semibold text-lg mb-1">Premium</h3>
                <p className="text-sm text-gray-600 mb-2">14-day free trial</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• 50 users</li>
                  <li>• 10,000 orders/month</li>
                  <li>• 5,000 inventory items</li>
                </ul>
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-lg"
          >
            {loading ? (
              'Creating...'
            ) : (
              <>
                Create Organization
                <ArrowRight className="ml-2 w-5 h-5" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
