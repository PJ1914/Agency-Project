'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer } from 'lucide-react';
import { InventoryItem } from '@/types/inventory.d';

interface QRCodeGeneratorProps {
  open: boolean;
  onClose: () => void;
  product: InventoryItem | null;
}

export function QRCodeGenerator({ open, onClose, product }: QRCodeGeneratorProps) {
  if (!product) return null;

  const qrData = JSON.stringify({
    id: product.id,
    sku: product.sku,
    barcode: product.barcode,
    name: product.productName,
    batchNumber: product.batchNumber,
  });

  const handleDownload = () => {
    const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas
        .toDataURL('image/png')
        .replace('image/png', 'image/octet-stream');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `QR_${product.sku}_${product.productName}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const qrElement = document.getElementById('qr-code-section');
      printWindow.document.write(`
        <html>
          <head>
            <title>Print QR Code - ${product.productName}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                padding: 20px;
              }
              .print-container {
                text-align: center;
                border: 2px solid #000;
                padding: 20px;
                max-width: 400px;
              }
              h2 { margin: 0 0 10px 0; font-size: 18px; }
              .info { margin: 10px 0; font-size: 14px; }
              .qr-code { margin: 20px 0; }
              @media print {
                body { padding: 0; }
                .print-container { border: 2px solid #000; }
              }
            </style>
          </head>
          <body>
            ${qrElement?.innerHTML || ''}
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate QR Code</DialogTitle>
        </DialogHeader>

        <div id="qr-code-section" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="qr-code flex justify-center">
                  <QRCodeSVG
                    id="qr-code-canvas"
                    value={qrData}
                    size={256}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                
                <div className="info space-y-2 border-t pt-4">
                  <h2 className="font-bold text-lg">{product.productName}</h2>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-left">
                      <p className="text-gray-600">SKU:</p>
                      <p className="font-mono font-semibold">{product.sku}</p>
                    </div>
                    {product.barcode && (
                      <div className="text-left">
                        <p className="text-gray-600">Barcode:</p>
                        <p className="font-mono font-semibold">{product.barcode}</p>
                      </div>
                    )}
                    {product.batchNumber && (
                      <div className="text-left">
                        <p className="text-gray-600">Batch:</p>
                        <p className="font-mono font-semibold">{product.batchNumber}</p>
                      </div>
                    )}
                    {product.expiryDate && (
                      <div className="text-left">
                        <p className="text-gray-600">Expiry:</p>
                        <p className="font-semibold">
                          {new Date(product.expiryDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={handleDownload} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download PNG
            </Button>
            <Button onClick={handlePrint} variant="outline" className="flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
