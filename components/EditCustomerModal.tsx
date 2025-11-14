'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Customer, CustomerType, CustomerStatus } from '@/types/customer.d';

interface EditCustomerModalProps {
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, customer: Partial<Customer>) => Promise<void>;
  customer: Customer | null;
}

export function EditCustomerModal({ open, onClose, onUpdate, customer }: EditCustomerModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<Customer>>({});

  useEffect(() => {
    if (customer) {
      setFormData(customer);
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone || !customer?.id) {
      alert('Name and Phone are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdate(customer.id, formData);
      onClose();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>Update customer information</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-companyName">Company Name</Label>
                <Input
                  id="edit-companyName"
                  value={formData.companyName || ''}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone *</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-alternatePhone">Alternate Phone</Label>
                <Input
                  id="edit-alternatePhone"
                  type="tel"
                  value={formData.alternatePhone || ''}
                  onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Address Information</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="edit-address">Street Address</Label>
                <Input
                  id="edit-address"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit-city">City</Label>
                  <Input
                    id="edit-city"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-state">State</Label>
                  <Input
                    id="edit-state"
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-pincode">PIN Code</Label>
                  <Input
                    id="edit-pincode"
                    value={formData.pincode || ''}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-country">Country</Label>
                <Input
                  id="edit-country"
                  value={formData.country || ''}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Business Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-gstNumber">GST Number</Label>
                <Input
                  id="edit-gstNumber"
                  value={formData.gstNumber || ''}
                  onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-panNumber">PAN Number</Label>
                <Input
                  id="edit-panNumber"
                  value={formData.panNumber || ''}
                  onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Customer Classification & Financial */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Classification & Financial</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-type">Customer Type</Label>
                <select
                  id="edit-type"
                  value={formData.type || 'regular'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as CustomerType })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="new">New</option>
                  <option value="regular">Regular</option>
                  <option value="vip">VIP</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <select
                  id="edit-status"
                  value={formData.status || 'active'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as CustomerStatus })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
              <div>
                <Label htmlFor="edit-discountPercentage" className="text-gray-700 dark:text-gray-300">Discount %</Label>
                <Input
                  id="edit-discountPercentage"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.discountPercentage || 0}
                  onChange={(e) => setFormData({ ...formData, discountPercentage: parseFloat(e.target.value) || 0 })}
                  className="dark:bg-gray-800 dark:text-white dark:border-gray-700"
                />
              </div>
              <div>
                <Label htmlFor="edit-creditLimit" className="text-gray-700 dark:text-gray-300">Credit Limit</Label>
                <Input
                  id="edit-creditLimit"
                  type="number"
                  step="1000"
                  min="0"
                  value={formData.creditLimit || 0}
                  onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                  className="dark:bg-gray-800 dark:text-white dark:border-gray-700"
                />
              </div>
              <div>
                <Label htmlFor="edit-outstandingBalance" className="text-gray-700 dark:text-gray-300">Outstanding Balance</Label>
                <Input
                  id="edit-outstandingBalance"
                  type="number"
                  step="100"
                  value={formData.outstandingBalance || 0}
                  onChange={(e) => setFormData({ ...formData, outstandingBalance: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="edit-loyaltyPoints">Loyalty Points</Label>
                <Input
                  id="edit-loyaltyPoints"
                  type="number"
                  value={formData.loyaltyPoints || 0}
                  onChange={(e) => setFormData({ ...formData, loyaltyPoints: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
