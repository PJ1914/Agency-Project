export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderRef?: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGSTIN?: string;
  
  // Invoice details
  invoiceDate: Date | string;
  dueDate: Date | string;
  
  // Items
  items: InvoiceItem[];
  
  // Amounts
  subtotal: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
  
  // Payment tracking
  status: InvoiceStatus;
  paidAmount: number;
  remainingAmount: number;
  paymentHistory: PaymentRecord[];
  
  // Metadata
  notes?: string;
  termsAndConditions?: string;
  organizationId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string;
  
  // Email tracking
  emailSent: boolean;
  emailSentAt?: Date | string;
  emailTo?: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  description?: string;
  hsn?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  taxRate: number; // GST percentage
  taxAmount: number;
  amount: number; // Final amount after discount and tax
}

export interface PaymentRecord {
  id: string;
  amount: number;
  paymentDate: Date | string;
  paymentMethod: 'cash' | 'card' | 'upi' | 'bank-transfer' | 'cheque' | 'other';
  transactionId?: string;
  reference?: string;
  notes?: string;
  createdAt: Date | string;
  createdBy: string;
}

export interface InvoiceSettings {
  // Company/Organization details
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite?: string;
  companyLogo?: string; // URL or base64
  
  // Tax information
  gstin: string;
  pan: string;
  
  // Bank details
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  
  // Invoice preferences
  invoicePrefix: string; // e.g., "INV-"
  invoiceNumberFormat: string; // e.g., "YYYY-MM-{number}"
  nextInvoiceNumber: number;
  
  // Display settings
  primaryColor?: string;
  secondaryColor?: string;
  showLogo: boolean;
  showQRCode: boolean;
  
  // Default terms
  defaultTermsAndConditions: string;
  defaultPaymentTerms: number; // Days until due
  footerText?: string;
  
  // Tax rates
  taxRates: {
    gst5: number;
    gst12: number;
    gst18: number;
    gst28: number;
  };
  
  // Email settings
  emailSubject: string;
  emailBody: string;
  autoSendEmail: boolean;
}

export interface InvoiceEmailData {
  to: string;
  subject: string;
  body: string;
  attachmentUrl: string;
  invoiceNumber: string;
}
