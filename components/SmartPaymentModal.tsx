'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getCustomerUnpaidOrders, processPayment } from '@/lib/smartIntegration';
import { Order } from '@/types/order.d';
import { Transaction } from '@/types/transaction.d';
import { 
  CreditCard, 
  User, 
  AlertCircle, 
  CheckCircle2,
  DollarSign,
  Package
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { addDocument } from '@/lib/firestore';

interface SmartPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preSelectedOrderId?: string;
}

export function SmartPaymentModal({ open, onClose, onSuccess, preSelectedOrderId }: SmartPaymentModalProps) {
  const { currentOrganization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [unpaidOrders, setUnpaidOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  const [formData, setFormData] = useState({
    orderId: '',
    amount: '',
    paymentMode: 'cash' as Transaction['paymentMode'],
    remarks: '',
  });

  // Load unpaid orders
  useEffect(() => {
    if (open && selectedOrder?.customerId) {
      loadUnpaidOrders(selectedOrder.customerId);
    }
  }, [open, selectedOrder?.customerId]);

  // Pre-select order if provided
  useEffect(() => {
    if (preSelectedOrderId && open) {
      setFormData(prev => ({ ...prev, orderId: preSelectedOrderId }));
    }
  }, [preSelectedOrderId, open]);

  const loadUnpaidOrders = async (customerId: string) => {
    const orders = await getCustomerUnpaidOrders(customerId);
    setUnpaidOrders(orders);
  };

  // Handle order selection
  const handleOrderSelect = (orderId: string) => {
    const order = unpaidOrders.find(o => o.orderId === orderId);
    if (order) {
      setSelectedOrder(order);
      setFormData(prev => ({
        ...prev,
        orderId: order.orderId,
        amount: order.outstandingAmount.toString(),
      }));
    }
  };

  const paymentAmount = parseFloat(formData.amount) || 0;
  const outstandingAmount = selectedOrder?.outstandingAmount || 0;
  const isPartialPayment = paymentAmount < outstandingAmount && paymentAmount > 0;
  const remainingAmount = outstandingAmount - paymentAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedOrder) {
      alert('Please select an order');
      return;
    }
    
    if (paymentAmount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    if (paymentAmount > outstandingAmount) {
      alert(`Payment amount cannot exceed outstanding amount of ${formatCurrency(outstandingAmount)}`);
      return;
    }
    
    setLoading(true);

    try {
      // Create transaction record
      const transactionId = `TXN-${Date.now().toString().slice(-8)}`;
      
      const transaction: Partial<Transaction> = {
        transactionId,
        orderId: selectedOrder.orderId,
        customerId: selectedOrder.customerId,
        clientName: selectedOrder.clientName,
        amount: paymentAmount,
        paymentMode: formData.paymentMode,
        status: 'Success',
        date: new Date(),
        remarks: formData.remarks || `Payment for Order ${selectedOrder.orderId}`,
        organizationId: currentOrganization?.id,
      };

      // Add transaction to Firestore
      await addDocument('transactions', transaction);

      // Process payment (updates order and customer)
      const result = await processPayment(
        selectedOrder.id!,
        paymentAmount,
        formData.paymentMode,
        transactionId
      );

      if (result.success) {
        alert(
          `✅ Payment Processed Successfully!\n\n` +
          `Amount Paid: ${formatCurrency(paymentAmount)}\n` +
          `${isPartialPayment ? `Remaining: ${formatCurrency(remainingAmount)}` : 'Order Fully Paid! 🎉'}\n\n` +
          `✓ Transaction record created\n` +
          `✓ Order payment status updated\n` +
          `✓ Customer outstanding balance updated`
        );
        onSuccess();
        onClose();
        // Reset form
        setFormData({
          orderId: '',
          amount: '',
          paymentMode: 'cash',
          remarks: '',
        });
        setSelectedOrder(null);
        setUnpaidOrders([]);
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      alert('Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <CreditCard className="w-6 h-6" />
            Smart Payment Processing
          </DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Automatically updates order status and customer balance
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Selection */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5" />
                <h3 className="font-semibold">Select Order</h3>
              </div>

              <div>
                <Label>Order ID</Label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-600 bg-white dark:bg-gray-800"
                  value={formData.orderId}
                  onChange={(e) => handleOrderSelect(e.target.value)}
                  required
                >
                  <option value="">-- Select Order --</option>
                  {unpaidOrders.map(order => (
                    <option key={order.id} value={order.orderId}>
                      {order.orderId} - {order.clientName} - Outstanding: {formatCurrency(order.outstandingAmount)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedOrder && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                      <span className="font-semibold">{selectedOrder.clientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Product:</span>
                      <span className="font-semibold">{selectedOrder.productName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Order Date:</span>
                      <span className="font-semibold">{formatDate(selectedOrder.orderDate)}</span>
                    </div>
                    <div className="border-t border-blue-300 dark:border-blue-700 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
                        <span className="font-semibold">{formatCurrency(selectedOrder.amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Paid Amount:</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(selectedOrder.paidAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Outstanding:</span>
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          {formatCurrency(selectedOrder.outstandingAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Details */}
          {selectedOrder && (
            <>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-5 h-5" />
                    <h3 className="font-semibold">Payment Details</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Payment Amount *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={outstandingAmount}
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                        required
                      />
                      {isPartialPayment && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-orange-600 dark:text-orange-400">
                          <AlertCircle className="w-4 h-4" />
                          <span>Partial payment. Remaining: {formatCurrency(remainingAmount)}</span>
                        </div>
                      )}
                      {!isPartialPayment && paymentAmount > 0 && paymentAmount <= outstandingAmount && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Full payment</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>Payment Mode *</Label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-600 bg-white dark:bg-gray-800"
                        value={formData.paymentMode}
                        onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as any })}
                        required
                      >
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="gpay">Google Pay</option>
                        <option value="phonepe">PhonePe</option>
                        <option value="bank-transfer">Bank Transfer</option>
                        <option value="razorpay">Razorpay</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label>Remarks</Label>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      placeholder="Payment notes..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-600 bg-white dark:bg-gray-800"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Payment Summary */}
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4">Payment Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Payment Amount:</span>
                      <span className="font-bold text-lg">{formatCurrency(paymentAmount)}</span>
                    </div>
                    {isPartialPayment && (
                      <>
                        <div className="flex justify-between">
                          <span>Remaining Balance:</span>
                          <span className="font-semibold text-orange-600 dark:text-orange-400">
                            {formatCurrency(remainingAmount)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                          ⚠️ Order will be marked as &quot;Partial Payment&quot;
                        </div>
                      </>
                    )}
                    {!isPartialPayment && paymentAmount > 0 && (
                      <div className="text-xs text-green-600 dark:text-green-400 mt-2">
                          ✅ Order will be marked as &quot;Fully Paid&quot;
                        </div>
                    )}
                    <div className="border-t border-green-300 dark:border-green-700 pt-2 mt-3 text-xs">
                      <div className="space-y-1 text-gray-600 dark:text-gray-400">
                        <div>✓ Transaction record will be created</div>
                        <div>✓ Order payment status will update</div>
                        <div>✓ Customer outstanding balance will adjust</div>
                        <div>✓ Notification will be sent</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !selectedOrder || paymentAmount <= 0}
            >
              {loading ? 'Processing...' : '💳 Process Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
