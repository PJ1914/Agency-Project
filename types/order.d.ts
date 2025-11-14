export interface Order {
  id: string;
  orderId: string;
  organizationId: string;
  customerId?: string; // Link to customer
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
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
  transactionId?: string; // Link to payment
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  paidAmount: number;
  outstandingAmount: number;
  createdAt: Date | string | any;
  updatedAt: Date | string | any;
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
