import React from 'react';
import logoImg from '../../assets/logo.png';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 32,
  showText = true,
  textClassName = 'text-lg font-bold tracking-tight text-slate-900 dark:text-white',
}) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Official Smart Learning Hub Logo with High-Contrast White Squircle Container */}
      <div 
        className="relative flex items-center justify-center shrink-0 rounded-xl bg-white p-1 shadow-xs border border-slate-200/90 dark:border-white/20 select-none overflow-hidden"
        style={{ width: size + 6, height: size + 6 }}
      >
        <img
          src={logoImg}
          alt="Smart Learning Hub Logo"
          className="w-full h-full object-contain"
        />
      </div>

      {showText && (
        <div className="flex flex-col leading-tight min-w-0">
          <span className={`${textClassName} whitespace-nowrap`}>
            Smart Learning Hub
          </span>
          <span className="hidden sm:block text-[11px] font-medium text-slate-400 dark:text-slate-400 whitespace-nowrap">
            Portal Mahasiswa
          </span>
        </div>
      )}
    </div>
  );
};

