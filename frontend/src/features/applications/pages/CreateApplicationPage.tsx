import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  APPLICATION_SOURCES,
  APPLICATION_STATUSES,
  EMPLOYMENT_TYPES,
  WORK_TYPES,
  type ApplicationSource,
  type ApplicationStatus,
  type EmploymentType,
  type WorkType,
} from '@/types/common';
import { useCreateApplication } from '../api/queries';
import { APPLICATION_STATUS_CONFIG } from '../status-meta';
import type { CreateApplicationRequest } from '../types';

// Các select chỉ sinh ra giá trị hợp lệ → zod chỉ cần validate required + độ dài;
// kiểu enum để select ràng buộc, cast lại lúc submit.
const schema = z.object({
  companyName: z.string().trim().min(1, 'Vui lòng nhập tên công ty').max(255),
  position: z.string().trim().min(1, 'Vui lòng nhập vị trí').max(255),
  jdContent: z.string().trim().min(10, 'JD tối thiểu 10 ký tự').max(50000),
  source: z.string().min(1, 'Vui lòng chọn nguồn'),
  status: z.string().min(1),
  companyDomain: z.string().trim().max(255),
  location: z.string().trim().max(255),
  workType: z.string(),
  employmentType: z.string(),
  jdUrl: z.string().trim().max(500),
  salaryMin: z.string(),
  salaryMax: z.string(),
  salaryCurrency: z.string().trim().max(10),
  sourceDetail: z.string().trim().max(255),
  appliedDate: z.string(),
  notes: z.string().trim().max(10000),
});

type FormValues = z.infer<typeof schema>;
//z.infer<typeof schame> dùng để tạo type tự động thay vì viết thủ công như này 
/*
type FormValues = {
  name: string;
  age: number;
  email: string;
};
tóm lại: để tạo type tự động thì cần dùng z.infer<> nhưng <> chỉ nhận type chứ không nhận value nên typeof schema
để chuyển schema thành type
*/

const inputClass =
  'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

// Helper component nội bộ (không export → không vỡ fast-refresh)
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const emptyToUndef = (s: string) => (s.trim() === '' ? undefined : s.trim());
const numOrUndef = (s: string) => (s.trim() === '' ? undefined : Number(s));

function getErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    return err.response?.data?.error?.message ?? 'Có lỗi xảy ra, thử lại sau.';
  }
  return 'Có lỗi xảy ra, thử lại sau.';
}

export function CreateApplicationPage() {
  const navigate = useNavigate();
  const { mutate: createApplication, isPending, error } = useCreateApplication();

  // Hôm nay (giờ local) dạng YYYY-MM-DD — chặn chọn ngày nộp ở tương lai (khớp @PastOrPresent backend)
  const today = new Date().toLocaleDateString('en-CA');

  const {
  register,        // Đăng ký input vào form (bên dưới có giải thích)
  handleSubmit,    // Xử lý submit form
  formState: { errors },  // Lấy ra object errors từ formState -> hiển thị lỗi cho user
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: '',
      position: '',
      jdContent: '',
      source: '',
      status: 'SAVED',
      companyDomain: '',
      location: '',
      workType: '',
      employmentType: '',
      jdUrl: '',
      salaryMin: '',
      salaryMax: '',
      salaryCurrency: '',
      sourceDetail: '',
      appliedDate: '',
      notes: '',
    },
  });

  function onSubmit(values: FormValues) {
    const body: CreateApplicationRequest = {
      companyName: values.companyName.trim(),
      position: values.position.trim(),
      jdContent: values.jdContent.trim(),
      source: values.source as ApplicationSource,
      status: values.status as ApplicationStatus,
      companyDomain: emptyToUndef(values.companyDomain),
      location: emptyToUndef(values.location),
      workType: (values.workType || undefined) as WorkType | undefined,
      employmentType: (values.employmentType || undefined) as EmploymentType | undefined,
      jdUrl: emptyToUndef(values.jdUrl),
      salaryMin: numOrUndef(values.salaryMin),
      salaryMax: numOrUndef(values.salaryMax),
      salaryCurrency: emptyToUndef(values.salaryCurrency),
      sourceDetail: emptyToUndef(values.sourceDetail),
      appliedDate: emptyToUndef(values.appliedDate),
      notes: emptyToUndef(values.notes),
    };

    createApplication(body, {
      onSuccess: (created) => navigate(`/applications/${created.id}`),
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link to="/applications" className="text-sm text-blue-600 hover:underline">
        ← Quay lại danh sách
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">Tạo đơn ứng tuyển</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <Field label="Tên công ty *" error={errors.companyName?.message}>
          <input className={inputClass} {...register('companyName')} />
        </Field>

        <Field label="Vị trí *" error={errors.position?.message}>
          <input className={inputClass} {...register('position')} />
        </Field>

        <Field label="Nội dung JD *" error={errors.jdContent?.message}>
          <textarea rows={5} className={inputClass} {...register('jdContent')} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nguồn *" error={errors.source?.message}>
            <select className={inputClass} {...register('source')}>
              <option value="">-- Chọn nguồn --</option>
              {APPLICATION_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Trạng thái" error={errors.status?.message}>
            <select className={inputClass} {...register('status')}>
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {APPLICATION_STATUS_CONFIG[s].label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Địa điểm" error={errors.location?.message}>
            <input className={inputClass} {...register('location')} />
          </Field>

          <Field label="Domain công ty" error={errors.companyDomain?.message}>
            <input className={inputClass} placeholder="vd: techcorp.com" {...register('companyDomain')} />
          </Field>

          <Field label="Hình thức làm việc" error={errors.workType?.message}>
            <select className={inputClass} {...register('workType')}>
              <option value="">-- Không rõ --</option>
              {WORK_TYPES.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Loại hình" error={errors.employmentType?.message}>
            <select className={inputClass} {...register('employmentType')}>
              <option value="">-- Không rõ --</option>
              {EMPLOYMENT_TYPES.map((et) => (
                <option key={et} value={et}>
                  {et}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Lương tối thiểu" error={errors.salaryMin?.message}>
            <input type="number" min={0} className={inputClass} {...register('salaryMin')} />
          </Field>

          <Field label="Lương tối đa" error={errors.salaryMax?.message}>
            <input type="number" min={0} className={inputClass} {...register('salaryMax')} />
          </Field>

          <Field label="Đơn vị tiền" error={errors.salaryCurrency?.message}>
            <input className={inputClass} placeholder="VND / USD" {...register('salaryCurrency')} />
          </Field>

          <Field label="Ngày nộp" error={errors.appliedDate?.message}>
            <input type="date" max={today} className={inputClass} {...register('appliedDate')} />
          </Field>

          <Field label="Link JD" error={errors.jdUrl?.message}>
            <input className={inputClass} placeholder="https://..." {...register('jdUrl')} />
          </Field>

          <Field label="Chi tiết nguồn" error={errors.sourceDetail?.message}>
            <input className={inputClass} placeholder="vd: tên người giới thiệu" {...register('sourceDetail')} />
          </Field>
        </div>

        <Field label="Ghi chú" error={errors.notes?.message}>
          <textarea rows={3} className={inputClass} {...register('notes')} />
        </Field>

        {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Đang tạo...' : 'Tạo đơn'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/applications')}>
            Hủy
          </Button>
        </div>
      </form>
    </div>
  );
}
// handleSubmit(onSubmit) chạy
// → zodResolver validate → hợp lệ → gọi onSubmit(data)
// → onSubmit gọi createApplication(request)
// → mutationFn gọi API: POST /applications
// → API trả về 400/500
// → Axios throw AxiosError
// → React Query bắt lỗi → set error = AxiosError


