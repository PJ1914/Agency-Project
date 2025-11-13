'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { LogOut, User } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

export function Navbar() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="lg:ml-0 ml-14">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">Dashboard</h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:block">Welcome back!</p>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <NotificationBell />
          <div className="hidden md:flex items-center space-x-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            <User className="w-4 h-4" />
            <span className="truncate max-w-[150px]">{user?.email}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
