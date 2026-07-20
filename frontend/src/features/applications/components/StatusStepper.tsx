import { Fragment } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApplicationStatus } from '@/types/common';

// 5 mốc chính của hành trình. Nhiều status phỏng vấn (phone/tech/onsite) gộp vào 1 mốc "PV".
const STEPS = ['Lưu', 'Nộp', 'PV', 'Offer', 'Nhận'] as const;

// status → đã đi tới mốc thứ mấy (index). -1 = đơn đã đóng (từ chối/rút): list không có
// status history nên KHÔNG biết rớt ở mốc nào → hiển thị mờ, xem timeline thật ở trang chi tiết.
const REACHED: Record<ApplicationStatus, number> = {
  SAVED: 0,
  APPLIED: 1,
  PHONE_SCREEN: 2,
  TECHNICAL_INTERVIEW: 2,
  ONSITE: 2,
  OFFER: 3,
  ACCEPTED: 4,
  REJECTED: -1,
  WITHDRAWN: -1,
};

interface StatusStepperProps {
  status: ApplicationStatus;
}

export function StatusStepper({ status }: StatusStepperProps) {
  const reached = REACHED[status];
  const closed = reached === -1;
  const rejected = status === 'REJECTED';

  return (
    <div className="flex items-center">
      {STEPS.map((label, i) => {
        const done = !closed && i < reached; // mốc đã qua
        const current = !closed && i === reached; // mốc đang đứng
        const active = done || current;

        return (
          <Fragment key={label}>
            {/* Đường nối giữa 2 mốc — tô màu nếu đã đi qua */}
            {i > 0 && (
              <span
                className={cn(
                  'h-0.5 flex-1',
                  !closed && i <= reached ? 'bg-primary' : 'bg-gray-200',
                )}
              />
            )}

            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  'grid h-5 w-5 place-items-center rounded-full border-2 text-[10px]',
                  current && 'border-primary bg-primary text-primary-foreground',
                  done && 'border-primary bg-primary text-primary-foreground',
                  !active && !closed && 'border-gray-300 bg-white',
                  closed && (rejected ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-100'),
                )}
              >
                {done && <Check className="h-3 w-3" />}
                {closed && i === 0 && rejected && <X className="h-3 w-3 text-red-500" />}
              </span>
              <span
                className={cn(
                  'text-[10px]',
                  active ? 'font-medium text-gray-700' : 'text-gray-400',
                )}
              >
                {label}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
