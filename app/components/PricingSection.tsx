'use client';

import React, { useEffect, useState } from 'react';
import { Check, Star } from 'lucide-react';

interface Plan {
  id: number;
  plan_name: string;
  duration_months: number;
  price: string | number;
}

const PricingSection = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch('/api/public/plans');
        const data = await response.json();
        if (data.success) {
          setPlans(data.plans);
        }
      } catch (error) {
        console.error('Failed to fetch plans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const getFeatures = (planName: string) => {
    const lowerName = planName.toLowerCase();
    if (lowerName.includes('basic') || lowerName.includes('monthly') || lowerName.includes('normal')) {
      return [
        "Unlimited access to the gym",
        "1 class per week",
        "FREE drinking package",
        "1 Free personal training"
      ];
    } else if (lowerName.includes('pro') || lowerName.includes('standard') || lowerName.includes('6')) {
      return [
        "Unlimited access to the gym",
        "3 classes per week",
        "FREE drinking package",
        "2 Free personal training",
        "Access to sauna & pool"
      ];
    } else {
      return [
        "Unlimited access to the gym",
        "Unlimited classes per week",
        "FREE drinking package",
        "5 Free personal training",
        "Full spa access",
        "Nutrition consultation"
      ];
    }
  };

  if (loading) return null;
  if (plans.length === 0) return null;

  return (
    <section id="pricing" className="py-24 bg-zinc-950 relative overflow-hidden">
      {/* Background with Red Overlay matching reference */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-red-50/10 to-black/80 z-10 mix-blend-multiply" />
        <div className="absolute inset-0 bg-black/40 z-20" />
        <img
          src="https://images.pexels.com/photos/17065209/pexels-photo-17065209.jpeg"
          alt="Gym Pull-up Background"
          className="w-full h-full object-cover grayscale opacity-70"
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-30">
        <div className="text-center mb-16 space-y-2">
          {/* Header styled like the reference image */}
          <h2 className="text-6xl md:text-7xl font-black text-white tracking-tighter uppercase drop-shadow-2xl">
            Pricing Plans
          </h2>
          <div className="flex items-center justify-center gap-2 text-white/80 text-xs font-bold uppercase tracking-widest">
            <span className="flex items-center gap-1 opacity-70">Home</span>
            <span className="opacity-50 font-normal">/</span>
            <span className="text-red-500">Pricing Plans</span>
          </div>
          <p className="text-gray-300 max-w-2xl mx-auto font-medium pt-4 text-sm leading-relaxed">
            Choose the perfect plan to reach your fitness goals.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-8">
          {plans.map((plan, index) => {
            const features = getFeatures(plan.plan_name);
            const isPopular = index === 1; // Mark second plan as popular

            return (
              <div
                key={plan.id}
                className={`relative group p-1 rounded-[2.5rem] transition-all duration-500 hover:-translate-y-2 w-full md:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)] xl:w-[calc(25%-1.5rem)] min-w-[300px] max-w-[350px] ${isPopular ? 'bg-gradient-to-b from-orange-500 to-orange-600 shadow-2xl shadow-orange-500/20' : 'bg-white/10 hover:bg-white/20'
                  }`}
              >
                <div className="bg-zinc-950 rounded-[2.4rem] h-full p-8 flex flex-col items-center text-center">
                  {isPopular && (
                    <div className="absolute top-6 right-6 bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 animate-pulse">
                      <Star className="w-3 h-3 fill-white" /> MOST POPULAR
                    </div>
                  )}

                  <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-widest">{plan.plan_name}</h3>

                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-bold text-orange-500">$</span>
                    <span className="text-6xl font-black text-white tracking-tighter">{plan.price}</span>
                  </div>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-10">
                    {plan.duration_months === 1 ? 'Monthly' : `${plan.duration_months} Months`}
                  </p>

                  <ul className="space-y-4 mb-10 text-left w-full">
                    {features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-sm text-gray-300">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isPopular ? 'bg-orange-500/20 text-orange-500' : 'bg-white/10 text-white'}`}>
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button className={`w-full py-5 rounded-2xl font-black transition-all active:scale-[0.98] mt-auto uppercase tracking-wider ${isPopular
                    ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/30 hover:bg-orange-600'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                    }`}>
                    Get Started
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
