import { Link } from 'react-router-dom';
import { MapPin, Briefcase, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApplicationListItem } from '../types';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';
import { StatusStepper } from './StatusStepper';

// Bảng màu avatar — chọn theo id để mỗi công ty có 1 sắc riêng, sinh động (như mockup).
const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
];

interface ApplicationCardProps {
  application: ApplicationListItem;
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  const avatarColor = AVATAR_COLORS[application.id % AVATAR_COLORS.length];

  return (
    <Link
      to={`/applications/${application.id}`}
      className="block rounded-xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      {/* Đầu card: avatar + tên/vị trí + badge trạng thái */}
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-xl text-base font-bold uppercase',
            avatarColor,
          )}
        >
          {application.companyName.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-gray-900">{application.companyName}</h3>
          <p className="truncate text-sm text-gray-500">{application.position}</p>
        </div>
        <span className="shrink-0">
          <ApplicationStatusBadge status={application.status} />
        </span>
      </div>

      {/* Stepper tiến trình */}
      <div className="mt-5">
        <StatusStepper status={application.status} />
      </div>

      {/* Meta: địa điểm · hình thức · ngày nộp */}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-xs text-gray-500">
        {application.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {application.location}
          </span>
        )}
        {application.workType && (
          <span className="flex items-center gap-1">
            <Briefcase className="h-3.5 w-3.5" />
            {application.workType}
          </span>
        )}
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" />
          {application.appliedDate ?? 'Chưa nộp'}
        </span>
      </div>
    </Link>
  );
}
