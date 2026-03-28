import React from 'react';
import { Activity } from 'lucide-react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  iconClassName?: string;
  showText?: boolean;
}

export default function Logo({ className, iconClassName, showText = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn(
        "w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.3)]",
        iconClassName
      )}>
        <Activity className="w-7 h-7 text-black stroke-[2.5]" />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tighter text-white leading-none">MODAFLOW</span>
          <span className="text-[9px] font-bold text-orange-500 uppercase tracking-[0.2em] mt-1">Business Control</span>
        </div>
      )}
    </div>
  );
}
