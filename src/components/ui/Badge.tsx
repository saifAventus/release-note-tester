import React from 'react';

export interface BadgeProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className = '',
  size = 'sm',
}) => {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border transition-colors ${sizeClass} ${className}`}
    >
      {children}
    </span>
  );
};
