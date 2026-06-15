import { cn } from '@/lib/utils';
import type { ApplicationStatus } from '@/types/common';
import { APPLICATION_STATUS_CONFIG } from '../status-meta';

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
}

export function ApplicationStatusBadge({ status }: ApplicationStatusBadgeProps) {
  const config = APPLICATION_STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}
