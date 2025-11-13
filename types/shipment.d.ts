export interface Shipment {
  id: string;
  orderId: string;
  trackingNumber: string;
  carrier: string;
  status: 'pending' | 'in-transit' | 'delivered' | 'failed';
  origin: string;
  destination: string;
  shipDate: Date | string;
  estimatedDelivery?: Date | string;
  actualDelivery?: Date | string;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ShipmentFormData {
  orderId: string;
  trackingNumber: string;
  carrier: string;
  status: Shipment['status'];
  origin: string;
  destination: string;
  shipDate: Date | string;
  estimatedDelivery?: Date | string;
  actualDelivery?: Date | string;
  notes?: string;
}
