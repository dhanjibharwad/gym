'use client'

import { useEffect, useRef, useState } from "react";
import { Zap, Timer, Flame, Heart, Activity, Target } from "lucide-react";

const cardioFeatures = [
  { icon: Timer, text: "Advanced Treadmills with incline training", color: "text-blue-500" },
  { icon: Zap, text: "Spin & Cycling studio area", color: "text-yellow-500" },
  { icon: Flame, text: "HIIT Training zones and classes", color: "text-red-500" },
  { icon: Heart, text: "Heart rate monitoring systems", color: "text-pink-500" },
];

const CardioSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-br from-gray-50 to-white"
    >
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-purple-500/5" />
      <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-500/8 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: "1s" }} />
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-4 h-4 bg-blue-400 rounded-full animate-bounce opacity-60" style={{ animationDelay: "0.5s" }} />
      <div className="absolute top-40 right-20 w-3 h-3 bg-purple-400 rounded-full animate-bounce opacity-60" style={{ animationDelay: "1.5s" }} />
      <div className="absolute bottom-32 left-20 w-2 h-2 bg-pink-400 rounded-full animate-bounce opacity-60" style={{ animationDelay: "2s" }} />

      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Enhanced Left Image */}
          <div
            className={`relative order-2 lg:order-1 transition-all duration-1000 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12"
            }`}
          >
            <div className="relative group">
              {/* Multi-layered Glow Effect */}
              <div className="absolute -inset-6 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl opacity-60 group-hover:opacity-100 transition-all duration-700" />
              <div className="absolute -inset-3 bg-gradient-to-r from-blue-400/30 to-purple-400/30 rounded-2xl blur-xl opacity-40 group-hover:opacity-70 transition-all duration-500" />
              
              {/* Main Image Container */}
              <div className="relative rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl backdrop-blur-sm">
                <img
                  src='/images/gym-interior.jpg'
                  alt="Cardio Zone"
                  className="w-full h-[500px] object-cover transform group-hover:scale-105 transition-transform duration-700"
                />
                {/* Enhanced Overlays */}
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/30 via-transparent to-purple-600/20 mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                
                {/* Dynamic Energy Lines */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400/80 via-white/60 to-transparent animate-pulse" />
                <div className="absolute top-1/3 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-400/60 via-pink-400/40 to-transparent animate-pulse" style={{ animationDelay: "0.3s" }} />
                <div className="absolute top-2/3 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-400/40 via-transparent to-transparent animate-pulse" style={{ animationDelay: "0.6s" }} />
              </div>

              {/* Floating Stats */}
              <div className="absolute -top-4 -right-4 bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-white/20">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-bold text-gray-800">Live Stats</span>
                </div>
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-white/20">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-500" />
                  <span className="text-sm font-bold text-gray-800">AI Coaching</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Right Content */}
          <div
            className={`order-1 lg:order-2 transition-all duration-1000 delay-200 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12"
            }`}
          >
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full px-4 py-2 mb-6">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="text-blue-600 font-semibold tracking-wide uppercase text-sm">
                High-Intensity Zone
              </span>
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
              <span className="gradient-text">
                Cardio
              </span>{" "}
              <span className="text-gray-800">& Endurance</span>
              <br />
              <span className="text-gray-600 text-3xl md:text-4xl lg:text-5xl">Zone</span>
            </h2>
            
            <p className="text-gray-600 text-lg leading-relaxed mb-10">
              Push your cardiovascular limits in our state-of-the-art endurance zone. 
              Equipped with cutting-edge technology to track your performance and 
              maximize your fat-burning potential with real-time feedback.
            </p>

            {/* Enhanced Feature List */}
            <div className="space-y-6 mb-10">
              {cardioFeatures.map((feature, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-4 group transition-all duration-500 hover:transform hover:translate-x-2 ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
                  }`}
                  style={{ transitionDelay: `${400 + index * 100}ms` }}
                >
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-white to-gray-50 shadow-lg flex items-center justify-center group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border border-gray-100`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <p className="text-gray-700 font-medium text-lg group-hover:text-gray-900 transition-colors duration-300">
                    {feature.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Enhanced Energy Meter */}
            <div className="bg-gradient-to-r from-white to-gray-50 rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-500" />
                  Calorie Burn Potential
                </span>
                <span className="text-2xl font-black bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                  800+ kcal/hr
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 rounded-full transition-all duration-1500 delay-700 shadow-lg ${isVisible ? "w-4/5" : "w-0"
                  }`}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Beginner</span>
                <span>Intermediate</span>
                <span>Advanced</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CardioSection;
