export interface Order {
  id: string;
  orderId: string;
  clientName: string;
  country: string;
  productId: string;
  productName: string;
  quantity: number;
  amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  orderDate: Date | string;
  expectedDelivery?: Date | string;
  notes?: string;
  inventoryDeducted: boolean;
  shipmentId?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface OrderFormData {
  orderId: string;
  clientName: string;
  country: string;
  productId: string;
  productName: string;
  quantity: number;
  amount: number;
  status: Order['status'];
  orderDate: Date | string;
  expectedDelivery?: Date | string;
  notes?: string;
}
