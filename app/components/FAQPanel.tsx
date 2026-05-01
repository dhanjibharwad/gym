'use client';

import React, { useEffect, useState } from 'react';
import { X, HelpCircle, ChevronDown, ChevronUp, MessageSquare, Clock, CreditCard, Dumbbell } from 'lucide-react';

interface FAQPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const FAQPanel: React.FC<FAQPanelProps> = ({ isOpen, onClose }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  const faqs = [
    {
      icon: <Clock className="w-5 h-5 text-orange-500" />,
      question: "What are the gym opening hours?",
      answer: "We are open 24/7 for all members with valid access cards. Staffed hours are Monday-Friday 6 AM to 10 PM, and weekends 8 AM to 8 PM."
    },
    {
      icon: <CreditCard className="w-5 h-5 text-orange-500" />,
      question: "How can I cancel or pause my membership?",
      answer: "You can pause your membership for up to 3 months per year through your member portal. To cancel, please provide a 30-day notice via the portal or at the front desk."
    },
    {
      icon: <Dumbbell className="w-5 h-5 text-orange-500" />,
      question: "Do you offer personal training?",
      answer: "Yes! We have certified personal trainers available for 1-on-1 sessions. You can book a free initial consultation through the 'Trainers' section in the portal."
    },
    {
      icon: <MessageSquare className="w-5 h-5 text-orange-500" />,
      question: "Is there a guest pass policy?",
      answer: "Members can bring one guest per month for free. Additional guest passes can be purchased for $15 at the reception."
    },
    {
      icon: <HelpCircle className="w-5 h-5 text-orange-500" />,
      question: "How do I book a group fitness class?",
      answer: "Classes can be booked up to 7 days in advance through the mobile app or member portal. We recommend booking early as popular classes fill up quickly."
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
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Help Center</h2>
              <p className="text-[10px] text-orange-500 uppercase tracking-[0.2em] font-black opacity-80">FAQs & Support</p>
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
        <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition-all duration-300"
              >
                <button 
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full p-5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
                      {faq.icon}
                    </div>
                    <span className="font-bold text-white text-sm">{faq.question}</span>
                  </div>
                  {openIndex === index ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                </button>
                
                {openIndex === index && (
                  <div className="px-5 pb-5 pt-0 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="pl-12">
                      <p className="text-sm text-gray-200 leading-relaxed font-medium">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="p-8 bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-[2.5rem] border border-orange-500/20 space-y-4 mt-8">
              <h4 className="text-sm font-black text-orange-500 uppercase tracking-widest text-center">Ready to start?</h4>
              <p className="text-sm text-white text-center font-medium leading-relaxed">
                Join our community today and transform your fitness journey with our expert trainers.
              </p>
              <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-[0.98] cursor-pointer">
                Explore Memberships
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-white/10 bg-transparent">
          <button 
            onClick={onClose}
            className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all cursor-pointer border border-white/10"
          >
            Close Help Center
          </button>
        </div>
      </div>
    </div>
  );
};

export default FAQPanel;
