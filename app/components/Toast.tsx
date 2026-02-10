'use client';

import React from 'react';
import { X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border min-w-[280px] ${
        type === 'success' ? 'bg-green-50 border-green-500 text-green-900' :
        type === 'error' ? 'bg-red-50 border-red-500 text-red-900' :
        'bg-blue-50 border-blue-500 text-blue-900'
      }`}>
        <p className="flex-1 font-medium text-sm">{message}</p>
        <button onClick={onClose} className="hover:opacity-70 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
