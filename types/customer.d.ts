export type CustomerType = 'vip' | 'regular' | 'new' | 'inactive';
export type CustomerStatus = 'active' | 'inactive' | 'blocked';

export interface Customer {
  id: string;
  customerId: string; // e.g., "CUST-001"
  
  // Basic Information
  name: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  
  // Address
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  
  // Business Information
  companyName?: string;
  gstNumber?: string;
  panNumber?: string;
  
  // Customer Classification
  type: CustomerType;
  status: CustomerStatus;
  tags: string[]; // e.g., ["wholesale", "export", "retail"]
  
  // Financial Information
  totalPurchases: number; // Total amount spent
  totalOrders: number; // Number of orders
  outstandingBalance: number; // Amount owed
  creditLimit?: number; // Max credit allowed
  
  // Loyalty & Engagement
  loyaltyPoints: number;
  discountPercentage: number; // Custom discount for this customer
  
  // Dates
  firstOrderDate?: Date | string | any;
  lastOrderDate?: Date | string | any;
  createdAt: Date | string | any;
  updatedAt: Date | string | any;
  
  // Notes & History
  notes: CustomerNote[];
  
  // Metadata
  organizationId: string;
  createdBy: string;
  assignedTo?: string; // Sales person assigned
}

export interface CustomerNote {
  id: string;
  content: string;
  category: 'general' | 'complaint' | 'inquiry' | 'feedback' | 'follow-up';
  createdAt: Date | string;
  createdBy: string;
  createdByName?: string;
}

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  vipCustomers: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalOutstanding: number;
}

export interface CustomerPurchaseHistory {
  orderId: string;
  orderDate: Date | string;
  productName: string;
  quantity: number;
  amount: number;
  status: string;
  paymentStatus: 'paid' | 'pending' | 'partial';
}
