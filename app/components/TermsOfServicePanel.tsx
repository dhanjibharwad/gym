'use client';

import React, { useEffect } from 'react';
import { X, Gavel, Scale, ShieldAlert, UserPlus, Ban, CreditCard, HelpCircle } from 'lucide-react';

interface TermsOfServicePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const TermsOfServicePanel: React.FC<TermsOfServicePanelProps> = ({ isOpen, onClose }) => {
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
      icon: <UserPlus className="w-5 h-5 text-orange-500" />,
      title: "Membership Agreement",
      content: "By joining GymPortal, you agree to abide by our house rules and safety guidelines. Membership is personal and non-transferable unless specified in your plan."
    },
    {
      icon: <Scale className="w-5 h-5 text-orange-500" />,
      title: "Use of Facilities",
      content: "Members must use equipment properly and return it to its designated place. Proper athletic attire and clean footwear are required at all times within the gym area."
    },
    {
      icon: <CreditCard className="w-5 h-5 text-orange-500" />,
      title: "Payments & Cancellations",
      content: "Subscription fees are billed automatically. Cancellation requests must be submitted 30 days in advance. No refunds are provided for partial months."
    },
    {
      icon: <ShieldAlert className="w-5 h-5 text-orange-500" />,
      title: "Limitation of Liability",
      content: "GymPortal is not liable for any injuries sustained on the premises. Members are responsible for their own safety and should consult a doctor before starting any exercise program."
    },
    {
      icon: <Ban className="w-5 h-5 text-orange-500" />,
      title: "Termination",
      content: "We reserve the right to terminate memberships for violations of our code of conduct, harassment of other members, or damage to property."
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
              <Gavel className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Terms of Service</h2>
              <p className="text-[10px] text-orange-500 uppercase tracking-[0.2em] font-black opacity-80">Rules & Regulations</p>
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
                <HelpCircle className="w-5 h-5 text-orange-500" />
                <h4>Agreement to Terms</h4>
              </div>
              <p className="text-sm text-gray-200 leading-relaxed">
                By accessing or using GymPortal services, you agree to be bound by these terms. 
                Please read them carefully before finalizing your membership.
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
                End of Terms of Service
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
            I Accept the Terms
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePanel;
