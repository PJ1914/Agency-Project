'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
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
  ChevronDown,
  ChevronRight,
  Brain,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { OrganizationSwitcher } from './OrganizationSwitcher';
import { isSuperAdmin } from '@/lib/auth';

// Categorized navigation structure
const navigationCategories = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ]
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { name: 'Orders', href: '/dashboard/orders', icon: Package },
      { name: 'Customers', href: '/dashboard/customers', icon: Users },
      { name: 'Inventory', href: '/dashboard/inventory', icon: Warehouse },
      { name: 'Shipments', href: '/dashboard/shipments', icon: Truck },
    ]
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { name: 'Payments', href: '/dashboard/payments', icon: CreditCard },
      { name: 'Invoices', href: '/dashboard/invoices', icon: Receipt },
    ]
  },
  {
    id: 'insights',
    label: 'Insights',
    items: [
      { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
      { name: 'Reports', href: '/dashboard/reports', icon: FileText },
    ]
  },
  {
    id: 'ai',
    label: 'AI & Automation',
    items: [
      { name: 'AI Assistant', href: '/dashboard/ai-chatbot', icon: MessageSquare },
      { name: 'AI Intelligence', href: '/dashboard/ai-intelligence', icon: Brain },
    ]
  },
  {
    id: 'integrations',
    label: 'Integrations',
    items: [
      { name: 'Integrations', href: '/dashboard/integrations', icon: Zap },
    ]
  },
];

const bottomNavigation = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
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
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    'overview', 'operations', 'finance', 'insights', 'ai', 'integrations'
  ]);
  const { currentOrganization } = useOrganization();
  
  // Memoize admin check to prevent recalculation
  const isAdmin = useMemo(() => {
    if (user?.uid) {
      return user.email ? (user.email.toLowerCase().endsWith('@admin.com') || user.email.toLowerCase() === 'pranay.jumbarthi1905@gmail.com') : false;
    }
    return false;
  }, [user?.uid, user?.email]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

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
            <div className="flex-1 flex items-center gap-3">
              {/* Logo */}
              <div className="flex-shrink-0">
                <Image
                  src="/TapasyaFlow-Logo.png"
                  alt="TapasyaFlow Logo"
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
              </div>
              {/* Text */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold truncate">
                  {isAdmin ? 'TapasyaFlow' : (currentOrganization?.name || 'TapasyaFlow')}
                </h1>
                <p className="text-xs sm:text-sm text-gray-300 dark:text-gray-400 mt-1">
                  {isAdmin ? 'Admin Dashboard' : 'Business Management'}
                </p>
              </div>
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

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
          {navigationCategories.map((category) => {
            const isExpanded = expandedCategories.includes(category.id);
            
            return (
              <div key={category.id} className="mb-2">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-400 hover:text-gray-300 uppercase tracking-wider transition-colors"
                >
                  <span>{category.label}</span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                
                {/* Category Items */}
                {isExpanded && (
                  <div className="mt-1 space-y-1">
                    {category.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cn(
                            'flex items-center px-4 py-2.5 rounded-lg transition-colors text-sm',
                            isActive
                              ? 'bg-primary text-white font-medium'
                              : 'text-gray-300 hover:bg-secondary-foreground/10 hover:text-white'
                          )}
                        >
                          <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Admin Navigation */}
        {isAdmin && (
          <div className="border-t border-gray-700 dark:border-gray-800">
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <Shield className="w-4 h-4" />
                Admin
              </div>
            </div>
            <nav className="px-4 pb-2 space-y-1">
              {adminNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center px-4 py-2.5 rounded-lg transition-colors text-sm',
                      isActive
                        ? 'bg-indigo-600 text-white font-medium'
                        : 'text-gray-300 dark:text-gray-400 hover:bg-indigo-600/20 hover:text-white'
                    )}
                  >
                    <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="border-t border-gray-700 dark:border-gray-800">
          <nav className="px-4 py-3 space-y-1">
            {bottomNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center px-4 py-2.5 rounded-lg transition-colors text-sm',
                    isActive
                      ? 'bg-primary text-white font-medium'
                      : 'text-gray-300 dark:text-gray-400 hover:bg-secondary-foreground/10 hover:text-white'
                  )}
                >
                  <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
                  <span>{item.name}</span>
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
