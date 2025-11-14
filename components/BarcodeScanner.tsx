'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, QrCode, Package, AlertCircle, Check, X } from 'lucide-react';
import { InventoryItem } from '@/types/inventory.d';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useOrganization } from '@/contexts/OrganizationContext';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  mode: 'scan' | 'view' | 'quick-check';
  onProductScanned?: (product: InventoryItem) => void;
  onManualEntry?: (barcode: string) => void;
}

export function BarcodeScanner({ open, onClose, mode, onProductScanned, onManualEntry }: BarcodeScannerProps) {
  const { currentOrganization } = useOrganization();
  const [manualBarcode, setManualBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<InventoryItem | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setScanning(true);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Camera access denied. Please enable camera permissions or use manual entry.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const searchProductByBarcode = async (barcode: string) => {
    if (!currentOrganization?.id) {
      setError('No organization selected');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const inventoryRef = collection(db, 'inventory');
      const q = query(
        inventoryRef,
        where('organizationId', '==', currentOrganization.id),
        where('barcode', '==', barcode)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Try searching by SKU as fallback
        const qSku = query(
          inventoryRef,
          where('organizationId', '==', currentOrganization.id),
          where('sku', '==', barcode)
        );
        const snapshotSku = await getDocs(qSku);
        
        if (snapshotSku.empty) {
          setError(`Product not found with barcode: ${barcode}`);
          setScannedProduct(null);
          return;
        }
        
        const product = { id: snapshotSku.docs[0].id, ...snapshotSku.docs[0].data() } as InventoryItem;
        setScannedProduct(product);
        
        if (onProductScanned) {
          onProductScanned(product);
        }
        
        return;
      }

      const product = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as InventoryItem;
      setScannedProduct(product);
      
      if (onProductScanned) {
        onProductScanned(product);
      }
    } catch (err) {
      console.error('Error searching product:', err);
      setError('Failed to search product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;

    if (onManualEntry) {
      onManualEntry(manualBarcode);
    }

    await searchProductByBarcode(manualBarcode);
    setManualBarcode('');
  };

  const handleClose = () => {
    stopCamera();
    setManualBarcode('');
    setScannedProduct(null);
    setError('');
    onClose();
  };

  const handleUseProduct = () => {
    if (scannedProduct && onProductScanned) {
      onProductScanned(scannedProduct);
    }
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Barcode Scanner
          </DialogTitle>
          <DialogDescription>
            {mode === 'scan' && 'Scan product barcode to add to order'}
            {mode === 'view' && 'Scan to view product details'}
            {mode === 'quick-check' && 'Quick stock check via barcode'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera Scanner */}
          {scanning && (
            <Card>
              <CardContent className="pt-6">
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg border-2 border-blue-500"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-64 border-4 border-green-500 rounded-lg animate-pulse"></div>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">Position barcode within the frame</p>
                  <Button onClick={stopCamera} variant="outline" className="mt-2">
                    <X className="w-4 h-4 mr-2" />
                    Stop Camera
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Camera Controls */}
          {!scanning && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Scan Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={startCamera} className="w-full" size="lg">
                  <Camera className="w-5 h-5 mr-2" />
                  Use Camera to Scan
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">Or</span>
                  </div>
                </div>

                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <div>
                    <Label htmlFor="manual-barcode">Enter Barcode/SKU Manually</Label>
                    <Input
                      id="manual-barcode"
                      value={manualBarcode}
                      onChange={(e) => setManualBarcode(e.target.value)}
                      placeholder="Type or paste barcode number..."
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Searching...' : 'Search Product'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Error</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scanned Product Details */}
          {scannedProduct && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    Product Found
                  </CardTitle>
                  <Package className="w-6 h-6 text-green-600" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Product Name</p>
                    <p className="font-semibold text-green-900">{scannedProduct.productName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">SKU</p>
                    <p className="font-semibold text-green-900">{scannedProduct.sku}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Stock Available</p>
                    <p className={`font-semibold ${
                      scannedProduct.quantity > (scannedProduct.lowStockThreshold || 10)
                        ? 'text-green-600'
                        : scannedProduct.quantity > 0
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}>
                      {scannedProduct.quantity} units
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Unit Price</p>
                    <p className="font-semibold text-green-900">₹{scannedProduct.unitPrice || scannedProduct.price}</p>
                  </div>
                  {scannedProduct.barcode && (
                    <div>
                      <p className="text-sm text-gray-600">Barcode</p>
                      <p className="font-mono text-sm text-green-900">{scannedProduct.barcode}</p>
                    </div>
                  )}
                  {scannedProduct.batchNumber && (
                    <div>
                      <p className="text-sm text-gray-600">Batch Number</p>
                      <p className="font-mono text-sm text-green-900">{scannedProduct.batchNumber}</p>
                    </div>
                  )}
                  {scannedProduct.expiryDate && (
                    <div>
                      <p className="text-sm text-gray-600">Expiry Date</p>
                      <p className="font-medium text-green-900">
                        {new Date(scannedProduct.expiryDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {scannedProduct.category && (
                    <div>
                      <p className="text-sm text-gray-600">Category</p>
                      <p className="font-medium text-green-900">{scannedProduct.category}</p>
                    </div>
                  )}
                </div>

                {mode === 'scan' && (
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleUseProduct} className="flex-1">
                      <Check className="w-4 h-4 mr-2" />
                      Use This Product
                    </Button>
                    <Button onClick={() => setScannedProduct(null)} variant="outline">
                      <X className="w-4 h-4 mr-2" />
                      Scan Another
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {mode !== 'scan' && (
          <div className="flex justify-end gap-2 pt-4">
            <Button onClick={handleClose} variant="outline">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
