'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Shipment } from '@/types/shipment.d';

interface AddShipmentModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (shipment: Partial<Shipment>) => Promise<void>;
}

export function AddShipmentModal({ open, onClose, onAdd }: AddShipmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    orderId: '',
    trackingNumber: '',
    carrier: '',
    status: 'pending' as const,
    origin: '',
    destination: '',
    shipDate: new Date().toISOString().split('T')[0],
    estimatedDelivery: '',
    actualDelivery: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onAdd({
        orderId: formData.orderId,
        trackingNumber: formData.trackingNumber,
        carrier: formData.carrier,
        status: formData.status,
        origin: formData.origin,
        destination: formData.destination,
        shipDate: new Date(formData.shipDate),
        estimatedDelivery: formData.estimatedDelivery ? new Date(formData.estimatedDelivery) : undefined,
        actualDelivery: formData.actualDelivery ? new Date(formData.actualDelivery) : undefined,
        notes: formData.notes || undefined,
      });

      // Reset form
      setFormData({
        orderId: '',
        trackingNumber: '',
        carrier: '',
        status: 'pending',
        origin: '',
        destination: '',
        shipDate: new Date().toISOString().split('T')[0],
        estimatedDelivery: '',
        actualDelivery: '',
        notes: '',
      });

      onClose();
    } catch (error) {
      console.error('Error adding shipment:', error);
      alert('Failed to add shipment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle>Add New Shipment</DialogTitle>
          <DialogDescription>
            Create a new shipment tracking entry
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
              <Label htmlFor="trackingNumber">Tracking Number *</Label>
              <Input
                id="trackingNumber"
                value={formData.trackingNumber}
                onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
                placeholder="TRK123456789"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="carrier">Carrier *</Label>
              <Input
                id="carrier"
                value={formData.carrier}
                onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                placeholder="DHL, FedEx, etc."
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
                <option value="in-transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="origin">Origin *</Label>
              <Input
                id="origin"
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                placeholder="Mumbai, India"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">Destination *</Label>
              <Input
                id="destination"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                placeholder="Dubai, UAE"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shipDate">Ship Date *</Label>
              <Input
                id="shipDate"
                type="date"
                value={formData.shipDate}
                onChange={(e) => setFormData({ ...formData, shipDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedDelivery">Est. Delivery</Label>
              <Input
                id="estimatedDelivery"
                type="date"
                value={formData.estimatedDelivery}
                onChange={(e) => setFormData({ ...formData, estimatedDelivery: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="actualDelivery">Actual Delivery</Label>
              <Input
                id="actualDelivery"
                type="date"
                value={formData.actualDelivery}
                onChange={(e) => setFormData({ ...formData, actualDelivery: e.target.value })}
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
              {loading ? 'Adding...' : 'Add Shipment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
