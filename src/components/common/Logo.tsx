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
      {/* Official Smart Learning Hub Toga & Shield Logo */}
      <img
        src={logoImg}
        alt="Smart Learning Hub Logo"
        className="shrink-0 object-contain drop-shadow-xs select-none"
        style={{ width: size, height: size }}
      />

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

