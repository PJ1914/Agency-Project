'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { InventoryItem } from '@/types/inventory.d';

interface EditInventoryModalProps {
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, item: Partial<InventoryItem>) => Promise<void>;
  item: InventoryItem | null;
}

export function EditInventoryModal({ open, onClose, onUpdate, item }: EditInventoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    productName: '',
    sku: '',
    quantity: '',
    price: '',
    unitPrice: '',
    category: '',
    lowStockThreshold: '',
    description: '',
  });

  useEffect(() => {
    if (item) {
      setFormData({
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity.toString(),
        price: item.price.toString(),
        unitPrice: item.unitPrice?.toString() || '',
        category: item.category || '',
        lowStockThreshold: item.lowStockThreshold?.toString() || '',
        description: item.description || '',
      });
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item?.id) return;

    setLoading(true);

    try {
      const priceValue = parseFloat(formData.price);
      const quantityValue = parseInt(formData.quantity);
      
      // Calculate unit price: if provided use it, otherwise divide total price by quantity
      const calculatedUnitPrice = formData.unitPrice 
        ? parseFloat(formData.unitPrice) 
        : (priceValue / quantityValue);
      
      await onUpdate(item.id, {
        productName: formData.productName,
        sku: formData.sku,
        quantity: quantityValue,
        price: priceValue,
        unitPrice: calculatedUnitPrice,
        category: formData.category || undefined,
        lowStockThreshold: formData.lowStockThreshold ? parseInt(formData.lowStockThreshold) : undefined,
        description: formData.description || undefined,
      });

      onClose();
    } catch (error) {
      console.error('Error updating inventory:', error);
      alert('Failed to update inventory item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle>Edit Inventory Item</DialogTitle>
          <DialogDescription>
            Update inventory item details
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
              {loading ? 'Updating...' : 'Update Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
