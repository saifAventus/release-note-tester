import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  readonly startIcon?: React.ReactNode;
  readonly endIcon?: React.ReactNode;
  readonly error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ startIcon, endIcon, error, className = '', disabled, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {startIcon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            {startIcon}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={`w-full bg-slate-900/90 text-slate-100 placeholder:text-slate-500 text-sm rounded-xl border transition-all duration-200 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-rose-500/80 focus:ring-rose-500/40' : 'border-slate-800 hover:border-slate-700'
          } ${startIcon ? 'pl-10' : 'pl-4'} ${endIcon ? 'pr-10' : 'pr-4'} py-2.5 ${className}`}
          {...props}
        />
        {endIcon && (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400">
            {endIcon}
          </div>
        )}
        {error && <p className="mt-1.5 text-xs text-rose-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
