import React from 'react';

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
      {/* Icon-only geometric logo: Interconnected hexagonal knowledge nodes */}
      <div 
        className="relative flex items-center justify-center shrink-0 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-cyan-500 p-2 shadow-sm shadow-blue-500/20"
        style={{ width: size, height: size }}
        aria-label="Smart Learning Hub Logo"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full h-full text-white"
        >
          {/* Central learning diamond with connecting nodes */}
          <polygon points="12 2 20 7 20 17 12 22 4 17 4 7" className="opacity-40" />
          <line x1="12" y1="2" x2="12" y2="12" />
          <line x1="12" y1="12" x2="20" y2="17" />
          <line x1="12" y1="12" x2="4" y2="17" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
          <circle cx="12" cy="2" r="1.5" fill="currentColor" />
          <circle cx="20" cy="7" r="1.5" fill="currentColor" />
          <circle cx="20" cy="17" r="1.5" fill="currentColor" />
          <circle cx="12" cy="22" r="1.5" fill="currentColor" />
          <circle cx="4" cy="17" r="1.5" fill="currentColor" />
          <circle cx="4" cy="7" r="1.5" fill="currentColor" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-tight min-w-0">
          <span className={`${textClassName} whitespace-nowrap`}>
            Smart Learning Hub
          </span>
          <span className="hidden sm:block text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Portal Mahasiswa
          </span>
        </div>
      )}
    </div>
  );
};
