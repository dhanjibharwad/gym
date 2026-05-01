'use client';

import React, { useEffect } from 'react';
import { X, ShieldCheck, Lock, Eye, FileText, UserCheck, Bell, Mail } from 'lucide-react';

interface PrivacyPolicyPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyPolicyPanel: React.FC<PrivacyPolicyPanelProps> = ({ isOpen, onClose }) => {
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  const sections = [
    {
      icon: <UserCheck className="w-5 h-5 text-orange-500" />,
      title: "Information We Collect",
      content: "We collect personal information that you provide to us, including name, email address, phone number, and fitness-related data (like height and weight for BMI calculations) when you use our services."
    },
    {
      icon: <Eye className="w-5 h-5 text-orange-500" />,
      title: "How We Use Data",
      content: "Your data is used to provide personalized fitness plans, manage your membership, process payments, and improve our services. We never sell your personal information to third parties."
    },
    {
      icon: <Lock className="w-5 h-5 text-orange-500" />,
      title: "Data Security",
      content: "We implement industry-standard security measures to protect your data. This includes encryption of sensitive information and restricted access to personal data by our staff."
    },
    {
      icon: <Bell className="w-5 h-5 text-orange-500" />,
      title: "Your Rights",
      content: "You have the right to access, correct, or delete your personal data at any time. You can also opt-out of marketing communications through your profile settings."
    },
    {
      icon: <Mail className="w-5 h-5 text-orange-500" />,
      title: "Contact Us",
      content: "If you have any questions about this Privacy Policy, please contact our data protection officer at privacy@gymportal.com."
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-transparent transition-opacity duration-500"
        onClick={onClose}
      />

      {/* Drawer with Glassmorphism */}
      <div className="relative w-full max-w-lg bg-black/40 backdrop-blur-2xl border-l border-white/10 shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-500">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-transparent sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-500 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Privacy Policy</h2>
              <p className="text-[10px] text-orange-500 uppercase tracking-[0.2em] font-black opacity-80">Legal & Transparency</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="p-6 bg-orange-500/10 border border-orange-500/20 rounded-3xl space-y-3">
              <div className="flex items-center gap-2 text-white font-bold">
                <FileText className="w-5 h-5 text-orange-500" />
                <h4>Last Updated: May 2026</h4>
              </div>
              <p className="text-sm text-gray-200 leading-relaxed">
                At GymPortal, we respect your privacy and are committed to protecting your personal data. 
                This policy explains how we handle your information when you use our platform.
              </p>
            </div>

            <div className="space-y-6">
              {sections.map((section, index) => (
                <div 
                  key={index} 
                  className="p-6 bg-white/5 rounded-2xl border border-white/10 hover:border-orange-500/30 transition-colors group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                      {section.icon}
                    </div>
                    <h3 className="font-bold text-white tracking-tight">{section.title}</h3>
                  </div>
                  <p className="text-sm text-gray-200 leading-relaxed font-medium">
                    {section.content}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-4 pb-8">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest text-center font-bold">
                End of Privacy Policy
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-white/10 bg-transparent">
          <button 
            onClick={onClose}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-[0.98] cursor-pointer"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPanel;
