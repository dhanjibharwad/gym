"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Building2, 
  CreditCard, 
  UserCog, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  NotebookTabs,
  Menu,
  X
} from 'lucide-react';

const navItems = [
  { label: "Dashboard", href: "/superadmin", icon: LayoutDashboard },
  { label: "Companies", href: "/superadmin/companies", icon: Building2 },
  { label: "Subscription Plans", href: "/superadmin/plans", icon: CreditCard },
  { label: "Settings", href: "/superadmin/settings", icon: Settings }
];

export default function SuperAdminSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobileMenu = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileOpen]);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileMenu}
        className="lg:hidden fixed top-4 left-4 z-50 bg-indigo-800 text-white p-2 rounded-lg shadow-lg hover:bg-indigo-900 transition-colors"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`bg-white shadow-lg transition-all duration-300 ease-in-out flex flex-col overflow-hidden
          lg:sticky lg:top-0 lg:h-screen
          fixed top-0 left-0 h-full z-40
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-16 w-64' : 'w-64'}
        `}
      >
        {/* Toggle Button - Desktop only */}
        <button
          onClick={toggleSidebar}
          type="button"
          className={`hidden lg:block absolute top-4 bg-white shadow-md rounded-full p-2 border border-gray-200 hover:bg-gray-100 transition-all z-50 ${
            isCollapsed ? 'left-1/2 -translate-x-1/2' : 'right-2'
          }`}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>

        {/* Logo Section - Fixed */}
        {!isCollapsed && (
          <div className="border-b border-gray-100 flex justify-center items-center p-5 lg:mt-0 mt-0">
            <Link 
              href="/superadmin" 
              className="transition-transform duration-200 hover:scale-105"
            >
              <h1 className="text-2xl font-bold text-indigo-800">SuperAdmin</h1>
            </Link>
          </div>
        )}

        {/* Scrollable Navigation */}
        <div className={`flex-1 overflow-hidden ${
          isCollapsed ? 'lg:pt-16 pt-0' : ''
        }`}>
          <nav className="h-full">
            <div className={`h-full py-2 ${
              isCollapsed 
                ? 'lg:px-0 px-4 overflow-y-auto overflow-x-hidden scrollbar-hide' 
                : 'px-4 overflow-y-auto overflow-x-hidden'
            }`}>
              <ul className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/superadmin');

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center font-medium transition-all duration-200 group relative ${
                          isActive
                            ? 'bg-indigo-800 text-white shadow-md'
                            : 'text-gray-700 hover:bg-indigo-800/10 hover:text-indigo-800'
                        } ${
                          isCollapsed 
                            ? 'lg:w-12 lg:h-12 lg:mx-2 lg:justify-center w-full gap-3 px-3 py-2.5 rounded-lg' 
                            : 'w-full gap-3 px-3 py-2.5 rounded-lg'
                        }`}
                        title={isCollapsed ? item.label : ''}
                      >
                        <Icon 
                          className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" 
                        />
                        
                        <span className={`truncate text-sm ${
                          isCollapsed ? 'lg:hidden block' : 'block'
                        }`}>{item.label}</span>

                        {/* Tooltip for collapsed state - Desktop only */}
                        {isCollapsed && (
                          <span className="hidden lg:block absolute left-full ml-2 px-2 py-1.5 bg-indigo-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                            {item.label}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
        </div>

        {/* Footer - Fixed */}
        <div className={`border-t border-gray-200 flex justify-center items-center ${
          isCollapsed ? 'lg:p-2 p-4' : 'p-4'
        }`}>
          {!isCollapsed ? (
            <div className="text-xs text-gray-500">
              Our Gym © {new Date().getFullYear()}
            </div>
          ) : (
            <div className="text-xs text-gray-500 font-semibold lg:block hidden">
              Our GYM
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
