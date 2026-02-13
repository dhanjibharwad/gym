"use client"

import { ChevronDown, User, LogOut, Bell, Search, Menu } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface TopbarProps {
  userRole?: string;
  userName?: string;
  companyName?: string;
}

export default function Topbar({ userRole = "admin", userName = "User", companyName = "" }: TopbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      window.location.href = '/auth/login';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex justify-between items-center">
          {/* Left side - Portal name */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-700 hidden sm:block">
                {userRole.toLowerCase() === 'admin' ? 'Admin Portal' : 
                 userRole.toLowerCase() === 'reception' ? 'Reception Portal' : 
                 `${userRole} Portal`}
              </span>
            </div>
          </div>

          {/* Right side - Company name and Profile */}
          <div className="flex items-center gap-3">
            {companyName && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-orange-700">{companyName}</span>
              </div>
            )}
            
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded-lg transition-all duration-200 border border-transparent hover:border-gray-200"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-orange-100">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm font-semibold text-gray-800">{userName}</span>
                  <span className="text-xs text-gray-500 capitalize">{userRole}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">{userName}</p>
                    <p className="text-xs text-gray-500 capitalize mt-0.5">{userRole}</p>
                    {companyName && (
                      <p className="text-xs text-orange-600 mt-1 font-medium">{companyName}</p>
                    )}
                  </div>
                  <button 
                    onClick={handleLogout} 
                    className="w-full px-4 py-2.5 text-left hover:bg-red-50 flex items-center gap-3 text-sm text-gray-700 hover:text-red-600 transition-colors group"
                  >
                    <LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}