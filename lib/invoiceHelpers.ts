import { Organization } from '@/types/organization.d';

export interface InvoiceSettingsValidation {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
}

/**
 * Validates invoice settings to ensure all required fields are configured
 */
export function validateInvoiceSettings(organization: Organization): InvoiceSettingsValidation {
  const missingFields: string[] = [];
  const warnings: string[] = [];
  
  const invoiceSettings = (organization.settings?.invoice as any) || {};
  
  // Check required fields
  if (!invoiceSettings.companyName && !organization.name) {
    missingFields.push('Company Name');
  }
  
  if (!invoiceSettings.companyAddress && !organization.address) {
    missingFields.push('Company Address');
  }
  
  if (!invoiceSettings.companyPhone && !organization.phone) {
    missingFields.push('Company Phone');
  }
  
  if (!invoiceSettings.companyEmail && !organization.email) {
    missingFields.push('Company Email');
  }
  
  // Check important but not critical fields
  if (!invoiceSettings.gstin) {
    warnings.push('GSTIN (for GST invoices)');
  }
  
  if (!invoiceSettings.pan) {
    warnings.push('PAN Number');
  }
  
  if (!invoiceSettings.bankName || !invoiceSettings.accountNumber || !invoiceSettings.ifscCode) {
    warnings.push('Complete Bank Details (for payment information)');
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings,
  };
}

/**
 * Gets the best available value for invoice field with fallback
 */
export function getInvoiceField(
  organization: Organization,
  settingsField: string,
  orgField: string,
  defaultValue: string = 'Not set'
): string {
  const invoiceSettings = (organization.settings?.invoice as any) || {};
  return invoiceSettings[settingsField] || (organization as any)[orgField] || defaultValue;
}

/**
 * Formats invoice settings validation message for user display
 */
export function formatValidationMessage(validation: InvoiceSettingsValidation): string {
  if (validation.isValid && validation.warnings.length === 0) {
    return '✅ All invoice settings are configured!';
  }
  
  let message = '';
  
  if (validation.missingFields.length > 0) {
    message += `❌ Missing Required Fields:\n${validation.missingFields.map(f => `  • ${f}`).join('\n')}\n\n`;
  }
  
  if (validation.warnings.length > 0) {
    message += `⚠️ Recommended to Add:\n${validation.warnings.map(f => `  • ${f}`).join('\n')}\n\n`;
  }
  
  message += 'Go to Settings → Invoice Settings to complete your configuration.';
  
  return message;
}
