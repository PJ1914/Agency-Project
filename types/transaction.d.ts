export interface Transaction {
  id: string;
  transactionId: string;
  orderId: string;
  clientName: string;
  amount: number;
  paymentMode: 'razorpay' | 'cash' | 'phonepe' | 'gpay' | 'bank-transfer' | 'upi' | 'other';
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  status: 'Success' | 'Pending' | 'Failed';
  date: Date | string;
  remarks?: string;
  receiptUrl?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface RazorpayWebhookPayload {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment: {
      entity: {
        id: string;
        entity: string;
        amount: number;
        currency: string;
        status: string;
        order_id: string;
        method: string;
        email: string;
        contact: string;
        captured: boolean;
        created_at: number;
      };
    };
  };
  created_at: number;
}
