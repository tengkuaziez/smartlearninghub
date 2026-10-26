import React from 'react';
import type { SubmissionStatus, AttendanceStatus } from '../../types/index.ts';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  dot = false,
}) => {
  const variantStyles = {
    primary: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900',
    secondary: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900',
    danger: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900',
    info: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-900',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    outline: 'bg-transparent text-slate-700 border-slate-300 dark:text-slate-300 dark:border-slate-700',
  };

  const dotColors = {
    primary: 'bg-blue-500',
    secondary: 'bg-indigo-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-cyan-500',
    neutral: 'bg-slate-400',
    outline: 'bg-slate-400',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border tracking-wide transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};

export const SubmissionStatusBadge: React.FC<{ status: SubmissionStatus; className?: string }> = ({
  status,
  className = '',
}) => {
  switch (status) {
    case 'belum_dikerjakan':
      return (
        <Badge variant="warning" dot className={className}>
          Belum Dikerjakan
        </Badge>
      );
    case 'sudah_dikumpulkan':
      return (
        <Badge variant="info" dot className={className}>
          Sudah Dikumpulkan
        </Badge>
      );
    case 'terlambat':
      return (
        <Badge variant="danger" dot className={className}>
          Terlambat
        </Badge>
      );
    case 'perlu_revisi':
      return (
        <Badge variant="warning" dot className={className}>
          Perlu Revisi
        </Badge>
      );
    case 'sudah_dinilai':
      return (
        <Badge variant="success" dot className={className}>
          Sudah Dinilai
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" className={className}>
          {status}
        </Badge>
      );
  }
};

export const AttendanceStatusBadge: React.FC<{ status: AttendanceStatus; className?: string }> = ({
  status,
  className = '',
}) => {
  switch (status) {
    case 'hadir':
      return (
        <Badge variant="success" dot className={className}>
          Hadir
        </Badge>
      );
    case 'izin':
      return (
        <Badge variant="primary" dot className={className}>
          Izin
        </Badge>
      );
    case 'sakit':
      return (
        <Badge variant="warning" dot className={className}>
          Sakit
        </Badge>
      );
    case 'alpa':
      return (
        <Badge variant="danger" dot className={className}>
          Alpa
        </Badge>
      );
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
};
