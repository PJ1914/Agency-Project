'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, CheckCircle, AlertCircle } from 'lucide-react';

export default function AdminSetupPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const setupSuperAdmin = async () => {
    if (!user) {
      setMessage('Please log in first!');
      setSuccess(false);
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Update appUsers collection
      const appUserRef = doc(db, 'appUsers', user.uid);
      await setDoc(appUserRef, {
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email,
        isSuperAdmin: true,
        role: 'super-admin',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }, { merge: true });

      // Also update users collection
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        isSuperAdmin: true,
        role: 'super-admin',
        updatedAt: new Date()
      }, { merge: true });

      setSuccess(true);
      setMessage('Success! You are now a super admin. Please sign out and sign back in.');
    } catch (error: any) {
      setSuccess(false);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Not Logged In
            </CardTitle>
            <CardDescription>
              Please log in to set up super admin access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/login'}
              className="w-full"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Super Admin Setup
          </CardTitle>
          <CardDescription>
            Set up super admin access for your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Current User</p>
            <p className="font-medium">{user.email}</p>
            <p className="text-xs text-gray-500 mt-1">UID: {user.uid}</p>
          </div>

          {message && (
            <div className={`p-4 rounded-lg flex items-start gap-2 ${
              success 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            }`}>
              {success ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <p className="text-sm">{message}</p>
            </div>
          )}

          {!success && (
            <Button 
              onClick={setupSuperAdmin}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Setting up...' : 'Make Me Super Admin'}
            </Button>
          )}

          {success && (
            <div className="space-y-2">
              <Button 
                onClick={() => window.location.href = '/api/auth/signout'}
                className="w-full"
                variant="outline"
              >
                Sign Out Now
              </Button>
              <p className="text-xs text-center text-gray-500">
                You must sign out and sign back in for changes to take effect
              </p>
            </div>
          )}

          <div className="text-xs text-gray-500 space-y-1 pt-4 border-t">
            <p className="font-medium">After setup:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Sign out and sign back in</li>
              <li>You&apos;ll see &quot;Organizations&quot; in the sidebar</li>
              <li>You&apos;ll see &quot;Admin&quot; section in the sidebar</li>
              <li>You&apos;ll have access to all organizations</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
