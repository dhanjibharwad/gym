'use client';

import React from 'react';

interface TopLoadingBarProps {
  isLoading?: boolean;
  progress?: number; // 0-100
}

const TopLoadingBar: React.FC<TopLoadingBarProps> = ({ 
  isLoading = false, 
  progress = 0 
}) => {
  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-50">
      {/* Loading Bar Container */}
      <div className="w-full h-1 bg-gray-200 overflow-hidden">
        {/* Animated Progress Bar */}
        <div 
          className="h-full bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 transition-all duration-300 ease-out"
          style={{ 
            width: progress > 0 ? `${progress}%` : '30%',
            animation: progress === 0 ? 'loading-pulse 1.5s ease-in-out infinite' : 'none'
          }}
        />
      </div>
      
      {/* Custom CSS for pulsing animation */}
      <style jsx>{`
        @keyframes loading-pulse {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};

export default TopLoadingBar;
