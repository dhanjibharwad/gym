'use client'

import { useEffect, useState } from "react";
import { Star, Clock, Users, Trophy } from "lucide-react";

const IntroSection = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div
          className={`transition-all duration-1000 ease-out ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6 leading-tight">
                <span className="block text-foreground">Why Choose</span>
                <span className="block gradient-text mt-2">Our Gym?</span>
              </h2>

              <p
                className={`text-lg text-muted-foreground mb-8 leading-relaxed transition-all duration-1000 delay-300 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
              >
                Experience the difference with our state-of-the-art facilities, expert guidance, 
                and supportive community that helps you achieve your fitness goals.
              </p>

              {/* Stats */}
              <div
                className={`grid grid-cols-2 gap-6 transition-all duration-1000 delay-500 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
              >
                <div className="text-center p-4 rounded-xl border border-foreground/10">
                  <Users className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">500+</div>
                  <div className="text-sm text-muted-foreground">Active Members</div>
                </div>
                <div className="text-center p-4 rounded-xl border border-foreground/10">
                  <Trophy className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">50+</div>
                  <div className="text-sm text-muted-foreground">Equipment Types</div>
                </div>
              </div>
            </div>

            {/* Right Content - Features */}
            <div
              className={`space-y-6 transition-all duration-1000 delay-700 ${
                isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
              }`}
            >
              <div className="p-6 rounded-xl border border-foreground/10">
                <div className="flex items-center gap-4 mb-4">
                  <Star className="w-6 h-6 text-yellow-400" />
                  <h3 className="text-xl font-semibold text-foreground">Expert Training</h3>
                </div>
                <p className="text-muted-foreground">
                  Certified personal trainers with years of experience to guide your fitness journey.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-foreground/10">
                <div className="flex items-center gap-4 mb-4">
                  <Clock className="w-6 h-6 text-blue-500" />
                  <h3 className="text-xl font-semibold text-foreground">24/7 Access</h3>
                </div>
                <p className="text-muted-foreground">
                  Train on your schedule with round-the-clock gym access for all members.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-foreground/10">
                <div className="flex items-center gap-4 mb-4">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                  <h3 className="text-xl font-semibold text-foreground">Modern Equipment</h3>
                </div>
                <p className="text-muted-foreground">
                  Latest fitness technology and equipment from top brands worldwide.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default IntroSection;