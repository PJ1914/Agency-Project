'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Shield, LogOut, Clock, Globe, Monitor } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AccountPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { currentOrganization, memberRole } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [loginInfo, setLoginInfo] = useState({
    lastLogin: new Date().toLocaleString(),
    browser: '',
    os: '',
    ip: 'Not available',
    location: 'Not available',
  });

  useEffect(() => {
    // Get browser and OS info
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    let os = 'Unknown';

    // Detect browser
    if (userAgent.indexOf('Chrome') > -1) browser = 'Google Chrome';
    else if (userAgent.indexOf('Safari') > -1) browser = 'Safari';
    else if (userAgent.indexOf('Firefox') > -1) browser = 'Firefox';
    else if (userAgent.indexOf('Edge') > -1) browser = 'Microsoft Edge';

    // Detect OS
    if (userAgent.indexOf('Win') > -1) os = 'Windows';
    else if (userAgent.indexOf('Mac') > -1) os = 'macOS';
    else if (userAgent.indexOf('Linux') > -1) os = 'Linux';
    else if (userAgent.indexOf('Android') > -1) os = 'Android';
    else if (userAgent.indexOf('iOS') > -1) os = 'iOS';

    setLoginInfo(prev => ({ ...prev, browser, os }));

    // Get user's location (if available)
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // You can use a geolocation API to get location from coordinates
            setLoginInfo(prev => ({
              ...prev,
              location: `Lat: ${position.coords.latitude.toFixed(2)}, Long: ${position.coords.longitude.toFixed(2)}`,
            }));
          } catch (error) {
            console.error('Error getting location:', error);
          }
        },
        () => {
          setLoginInfo(prev => ({ ...prev, location: 'Location access denied' }));
        }
      );
    }
  }, []);

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
      router.push('/login');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Account Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your account information and preferences</p>
      </div>

      <div className="space-y-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Your personal account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input 
                value={user?.displayName || 'Not set'} 
                disabled 
              />
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input 
                value={user?.email || ''} 
                disabled 
              />
            </div>
            <div className="space-y-2">
              <Label>User ID</Label>
              <Input 
                value={user?.uid || ''} 
                disabled 
                className="font-mono text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Organization Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Organization Access
            </CardTitle>
            <CardDescription>Your current organization and role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Current Organization</Label>
              <Input 
                value={currentOrganization?.name || 'Not set'} 
                disabled 
              />
            </div>
            <div className="space-y-2">
              <Label>Your Role</Label>
              <Input 
                value={memberRole?.role?.toUpperCase() || 'Not set'} 
                disabled 
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Input 
                value={memberRole?.status?.toUpperCase() || 'Not set'} 
                disabled 
              />
            </div>
          </CardContent>
        </Card>

        {/* Login Session Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Current Session
            </CardTitle>
            <CardDescription>Information about your current login session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  Last Login
                </Label>
                <Input 
                  value={loginInfo.lastLogin} 
                  disabled 
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-gray-500" />
                  Browser
                </Label>
                <Input 
                  value={loginInfo.browser} 
                  disabled 
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-gray-500" />
                  Operating System
                </Label>
                <Input 
                  value={loginInfo.os} 
                  disabled 
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-500" />
                  Location
                </Label>
                <Input 
                  value={loginInfo.location} 
                  disabled 
                  className="text-sm"
                />
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-300">
                <strong>Security Tip:</strong> If you notice any suspicious login activity, sign out immediately and change your password.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Manage your password and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium dark:text-gray-100">Password</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Last changed: Never</p>
              </div>
              <Button variant="outline" disabled>
                Change Password
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium dark:text-gray-100">Two-Factor Authentication</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Add an extra layer of security</p>
              </div>
              <Button variant="outline" disabled>
                Enable 2FA
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible account actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sign Out</p>
                <p className="text-sm text-gray-600">Sign out from your account on this device</p>
              </div>
              <Button 
                variant="destructive" 
                onClick={handleSignOut}
                disabled={loading}
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
