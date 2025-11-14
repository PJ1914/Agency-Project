'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { InventoryItem } from '@/types/inventory.d';

interface AddInventoryModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (item: Partial<InventoryItem>) => Promise<void>;
}

export function AddInventoryModal({ open, onClose, onAdd }: AddInventoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    productName: '',
    sku: '',
    barcode: '',
    batchNumber: '',
    expiryDate: '',
    manufacturingDate: '',
    quantity: '',
    price: '',
    unitPrice: '',
    category: '',
    lowStockThreshold: '',
    reorderPoint: '',
    reorderQuantity: '',
    supplierName: '',
    leadTimeDays: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const priceValue = parseFloat(formData.price);
      const initialQuantity = parseInt(formData.quantity);
      
      // Calculate unit price: if provided use it, otherwise divide total price by quantity
      const calculatedUnitPrice = formData.unitPrice 
        ? parseFloat(formData.unitPrice) 
        : (priceValue / initialQuantity);
      
      await onAdd({
        productName: formData.productName,
        sku: formData.sku,
        barcode: formData.barcode || undefined,
        batchNumber: formData.batchNumber || undefined,
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : undefined,
        manufacturingDate: formData.manufacturingDate ? new Date(formData.manufacturingDate) : undefined,
        quantity: initialQuantity,
        price: priceValue,
        unitPrice: calculatedUnitPrice,
        category: formData.category || undefined,
        lowStockThreshold: formData.lowStockThreshold ? parseInt(formData.lowStockThreshold) : undefined,
        reorderPoint: formData.reorderPoint ? parseInt(formData.reorderPoint) : undefined,
        reorderQuantity: formData.reorderQuantity ? parseInt(formData.reorderQuantity) : undefined,
        supplierName: formData.supplierName || undefined,
        leadTimeDays: formData.leadTimeDays ? parseInt(formData.leadTimeDays) : undefined,
        description: formData.description || undefined,
        history: [{
          id: Date.now().toString(),
          type: 'initial',
          quantityChange: initialQuantity,
          previousQuantity: 0,
          newQuantity: initialQuantity,
          reason: 'Initial stock',
          performedBy: 'Admin',
          createdAt: new Date().toISOString()
        }]
      });

      // Reset form
      setFormData({
        productName: '',
        sku: '',
        barcode: '',
        batchNumber: '',
        expiryDate: '',
        manufacturingDate: '',
        quantity: '',
        price: '',
        unitPrice: '',
        category: '',
        lowStockThreshold: '',
        reorderPoint: '',
        reorderQuantity: '',
        supplierName: '',
        leadTimeDays: '',
        description: '',
      });

      onClose();
    } catch (error) {
      console.error('Error adding inventory:', error);
      alert('Failed to add inventory item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
          <DialogDescription>
            Add a new product to your inventory
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="productName">Product Name *</Label>
              <Input
                id="productName"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                placeholder="Product Name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="SKU-001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode / QR Code</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="1234567890123"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="batchNumber">Batch Number</Label>
              <Input
                id="batchNumber"
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                placeholder="BATCH-2025-001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manufacturingDate">Manufacturing Date</Label>
              <Input
                id="manufacturingDate"
                type="date"
                value={formData.manufacturingDate}
                onChange={(e) => setFormData({ ...formData, manufacturingDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                id="expiryDate"
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
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
              <Label htmlFor="price">Total Price (₹) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitPrice">Unit Price (₹)</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                placeholder="Leave empty to use Total Price"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Category"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lowStockThreshold">Low Stock Alert</Label>
              <Input
                id="lowStockThreshold"
                type="number"
                value={formData.lowStockThreshold}
                onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                placeholder="10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reorderPoint">Reorder Point</Label>
              <Input
                id="reorderPoint"
                type="number"
                value={formData.reorderPoint}
                onChange={(e) => setFormData({ ...formData, reorderPoint: e.target.value })}
                placeholder="Auto-calculated if empty"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reorderQuantity">Reorder Quantity</Label>
              <Input
                id="reorderQuantity"
                type="number"
                value={formData.reorderQuantity}
                onChange={(e) => setFormData({ ...formData, reorderQuantity: e.target.value })}
                placeholder="Suggested order size"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplierName">Supplier Name</Label>
              <Input
                id="supplierName"
                value={formData.supplierName}
                onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                placeholder="Supplier name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="leadTimeDays">Lead Time (Days)</Label>
              <Input
                id="leadTimeDays"
                type="number"
                value={formData.leadTimeDays}
                onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })}
                placeholder="7"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Product description..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
