import React from 'react';
import { cn } from '../../lib/utils';
import type { Severity, ReadinessStatus, ArtifactStatus } from '../../types';

type BadgeVariant = 'critical' | 'high' | 'medium' | 'low' | 'ready' | 'needs-revision' | 'critical-gaps' | 'pass' | 'warn' | 'fail' | 'completed' | 'processing' | 'pending' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variants: Record<BadgeVariant, string> = {
  critical: 'bg-red-50 text-red-600 ring-1 ring-red-200',
  high: 'bg-orange-50 text-orange-600 ring-1 ring-orange-200',
  medium: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200',
  low: 'bg-blue-50 text-blue-600 ring-1 ring-blue-200',
  ready: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200',
  'needs-revision': 'bg-amber-50 text-amber-600 ring-1 ring-amber-200',
  'critical-gaps': 'bg-red-50 text-red-600 ring-1 ring-red-200',
  pass: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200',
  warn: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200',
  fail: 'bg-red-50 text-red-600 ring-1 ring-red-200',
  completed: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200',
  processing: 'bg-blue-50 text-blue-600 ring-1 ring-blue-200',
  pending: 'bg-gray-50 text-gray-500 ring-1 ring-gray-200',
  default: 'bg-gray-50 text-gray-500 ring-1 ring-gray-200',
};

const dotColors: Record<BadgeVariant, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-500',
  ready: 'bg-emerald-500',
  'needs-revision': 'bg-amber-500',
  'critical-gaps': 'bg-red-500',
  pass: 'bg-emerald-500',
  warn: 'bg-amber-500',
  fail: 'bg-red-500',
  completed: 'bg-emerald-500',
  processing: 'bg-blue-500',
  pending: 'bg-gray-400',
  default: 'bg-gray-400',
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', children, className, dot = false }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-[0.04em]',
      variants[variant],
      className,
    )}
  >
    {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />}
    {children}
  </span>
);

export function severityToBadge(severity: Severity): BadgeVariant {
  return severity.toLowerCase() as BadgeVariant;
}

export function readinessToBadge(status: ReadinessStatus): BadgeVariant {
  const map: Record<ReadinessStatus, BadgeVariant> = {
    READY: 'ready',
    NEEDS_REVISION: 'needs-revision',
    CRITICAL_GAPS: 'critical-gaps',
  };
  return map[status];
}

export function readinessLabel(status: ReadinessStatus): string {
  const map: Record<ReadinessStatus, string> = {
    READY: 'Ready',
    NEEDS_REVISION: 'Needs Revision',
    CRITICAL_GAPS: 'Critical Gaps',
  };
  return map[status];
}

export function artifactStatusToBadge(status: ArtifactStatus): BadgeVariant {
  const map: Record<ArtifactStatus, BadgeVariant> = {
    COMPLETED: 'completed',
    PROCESSING: 'processing',
    PENDING: 'pending',
    FAILED: 'critical',
  };
  return map[status];
}

export function matrixStatusToBadge(status: 'PASS' | 'WARN' | 'FAIL'): BadgeVariant {
  return status.toLowerCase() as BadgeVariant;
}
