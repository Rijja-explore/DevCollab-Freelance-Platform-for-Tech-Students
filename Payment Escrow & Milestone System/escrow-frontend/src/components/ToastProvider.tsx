import React, { createContext, useContext } from 'react';
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
        background: '#0c1019',
        color: '#fbbf24',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
      },
    });

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showWarning }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0c1019',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
          },
          success: {
            iconTheme: {
              primary: '#06d6a0',
              secondary: '#0c1019',
            },
          },
          error: {
            iconTheme: {
              primary: '#ff6b6b',
              secondary: '#0c1019',
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
