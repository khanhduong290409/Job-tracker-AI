import { Link } from 'react-router-dom';
import type { ApplicationListItem } from '../types';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';

interface ApplicationCardProps {
  application: ApplicationListItem;
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  // Gộp các field phụ có giá trị thành 1 dòng meta (bỏ field null).
  const meta = [application.source, application.location, application.workType]
    .filter(Boolean)// lọc bỏ các giá trị falsy ra khỏi mảng.
    .join(' · ');
/*
6 giá trị falsy trong JS 

false
0
''        // string rỗng
null
undefined
NaN
*/
  return (
    <Link
      to={`/applications/${application.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow"
    >
      <div className="flex items-start justify-between gap-4">

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-gray-900">{application.companyName}</h3>
            <span className="shrink-0">
              <ApplicationStatusBadge status={application.status} />
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-gray-700">{application.position}</p>
          {meta && <p className="mt-1 truncate text-xs text-gray-500">{meta}</p>}
        </div>

        <div className="shrink-0 text-right text-xs text-gray-400">
          {application.appliedDate ? `Nộp: ${application.appliedDate}` : 'Chưa nộp'}
        </div>

      </div>
    </Link>
  );
}
