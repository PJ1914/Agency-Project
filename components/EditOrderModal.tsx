'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Order } from '@/types/order.d';

interface EditOrderModalProps {
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, order: Partial<Order>) => Promise<void>;
  order: Order | null;
}

export function EditOrderModal({ open, onClose, onUpdate, order }: EditOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    orderId: '',
    clientName: '',
    country: '',
    quantity: '',
    amount: '',
    status: 'pending' as Order['status'],
    orderDate: '',
    expectedDelivery: '',
    notes: '',
  });

  useEffect(() => {
    if (order) {
      // Helper function to convert any date format to YYYY-MM-DD string
      const toDateString = (dateValue: any): string => {
        if (!dateValue) return '';
        
        console.log('Converting date:', dateValue, typeof dateValue);
        
        try {
          let date: Date;
          
          // If it's a Firestore Timestamp with seconds
          if (dateValue?.seconds) {
            date = new Date(dateValue.seconds * 1000);
          }
          // If it's already a Date object
          else if (dateValue instanceof Date) {
            date = dateValue;
          }
          // If it's a string, parse it
          else if (typeof dateValue === 'string') {
            date = new Date(dateValue);
          }
          // Otherwise, try to create a Date from it
          else {
            date = new Date(dateValue);
          }
          
          // Check if date is valid
          if (isNaN(date.getTime())) {
            console.error('Invalid date:', dateValue);
            return '';
          }
          
          // Format as YYYY-MM-DD using local timezone to avoid UTC offset issues
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const formatted = `${year}-${month}-${day}`;
          
          console.log('Formatted date:', formatted);
          return formatted;
        } catch (error) {
          console.error('Error converting date:', error, dateValue);
          return '';
        }
      };

      console.log('Order data:', order);

      setFormData({
        orderId: order.orderId,
        clientName: order.clientName,
        country: order.country,
        quantity: order.quantity.toString(),
        amount: order.amount.toString(),
        status: order.status,
        orderDate: toDateString(order.orderDate),
        expectedDelivery: toDateString(order.expectedDelivery),
        notes: order.notes || '',
      });
    }
  }, [order]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order?.id) return;

    setLoading(true);

    try {
      await onUpdate(order.id, {
        orderId: formData.orderId,
        clientName: formData.clientName,
        country: formData.country,
        quantity: parseInt(formData.quantity),
        amount: parseFloat(formData.amount),
        status: formData.status,
        orderDate: new Date(formData.orderDate),
        expectedDelivery: formData.expectedDelivery ? new Date(formData.expectedDelivery) : undefined,
        notes: formData.notes || undefined,
      });

      onClose();
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Order</DialogTitle>
          <DialogDescription>
            Update order details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderId">Order ID *</Label>
              <Input
                id="orderId"
                value={formData.orderId}
                onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                placeholder="ORD-001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="Client Name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="India"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="100"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="50000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderDate">Order Date *</Label>
              <Input
                id="orderDate"
                type="date"
                value={formData.orderDate}
                onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedDelivery">Expected Delivery</Label>
              <Input
                id="expectedDelivery"
                type="date"
                value={formData.expectedDelivery}
                onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
