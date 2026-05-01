'use client';

import React, { useState, useEffect } from 'react';
import { X, Calculator, Scale, ArrowUpCircle, Info, CheckCircle2, ChevronRight } from 'lucide-react';

interface BMICalculatorPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const BMICalculatorPanel: React.FC<BMICalculatorPanelProps> = ({ isOpen, onClose }) => {
  const [height, setHeight] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [result, setResult] = useState<{
    bmi: number;
    category: string;
    color: string;
    suggestion: string;
    plan: string;
  } | null>(null);

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const calculateBMI = () => {
    const h = parseFloat(height) / 100; // convert cm to m
    const w = parseFloat(weight);

    if (h > 0 && w > 0) {
      const bmi = parseFloat((w / (h * h)).toFixed(1));
      let category = '';
      let color = '';
      let suggestion = '';
      let plan = '';

      if (bmi < 18.5) {
        category = 'Underweight';
        color = 'text-blue-400';
        suggestion = 'Focus on nutrient-dense foods and strength training to build muscle mass safely.';
        plan = 'Muscle Gain Program';
      } else if (bmi >= 18.5 && bmi < 25) {
        category = 'Healthy Weight';
        color = 'text-green-400';
        suggestion = 'You are in a great range! Maintain your fitness with a balanced mix of cardio and weights.';
        plan = 'Athletic Performance Plan';
      } else if (bmi >= 25 && bmi < 30) {
        category = 'Overweight';
        color = 'text-yellow-400';
        suggestion = 'Incorporate more high-intensity interval training (HIIT) and monitor calorie intake.';
        plan = 'Fat Loss & Conditioning';
      } else {
        category = 'Obese';
        color = 'text-red-400';
        suggestion = 'Prioritize consistent cardio and consult with our nutritionists for a sustainable plan.';
        plan = 'Weight Transformation';
      }

      setResult({ bmi, category, color, suggestion, plan });
    }
  };

  const reset = () => {
    setHeight('');
    setWeight('');
    setResult(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Completely Transparent Backdrop - Only handles close on click */}
      <div 
        className="absolute inset-0 bg-transparent transition-opacity duration-500"
        onClick={onClose}
      />

      {/* Drawer with Glassmorphism */}
      <div className="relative w-full max-w-md bg-black/40 backdrop-blur-2xl border-l border-white/10 shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-500">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-transparent sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-500 shadow-inner">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">BMI Calculator</h2>
              <p className="text-[10px] text-orange-500 uppercase tracking-[0.2em] font-black opacity-80">Health Assessment</p>
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
          {!result ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <ArrowUpCircle className="w-4 h-4 text-orange-500" /> Height (cm)
                  </label>
                  <input 
                    type="number" 
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="e.g. 175"
                    className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 px-6 text-white placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:bg-white/15 transition-all text-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-orange-500" /> Weight (kg)
                  </label>
                  <input 
                    type="number" 
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g. 70"
                    className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 px-6 text-white placeholder:text-gray-400 focus:outline-none focus:border-orange-500 focus:bg-white/15 transition-all text-lg font-medium"
                  />
                </div>
              </div>

              <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-5 flex items-start gap-4 backdrop-blur-md">
                <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
                  <Info className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm text-white leading-relaxed font-medium">
                  BMI is a useful estimate for most adults, but doesn't account for muscle mass or body composition.
                </p>
              </div>

              <button 
                onClick={calculateBMI}
                disabled={!height || !weight}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-3 text-lg tracking-tight"
              >
                Calculate My BMI
              </button>
            </div>
          ) : (
            <div className="space-y-8 animate-in zoom-in-95 duration-300">
              {/* Result Card with Glass Effect */}
              <div className="flex flex-col items-center justify-center space-y-4 py-10 bg-white/5 rounded-[3rem] border border-white/10 relative overflow-hidden backdrop-blur-xl">
                <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 to-transparent" />
                <p className="text-xs text-orange-500 uppercase tracking-[0.3em] font-black opacity-80">Your Health Score</p>
                <h3 className="text-8xl font-black text-white tracking-tighter">{result.bmi}</h3>
                <p className={`text-xl font-black ${result.color} px-8 py-2.5 rounded-full bg-white/5 border border-white/5 shadow-xl`}>
                  {result.category}
                </p>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-3">
                  <h4 className="font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" /> Professional Insight
                  </h4>
                  <p className="text-white leading-relaxed font-medium">
                    {result.suggestion}
                  </p>
                </div>

                <div className="p-8 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-[2.5rem] border border-orange-500/20 space-y-5 relative overflow-hidden group">
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                  <h4 className="text-xs font-black text-orange-500 uppercase tracking-[0.2em]">Recommended Plan</h4>
                  <div className="flex items-center justify-between group cursor-pointer relative z-10">
                    <span className="text-2xl font-black text-white tracking-tight">{result.plan}</span>
                    <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:translate-x-2 transition-transform duration-300">
                      <ChevronRight className="w-7 h-7 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={reset}
                className="w-full py-4 text-gray-500 hover:text-white font-bold transition-colors cursor-pointer text-sm uppercase tracking-widest"
              >
                Start Over
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-white/10 bg-transparent">
          <button 
            onClick={onClose}
            className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all cursor-pointer border border-white/10"
          >
            Close Assessment
          </button>
        </div>
      </div>
    </div>
  );
};

export default BMICalculatorPanel;
