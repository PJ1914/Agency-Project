'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { Order } from '@/types/order.d';
import { useOrganization } from '@/contexts/OrganizationContext';
import { 
  getCustomerSummary, 
  getInventorySummary, 
  createSmartOrder 
} from '@/lib/smartIntegration';
import { 
  User, 
  Package, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2,
  UserPlus,
  ShoppingCart
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface SmartOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SmartOrderModal({ open, onClose, onSuccess }: SmartOrderModalProps) {
  const { currentOrganization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  
  const [formData, setFormData] = useState({
    orderId: `ORD-${Date.now().toString().slice(-6)}`,
    customerId: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    country: 'India',
    productId: '',
    quantity: '1',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDelivery: '',
    notes: '',
  });

  // Load customers and inventory on open
  useEffect(() => {
    if (open && currentOrganization?.id) {
      loadData();
    }
  }, [open, currentOrganization?.id]);

  const loadData = async () => {
    if (!currentOrganization?.id) return;
    
    const [customerList, inventoryList] = await Promise.all([
      getCustomerSummary(currentOrganization.id),
      getInventorySummary(currentOrganization.id),
    ]);
    
    setCustomers(customerList);
    setInventory(inventoryList);
  };

  // Handle customer selection
  const handleCustomerSelect = (customerId: string) => {
    if (customerId === 'new') {
      setIsNewCustomer(true);
      setSelectedCustomer(null);
      setFormData(prev => ({
        ...prev,
        customerId: '',
        clientName: '',
        clientPhone: '',
        clientEmail: '',
      }));
    } else {
      setIsNewCustomer(false);
      const customer = customers.find(c => c.id === customerId);
      setSelectedCustomer(customer);
      setFormData(prev => ({
        ...prev,
        customerId: customer.id,
        clientName: customer.name,
        clientPhone: customer.phone,
        clientEmail: customer.email || '',
      }));
    }
  };

  // Handle product selection
  const handleProductSelect = (productId: string) => {
    const product = inventory.find(p => p.id === productId);
    setSelectedProduct(product);
    setFormData(prev => ({ ...prev, productId }));
  };

  // Calculate totals
  const quantity = parseInt(formData.quantity) || 0;
  const unitPrice = selectedProduct?.unitPrice || 0;
  const totalAmount = quantity * unitPrice;
  const isStockAvailable = selectedProduct ? quantity <= selectedProduct.quantity : false;
  const stockWarning = selectedProduct && quantity > selectedProduct.quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.productId) {
      alert('Please select a product');
      return;
    }
    
    if (!isStockAvailable) {
      alert(`Insufficient stock! Available: ${selectedProduct?.quantity || 0} units`);
      return;
    }
    
    if (!isNewCustomer && !formData.customerId) {
      alert('Please select a customer or choose "New Customer"');
      return;
    }

    if (isNewCustomer && (!formData.clientName || !formData.clientPhone)) {
      alert('Please enter customer name and phone for new customer');
      return;
    }
    
    setLoading(true);

    try {
      const result = await createSmartOrder({
        orderId: formData.orderId,
        organizationId: currentOrganization?.id,
        customerId: formData.customerId || undefined,
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        clientEmail: formData.clientEmail,
        country: formData.country,
        productId: formData.productId,
        productName: selectedProduct.productName,
        quantity: parseInt(formData.quantity),
        amount: totalAmount,
        status: 'pending',
        orderDate: new Date(formData.orderDate),
        expectedDelivery: formData.expectedDelivery ? new Date(formData.expectedDelivery) : undefined,
        notes: formData.notes,
        inventoryDeducted: false,
        paymentStatus: 'unpaid',
        paidAmount: 0,
        outstandingAmount: totalAmount,
      });

      if (result.success) {
        alert(
          `✅ ${result.message}\n\n` +
          (result.warnings ? `⚠️ ${result.warnings.join('\n')}` : '')
        );
        onSuccess();
        onClose();
        // Reset form
        setFormData({
          orderId: `ORD-${Date.now().toString().slice(-6)}`,
          customerId: '',
          clientName: '',
          clientPhone: '',
          clientEmail: '',
          country: 'India',
          productId: '',
          quantity: '1',
          orderDate: new Date().toISOString().split('T')[0],
          expectedDelivery: '',
          notes: '',
        });
        setSelectedCustomer(null);
        setSelectedProduct(null);
        setIsNewCustomer(false);
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error: any) {
      console.error('Error creating order:', error);
      alert('Failed to create order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <ShoppingCart className="w-6 h-6" />
            Create Smart Order
          </DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Automatically links customer, inventory, and payment
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Details */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Order ID</Label>
                  <Input
                    value={formData.orderId}
                    onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Order Date</Label>
                  <Input
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Selection */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5" />
                <h3 className="font-semibold">Customer Information</h3>
              </div>

              <div>
                <Label>Select Customer</Label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-600 bg-white dark:bg-gray-800"
                  value={isNewCustomer ? 'new' : formData.customerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  required
                >
                  <option value="">-- Select Customer --</option>
                  <option value="new">➕ New Customer</option>
                  <optgroup label="Existing Customers">
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} ({customer.phone}) 
                        {customer.outstandingBalance > 0 && ` - Outstanding: ₹${customer.outstandingBalance}`}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {selectedCustomer && !isNewCustomer && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Total Orders:</span>
                      <span className="ml-2 font-semibold">{selectedCustomer.totalOrders}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Outstanding:</span>
                      <span className="ml-2 font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(selectedCustomer.outstandingBalance)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Type:</span>
                      <span className="ml-2 font-semibold capitalize">{selectedCustomer.type}</span>
                    </div>
                  </div>
                </div>
              )}

              {isNewCustomer && (
                <div className="grid grid-cols-2 gap-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div>
                    <Label>Customer Name *</Label>
                    <Input
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <Label>Phone *</Label>
                    <Input
                      value={formData.clientPhone}
                      onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                      placeholder="9876543210"
                      required
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.clientEmail}
                      onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="India"
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                      <UserPlus className="w-4 h-4" />
                      <span>New customer will be created automatically</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Selection */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5" />
                <h3 className="font-semibold">Product & Quantity</h3>
              </div>

              <div>
                <Label>Select Product</Label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-600 bg-white dark:bg-gray-800"
                  value={formData.productId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  required
                >
                  <option value="">-- Select Product --</option>
                  {inventory.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.productName} ({product.sku}) - Stock: {product.quantity} - ₹{product.unitPrice}/unit
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Available Stock:</span>
                      <span className="ml-2 font-semibold">{selectedProduct.quantity} units</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Unit Price:</span>
                      <span className="ml-2 font-semibold">{formatCurrency(selectedProduct.unitPrice)}</span>
                    </div>
                    {selectedProduct.supplierName && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Supplier:</span>
                        <span className="ml-2 font-semibold">{selectedProduct.supplierName}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="1"
                  required
                />
                {stockWarning && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span>Insufficient stock! Available: {selectedProduct.quantity} units</span>
                  </div>
                )}
                {!stockWarning && selectedProduct && isStockAvailable && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Stock available</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          {selectedProduct && (
            <Card className="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5" />
                  <h3 className="font-semibold">Order Summary</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Product:</span>
                    <span className="font-semibold">{selectedProduct.productName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Quantity:</span>
                    <span className="font-semibold">{quantity} units</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Unit Price:</span>
                    <span className="font-semibold">{formatCurrency(unitPrice)}</span>
                  </div>
                  <div className="border-t border-indigo-300 dark:border-indigo-700 pt-2 mt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Amount:</span>
                      <span className="text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    ✓ Inventory will be deducted automatically<br />
                    ✓ Customer stats will be updated<br />
                    ✓ Outstanding balance will be tracked
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Expected Delivery</Label>
              <Input
                type="date"
                value={formData.expectedDelivery}
                onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any special instructions..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !isStockAvailable}
            >
              {loading ? 'Creating...' : '🚀 Create Smart Order'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
