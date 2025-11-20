export interface Notification {
  id: string;
  type: 'low-stock' | 'payment-pending' | 'order-created' | 'shipment-delayed' | 'stock-critical' | 'payment-failed' | 'reorder-required';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
  read: boolean;
  organizationId?: string;
  orderId?: string;
  inventoryId?: string;
  shipmentId?: string;
  transactionId?: string;
  createdAt: Date | string;
  actionRequired: boolean;
  actionUrl?: string;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  lowStockAlerts: boolean;
  paymentAlerts: boolean;
  shipmentAlerts: boolean;
  orderAlerts: boolean;
  email: string;
}
