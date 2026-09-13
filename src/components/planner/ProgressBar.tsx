import React from 'react';

interface ProgressBarProps {
  progress: number;
  className?: string;
  showText?: boolean;
}

export function ProgressBar({ progress, className = '', showText = true }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));

  // Color dynamic based on progress
  let barColor = 'bg-slate-300';
  if (clamped >= 100) {
    barColor = 'bg-emerald-500';
  } else if (clamped >= 70) {
    barColor = 'bg-orchid-600';
  } else if (clamped >= 30) {
    barColor = 'bg-purple-500';
  } else if (clamped > 0) {
    barColor = 'bg-sky-500';
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden flex-1"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showText && (
        <span className="text-xs font-mono font-medium text-slate-500 w-8 text-right">
          {clamped}%
        </span>
      )}
    </div>
  );
}
