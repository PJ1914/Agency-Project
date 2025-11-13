'use client';

import { useState, useEffect } from 'react';
import { Bell, X, Check, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Notification } from '@/types/notification.d';
import { markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/notifications';
import { formatDateTime } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export function NotificationBell() {
  const router = useRouter();
  const { notifications, notificationsLoading, refetchNotifications, unreadNotificationsCount } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [allNotifications, setAllNotifications] = useState(notifications);

  useEffect(() => {
    setAllNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    // Sort by newest first
    const sorted = [...notifications].sort((a, b) => {
      // Handle Firestore Timestamps
      let dateA: number;
      let dateB: number;
      
      if (a.createdAt && typeof a.createdAt === 'object' && 'seconds' in a.createdAt) {
        dateA = (a.createdAt as any).seconds * 1000;
      } else if (a.createdAt) {
        dateA = new Date(a.createdAt).getTime();
      } else {
        dateA = 0;
      }
      
      if (b.createdAt && typeof b.createdAt === 'object' && 'seconds' in b.createdAt) {
        dateB = (b.createdAt as any).seconds * 1000;
      } else if (b.createdAt) {
        dateB = new Date(b.createdAt).getTime();
      } else {
        dateB = 0;
      }
      
      return dateB - dateA;
    });
    setAllNotifications(sorted);
  }, [notifications]);

  const unreadCount = notifications.length;

  const handleMarkAsRead = async (notificationId: string, actionUrl?: string) => {
    try {
      await markNotificationAsRead(notificationId);
      await refetchNotifications();
      
      if (actionUrl) {
        setIsOpen(false);
        router.push(actionUrl);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      await refetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getSeverityIcon = (severity: Notification['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'success':
        return <Check className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: Notification['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-l-red-500 hover:bg-red-100';
      case 'warning':
        return 'bg-yellow-50 border-l-yellow-500 hover:bg-yellow-100';
      case 'success':
        return 'bg-green-50 border-l-green-500 hover:bg-green-100';
      default:
        return 'bg-blue-50 border-l-blue-500 hover:bg-blue-100';
    }
  };

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[80vh] sm:max-h-[600px] overflow-hidden flex flex-col">
            <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 sticky top-0">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                <h3 className="font-semibold text-sm sm:text-base text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 bg-white">
              {notificationsLoading ? (
                <div className="p-6 sm:p-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm">Loading notifications...</p>
                </div>
              ) : allNotifications.length === 0 ? (
                <div className="p-6 sm:p-8 text-center text-gray-500">
                  <Bell className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium text-sm sm:text-base">No new notifications</p>
                  <p className="text-xs sm:text-sm mt-1">You&apos;re all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {allNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 sm:p-4 cursor-pointer transition-colors border-l-4 ${getSeverityColor(notification.severity)}`}
                      onClick={() => handleMarkAsRead(notification.id, notification.actionUrl)}
                    >
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className="flex-shrink-0 mt-0.5 sm:mt-1">
                          {getSeverityIcon(notification.severity)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <h4 className="font-semibold text-gray-900 text-xs sm:text-sm">
                              {notification.title}
                            </h4>
                            {notification.actionRequired && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0">
                                Action Required
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2 gap-2">
                            <p className="text-xs text-gray-500 truncate">
                              {formatDateTime(notification.createdAt)}
                            </p>
                            {notification.actionUrl && (
                              <span className="text-xs text-blue-600 font-medium whitespace-nowrap flex-shrink-0">
                                Click to view →
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
