export interface InventoryHistoryEntry {
  id: string;
  type: 'restock' | 'sale' | 'adjustment' | 'initial';
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  orderId?: string;
  performedBy?: string;
  createdAt: Date | string | any;
}

export interface InventoryItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  unitPrice: number;
  category?: string;
  lowStockThreshold?: number;
  description?: string;
  lastOrderDate?: Date | string;
  history?: InventoryHistoryEntry[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface InventoryFormData {
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  unitPrice: number;
  category?: string;
  lowStockThreshold?: number;
  description?: string;
}
