'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
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
  Monitor
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
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
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
  });

  const [saved, setSaved] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
    
    // Apply theme
    const theme = localStorage.getItem('theme') || 'light';
    applyTheme(theme as 'light' | 'dark' | 'system');
  }, []);

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

  const handleSaveSettings = () => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage your account and application preferences</p>
        </div>
        <Button onClick={handleSaveSettings} className="gap-2">
          <Save className="h-4 w-4" />
          {saved ? 'Saved!' : 'Save All Changes'}
        </Button>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-600" />
            <CardTitle>Profile Information</CardTitle>
          </div>
          <CardDescription>Your personal account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                type="text"
                value={user?.displayName || ''}
                placeholder="Your name"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="organization">Current Organization</Label>
            <Input
              id="organization"
              value={currentOrganization?.name || 'Not set'}
              disabled
              className="bg-gray-50"
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
            <Label>Theme</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleThemeChange('light')}
                className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  settings.theme === 'light'
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Sun className="h-5 w-5" />
                <span className="font-medium">Light</span>
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  settings.theme === 'dark'
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Moon className="h-5 w-5" />
                <span className="font-medium">Dark</span>
              </button>
              <button
                onClick={() => handleThemeChange('system')}
                className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  settings.theme === 'system'
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Monitor className="h-5 w-5" />
                <span className="font-medium">System</span>
              </button>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label>Display Preferences</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium">Compact Mode</div>
                  <p className="text-xs text-gray-500">Reduce spacing for more content</p>
                </div>
                <button
                  onClick={() => togglePreference('compactMode')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.preferences.compactMode ? 'bg-indigo-600' : 'bg-gray-300'
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
                  <div className="text-sm font-medium">Show Animations</div>
                  <p className="text-xs text-gray-500">Enable smooth transitions</p>
                </div>
                <button
                  onClick={() => togglePreference('showAnimations')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.preferences.showAnimations ? 'bg-indigo-600' : 'bg-gray-300'
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
                  <div className="text-sm font-medium">Auto-Save</div>
                  <p className="text-xs text-gray-500">Automatically save changes</p>
                </div>
                <button
                  onClick={() => togglePreference('autoSave')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.preferences.autoSave ? 'bg-indigo-600' : 'bg-gray-300'
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
            <Bell className="h-5 w-5 text-indigo-600" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>Manage how you receive alerts and updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div className="text-sm font-medium">Email Notifications</div>
                </div>
                <p className="text-xs text-gray-500 ml-6">Receive updates via email</p>
              </div>
              <button
                onClick={() => toggleNotification('email')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications.email ? 'bg-indigo-600' : 'bg-gray-300'
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
                <div className="text-sm font-medium">Order Updates</div>
                <p className="text-xs text-gray-500">Get notified about order status changes</p>
              </div>
              <button
                onClick={() => toggleNotification('orderUpdates')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications.orderUpdates ? 'bg-indigo-600' : 'bg-gray-300'
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
                <div className="text-sm font-medium">Inventory Alerts</div>
                <p className="text-xs text-gray-500">Notifications for inventory changes</p>
              </div>
              <button
                onClick={() => toggleNotification('inventoryAlerts')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications.inventoryAlerts ? 'bg-indigo-600' : 'bg-gray-300'
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
                <div className="text-sm font-medium">Low Stock Alerts</div>
                <p className="text-xs text-gray-500">Alert when inventory is running low</p>
              </div>
              <button
                onClick={() => toggleNotification('lowStockAlerts')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications.lowStockAlerts ? 'bg-indigo-600' : 'bg-gray-300'
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
            <Globe className="h-5 w-5 text-indigo-600" />
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
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

      {/* System Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-600" />
            <CardTitle>System Information</CardTitle>
          </div>
          <CardDescription>Application and integration details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Application Version</p>
              <p className="font-medium">v1.0.0</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Firebase Project</p>
              <p className="font-medium font-mono text-xs">
                {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Not configured'}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">User ID</p>
              <p className="font-medium font-mono text-xs truncate">{user?.uid || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Organization ID</p>
              <p className="font-medium font-mono text-xs truncate">
                {currentOrganization?.id || 'N/A'}
              </p>
            </div>
          </div>

          <Separator />

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Integrations Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Firebase Authentication</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Firestore Database</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Razorpay Payments</span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">Configured</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button (sticky at bottom) */}
      <div className="sticky bottom-0 bg-white border-t pt-4 pb-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {saved ? '✓ All changes saved successfully' : 'Remember to save your changes'}
          </p>
          <Button onClick={handleSaveSettings} size="lg" className="gap-2">
            <Save className="h-4 w-4" />
            {saved ? 'Saved!' : 'Save All Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
