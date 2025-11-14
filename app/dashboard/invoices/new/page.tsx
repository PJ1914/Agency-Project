'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';

export default function NewInvoicePage() {
  const router = useRouter();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create Invoice</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Generate invoices from orders</p>
        </div>
      </div>

      {/* Temporary Redirect Message */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FileText className="w-16 h-16 text-indigo-600 dark:text-indigo-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Invoice Creation Coming Soon
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-6 max-w-md">
            For now, you can generate invoices directly from the Orders page. 
            Click the invoice icon (📄) next to any order to download a PDF invoice.
          </p>
          <div className="flex gap-4">
            <Button
              onClick={() => router.push('/dashboard/orders')}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Go to Orders
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/invoices')}
            >
              View Invoices
            </Button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 max-w-2xl">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              📋 How to Generate Invoices:
            </h3>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-decimal list-inside">
              <li>Go to <strong>Dashboard → Orders</strong></li>
              <li>Find the order you want to invoice</li>
              <li>Click the <strong>📄 Invoice icon</strong> in the Actions column</li>
              <li>The PDF will be generated with your company details from Settings</li>
              <li>Download automatically starts</li>
            </ol>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 max-w-2xl">
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              ⚙️ Configure Invoice Settings:
            </h3>
            <ol className="text-sm text-yellow-800 dark:text-yellow-200 space-y-2 list-decimal list-inside">
              <li>Go to <strong>Dashboard → Settings</strong></li>
              <li>Scroll to <strong>Invoice Settings</strong> section</li>
              <li>Fill in:
                <ul className="ml-6 mt-1 space-y-1 list-disc">
                  <li>Company Name, Address, Phone, Email</li>
                  <li>GSTIN & PAN Number</li>
                  <li>Bank Details</li>
                  <li>Terms & Conditions</li>
                  <li>Footer Text</li>
                </ul>
              </li>
              <li>Click <strong>Save All Changes</strong></li>
              <li>Your invoices will now use these details!</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
