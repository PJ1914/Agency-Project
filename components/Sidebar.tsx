'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Truck,
  CreditCard,
  FileText,
  Receipt,
  Settings,
  Menu,
  X,
  Building2,
  User,
  Users,
  Shield,
  BarChart3,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { OrganizationSwitcher } from './OrganizationSwitcher';

const ADMIN_EMAIL = 'pranay.jumbarthi1905@gmail.com';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Orders', href: '/dashboard/orders', icon: Package },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Warehouse },
  { name: 'Shipments', href: '/dashboard/shipments', icon: Truck },
  { name: 'Payments', href: '/dashboard/payments', icon: CreditCard },
  { name: 'Invoices', href: '/dashboard/invoices', icon: Receipt },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText },
  { name: 'AI Assistant', href: '/dashboard/ai-chatbot', icon: MessageSquare },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const bottomNavigation = [
  { name: 'Account', href: '/dashboard/account', icon: User },
];

const adminNavigation = [
  { name: 'Organizations', href: '/organizations', icon: Building2, adminOnly: true },
  { name: 'User Management', href: '/admin/users', icon: Users, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { currentOrganization } = useOrganization();
  
  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <>
      {/* Mobile Menu Button - Only show when menu is closed */}
      {!isMobileMenuOpen && (
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-secondary text-white rounded-lg shadow-lg hover:bg-secondary/90 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      )}

      {/* Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 w-64 bg-secondary dark:bg-gray-900 text-white flex flex-col transition-transform duration-300 shadow-xl',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="p-6 border-b border-gray-700 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold truncate">
                {isAdmin ? 'TapasyaFlow' : (currentOrganization?.name || 'TapasyaFlow')}
              </h1>
              <p className="text-xs sm:text-sm text-gray-300 dark:text-gray-400 mt-1">
                {isAdmin ? 'Admin Dashboard' : 'Business Management'}
              </p>
            </div>
            {/* Close button for mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden text-gray-300 hover:text-white p-1"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Organization Switcher */}
          {isAdmin && (
            <div className="mt-4">
              <OrganizationSwitcher />
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'flex items-center px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-300 hover:bg-secondary-foreground/10 hover:text-white'
                )}
              >
                <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Admin Navigation */}
        {isAdmin && (
          <div className="border-t border-gray-700 dark:border-gray-800">
            <div className="px-4 py-2">
              <div className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <Shield className="w-4 h-4" />
                Admin Area
              </div>
            </div>
            <nav className="px-4 space-y-1">
              {adminNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center px-4 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-300 dark:text-gray-400 hover:bg-indigo-600/20 hover:text-white'
                    )}
                  >
                    <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="border-t border-gray-700 dark:border-gray-800">
          <nav className="px-4 py-2 space-y-1">
            {bottomNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-300 dark:text-gray-400 hover:bg-secondary-foreground/10 hover:text-white'
                  )}
                >
                  <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-700 dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-500">© 2025 TapasyaFlow</p>
        </div>
      </aside>
    </>
  );
}
