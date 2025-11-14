'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Order } from '@/types/order.d';
import { InventoryItem } from '@/types/inventory.d';
import { Customer } from '@/types/customer.d';
import { useFirestore } from '@/hooks/useFirestore';
import { useOrganization } from '@/contexts/OrganizationContext';
import { AlertCircle, CheckCircle, Package, UserPlus, Search, QrCode } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BarcodeScanner } from './BarcodeScanner';

interface AddOrderModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (order: Partial<Order>) => Promise<void>;
  preSelectedCustomer?: Customer | null;
}

export function AddOrderModal({ open, onClose, onAdd, preSelectedCustomer }: AddOrderModalProps) {
  const { currentOrganization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const { data: inventory } = useFirestore<InventoryItem>('inventory');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [stockWarning, setStockWarning] = useState<string>('');
  const [showCustomerPrompt, setShowCustomerPrompt] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    orderId: `ORD-${Date.now().toString().slice(-6)}`,
    customerId: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    country: 'India',
    productId: '',
    productName: '',
    quantity: '',
    amount: '',
    status: 'pending' as const,
    orderDate: new Date().toISOString().split('T')[0],
    expectedDelivery: '',
    notes: '',
  });

  // Generate next available Order ID
  const generateNextOrderId = async (): Promise<string> => {
    if (!currentOrganization?.id) return 'ORD-0001';

    try {
      // Fetch all existing orders for this organization
      const ordersRef = collection(db, 'orders');
      const q = query(
        ordersRef,
        where('organizationId', '==', currentOrganization.id)
      );
      const snapshot = await getDocs(q);
      
      // Extract existing order numbers
      const existingNumbers = snapshot.docs
        .map(doc => {
          const orderId = doc.data().orderId as string;
          // Extract number from format ORD-0001, ORD-0002, etc.
          const match = orderId.match(/^ORD-(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0)
        .sort((a, b) => a - b);

      // Find the first available number (fill gaps first)
      let nextNumber = 1;
      for (const num of existingNumbers) {
        if (num === nextNumber) {
          nextNumber++;
        } else if (num > nextNumber) {
          // Found a gap, use it
          break;
        }
      }

      // Format with leading zeros (ORD-0001, ORD-0002, etc.)
      return `ORD-${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating order ID:', error);
      return `ORD-0001`;
    }
  };

  // Load customers and generate order ID on open
  useEffect(() => {
    if (open && currentOrganization?.id) {
      loadCustomers();
      
      // Generate next available order ID
      generateNextOrderId().then(orderId => {
        setFormData(prev => ({
          ...prev,
          orderId,
        }));
      });
    }
  }, [open, currentOrganization?.id]);

  // Handle pre-selected customer from Customers page
  useEffect(() => {
    if (preSelectedCustomer) {
      setSelectedCustomer(preSelectedCustomer);
      setFormData(prev => ({
        ...prev,
        customerId: preSelectedCustomer.id,
        clientName: preSelectedCustomer.name,
        clientPhone: preSelectedCustomer.phone,
        clientEmail: preSelectedCustomer.email || '',
        country: preSelectedCustomer.country || 'India',
      }));
    }
  }, [preSelectedCustomer]);

  const loadCustomers = async () => {
    if (!currentOrganization?.id) return;
    
    try {
      const customersRef = collection(db, 'customers');
      const q = query(
        customersRef,
        where('organizationId', '==', currentOrganization.id),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(q);
      const customersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Customer[];
      
      setCustomers(customersList);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  // Handle customer selection
  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
      setFormData(prev => ({
        ...prev,
        customerId: customer.id,
        clientName: customer.name,
        clientPhone: customer.phone,
        clientEmail: customer.email || '',
        country: customer.country || 'India',
      }));
      setSearchTerm('');
    }
  };

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
      let customerDocId = formData.customerId;

      // Check if customer exists or needs to be created
      if (!customerDocId && formData.clientName) {
        // Check if similar customer exists
        const similarCustomer = customers.find(c => 
          c.name.toLowerCase() === formData.clientName.toLowerCase() ||
          (formData.clientPhone && c.phone === formData.clientPhone)
        );

        if (similarCustomer) {
          // Use existing customer
          customerDocId = similarCustomer.id;
          setSelectedCustomer(similarCustomer);
        } else {
          // Create new customer and get the doc ID
          const newCustomerDocId = await createNewCustomer();
          if (newCustomerDocId) {
            customerDocId = newCustomerDocId;
          }
        }
      }

      await onAdd({
        orderId: formData.orderId,
        organizationId: currentOrganization?.id,
        customerId: customerDocId || undefined,
        clientName: formData.clientName,
        clientPhone: formData.clientPhone,
        clientEmail: formData.clientEmail,
        country: formData.country,
        productId: formData.productId,
        productName: formData.productName,
        quantity: parseInt(formData.quantity),
        amount: parseFloat(formData.amount),
        status: formData.status,
        orderDate: new Date(formData.orderDate),
        expectedDelivery: formData.expectedDelivery ? new Date(formData.expectedDelivery) : undefined,
        notes: formData.notes || undefined,
        inventoryDeducted: false,
        paymentStatus: 'unpaid',
        paidAmount: 0,
        outstandingAmount: parseFloat(formData.amount),
      });

      // Reset form with new sequential Order ID
      const nextOrderId = await generateNextOrderId();
      setFormData({
        orderId: nextOrderId,
        customerId: '',
        clientName: '',
        clientPhone: '',
        clientEmail: '',
        country: 'India',
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
      setSelectedCustomer(null);
      setStockWarning('');
      setShowCustomerPrompt(false);
      onClose();
    } catch (error) {
      console.error('Error adding order:', error);
      alert('Failed to add order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate next available Customer ID
  const generateNextCustomerId = async (): Promise<string> => {
    if (!currentOrganization?.id) return 'CUST-0001';

    try {
      const customersRef = collection(db, 'customers');
      const q = query(
        customersRef,
        where('organizationId', '==', currentOrganization.id)
      );
      const snapshot = await getDocs(q);
      
      // Extract existing customer numbers
      const existingNumbers = snapshot.docs
        .map(doc => {
          const customerId = doc.data().customerId as string;
          const match = customerId.match(/^CUST-(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0)
        .sort((a, b) => a - b);

      // Find the first available number (fill gaps first)
      let nextNumber = 1;
      for (const num of existingNumbers) {
        if (num === nextNumber) {
          nextNumber++;
        } else if (num > nextNumber) {
          break;
        }
      }

      return `CUST-${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating customer ID:', error);
      return `CUST-0001`;
    }
  };

  const createNewCustomer = async (): Promise<string | null> => {
    if (!currentOrganization?.id) return null;

    try {
      const customerId = await generateNextCustomerId();
      
      const newCustomer: Partial<Customer> = {
        customerId,
        name: formData.clientName,
        phone: formData.clientPhone || '',
        email: formData.clientEmail || '',
        country: formData.country || 'India',
        type: 'new',
        status: 'active',
        totalOrders: 0,
        totalPurchases: 0,
        outstandingBalance: 0,
        loyaltyPoints: 0,
        discountPercentage: 0,
        notes: [],
        organizationId: currentOrganization.id,
        createdBy: 'system',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'customers'), newCustomer);
      
      // Update form with new customer ID
      setFormData(prev => ({ ...prev, customerId: docRef.id }));
      
      // Silently created - no alert needed
      console.log('✅ Customer auto-created:', newCustomer.customerId, 'Doc ID:', docRef.id);
      
      // Reload customers list
      loadCustomers();

      return docRef.id; // Return the document ID
    } catch (error) {
      console.error('Error creating customer:', error);
      return null;
    }
  };

  // Filter customers based on search
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    c.customerId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">Add New Order</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Create a new order entry. Select an existing customer for quick order creation, or enter new client details. 
            New clients can be saved as customers to track their order history and outstanding balance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderId" className="text-gray-700 dark:text-gray-300">Order ID *</Label>
              <Input
                id="orderId"
                value={formData.orderId}
                onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                placeholder="ORD-001"
                required
                className="bg-gray-50 dark:bg-gray-800 dark:text-white dark:border-gray-700"
                readOnly
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">Auto-generated</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="text-gray-700 dark:text-gray-300">Country *</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="India"
                required
                className="dark:bg-gray-800 dark:text-white dark:border-gray-700"
              />
            </div>

            {/* Customer Selection Section */}
            <div className="space-y-2 col-span-2">
              <Label className="text-gray-700 dark:text-gray-300">Customer Selection</Label>
              
              {/* Search Field */}
              <div className="relative">
                <Input
                  placeholder="🔍 Search existing customers by name, phone, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-3 dark:bg-gray-800 dark:text-white dark:border-gray-700"
                  autoComplete="off"
                />
              </div>

              {/* Customer Dropdown */}
              {searchTerm && filteredCustomers.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 shadow-lg z-50 absolute w-full custom-scrollbar">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => {
                        handleCustomerSelect(customer.id);
                        setSearchTerm('');
                      }}
                      className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b dark:border-gray-700 last:border-b-0"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm text-gray-900 dark:text-white">{customer.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{customer.phone}</p>
                          {customer.email && (
                            <p className="text-xs text-gray-500 dark:text-gray-500">{customer.email}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{customer.customerId}</p>
                          {customer.outstandingBalance > 0 && (
                            <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                              Due: ₹{customer.outstandingBalance.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Customer Info Card */}
              {selectedCustomer && (
                <div className="mt-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-green-600 dark:bg-green-700 rounded-full flex items-center justify-center text-white font-bold">
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-green-900 dark:text-green-100">{selectedCustomer.name}</p>
                        <p className="text-sm text-green-700 dark:text-green-300">{selectedCustomer.phone}</p>
                        {selectedCustomer.email && (
                          <p className="text-xs text-green-600 dark:text-green-400">{selectedCustomer.email}</p>
                        )}
                        <div className="flex gap-4 mt-2 text-xs">
                          <span className="text-green-700 dark:text-green-300">
                            <strong>{selectedCustomer.totalOrders || 0}</strong> orders
                          </span>
                          <span className="text-green-700 dark:text-green-300">
                            <strong>₹{selectedCustomer.totalPurchases?.toLocaleString() || 0}</strong> spent
                          </span>
                          {selectedCustomer.outstandingBalance > 0 && (
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              <strong>₹{selectedCustomer.outstandingBalance.toLocaleString()}</strong> due
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setFormData({
                          ...formData,
                          customerId: '',
                          clientName: '',
                          clientPhone: '',
                          clientEmail: '',
                        });
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      ✕ Clear
                    </Button>
                  </div>
                </div>
              )}

              {/* Manual Entry Fields (shown when no customer selected) */}
              {!selectedCustomer && (
                <div className="space-y-3 mt-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                    Or enter new client details manually:
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="clientName" className="text-gray-700 dark:text-gray-300">Client Name *</Label>
                      <Input
                        id="clientName"
                        value={formData.clientName}
                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                        placeholder="Client Name"
                        required
                        autoComplete="off"
                        className="dark:bg-gray-800 dark:text-white dark:border-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientPhone" className="text-gray-700 dark:text-gray-300">Phone</Label>
                      <Input
                        id="clientPhone"
                        value={formData.clientPhone}
                        onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                        placeholder="+91 9876543210"
                        autoComplete="off"
                        className="dark:bg-gray-800 dark:text-white dark:border-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientEmail" className="text-gray-700 dark:text-gray-300">Email</Label>
                      <Input
                        id="clientEmail"
                        type="email"
                        value={formData.clientEmail}
                        onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                        placeholder="client@example.com"
                        autoComplete="off"
                        className="dark:bg-gray-800 dark:text-white dark:border-gray-700"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="productId" className="text-gray-700 dark:text-gray-300">Select Product *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBarcodeScanner(true)}
                  className="text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Scan Barcode
                </Button>
              </div>
              <select
                id="productId"
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">-- Select Product --</option>
                {inventory.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.productName} (Stock: {item.quantity} units, Price: ₹{item.unitPrice || item.price})
                  </option>
                ))}
              </select>
              {selectedProduct && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-2">
                    <Package className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">{selectedProduct.productName}</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        Available Stock: <strong>{selectedProduct.quantity} units</strong> | 
                        Unit Price: <strong>₹{selectedProduct.unitPrice || selectedProduct.price}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="text-gray-700 dark:text-gray-300">Country *</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="India"
                required
                className="dark:bg-gray-800 dark:text-white dark:border-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-gray-700 dark:text-gray-300">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="100"
                required
                disabled={!formData.productId}
                className="dark:bg-gray-800 dark:text-white dark:border-gray-700 disabled:opacity-50"
              />
              {stockWarning && (
                <div className={`flex items-start gap-2 p-2 rounded-lg text-sm ${
                  stockWarning.includes('Insufficient') 
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800' 
                    : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800'
                }`}>
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{stockWarning}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-gray-700 dark:text-gray-300">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="50000"
                required
                readOnly
                className="bg-gray-50 dark:bg-gray-800 dark:text-white dark:border-gray-700"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">Auto-calculated based on quantity × unit price</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-gray-700 dark:text-gray-300">Status *</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="flex h-10 w-full rounded-md border border-input bg-background dark:bg-gray-800 dark:text-white dark:border-gray-700 px-3 py-2 text-sm"
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
              <Label htmlFor="orderDate" className="text-gray-700 dark:text-gray-300">Order Date *</Label>
              <Input
                id="orderDate"
                type="date"
                value={formData.orderDate}
                onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                required
                className="dark:bg-gray-800 dark:text-white dark:border-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedDelivery" className="text-gray-700 dark:text-gray-300">Expected Delivery</Label>
              <Input
                id="expectedDelivery"
                type="date"
                value={formData.expectedDelivery}
                onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
                className="dark:bg-gray-800 dark:text-white dark:border-gray-700"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-gray-700 dark:text-gray-300">Notes</Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background dark:bg-gray-800 dark:text-white dark:border-gray-700 px-3 py-2 text-sm"
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

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        open={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        mode="scan"
        onProductScanned={(product) => {
          setFormData({ ...formData, productId: product.id, productName: product.productName });
          setSelectedProduct(product);
          setShowBarcodeScanner(false);
        }}
      />
    </Dialog>
  );
}
