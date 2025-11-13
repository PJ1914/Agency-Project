import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

interface InvoiceItem {
  product: string;
  hsn: string;
  mrp: number;
  qty: number;
  free: number;
  rate: number;
  dis: number;
  dis2: number;
  sgst: number;
  cgst: number;
  amount: number;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerAddress?: string;
  salesMan: string;
  items: InvoiceItem[];
  organizationName: string;
  organizationAddress: string;
  organizationPhone: string;
  organizationEmail: string;
  organizationGSTIN: string;
  footerText?: string;
}

export async function generateInvoicePDF(invoiceData: InvoiceData): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Generate QR Code with invoice details
  const qrData = JSON.stringify({
    invoice: invoiceData.invoiceNumber,
    date: invoiceData.date,
    customer: invoiceData.customerName,
    total: invoiceData.items.reduce((sum, item) => sum + item.amount, 0),
    organization: invoiceData.organizationName
  });
  
  const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
    width: 200,
    margin: 1
  });

  // Header - Organization Details
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(invoiceData.organizationName.toUpperCase(), 14, 15);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const addressLines = doc.splitTextToSize(invoiceData.organizationAddress, 80);
  doc.text(addressLines, 14, 22);
  
  const addressHeight = addressLines.length * 4;
  doc.text(`Phone: ${invoiceData.organizationPhone}`, 14, 22 + addressHeight);
  doc.text(`Email: ${invoiceData.organizationEmail}`, 14, 26 + addressHeight);
  doc.text(`GSTIN: ${invoiceData.organizationGSTIN}`, 14, 30 + addressHeight);

  // QR Code on top right
  doc.addImage(qrCodeDataUrl, 'PNG', pageWidth - 45, 10, 35, 35);

  // GST Invoice Title
  doc.setFillColor(200, 200, 200);
  doc.rect(14, 50, pageWidth - 28, 8, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('GST INVOICE', pageWidth / 2, 55, { align: 'center' });

  // Invoice Details
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Estimate No: ${invoiceData.invoiceNumber}`, 14, 63);
  doc.text(`Date: ${invoiceData.date}`, pageWidth - 60, 63);
  doc.text(`Sales Man: ${invoiceData.salesMan}`, 14, 68);
  
  if (invoiceData.customerName) {
    doc.text(`Customer: ${invoiceData.customerName}`, 14, 73);
  }

  // Items Table
  const tableData = invoiceData.items.map(item => [
    item.product,
    item.hsn,
    item.mrp.toFixed(2),
    item.qty.toString(),
    item.free.toString(),
    item.rate.toFixed(2),
    item.dis.toFixed(2),
    item.dis2.toFixed(2),
    item.sgst.toFixed(2),
    item.cgst.toFixed(2),
    item.amount.toFixed(2)
  ]);

  autoTable(doc, {
    startY: 78,
    head: [['Product', 'HSN', 'MRP', 'Qty', 'Free', 'Rate', 'Dis', 'Dis2', 'SGST', 'CGST', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 8
    },
    bodyStyles: {
      fontSize: 8,
      lineWidth: 0.1,
      lineColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 18 },
      2: { cellWidth: 15 },
      3: { cellWidth: 12 },
      4: { cellWidth: 12 },
      5: { cellWidth: 15 },
      6: { cellWidth: 12 },
      7: { cellWidth: 12 },
      8: { cellWidth: 12 },
      9: { cellWidth: 12 },
      10: { cellWidth: 18 }
    }
  });

  // Calculate totals
  const totalQty = invoiceData.items.reduce((sum, item) => sum + item.qty, 0);
  const totalAmount = invoiceData.items.reduce((sum, item) => sum + item.amount, 0);
  const totalSGST = invoiceData.items.reduce((sum, item) => sum + (item.amount * item.sgst / 100), 0);
  const totalCGST = invoiceData.items.reduce((sum, item) => sum + (item.amount * item.cgst / 100), 0);
  const totalGST = totalSGST + totalCGST;
  const grandTotal = totalAmount + totalGST;

  // Tax Summary Table
  const finalY = (doc as any).lastAutoTable.finalY + 5;
  
  autoTable(doc, {
    startY: finalY,
    head: [['CLASS', 'TOTAL', 'SCH', 'DISC', 'SGST', 'CGST', 'TOTAL GST']],
    body: [
      ['GST 5.00', totalAmount.toFixed(2), '0.00', '0.00', totalSGST.toFixed(2), totalCGST.toFixed(2), totalGST.toFixed(2)],
      ['GST 12.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00'],
      ['GST 18.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00'],
      ['GST 28.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00'],
      ['TOTAL', totalAmount.toFixed(2), '0.00', '0.00', totalSGST.toFixed(2), totalCGST.toFixed(2), totalGST.toFixed(2)]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 8
    },
    bodyStyles: {
      fontSize: 8,
      lineWidth: 0.1,
      lineColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 25 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
      6: { cellWidth: 25 }
    }
  });

  // Grand Total Box
  const summaryY = (doc as any).lastAutoTable.finalY + 5;
  
  doc.setFillColor(240, 240, 240);
  doc.rect(pageWidth - 70, summaryY, 56, 30, 'F');
  doc.rect(pageWidth - 70, summaryY, 56, 30, 'S');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SUB TOTAL', pageWidth - 68, summaryY + 6);
  doc.text(`₹${totalAmount.toFixed(2)}`, pageWidth - 16, summaryY + 6, { align: 'right' });
  
  doc.text('SGST PAYBLE', pageWidth - 68, summaryY + 12);
  doc.text(`₹${totalSGST.toFixed(2)}`, pageWidth - 16, summaryY + 12, { align: 'right' });
  
  doc.text('CGST PAYBLE', pageWidth - 68, summaryY + 18);
  doc.text(`₹${totalCGST.toFixed(2)}`, pageWidth - 16, summaryY + 18, { align: 'right' });
  
  doc.setFontSize(12);
  doc.text('GRAND TOTAL', pageWidth - 68, summaryY + 26);
  doc.text(`₹${grandTotal.toFixed(2)}`, pageWidth - 16, summaryY + 26, { align: 'right' });

  // Total Quantity
  doc.setFontSize(10);
  doc.text(`TOTAL QTY: ${totalQty}`, 14, summaryY + 15);

  // Amount in words
  const amountInWords = numberToWords(grandTotal);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(`Rs. ${amountInWords} only`, 14, summaryY + 25);

  // Terms & Conditions
  const termsY = summaryY + 35;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Terms & Conditions', 14, termsY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Goods once sold will not be taken back or exchanged.', 14, termsY + 5);
  doc.text('Bills not due date will attract 24% interest.', 14, termsY + 10);
  
  if (invoiceData.footerText) {
    doc.text(invoiceData.footerText, 14, termsY + 15);
  }

  // Signature
  doc.setFont('helvetica', 'bold');
  doc.text(`For ${invoiceData.organizationName.toUpperCase()}`, pageWidth - 60, termsY + 15);
  doc.text('Receiver', 14, termsY + 25);

  return doc.output('blob');
}

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (num === 0) return 'Zero';

  const crores = Math.floor(num / 10000000);
  const lakhs = Math.floor((num % 10000000) / 100000);
  const thousands = Math.floor((num % 100000) / 1000);
  const hundreds = Math.floor((num % 1000) / 100);
  const remainder = Math.floor(num % 100);

  let words = '';

  if (crores > 0) {
    words += convertTwoDigit(crores) + ' Crore ';
  }
  if (lakhs > 0) {
    words += convertTwoDigit(lakhs) + ' Lakh ';
  }
  if (thousands > 0) {
    words += convertTwoDigit(thousands) + ' Thousand ';
  }
  if (hundreds > 0) {
    words += ones[hundreds] + ' Hundred ';
  }
  if (remainder > 0) {
    if (remainder < 10) {
      words += ones[remainder];
    } else if (remainder < 20) {
      words += teens[remainder - 10];
    } else {
      words += tens[Math.floor(remainder / 10)] + ' ' + ones[remainder % 10];
    }
  }

  // Handle decimal part (paise)
  const decimal = Math.round((num - Math.floor(num)) * 100);
  if (decimal > 0) {
    words += ' and ' + convertTwoDigit(decimal) + ' Paise';
  }

  return words.trim();
}

function convertTwoDigit(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  return tens[Math.floor(num / 10)] + ' ' + ones[num % 10];
}
