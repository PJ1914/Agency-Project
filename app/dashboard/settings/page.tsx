'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { updateDocument } from '@/lib/firestore';
import { 
  Moon, 
  Sun, 
  Bell, 
  Globe, 
  Palette, 
  Database,
  Shield,
  Mail,
  Clock,
  DollarSign,
  Save,
  Monitor,
  FileText,
  Star
} from 'lucide-react';

interface Settings {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    orderUpdates: boolean;
    inventoryAlerts: boolean;
    lowStockAlerts: boolean;
    paymentAlerts: boolean;
  };
  display: {
    language: string;
    timezone: string;
    dateFormat: string;
    currency: string;
  };
  preferences: {
    compactMode: boolean;
    showAnimations: boolean;
    autoSave: boolean;
  };
  loyaltyProgram: {
    enabled: boolean;
    pointsPerPurchase: number;
    redemptionRate: number;
  };
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { currentOrganization, refetchOrganization } = useOrganization();
  const [settings, setSettings] = useState<Settings>({
    theme: 'light',
    notifications: {
      email: true,
      push: true,
      orderUpdates: true,
      inventoryAlerts: true,
      lowStockAlerts: true,
      paymentAlerts: true,
    },
    display: {
      language: 'en',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD-MM-YYYY',
      currency: 'INR',
    },
    preferences: {
      compactMode: false,
      showAnimations: true,
      autoSave: true,
    },
    loyaltyProgram: {
      enabled: false,
      pointsPerPurchase: 1,
      redemptionRate: 100,
    },
  });

  const [invoiceSettings, setInvoiceSettings] = useState({
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyLogo: '',
    gstin: '',
    pan: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    invoicePrefix: 'INV-',
    termsAndConditions: 'Goods once sold will not be taken back or exchanged.\nBills not due date will attract 24% interest.',
    footerText: '',
    taxRates: {
      gst5: 5,
      gst12: 12,
      gst18: 18,
      gst28: 28,
    },
  });

  const [saved, setSaved] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings({
        ...parsed,
        loyaltyProgram: parsed.loyaltyProgram || {
          enabled: currentOrganization?.settings?.loyaltyProgram?.enabled || false,
          pointsPerPurchase: currentOrganization?.settings?.loyaltyProgram?.pointsPerPurchase || 1,
          redemptionRate: currentOrganization?.settings?.loyaltyProgram?.redemptionRate || 100,
        },
      });
    } else if (currentOrganization?.settings?.loyaltyProgram) {
      setSettings(prev => ({
        ...prev,
        loyaltyProgram: {
          enabled: currentOrganization?.settings?.loyaltyProgram?.enabled || false,
          pointsPerPurchase: currentOrganization?.settings?.loyaltyProgram?.pointsPerPurchase || 1,
          redemptionRate: currentOrganization?.settings?.loyaltyProgram?.redemptionRate || 100,
        },
      }));
    }
    
    // Load invoice settings from organization
    if (currentOrganization?.settings?.invoice) {
      const invoice = currentOrganization.settings.invoice as any;
      setInvoiceSettings({
        companyName: invoice.companyName || currentOrganization.name || '',
        companyAddress: invoice.companyAddress || currentOrganization.address || '',
        companyPhone: invoice.companyPhone || currentOrganization.phone || '',
        companyEmail: invoice.companyEmail || currentOrganization.email || '',
        companyLogo: invoice.companyLogo || '',
        gstin: invoice.gstin || '',
        pan: invoice.pan || '',
        bankName: invoice.bankName || '',
        accountNumber: invoice.accountNumber || '',
        ifscCode: invoice.ifscCode || '',
        invoicePrefix: invoice.invoicePrefix || 'INV-',
        termsAndConditions: invoice.termsAndConditions || 'Goods once sold will not be taken back or exchanged.\nBills not due date will attract 24% interest.',
        footerText: invoice.footerText || '',
        taxRates: invoice.taxRates || {
          gst5: 5,
          gst12: 12,
          gst18: 18,
          gst28: 28,
        },
      });
    }
    
    // Apply theme
    const theme = localStorage.getItem('theme') || 'light';
    applyTheme(theme as 'light' | 'dark' | 'system');
  }, [currentOrganization]);

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    setSettings(prev => ({ ...prev, theme }));
    localStorage.setItem('theme', theme);
    applyTheme(theme);
  };

  const handleSaveSettings = async () => {
    try {
      localStorage.setItem('appSettings', JSON.stringify(settings));
      
      // Save invoice and loyalty settings to organization
      if (currentOrganization?.id) {
        await updateDocument('organizations', currentOrganization.id, {
          settings: {
            ...currentOrganization.settings,
            invoice: invoiceSettings,
            loyaltyProgram: settings.loyaltyProgram,
          },
        });
        await refetchOrganization();
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  const updateInvoiceSettings = (key: string, value: any) => {
    setInvoiceSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleNotification = (key: keyof Settings['notifications']) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
  };

  const togglePreference = (key: keyof Settings['preferences']) => {
    setSettings(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: !prev.preferences[key],
      },
    }));
  };

  const updateDisplay = (key: keyof Settings['display'], value: string) => {
    setSettings(prev => ({
      ...prev,
      display: {
        ...prev.display,
        [key]: value,
      },
    }));
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">Manage your account and application preferences</p>
        </div>
        <Button onClick={handleSaveSettings} className="gap-2 w-full sm:w-auto">
          <Save className="h-4 w-4" />
          {saved ? 'Saved!' : 'Save All Changes'}
        </Button>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <CardTitle>Profile Information</CardTitle>
          </div>
          <CardDescription>Your personal account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">Display Name</Label>
              <Input
                id="name"
                type="text"
                value={user?.displayName || ''}
                placeholder="Your name"
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="organization" className="text-gray-700 dark:text-gray-300">Current Organization</Label>
            <Input
              id="organization"
              value={currentOrganization?.name || 'Not set'}
              disabled
              className="bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-indigo-600" />
            <CardTitle>Appearance</CardTitle>
          </div>
          <CardDescription>Customize how the dashboard looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="text-gray-700 dark:text-gray-300">Theme</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleThemeChange('light')}
                className={`flex items-center justify-center gap-2 p-3 sm:p-4 rounded-lg border-2 transition-all ${
                  settings.theme === 'light'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-500'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                }`}
              >
                <Sun className="h-5 w-5 dark:text-gray-300" />
                <span className="font-medium text-sm sm:text-base dark:text-gray-200">Light</span>
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`flex items-center justify-center gap-2 p-3 sm:p-4 rounded-lg border-2 transition-all ${
                  settings.theme === 'dark'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-500'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                }`}
              >
                <Moon className="h-5 w-5 dark:text-gray-300" />
                <span className="font-medium text-sm sm:text-base dark:text-gray-200">Dark</span>
              </button>
              <button
                onClick={() => handleThemeChange('system')}
                className={`flex items-center justify-center gap-2 p-3 sm:p-4 rounded-lg border-2 transition-all ${
                  settings.theme === 'system'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-500'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                }`}
              >
                <Monitor className="h-5 w-5 dark:text-gray-300" />
                <span className="font-medium text-sm sm:text-base dark:text-gray-200">System</span>
              </button>
            </div>
          </div>

          <Separator className="dark:bg-gray-700" />

          <div className="space-y-4">
            <Label>Display Preferences</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium dark:text-gray-200">Compact Mode</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Reduce spacing for more content</p>
                </div>
                <button
                  onClick={() => togglePreference('compactMode')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.preferences.compactMode ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.preferences.compactMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium dark:text-gray-200">Show Animations</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Enable smooth transitions</p>
                </div>
                <button
                  onClick={() => togglePreference('showAnimations')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.preferences.showAnimations ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.preferences.showAnimations ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium dark:text-gray-200">Auto-Save</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Automatically save changes</p>
                </div>
                <button
                  onClick={() => togglePreference('autoSave')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.preferences.autoSave ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.preferences.autoSave ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>Manage how you receive alerts and updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <div className="text-sm font-medium dark:text-gray-200">Email Notifications</div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">Receive updates via email</p>
              </div>
              <button
                onClick={() => toggleNotification('email')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications.email ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications.email ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <Separator />

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium dark:text-gray-200">Order Updates</div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Get notified about order status changes</p>
              </div>
              <button
                onClick={() => toggleNotification('orderUpdates')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications.orderUpdates ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications.orderUpdates ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium dark:text-gray-200">Inventory Alerts</div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Notifications for inventory changes</p>
              </div>
              <button
                onClick={() => toggleNotification('inventoryAlerts')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications.inventoryAlerts ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications.inventoryAlerts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium dark:text-gray-200">Low Stock Alerts</div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Alert when inventory is running low</p>
              </div>
              <button
                onClick={() => toggleNotification('lowStockAlerts')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications.lowStockAlerts ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications.lowStockAlerts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium">Payment Alerts</div>
                <p className="text-xs text-gray-500">Notifications for payment activities</p>
              </div>
              <button
                onClick={() => toggleNotification('paymentAlerts')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications.paymentAlerts ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications.paymentAlerts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <CardTitle>Regional & Display</CardTitle>
          </div>
          <CardDescription>Configure language, timezone, and formats</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Language
              </Label>
              <select
                id="language"
                value={settings.display.language}
                onChange={(e) => updateDisplay('language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="en">English</option>
                <option value="hi">Hindi (हिंदी)</option>
                <option value="mr">Marathi (मराठी)</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timezone
              </Label>
              <select
                id="timezone"
                value={settings.display.timezone}
                onChange={(e) => updateDisplay('timezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="America/New_York">America/New York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <select
                id="dateFormat"
                value={settings.display.dateFormat}
                onChange={(e) => updateDisplay('dateFormat', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="DD-MM-YYYY">DD-MM-YYYY (13-11-2025)</option>
                <option value="MM-DD-YYYY">MM-DD-YYYY (11-13-2025)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (2025-11-13)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Currency
              </Label>
              <select
                id="currency"
                value={settings.display.currency}
                onChange={(e) => updateDisplay('currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="INR">₹ INR (Indian Rupee)</option>
                <option value="USD">$ USD (US Dollar)</option>
                <option value="EUR">€ EUR (Euro)</option>
                <option value="GBP">£ GBP (British Pound)</option>
                <option value="AED">د.إ AED (UAE Dirham)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loyalty Program Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <CardTitle>Customer Loyalty Program</CardTitle>
          </div>
          <CardDescription>Manage rewards and points for customer retention</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm font-medium dark:text-gray-200">Enable Loyalty Program</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Turn on/off loyalty points for customers</p>
            </div>
            <button
              onClick={() => {
                setSettings(prev => ({
                  ...prev,
                  loyaltyProgram: {
                    ...prev.loyaltyProgram,
                    enabled: !prev.loyaltyProgram.enabled,
                  },
                }));
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.loyaltyProgram.enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.loyaltyProgram.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {settings.loyaltyProgram.enabled && (
            <>
              <Separator className="dark:bg-gray-700" />
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Loyalty Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pointsPerPurchase" className="text-gray-700 dark:text-gray-300">
                      Points Per Purchase
                    </Label>
                    <Input
                      id="pointsPerPurchase"
                      type="number"
                      min="0"
                      step="1"
                      value={settings.loyaltyProgram.pointsPerPurchase}
                      onChange={(e) => {
                        setSettings(prev => ({
                          ...prev,
                          loyaltyProgram: {
                            ...prev.loyaltyProgram,
                            pointsPerPurchase: parseInt(e.target.value) || 0,
                          },
                        }));
                      }}
                      className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Points awarded per ₹100 spent
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="redemptionRate" className="text-gray-700 dark:text-gray-300">
                      Redemption Rate
                    </Label>
                    <Input
                      id="redemptionRate"
                      type="number"
                      min="1"
                      step="1"
                      value={settings.loyaltyProgram.redemptionRate}
                      onChange={(e) => {
                        setSettings(prev => ({
                          ...prev,
                          loyaltyProgram: {
                            ...prev.loyaltyProgram,
                            redemptionRate: parseInt(e.target.value) || 100,
                          },
                        }));
                      }}
                      className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Points needed for ₹1 discount
                    </p>
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Example:</strong> With {settings.loyaltyProgram.pointsPerPurchase} points per ₹100 and redemption at {settings.loyaltyProgram.redemptionRate} points = ₹1, 
                    a customer spending ₹1000 earns {settings.loyaltyProgram.pointsPerPurchase * 10} points worth ₹{((settings.loyaltyProgram.pointsPerPurchase * 10) / settings.loyaltyProgram.redemptionRate).toFixed(2)}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Invoice Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <CardTitle>Invoice Settings</CardTitle>
          </div>
          <CardDescription>Configure invoice details and GST information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Company Information</h4>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="companyName" className="text-gray-700 dark:text-gray-300">Company Name</Label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Your Company Name"
                  value={invoiceSettings.companyName}
                  onChange={(e) => updateInvoiceSettings('companyName', e.target.value)}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <Label htmlFor="companyAddress" className="text-gray-700 dark:text-gray-300">Company Address</Label>
                <textarea
                  id="companyAddress"
                  rows={3}
                  placeholder="Street, City, State, PIN Code"
                  value={invoiceSettings.companyAddress}
                  onChange={(e) => updateInvoiceSettings('companyAddress', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyPhone" className="text-gray-700 dark:text-gray-300">Company Phone</Label>
                  <Input
                    id="companyPhone"
                    type="tel"
                    placeholder="+91 1234567890"
                    value={invoiceSettings.companyPhone}
                    onChange={(e) => updateInvoiceSettings('companyPhone', e.target.value)}
                    className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <Label htmlFor="companyEmail" className="text-gray-700 dark:text-gray-300">Company Email</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    placeholder="info@company.com"
                    value={invoiceSettings.companyEmail}
                    onChange={(e) => updateInvoiceSettings('companyEmail', e.target.value)}
                    className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="companyLogo" className="text-gray-700 dark:text-gray-300">Company Logo URL (Optional)</Label>
                <Input
                  id="companyLogo"
                  type="url"
                  placeholder="https://example.com/logo.png or leave empty"
                  value={invoiceSettings.companyLogo}
                  onChange={(e) => updateInvoiceSettings('companyLogo', e.target.value)}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Recommended: Square image, 200x200px minimum</p>
              </div>
            </div>
          </div>

          <Separator className="dark:bg-gray-700" />

          {/* Invoice Numbering */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Invoice Numbering</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoicePrefix" className="text-gray-700 dark:text-gray-300">Invoice Prefix</Label>
                <Input
                  id="invoicePrefix"
                  type="text"
                  placeholder="INV-"
                  value={invoiceSettings.invoicePrefix}
                  onChange={(e) => updateInvoiceSettings('invoicePrefix', e.target.value)}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Example: INV-2024-001</p>
              </div>
            </div>
          </div>

          <Separator className="dark:bg-gray-700" />

          {/* GST & Tax Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Tax Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gstin" className="text-gray-700 dark:text-gray-300">GSTIN</Label>
                <Input
                  id="gstin"
                  type="text"
                  placeholder="22AAAAA0000A1Z5"
                  value={invoiceSettings.gstin}
                  onChange={(e) => updateInvoiceSettings('gstin', e.target.value)}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <Label htmlFor="pan" className="text-gray-700 dark:text-gray-300">PAN Number</Label>
                <Input
                  id="pan"
                  type="text"
                  placeholder="AAAAA0000A"
                  value={invoiceSettings.pan}
                  onChange={(e) => updateInvoiceSettings('pan', e.target.value)}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          <Separator className="dark:bg-gray-700" />

          {/* Bank Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Bank Information</h4>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="bankName" className="text-gray-700 dark:text-gray-300">Bank Name</Label>
                <Input
                  id="bankName"
                  type="text"
                  placeholder="State Bank of India"
                  value={invoiceSettings.bankName}
                  onChange={(e) => updateInvoiceSettings('bankName', e.target.value)}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accountNumber" className="text-gray-700 dark:text-gray-300">Account Number</Label>
                  <Input
                    id="accountNumber"
                    type="text"
                    placeholder="1234567890"
                    value={invoiceSettings.accountNumber}
                    onChange={(e) => updateInvoiceSettings('accountNumber', e.target.value)}
                    className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <Label htmlFor="ifscCode" className="text-gray-700 dark:text-gray-300">IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    type="text"
                    placeholder="SBIN0001234"
                    value={invoiceSettings.ifscCode}
                    onChange={(e) => updateInvoiceSettings('ifscCode', e.target.value)}
                    className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator className="dark:bg-gray-700" />

          {/* Terms & Conditions */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Invoice Text</h4>
            <div>
              <Label htmlFor="termsAndConditions" className="text-gray-700 dark:text-gray-300">Terms & Conditions</Label>
              <textarea
                id="termsAndConditions"
                rows={4}
                placeholder="Goods once sold will not be taken back or exchanged..."
                value={invoiceSettings.termsAndConditions}
                onChange={(e) => updateInvoiceSettings('termsAndConditions', e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <Label htmlFor="footerText" className="text-gray-700 dark:text-gray-300">Footer Text (Optional)</Label>
              <Input
                id="footerText"
                type="text"
                placeholder="Thank you for your business!"
                value={invoiceSettings.footerText}
                onChange={(e) => updateInvoiceSettings('footerText', e.target.value)}
                className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <Separator className="dark:bg-gray-700" />

          {/* GST Tax Rates */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">GST Tax Rates (%)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="gst5" className="text-gray-700 dark:text-gray-300">GST 5%</Label>
                <Input
                  id="gst5"
                  type="number"
                  step="0.01"
                  value={invoiceSettings.taxRates.gst5}
                  onChange={(e) => updateInvoiceSettings('taxRates', { 
                    ...invoiceSettings.taxRates, 
                    gst5: parseFloat(e.target.value) 
                  })}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <Label htmlFor="gst12" className="text-gray-700 dark:text-gray-300">GST 12%</Label>
                <Input
                  id="gst12"
                  type="number"
                  step="0.01"
                  value={invoiceSettings.taxRates.gst12}
                  onChange={(e) => updateInvoiceSettings('taxRates', { 
                    ...invoiceSettings.taxRates, 
                    gst12: parseFloat(e.target.value) 
                  })}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <Label htmlFor="gst18" className="text-gray-700 dark:text-gray-300">GST 18%</Label>
                <Input
                  id="gst18"
                  type="number"
                  step="0.01"
                  value={invoiceSettings.taxRates.gst18}
                  onChange={(e) => updateInvoiceSettings('taxRates', { 
                    ...invoiceSettings.taxRates, 
                    gst18: parseFloat(e.target.value) 
                  })}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <Label htmlFor="gst28" className="text-gray-700 dark:text-gray-300">GST 28%</Label>
                <Input
                  id="gst28"
                  type="number"
                  step="0.01"
                  value={invoiceSettings.taxRates.gst28}
                  onChange={(e) => updateInvoiceSettings('taxRates', { 
                    ...invoiceSettings.taxRates, 
                    gst28: parseFloat(e.target.value) 
                  })}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> These settings will be used when generating invoices. Make sure to update your GSTIN and bank details for compliance.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <CardTitle>System Information</CardTitle>
          </div>
          <CardDescription>Application and integration details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-1">Application Version</p>
              <p className="font-medium dark:text-gray-200">v1.0.0</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-1">Firebase Project</p>
              <p className="font-medium font-mono text-xs dark:text-gray-200 break-all">
                {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Not configured'}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-1">User ID</p>
              <p className="font-medium font-mono text-xs truncate dark:text-gray-200 break-all">{user?.uid || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-1">Organization ID</p>
              <p className="font-medium font-mono text-xs truncate dark:text-gray-200 break-all">
                {currentOrganization?.id || 'N/A'}
              </p>
            </div>
          </div>

          <Separator className="dark:bg-gray-700" />

          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h4 className="font-medium mb-2 dark:text-gray-200">Integrations Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Firebase Authentication</span>
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Firestore Database</span>
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Razorpay Payments</span>
                <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs">Configured</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button (sticky at bottom) */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-950 border-t dark:border-gray-800 pt-4 pb-2 -mx-4 sm:-mx-6 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">
            {saved ? '✓ All changes saved successfully' : 'Remember to save your changes'}
          </p>
          <Button onClick={handleSaveSettings} size="lg" className="gap-2 w-full sm:w-auto">
            <Save className="h-4 w-4" />
            {saved ? 'Saved!' : 'Save All Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
