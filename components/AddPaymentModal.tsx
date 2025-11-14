'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Transaction } from '@/types/transaction.d';
import { Order } from '@/types/order.d';

interface AddPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  orders: Order[];
}

export function AddPaymentModal({ open, onClose, onAdd, orders }: AddPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    orderId: '',
    clientName: '',
    amount: '',
    paymentMode: 'cash' as Transaction['paymentMode'],
    razorpayPaymentId: '',
    status: 'Success' as Transaction['status'],
    date: new Date().toISOString().split('T')[0],
    remarks: '',
  });

  // Auto-fill client name when order is selected
  useEffect(() => {
    if (formData.orderId && orders.length > 0) {
      const selectedOrder = orders.find(order => order.orderId === formData.orderId);
      if (selectedOrder) {
        setFormData(prev => ({
          ...prev,
          clientName: selectedOrder.clientName,
          amount: selectedOrder.amount.toString(),
        }));
      }
    }
  }, [formData.orderId, orders]);

  const generateTransactionId = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `txn_${year}_${month}_${day}_${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> = {
        transactionId: generateTransactionId(),
        orderId: formData.orderId,
        clientName: formData.clientName,
        amount: parseFloat(formData.amount),
        paymentMode: formData.paymentMode,
        status: formData.status,
        date: new Date(formData.date),
        remarks: formData.remarks || undefined,
        razorpayPaymentId: formData.razorpayPaymentId || undefined,
      };

      await onAdd(transactionData);
      
      // Reset form
      setFormData({
        orderId: '',
        clientName: '',
        amount: '',
        paymentMode: 'cash',
        razorpayPaymentId: '',
        status: 'Success',
        date: new Date().toISOString().split('T')[0],
        remarks: '',
      });
      
      onClose();
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Failed to add payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
          <DialogDescription>
            Add a new payment transaction (online or offline)
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderId">Order ID *</Label>
              <select
                id="orderId"
                value={formData.orderId}
                onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Order</option>
                {orders.map(order => (
                  <option key={order.id} value={order.orderId}>
                    {order.orderId} - {order.clientName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="Auto-filled from order"
                required
                readOnly
                className="bg-gray-50"
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
                placeholder="85000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMode">Payment Mode *</Label>
              <select
                id="paymentMode"
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as Transaction['paymentMode'] })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="cash">Cash</option>
                <option value="phonepe">PhonePe / UPI</option>
                <option value="gpay">Google Pay</option>
                <option value="bank-transfer">Bank Transfer</option>
                <option value="razorpay">Razorpay (Online)</option>
                <option value="upi">Other UPI</option>
                <option value="other">Other</option>
              </select>
            </div>

            {formData.paymentMode === 'razorpay' && (
              <div className="space-y-2 col-span-2">
                <Label htmlFor="razorpayPaymentId">Razorpay Payment ID</Label>
                <Input
                  id="razorpayPaymentId"
                  value={formData.razorpayPaymentId}
                  onChange={(e) => setFormData({ ...formData, razorpayPaymentId: e.target.value })}
                  placeholder="pay_NaVh38K..."
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Transaction['status'] })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Success">Success</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Payment Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="remarks">Remarks (Optional)</Label>
              <Input
                id="remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="e.g., Paid on delivery, Awaiting confirmation"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
