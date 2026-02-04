'use client'

import { useEffect, useRef, useState } from "react";
import { ChevronRight, Play } from "lucide-react";
import heroImage from "@/assets/hero-gym.jpg";

const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-end justify-center overflow-hidden pb-8"
    >
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src='/images/hero-gym.jpg'
          alt="Premium gym interior"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/20 via-transparent to-background/20" />
      </div>

      {/* Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-float" />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/15 rounded-full blur-[100px] animate-float"
        style={{ animationDelay: "2s" }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px]" />

      {/* Particles */}
      <div className="absolute inset-0 z-10 opacity-30">
        {isVisible && [...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${4 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-20 container mx-auto px-6 text-center">
        <div
          className={`transition-all duration-1000 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            }`}
        >
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6 leading-tight">
            <span className="block text-white/90">Build Your</span>
            <span className="block gradient-text mt-2">Ultimate Physique</span>
          </h1>

          <p
            className={`text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed transition-all duration-1000 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
          >
            Transform your body and mind at the most advanced fitness facility.
            World-class equipment, expert trainers, and a community that pushes you beyond limits.
          </p>

          {/* CTA Buttons */}
          {/* <div
            className={`flex flex-col sm:flex-row gap-4 justify-center items-center transition-all duration-1000 delay-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
          >
            <button className="group min-w-[200px] px-8 py-4 rounded-xl bg-gradient-to-r from-yellow-400 to-blue-500 text-black font-semibold flex items-center justify-center gap-2 hover:scale-105 transition">
              Join Now
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button className="group min-w-[200px] px-8 py-4 rounded-xl border border-white/20 text-white font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition">
              <Play className="w-5 h-5" />
              Explore Programs
            </button>
          </div> */}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
