"use client";

import React from "react";

interface GymLoaderProps {
  size?: "sm" | "md" | "lg" | "xl";
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { container: "w-16 h-16", barbell: "w-12 h-12" },
  md: { container: "w-24 h-24", barbell: "w-16 h-16" },
  lg: { container: "w-36 h-36", barbell: "w-24 h-24" },
  xl: { container: "w-52 h-52", barbell: "w-36 h-36" },
};

export default function GymLoader({
  size = "md",
  text = "",
  fullScreen = false,
  className = "",
}: GymLoaderProps) {
  const dimensions = sizeMap[size];

  const loaderContent = (
    <div className={`flex flex-col items-center justify-center min-h-[200px] ${className}`}>
      {/* Barbell Animation Container */}
      <div
        className={`${dimensions.container} relative flex items-center justify-center`}
      >
        {/* Animated Barbell SVG - Rotating Clockwise */}
        <svg
          viewBox="0 0 120 80"
          className={`${dimensions.barbell} relative z-10`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            transformOrigin: "center",
            animation: "barbellRotate 3s linear infinite",
          }}
        >
          {/* Left Weight Plates */}
          <rect x="5" y="25" width="8" height="30" rx="2" fill="#1F2937" />
          <rect x="15" y="20" width="10" height="40" rx="2" fill="#374151" />
          <rect x="27" y="15" width="12" height="50" rx="2" fill="#4B5563" />
          
          {/* Bar */}
          <rect x="40" y="36" width="40" height="8" rx="2" fill="#9CA3AF" />
          
          {/* Right Weight Plates */}
          <rect x="82" y="15" width="12" height="50" rx="2" fill="#4B5563" />
          <rect x="96" y="20" width="10" height="40" rx="2" fill="#374151" />
          <rect x="108" y="25" width="8" height="30" rx="2" fill="#1F2937" />

          {/* Plate Highlights */}
          <rect x="17" y="22" width="2" height="36" rx="1" fill="#6B7280" opacity="0.5" />
          <rect x="29" y="17" width="2" height="46" rx="1" fill="#6B7280" opacity="0.5" />
          <rect x="84" y="17" width="2" height="46" rx="1" fill="#6B7280" opacity="0.5" />
          <rect x="97" y="22" width="2" height="36" rx="1" fill="#6B7280" opacity="0.5" />

          {/* Weight Numbers on Plates */}
          <text x="33" y="44" fontSize="8" fill="#F97316" fontWeight="bold" textAnchor="middle">25</text>
          <text x="88" y="44" fontSize="8" fill="#F97316" fontWeight="bold" textAnchor="middle">25</text>
        </svg>
      </div>

      {/* Loading Text - only shown when explicitly provided */}
      {text && text !== "" && (
        <p className="mt-4 text-orange-600 font-semibold text-sm animate-pulse">
          {text}
        </p>
      )}

      {/* Keyframe Styles */}
      <style jsx>{`
        @keyframes barbellRotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gray-50/90 backdrop-blur-sm flex items-center justify-center z-50">
        {loaderContent}
      </div>
    );
  }

  return loaderContent;
}
