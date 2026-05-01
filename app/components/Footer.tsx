'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Phone, 
  MessageCircle, 
  Mail, 
  ArrowRight
} from "lucide-react";

interface FooterProps {
  onOpenBMI?: () => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
  onOpenFAQ?: () => void;
}

const Footer: React.FC<FooterProps> = ({ onOpenBMI, onOpenPrivacy, onOpenTerms, onOpenFAQ }) => {
  const linkClasses = "text-gray-400 hover:text-orange-500 transition-colors text-sm py-1 block cursor-pointer";
  const titleClasses = "text-sm font-black text-white uppercase tracking-wider mb-4";

  return (
    <footer className="bg-[#0a0f1a] text-white pt-12 pb-8 border-t border-gray-800/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          
          {/* Membership Plans */}
          <div>
            <h3 className={titleClasses}>Membership Plans</h3>
            <ul className="space-y-1">
              <li><Link href="#pricing" className={linkClasses}>Pricing Plans</Link></li>
              <li><Link href="/setup" className={linkClasses}>Basic Plan</Link></li>
              <li><Link href="/setup" className={linkClasses}>Premium Plan</Link></li>
              <li><Link href="/setup" className={linkClasses}>VIP Plan</Link></li>
              <li><Link href="/setup" className={linkClasses}>Corporate Plans</Link></li>
            </ul>
          </div>

          {/* Gym Features */}
          <div>
            <h3 className={titleClasses}>Gym Features</h3>
            <ul className="space-y-1">
              <li><Link href="/#classes" className={linkClasses}>Personal Training</Link></li>
              <li><Link href="/#classes" className={linkClasses}>Group Classes</Link></li>
              <li><Link href="/#about" className={linkClasses}>Nutrition Counseling</Link></li>
              <li><Link href="/#about" className={linkClasses}>Locker Facilities</Link></li>
              <li><Link href="/#about" className={linkClasses}>Cardio Zone</Link></li>
              <li><Link href="/#about" className={linkClasses}>Strength Training</Link></li>
            </ul>
          </div>

          {/* Member Support */}
          <div>
            <h3 className={titleClasses}>Member Support</h3>
            <ul className="space-y-1">
              <li>
                <Link href="/auth/login" className="text-orange-500 hover:text-orange-400 transition-colors text-sm py-1 flex items-center gap-1 font-bold">
                  Member Portal <ArrowRight className="w-3 h-3" />
                </Link>
              </li>
              <li>
                <button onClick={onOpenFAQ} className={linkClasses}>Class Booking</button>
              </li>
              <li>
                <button onClick={onOpenPrivacy} className={linkClasses}>Privacy Policy</button>
              </li>
              <li>
                <button onClick={onOpenFAQ} className={linkClasses}>FAQs</button>
              </li>
              <li>
                <button onClick={onOpenTerms} className={linkClasses}>Terms</button>
              </li>
            </ul>
          </div>

          {/* About Gym */}
          <div>
            <h3 className={titleClasses}>About Gym</h3>
            <ul className="space-y-1">
              <li><Link href="/#about" className={linkClasses}>Our Story</Link></li>
              <li><Link href="/#about" className={linkClasses}>Trainers</Link></li>
              <li><Link href="/#about" className={linkClasses}>Success Stories</Link></li>
              <li>
                <button onClick={onOpenBMI} className="text-gray-400 hover:text-orange-500 transition-colors text-xs font-bold mt-2 uppercase tracking-tighter">
                  BMI Calculator
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Us */}
          <div>
            <h3 className={titleClasses}>Contact Us</h3>
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-4">24x7 Support ( All Days )</p>
            <div className="flex gap-6">
              <Link href="tel:+1234567890" className="flex flex-col items-center gap-1 group">
                <div className="text-orange-500 group-hover:scale-110 transition-transform">
                  <Phone className="w-5 h-5" />
                </div>
                <span className="text-[10px] text-gray-400 font-bold">Call Us</span>
              </Link>
              <Link href="https://wa.me/1234567890" className="flex flex-col items-center gap-1 group">
                <div className="text-orange-500 group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <span className="text-[10px] text-gray-400 font-bold">Chat</span>
              </Link>
              <Link href="mailto:support@gymportal.com" className="flex flex-col items-center gap-1 group">
                <div className="text-orange-500 group-hover:scale-110 transition-transform">
                  <Mail className="w-5 h-5" />
                </div>
                <span className="text-[10px] text-gray-400 font-bold">Email</span>
              </Link>
            </div>
          </div>

        </div>

        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col md:row justify-between items-center gap-4 text-gray-600 text-[10px] font-bold uppercase tracking-widest">
          <p>© {new Date().getFullYear()} GymPortal. All rights reserved.</p>
          <div className="flex gap-6">
            <span>Powered by SmartGym Tech</span>
            <span className="text-green-600">System Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;