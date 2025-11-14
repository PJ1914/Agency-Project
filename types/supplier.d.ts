export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  country?: string;
  gstNumber?: string;
  panNumber?: string;
  paymentTerms?: string; // e.g., "Net 30", "COD"
  leadTime?: number; // Days
  rating?: number; // 1-5 stars
  isActive: boolean;
  notes?: string;
  productsSupplied?: string[]; // Array of product IDs or names
  organizationId: string;
  createdAt: Date | string | any;
  updatedAt: Date | string | any;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string; // PO-0001, PO-0002
  supplierId: string;
  supplierName: string;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  orderDate: Date | string | any;
  expectedDeliveryDate?: Date | string | any;
  actualDeliveryDate?: Date | string | any;
  notes?: string;
  paymentStatus: 'pending' | 'paid' | 'partial';
  paidAmount: number;
  organizationId: string;
  createdAt: Date | string | any;
  updatedAt: Date | string | any;
}

export interface PurchaseOrderItem {
  inventoryId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ReorderSuggestion {
  inventoryId: string;
  productName: string;
  currentStock: number;
  lowStockThreshold: number;
  reorderPoint: number; // Calculated optimal reorder level
  suggestedOrderQuantity: number; // Economic Order Quantity
  supplierId?: string;
  supplierName?: string;
  estimatedCost: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
}
