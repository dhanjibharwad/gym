// src/components/Footer.tsx

import React from 'react';
import { Phone, MessageCircle, Mail } from "lucide-react";

const linkClasses = 'text-white hover:text-yellow-400 transition-colors duration-200';
const titleClasses = 'text-base font-semibold text-white mb-4 uppercase tracking-wider';
const contactLinkClasses = 'text-yellow-400 hover:text-white transition-colors duration-200';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white p-8 md:p-12 lg:p-16 border-t border-gray-700">
      <div className="max-w-7xl mx-auto">
        {/* Main Content Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Membership Plans */}
          <div className="col-span-1 md:col-span-1">
            <h3 className={titleClasses}>Membership Plans</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className={linkClasses}>Basic Plan</a></li>
              <li><a href="#" className={linkClasses}>Premium Plan</a></li>
              <li><a href="#" className={linkClasses}>VIP Plan</a></li>
              <li><a href="#" className={linkClasses}>Corporate Plans</a></li>
              <li><a href="#" className={linkClasses}>Student Discounts</a></li>
              <li><a href="#" className={linkClasses}>Family Packages</a></li>
            </ul>
          </div>

          {/* Gym Features */}
          <div className="col-span-1 md:col-span-1">
            <h3 className={titleClasses}>Gym Features</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className={linkClasses}>Personal Training</a></li>
              <li><a href="#" className={linkClasses}>Group Classes</a></li>
              <li><a href="#" className={linkClasses}>Nutrition Counseling</a></li>
              <li><a href="#" className={linkClasses}>Locker Facilities</a></li>
              <li><a href="#" className={linkClasses}>Cardio Zone</a></li>
              <li><a href="#" className={linkClasses}>Strength Training</a></li>
            </ul>
          </div>

          {/* Member Support */}
          <div className="col-span-1 md:col-span-1">
            <h3 className={titleClasses}>Member Support</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className={linkClasses}>Member Portal</a></li>
              <li><a href="#" className={linkClasses}>Class Booking</a></li>
              <li><a href="#" className={linkClasses}>Privacy Policy</a></li>
              <li><a href="#" className={linkClasses}>FAQs</a></li>
              <li><a href="#" className={linkClasses}>Terms</a></li>
            </ul>
          </div>

          {/* About Gym */}
          <div className="col-span-1 md:col-span-1">
            <h3 className={titleClasses}>About Gym</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className={linkClasses}>Our Story</a></li>
              <li><a href="#" className={linkClasses}>Trainers</a></li>
              <li><a href="#" className={linkClasses}>Success Stories</a></li>
            </ul>
          </div>

          {/* Contact Us & Address (Spans 2 columns on medium screens) */}
          <div className="col-span-2 md:col-span-2">
            <h3 className={titleClasses}>Contact Us</h3>
            {/* <address className="not-italic text-sm mb-6">
              **FitZone Gym Management**<br />
              Fitness District, Health Plaza, 560001
            </address> */}

            <h4 className="text-sm font-semibold mb-2">24X7 SUPPORT ( ALL DAYS )</h4>
            {/* <div className="text-sm space-y-1 mb-6">
              <p>Membership : <a href="mailto:membership@fitzone.com" className={contactLinkClasses}>membership@fitzone.com</a></p>
            </div> */}
            
            {/* Contact Icons */}
            <div className="flex space-x-6 mb-8">
      <div className="flex flex-col items-center text-xs text-yellow-400">
        <Phone className="w-6 h-6 mb-1" />
        Call Us
      </div>
      <div className="flex flex-col items-center text-xs text-yellow-400">
        <MessageCircle className="w-6 h-6 mb-1" />
        Chat
      </div>
      <div className="flex flex-col items-center text-xs text-yellow-400">
        <Mail className="w-6 h-6 mb-1" />
        Email
      </div>
    </div>
          </div>
        </div>

        {/* --- Separator --- */}
        <hr className="my-8 border-gray-700" />
        
        {/* Download App & Social Media / Payment */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center">
            
            {/* Download App Section */}
            {/* <div className="p-6 mb-8 lg:mb-0 max-w-sm w-full bg-gradient-to-r from-gray-800 to-gray-700 border border-yellow-400 rounded-lg">
                <p className="text-base font-semibold mb-3">Download FitZone App</p>
                <p className="text-sm mb-4">Book classes, track workouts & manage your membership on the go</p>
                <div className="flex space-x-3">
                    <a href="#"><img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="Download on the App Store" className="h-10" /></a>
                    <a href="#"><img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" className="h-10" /></a>
                </div>
            </div> */}
            
            {/* Find Us On & Payment Methods */}
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-12 w-full lg:w-auto justify-between">
                
                {/* Social Media Icons */}
                {/* <div className="flex items-center space-x-4">
                    <p className="text-sm font-semibold">Find Us On</p>
                    <div className="flex space-x-2">
                        {['Insta', 'FB', 'LinkedIn', 'YouTube', 'X'].map((platform) => (
                            <a key={platform} href="#" className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black hover:bg-white transition-colors duration-200 text-xs font-bold">
                                {platform[0]}
                            </a>
                        ))}
                    </div>
                </div> */}
                
                {/* Payment Icons (Text placeholder) */}
                {/* <div className="text-xs text-gray-400 flex space-x-4">
                    <span>VISA</span>
                    <span>PayPal</span>
                    <span>AMEX</span>
                    ?
                </div> */}
            </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;