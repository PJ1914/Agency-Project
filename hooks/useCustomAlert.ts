'use client';

import { useState, useCallback } from 'react';

interface AlertOptions {
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmOptions extends AlertOptions {
  onConfirm: () => void;
}

export function useCustomAlert() {
  const [alertState, setAlertState] = useState<{
    open: boolean;
    title?: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    onConfirm?: () => void;
    confirmText: string;
    cancelText: string;
    showCancel: boolean;
  }>({
    open: false,
    message: '',
    type: 'info',
    confirmText: 'OK',
    cancelText: 'Cancel',
    showCancel: false,
  });

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertState({
      open: true,
      title: options.title,
      message: options.message,
      type: options.type || 'info',
      confirmText: options.confirmText || 'OK',
      cancelText: options.cancelText || 'Cancel',
      showCancel: false,
    });
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    setAlertState({
      open: true,
      title: options.title,
      message: options.message,
      type: options.type || 'warning',
      onConfirm: options.onConfirm,
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      showCancel: true,
    });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, open: false }));
  }, []);

  return {
    alertState,
    showAlert,
    showConfirm,
    closeAlert,
  };
}
