declare module 'razorpay' {
  export default class Razorpay {
    constructor(config: { key_id: string; key_secret: string });
    orders: {
      create(options: any): Promise<any>;
      fetch(orderId: string): Promise<any>;
    };
    payments: {
      fetch(paymentId: string): Promise<any>;
      refund(paymentId: string, options: any): Promise<any>;
    };
  }
}
