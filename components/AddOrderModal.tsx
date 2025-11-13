'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Order } from '@/types/order.d';
import { InventoryItem } from '@/types/inventory.d';
import { useFirestore } from '@/hooks/useFirestore';
import { AlertCircle, CheckCircle, Package } from 'lucide-react';

interface AddOrderModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (order: Partial<Order>) => Promise<void>;
}

export function AddOrderModal({ open, onClose, onAdd }: AddOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const { data: inventory } = useFirestore<InventoryItem>('inventory');
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [stockWarning, setStockWarning] = useState<string>('');
  
  const [formData, setFormData] = useState({
    orderId: '',
    clientName: '',
    country: '',
    productId: '',
    productName: '',
    quantity: '',
    amount: '',
    status: 'pending' as const,
    orderDate: new Date().toISOString().split('T')[0],
    expectedDelivery: '',
    notes: '',
  });

  // Handle product selection
  useEffect(() => {
    if (formData.productId && inventory.length > 0) {
      const product = inventory.find(item => item.id === formData.productId);
      if (product) {
        setSelectedProduct(product);
        setFormData(prev => ({
          ...prev,
          productName: product.productName,
          amount: (product.unitPrice * parseInt(prev.quantity || '0')).toString()
        }));
      }
    }
  }, [formData.productId, inventory]);

  // Check stock availability when quantity changes
  useEffect(() => {
    if (selectedProduct && formData.quantity) {
      const requestedQty = parseInt(formData.quantity);
      const availableStock = selectedProduct.quantity;
      
      if (requestedQty > availableStock) {
        setStockWarning(`⚠️ Insufficient stock! Available: ${availableStock} units`);
      } else if (requestedQty > availableStock * 0.8) {
        setStockWarning(`⚠️ Warning: Only ${availableStock} units in stock`);
      } else {
        setStockWarning('');
      }
      
      // Auto-calculate amount
      if (selectedProduct.unitPrice) {
        setFormData(prev => ({
          ...prev,
          amount: (selectedProduct.unitPrice * requestedQty).toString()
        }));
      }
    }
  }, [formData.quantity, selectedProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct) {
      alert('Please select a product');
      return;
    }
    
    const requestedQty = parseInt(formData.quantity);
    if (requestedQty > selectedProduct.quantity) {
      alert(`Cannot process order. Only ${selectedProduct.quantity} units available in stock.`);
      return;
    }
    
    setLoading(true);

    try {
      await onAdd({
        orderId: formData.orderId,
        clientName: formData.clientName,
        country: formData.country,
        productId: formData.productId,
        productName: formData.productName,
        quantity: parseInt(formData.quantity),
        amount: parseFloat(formData.amount),
        status: formData.status,
        orderDate: new Date(formData.orderDate),
        expectedDelivery: formData.expectedDelivery ? new Date(formData.expectedDelivery) : undefined,
        notes: formData.notes || undefined,
        inventoryDeducted: false, // Will be set to true after deduction
      });

      // Reset form
      setFormData({
        orderId: '',
        clientName: '',
        country: '',
        productId: '',
        productName: '',
        quantity: '',
        amount: '',
        status: 'pending',
        orderDate: new Date().toISOString().split('T')[0],
        expectedDelivery: '',
        notes: '',
      });
      
      setSelectedProduct(null);
      setStockWarning('');
      onClose();
    } catch (error) {
      console.error('Error adding order:', error);
      alert('Failed to add order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Order</DialogTitle>
          <DialogDescription>
            Create a new order entry for tracking. Stock will be automatically deducted from inventory.
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

            <div className="space-y-2 col-span-2">
              <Label htmlFor="productId">Select Product *</Label>
              <select
                id="productId"
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Select Product --</option>
                {inventory.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.productName} (Stock: {item.quantity} units, Price: ₹{item.unitPrice || item.price})
                  </option>
                ))}
              </select>
              {selectedProduct && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <Package className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">{selectedProduct.productName}</p>
                      <p className="text-xs text-blue-700 mt-1">
                        Available Stock: <strong>{selectedProduct.quantity} units</strong> | 
                        Unit Price: <strong>₹{selectedProduct.unitPrice || selectedProduct.price}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="100"
                required
                disabled={!formData.productId}
              />
              {stockWarning && (
                <div className={`flex items-start gap-2 p-2 rounded-lg text-sm ${
                  stockWarning.includes('Insufficient') 
                    ? 'bg-red-50 text-red-700 border border-red-200' 
                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}>
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{stockWarning}</span>
                </div>
              )}
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
                readOnly
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">Auto-calculated based on quantity × unit price</p>
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
              {loading ? 'Adding...' : 'Add Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
