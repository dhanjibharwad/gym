'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface MenuItem {
  label: string;
  href: string;
}

interface NavbarProps {
  logo?: string;
  menuItems?: MenuItem[];
}

const Navbar: React.FC<NavbarProps> = ({
  logo = '/logo.png',
  menuItems = [
    // { label: 'HOME', href: '/' },
    // { label: 'ABOUT US', href: '/about' },
    // { label: 'CLASSES', href: '/classes' },
    // { label: 'SERVICES', href: '/services' },
    // { label: 'OUR TEAM', href: '/team' },
    // { label: 'PAGES', href: '/pages' },
    // { label: 'CONTACT', href: '/contact' },
  ],
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-gradient-to-r from-black via-gray-900 to-black backdrop-blur-md fixed w-full z-50 top-0 shadow-lg border-b border-orange-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo - Left Side */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center group">
              <div className="relative">
                <span className="text-xl sm:text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 group-hover:from-orange-400 group-hover:via-orange-300 group-hover:to-orange-400 transition-all duration-300 tracking-tight">
                  OUR GYM
                </span>
                <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-orange-500 to-orange-400 group-hover:w-full transition-all duration-300"></div>
              </div>
            </Link>
          </div>

          {/* Menu Items - Center */}
          <div className="hidden xl:flex items-center justify-center flex-1 px-4 lg:px-8">
            <div className="flex items-center space-x-4 lg:space-x-8">
              {menuItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className="relative text-gray-300 hover:text-orange-500 transition-all duration-300 text-xs lg:text-sm font-semibold tracking-wider group whitespace-nowrap"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-500 group-hover:w-full transition-all duration-300"></span>
                </Link>
              ))}
            </div>
          </div>

          {/* Buttons - Right Side */}
          <div className="hidden xl:flex items-center space-x-2 lg:space-x-3">
            {/* Login Button */}
            <Link
              href="/auth/login"
              className="relative px-4 lg:px-6 py-2 lg:py-2.5 text-white border-2 border-orange-500/50 rounded-lg hover:border-orange-500 hover:bg-orange-500/10 transition-all duration-300 font-semibold text-xs lg:text-sm overflow-hidden group whitespace-nowrap"
            >
              <span className="relative z-10">UNIVERSAL LOGIN</span>
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/10 to-orange-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            </Link>

            {/* Start Now Button */}
            <Link
              href="/setup"
              className="relative px-4 lg:px-6 py-2 lg:py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300 font-semibold text-xs lg:text-sm shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 transform whitespace-nowrap"
            >
              START HERE
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="xl:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white hover:text-orange-500 focus:outline-none p-2 rounded-lg hover:bg-orange-500/10 transition-all duration-300"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="xl:hidden bg-gradient-to-b from-gray-900 to-black border-t border-orange-500/20 max-h-[calc(100vh-5rem)] overflow-y-auto">
          <div className="px-4 pt-2 pb-4 space-y-1">
            {menuItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className="block px-4 py-3 text-gray-300 hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-all duration-300 text-sm font-semibold"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-4 space-y-3">
              <Link
                href="/auth/login"
                className="block w-full px-6 py-3 text-center text-white border-2 border-orange-500/50 rounded-lg hover:border-orange-500 hover:bg-orange-500/10 transition-all duration-300 font-semibold text-sm"
                onClick={() => setIsOpen(false)}
              >
                UNIVERSAL LOGIN
              </Link>
              <Link
                href="/setup"
                className="block w-full px-6 py-3 text-center bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300 font-semibold text-sm shadow-lg shadow-orange-500/30"
                onClick={() => setIsOpen(false)}
              >
                START HERE
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;