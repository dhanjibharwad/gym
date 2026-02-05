"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CreditCard,
  Crown,
  User,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  UserCog,
  Clock,
  BadgeCheck,
  UserX,
  History
} from 'lucide-react';

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "reception"] },
  { label: "Add Staff", href: "/dashboard/add-staff", icon: UserCog, roles: ["admin"] },
  { label: "Our Staff", href: "/dashboard/ourstaff", icon: User, roles: ["admin"] },
  { label: "Members", href: "/dashboard/members", icon: Users, roles: ["admin", "reception"] },
  { label: "Add Members", href: "/dashboard/add-members", icon: UserPlus, roles: ["admin", "reception"] },
  { label: "Payments", href: "/dashboard/payments", icon: CreditCard, roles: ["admin", "reception"] },
  { label: "Membership Plans", href: "/dashboard/membership-plans", icon: Crown, roles: ["admin"] },
  { label: "Audit Logs", href: "/dashboard/audit-logs", icon: History, roles: ["admin"] },
  { label: "Payments History", href: "/dashboard/history", icon: Clock, roles: ["admin", "reception"] },
  { label: "Full Payments", href: "/dashboard/fullpayment", icon: BadgeCheck, roles: ["admin", "reception"] },
  { label: "Expired Membership", href: "/dashboard/expired", icon: UserX, roles: ["admin", "reception"] }
];

interface SidebarProps {
  userRole?: string;
}

export default function Sidebar({ userRole = "admin" }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const toggleSidebar = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsCollapsed(!isCollapsed);
  };

  return (
    <aside
      className={`bg-white shadow-lg transition-all duration-300 ease-in-out flex flex-col sticky top-0 h-screen overflow-hidden ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className={`absolute top-6 bg-white shadow-md rounded-full p-2 border border-gray-200 hover:bg-gray-100 hover:shadow-lg transition-all duration-200 z-20 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:ring-opacity-50 ${
          isCollapsed ? 'left-1/2 transform -translate-x-1/2' : 'right-2'
        }`}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="w-5 h-5 text-gray-600" />
        ) : (
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        )}
      </button>

      {/* Logo Section */}
      {!isCollapsed && (
        <div className="border-b border-gray-100 flex justify-center items-center p-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-orange-600">Our  GYM</span>
          </div>
        </div>
      )}

      {/* Scrollable Navigation */}
      <div className={`flex-1 overflow-hidden ${
        isCollapsed ? 'pt-16' : ''
      }`}>
        <nav className="h-full">
          <div className={`h-full py-2 ${
            isCollapsed 
              ? 'px-0 overflow-y-auto overflow-x-hidden scrollbar-hide' 
              : 'px-4 overflow-y-auto overflow-x-hidden'
          }`}>
            <ul className="space-y-1">
              {navItems
                .filter(item => item.roles.includes(userRole.toLowerCase()))
                .map((item) => {
                const Icon = item.icon;
                const isActive = item.href === '/dashboard' 
                  ? pathname === '/dashboard'
                  : pathname === item.href || pathname.startsWith(item.href + '/');

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center font-medium transition-all duration-200 group relative ${
                        isActive
                          ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-600'
                      } ${
                        isCollapsed 
                          ? 'w-12 h-12 mx-2 justify-center rounded-lg' 
                          : 'w-full gap-3 px-3 py-2.5 rounded-lg'
                      }`}
                      title={isCollapsed ? item.label : ''}
                    >
                      <Icon 
                        className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110" 
                      />
                      
                      {!isCollapsed && (
                        <span className="truncate text-sm">{item.label}</span>
                      )}

                      {/* Tooltip for collapsed state */}
                      {isCollapsed && (
                        <span className="absolute left-full ml-2 px-2 py-1.5 bg-gray-600 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
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

      {/* Footer */}
      <div className={`border-t border-gray-200 flex justify-center items-center ${
        isCollapsed ? 'p-2' : 'p-4'
      }`}>
        {!isCollapsed ? (
          <div className="text-xs text-gray-500">
            Our  GYM © 2026
          </div>
        ) : (
          <div className="text-xs text-gray-500 font-semibold">
            Our Gym
          </div>
        )}
      </div>
    </aside>
  );
}