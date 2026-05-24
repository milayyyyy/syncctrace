import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  className?: string;
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  className,
  children,
  padding = 'md',
  hover = false,
  onClick,
}) => {
  const paddings = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-7' };

  const classes = cn(
    'bg-white rounded-2xl border border-gray-100 shadow-card',
    paddings[padding],
    hover && 'cursor-pointer hover:shadow-card-hover hover:border-gray-200 transition-all duration-200',
    className,
  );

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {children}
      </button>
    );
  }

  return (
    <div className={classes}>
      {children}
    </div>
  );
};

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, action, icon }) => (
  <div className="flex items-start justify-between mb-5">
    <div className="flex items-center gap-3">
      {icon && (
        <div className="w-8 h-8 flex items-center justify-center text-primary">{icon}</div>
      )}
      <div>
        <h3 className="text-[15px] font-semibold text-gray-900 tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5 font-medium">{subtitle}</p>}
      </div>
    </div>
    {action && <div>{action}</div>}
  </div>
);
