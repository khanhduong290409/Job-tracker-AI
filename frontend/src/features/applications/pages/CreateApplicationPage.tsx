import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
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
import { useToast } from '@/components/ui/toast';
import { useExtractJd } from '@/features/ai/api/queries';
import { useCvList } from '@/features/cv/api/queries';
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
  cvVersionId: z.string(), // id CV dạng string (value của select); '' = không gắn
});

type FormValues = z.infer<typeof schema>;
//z.infer<typeof schame> dùng để tạo type tự động thay vì viết thủ công như này 
/*
type FormValues = {
  name: string;
  age: number;
  email: stringz;
};
tóm lại: để tạo type tự động thì cần dùng z.infer<> nhưng <> chỉ nhận type chứ không nhận value nên typeof schema
để chuyển schema thành type
*/

const inputClass =
  'block w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

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
  const toast = useToast();
  const { mutate: createApplication, isPending, error } = useCreateApplication();
  const { mutate: extractJd, isPending: isExtracting, error: extractError } = useExtractJd();

  // Hôm nay (giờ local) dạng YYYY-MM-DD — chặn chọn ngày nộp ở tương lai (khớp @PastOrPresent backend)
  const today = new Date().toLocaleDateString('en-CA');

  const {
  register,        // Đăng ký input vào form (bên dưới có giải thích)
  handleSubmit,    // Xử lý submit form
  setValue,        // Gán giá trị field bằng code (dùng cho auto-fill từ AI)
  reset,           // Đưa form về defaultValues (dọn form sau khi tạo xong)
  getValues,       // Đọc giá trị field hiện tại (lấy jdContent gửi cho AI)
  watch,           // Theo dõi field để re-render (bật/tắt nút theo độ dài JD)
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
      cvVersionId: '',
    },
  });

  const { data: cvList } = useCvList();

  const jdValue = watch('jdContent');

  // Gán field nếu AI trả giá trị (không clobber bằng null/'' → giữ thứ user đã nhập).
  //vì sao đoạn này lại dùng keyofFormValues? 
  //tại vì dòng setValue nó đòi hỏi key phải thuộc keyof FormValues.
  //nếu ta khai báo field: string rồi truyền vào setValue, typescript sẽ báo lỗi:
  //"string không gán được cho keyof"
  //tại sao ta dùng field: FormValues mà lại là keyof FormValues?
  //field: keyof FormValues thì field ở đây là tên của 1 biến , còn nếu dùng type: FormValues thì field ở đây là 1 type
  //tóm lại: field ở đây nghĩa là tên field của 1 trong các value field của FormValues
  //ví dụ FormValues có companyName, position thì field sẽ là companyName hoặc là posion 
  function setIf(field: keyof FormValues, value: string | null) {
    if (value != null && value.trim() !== '') {
      setValue(field, value.trim(), { shouldValidate: true });
    }//shouldValidate:  bật validate lại field ngay sau khi set.
  }

  function handleExtract() {
    const jd = getValues('jdContent').trim();
    if (jd.length < 10) return;
    extractJd(
      { jdContent: jd },
      {
        onSuccess: (insight) => {
          setIf('companyName', insight.companyName);
          setIf('companyDomain', insight.companyDomain);
          setIf('position', insight.position);
          setIf('location', insight.location);
          // Field số của form giữ dạng string (input type="number") → convert trước khi set.
          setIf('salaryMin', insight.salaryMin != null ? String(insight.salaryMin) : null);
          setIf('salaryMax', insight.salaryMax != null ? String(insight.salaryMax) : null);
          setIf('salaryCurrency', insight.salaryCurrency);
          setIf('sourceDetail', insight.sourceDetail);
          // Field enum: chỉ điền nếu AI trả đúng giá trị hợp lệ (option select), tránh chọn rác.
          // bên dưới có giải thích readonly
          if (insight.workType && (WORK_TYPES as readonly string[]).includes(insight.workType)) {
            setValue('workType', insight.workType, { shouldValidate: true });
          }
          if (
            insight.employmentType &&
            (EMPLOYMENT_TYPES as readonly string[]).includes(insight.employmentType)
          ) {
            setValue('employmentType', insight.employmentType, { shouldValidate: true });
          }
        },
      },
    );
  }

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
      cvVersionId: numOrUndef(values.cvVersionId),
    };

    createApplication(body, {
      onSuccess: () => {
        toast.success('Đã tạo đơn ứng tuyển');
        navigate("/applications");
        // Ở lại trang (không navigate) → phải dọn form, không thì bấm Tạo
        // lần nữa với data cũ còn nguyên là ra đơn trùng.
        reset();
      },
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <Link
        to="/applications"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900">Tạo đơn ứng tuyển</h1>
      <p className="mt-0.5 text-sm text-gray-500">Dán JD rồi để AI tự điền, hoặc nhập tay.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
        {/* ── Card 1: Thông tin cơ bản + JD + CV ── */}
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Thông tin cơ bản</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tên công ty *" error={errors.companyName?.message}>
                <input className={inputClass} {...register('companyName')} />
              </Field>
              <Field label="Vị trí *" error={errors.position?.message}>
                <input className={inputClass} {...register('position')} />
              </Field>
            </div>

            <Field label="Nội dung JD *" error={errors.jdContent?.message}>
              <textarea rows={6} className={inputClass} {...register('jdContent')} />
            </Field>

            {/* AI auto-fill: trích JD → điền công ty/vị trí/địa điểm/hình thức/loại hình */}
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExtract}
                disabled={isExtracting || jdValue.trim().length < 10}
              >
                {isExtracting ? (
                  'Đang phân tích...'
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Phân tích JD & tự điền
                  </>
                )}
              </Button>
              {extractError ? (
                <p className="mt-1 text-xs text-red-600">{getErrorMessage(extractError)}</p>
              ) : (
                <p className="mt-1 text-xs text-gray-400">
                  AI tự điền công ty, vị trí, địa điểm, hình thức, loại hình từ JD.
                </p>
              )}
            </div>

            <Field label="CV ứng tuyển" error={errors.cvVersionId?.message}>
              <select className={inputClass} {...register('cvVersionId')}>
                <option value="">-- Không gắn CV --</option>
                {(cvList ?? []).map((cv) => (
                  <option key={cv.id} value={cv.id}>
                    {cv.label}
                    {cv.parseStatus === 'COMPLETED' ? '' : ' (chưa parse xong)'}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">Gắn CV để dùng tính năng phân tích độ khớp CV–JD.</p>
            </Field>
          </div>
        </section>

        {/* ── Card 2: Chi tiết đơn ── */}
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Chi tiết đơn</h2>

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

          <div className="mt-4">
            <Field label="Ghi chú" error={errors.notes?.message}>
              <textarea rows={3} className={inputClass} {...register('notes')} />
            </Field>
          </div>
        </section>

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


  //vì sao đoạn này lại dùng keyofFormValues? 
  //tại vì dòng setValue nó đòi hỏi key phải thuộc keyof FormValues.
  //nếu ta khai báo field: string rồi truyền vào setValue, typescript sẽ báo lỗi:
  //"string không gán được cho keyof"
  //tại sao ta dùng field: FormValues mà lại là keyof FormValues?
  //field: keyof FormValues thì field ở đây là tên của 1 biến , còn nếu dùng type: FormValues thì field ở đây là 1 type


  //WORK_TYPES khai báo với as const → TypeScript coi nó là mảng siêu hẹp (chỉ đúng 3 giá trị 'ONSITE' | 'HYBRID' | 'REMOTE'), và readonly.
  //Nên WORK_TYPES.includes(insight.workType) bị lỗi: insight.workType là string bất kỳ, không khớp 3 giá trị hẹp đó.
  //Cast as readonly string[] = nói với TS "coi đây là mảng string thường (vẫn chỉ đọc)" → .includes(string) mới chạy được.