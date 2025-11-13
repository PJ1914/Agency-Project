'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Shipment } from '@/types/shipment.d';

interface EditShipmentModalProps {
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, shipment: Partial<Shipment>) => Promise<void>;
  shipment: Shipment | null;
}

export function EditShipmentModal({ open, onClose, onUpdate, shipment }: EditShipmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    orderId: '',
    trackingNumber: '',
    carrier: '',
    status: 'pending' as Shipment['status'],
    origin: '',
    destination: '',
    shipDate: '',
    estimatedDelivery: '',
    actualDelivery: '',
    notes: '',
  });

  useEffect(() => {
    if (shipment) {
      // Helper function to convert any date format to YYYY-MM-DD string
      const toDateString = (dateValue: any): string => {
        if (!dateValue) return '';
        
        try {
          // If it's a Firestore Timestamp with seconds
          if (dateValue?.seconds) {
            return new Date(dateValue.seconds * 1000).toISOString().split('T')[0];
          }
          // If it's already a Date object
          if (dateValue instanceof Date) {
            return dateValue.toISOString().split('T')[0];
          }
          // If it's a string, try to parse it
          if (typeof dateValue === 'string') {
            return new Date(dateValue).toISOString().split('T')[0];
          }
          // Fallback: try to convert to Date
          return new Date(dateValue).toISOString().split('T')[0];
        } catch (error) {
          console.error('Error converting date:', error);
          return '';
        }
      };

      setFormData({
        orderId: shipment.orderId,
        trackingNumber: shipment.trackingNumber,
        carrier: shipment.carrier,
        status: shipment.status,
        origin: shipment.origin,
        destination: shipment.destination,
        shipDate: toDateString(shipment.shipDate),
        estimatedDelivery: toDateString(shipment.estimatedDelivery),
        actualDelivery: toDateString(shipment.actualDelivery),
        notes: shipment.notes || '',
      });
    }
  }, [shipment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipment?.id) return;

    setLoading(true);

    try {
      await onUpdate(shipment.id, {
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

      onClose();
    } catch (error) {
      console.error('Error updating shipment:', error);
      alert('Failed to update shipment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Shipment</DialogTitle>
          <DialogDescription>
            Update shipment details
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
              {loading ? 'Updating...' : 'Update Shipment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
