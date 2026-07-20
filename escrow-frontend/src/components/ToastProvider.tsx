import React, { createContext, useContext, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';

interface ToastContextType {
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  showWarning: (msg: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const showSuccess = (msg: string) => toast.success(msg);
  const showError = (msg: string) => toast.error(msg);
  const showWarning = (msg: string) =>
    toast(msg, {
      icon: '⚠️',
      style: {
        background: '#1e293b',
        color: '#f59e0b',
        border: '1px solid #334155',
      },
    });

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showWarning }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0f172a',
            color: '#cbd5e1',
            border: '1px solid #1e293b',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#0f172a',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#0f172a',
            },
          },
        }}
      />
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
