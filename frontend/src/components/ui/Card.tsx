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
  const paddings = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-10' };

  const classes = cn(
    'glass-card relative overflow-hidden transition-all duration-300',
    paddings[padding],
    hover && 'cursor-pointer hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98]',
    className,
  );

  return (
    <div className={classes} onClick={onClick}>
      {/* Subtle top light effect */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
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
