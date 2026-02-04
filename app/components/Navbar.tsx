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
    <nav className="bg-black/90 backdrop-blur-sm fixed w-full z-50 top-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo - Left Side */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <div className="text-white font-bold text-2xl">
                <span className="text-3xl text-orange-500">EAGLE GYM</span>
                {/* <span className="">GYM</span> */}
              </div>
            </Link>
          </div>

          {/* Menu Items - Center */}
          <div className="hidden lg:flex items-center justify-center flex-1 px-8">
            <div className="flex items-center space-x-8">
              {menuItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className="text-white hover:text-orange-500 transition-colors duration-300 text-sm font-semibold tracking-wider"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Buttons & Social Icons - Right Side */}
          <div className="hidden lg:flex items-center space-x-4">


            {/* Login Button */}
            <Link
              href="/auth/login"
              className="px-6 py-2.5 text-white border border-white hover:bg-white hover:text-black transition-all duration-300 font-semibold text-sm"
            >
              LOGIN
            </Link>

            {/* Start Now Button */}
            {/* <Link
              href="/auth/member-register"
              className="px-6 py-2.5 bg-orange-500 text-white hover:bg-orange-600 transition-all duration-300 font-semibold text-sm"
            >
              START NOW
            </Link> */}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white hover:text-orange-500 focus:outline-none"
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
        <div className="lg:hidden bg-black/95">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {menuItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className="block px-3 py-2 text-white hover:text-orange-500 hover:bg-gray-900 transition-colors duration-300 text-sm font-semibold"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-4 pb-2 px-3 space-y-2">
              <Link
                href="/auth/login"
                className="block w-full px-6 py-2.5 text-center text-white border border-white hover:bg-white hover:text-black transition-all duration-300 font-semibold text-sm"
                onClick={() => setIsOpen(false)}
              >
                LOGIN
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;