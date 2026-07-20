import { isAxiosError } from 'axios';
import { useFieldArray, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import type { CvParsedData } from '../types';

// ── Form model: toàn string + list dạng textarea (mỗi dòng 1 mục) ─────────────
// Input HTML cần string (không null), và list edit bằng textarea cho gọn → form model
// khác CvParsedData. Map qua lại bằng toForm() / toParsed().

interface PersonalInfoForm {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  github: string;
  linkedin: string;
  portfolio: string;
}
interface EducationForm {
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate: string;
  gpa: string;
  achievements: string; // mỗi dòng 1 mục
}
interface ExperienceForm {
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
  technologies: string;
  achievements: string;
}
interface SkillGroupForm {
  category: string;
  items: string;
}
interface ProjectForm {
  name: string;
  description: string;
  technologies: string;
  role: string;
  link: string;
}
interface CertificationForm {
  name: string;
  issuer: string;
  date: string;
}
interface LanguageForm {
  language: string;
  level: string;
}
interface CvParsedDataForm {
  personalInfo: PersonalInfoForm;
  summary: string;
  education: EducationForm[];
  experience: ExperienceForm[];
  skills: SkillGroupForm[];
  projects: ProjectForm[];
  certifications: CertificationForm[];
  languages: LanguageForm[];
}

// ── Mappers ───────────────────────────────────────────────────────────────────
const str = (s: string | null | undefined): string => s ?? '';// khai báo nhận cả null và undefined bởi vì nếu chỉ nếu viết (s: string )
//thì hàm này sẽ chỉ nhận string trong khi hàm này có thể null và undefined nên ta khai báo thêm cả null và undefined luôn
const joinLines = (arr: string[] | null | undefined): string => (arr ?? []).join('\n');// cái này để liệt kê skill nên phải xuống dòng
const splitLines = (s: string): string[] =>
  s.split('\n').map((x) => x.trim()).filter((x) => x !== '');
// '' → null khi lưu (giữ DB sạch, nhất quán với output AI dùng null cho field trống)
const orNull = (s: string): string | null => (s.trim() === '' ? null : s.trim());

function toForm(d: CvParsedData | null): CvParsedDataForm {
  return {
    personalInfo: {
      fullName: str(d?.personalInfo?.fullName),
      email: str(d?.personalInfo?.email),
      phone: str(d?.personalInfo?.phone),
      address: str(d?.personalInfo?.address),
      github: str(d?.personalInfo?.links?.github),
      linkedin: str(d?.personalInfo?.links?.linkedin),
      portfolio: str(d?.personalInfo?.links?.portfolio),
    },
    summary: str(d?.summary),
    education: (d?.education ?? []).map((e) => ({
      school: str(e.school),
      degree: str(e.degree),
      major: str(e.major),
      startDate: str(e.startDate),
      endDate: str(e.endDate),
      gpa: str(e.gpa),
      achievements: joinLines(e.achievements),
    })),
    experience: (d?.experience ?? []).map((e) => ({
      company: str(e.company),
      position: str(e.position),
      location: str(e.location),
      startDate: str(e.startDate),
      endDate: str(e.endDate),
      description: str(e.description),
      technologies: joinLines(e.technologies),
      achievements: joinLines(e.achievements),
    })),
    skills: (d?.skills ?? []).map((s) => ({
      category: str(s.category),
      items: joinLines(s.items),
    })),
    projects: (d?.projects ?? []).map((p) => ({
      name: str(p.name),
      description: str(p.description),
      technologies: joinLines(p.technologies),
      role: str(p.role),
      link: str(p.link),
    })),
    certifications: (d?.certifications ?? []).map((c) => ({
      name: str(c.name),
      issuer: str(c.issuer),
      date: str(c.date),
    })),
    languages: (d?.languages ?? []).map((l) => ({
      language: str(l.language),
      level: str(l.level),
    })),
  };
}

function toParsed(f: CvParsedDataForm): CvParsedData {
  return {
    personalInfo: {
      fullName: orNull(f.personalInfo.fullName),
      email: orNull(f.personalInfo.email),
      phone: orNull(f.personalInfo.phone),
      address: orNull(f.personalInfo.address),
      links: {
        github: orNull(f.personalInfo.github),
        linkedin: orNull(f.personalInfo.linkedin),
        portfolio: orNull(f.personalInfo.portfolio),
      },
    },
    summary: orNull(f.summary),
    education: f.education.map((e) => ({
      school: orNull(e.school),
      degree: orNull(e.degree),
      major: orNull(e.major),
      startDate: orNull(e.startDate),
      endDate: orNull(e.endDate),
      gpa: orNull(e.gpa),
      achievements: splitLines(e.achievements),
    })),
    experience: f.experience.map((e) => ({
      company: orNull(e.company),
      position: orNull(e.position),
      location: orNull(e.location),
      startDate: orNull(e.startDate),
      endDate: orNull(e.endDate),
      description: orNull(e.description),
      technologies: splitLines(e.technologies),
      achievements: splitLines(e.achievements),
    })),
    skills: f.skills.map((s) => ({
      category: orNull(s.category),
      items: splitLines(s.items),
    })),
    projects: f.projects.map((p) => ({
      name: orNull(p.name),
      description: orNull(p.description),
      technologies: splitLines(p.technologies),
      role: orNull(p.role),
      link: orNull(p.link),
    })),
    certifications: f.certifications.map((c) => ({
      name: orNull(c.name),
      issuer: orNull(c.issuer),
      date: orNull(c.date),
    })),
    languages: f.languages.map((l) => ({
      language: orNull(l.language),
      level: orNull(l.level),
    })),
  };
}

// Item rỗng khi bấm "+ Thêm"
const EMPTY_EDU: EducationForm = { school: '', degree: '', major: '', startDate: '', endDate: '', gpa: '', achievements: '' };
const EMPTY_EXP: ExperienceForm = { company: '', position: '', location: '', startDate: '', endDate: '', description: '', technologies: '', achievements: '' };
const EMPTY_SKILL: SkillGroupForm = { category: '', items: '' };
const EMPTY_PROJECT: ProjectForm = { name: '', description: '', technologies: '', role: '', link: '' };
const EMPTY_CERT: CertificationForm = { name: '', issuer: '', date: '' };
const EMPTY_LANG: LanguageForm = { language: '', level: '' };

const inputClass =
  'block w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

// Helper nội bộ (không export → không vỡ fast-refresh)
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function getErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    return err.response?.data?.error?.message ?? 'Lưu thất bại, thử lại sau.';
  }
  return 'Lưu thất bại, thử lại sau.';
}

interface Props {
  parsedData: CvParsedData | null;
  onSave: (data: CvParsedData) => void;
  isSaving: boolean;
  saveError?: unknown;
}

export function CvParsedDataEditor({ parsedData, onSave, isSaving, saveError }: Props) {
  const { register, control, handleSubmit } = useForm<CvParsedDataForm>({
    defaultValues: toForm(parsedData),
  });

  const eduArr = useFieldArray({ control, name: 'education' });
  const expArr = useFieldArray({ control, name: 'experience' });
  const skillArr = useFieldArray({ control, name: 'skills' });
  const projArr = useFieldArray({ control, name: 'projects' });
  const certArr = useFieldArray({ control, name: 'certifications' });
  const langArr = useFieldArray({ control, name: 'languages' });

  function onSubmit(values: CvParsedDataForm) {
    onSave(toParsed(values));
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Thông tin cá nhân */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Thông tin cá nhân</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Họ tên"><input className={inputClass} {...register('personalInfo.fullName')} /></Field>
          <Field label="Email"><input className={inputClass} {...register('personalInfo.email')} /></Field>
          <Field label="SĐT"><input className={inputClass} {...register('personalInfo.phone')} /></Field>
          <Field label="Địa chỉ"><input className={inputClass} {...register('personalInfo.address')} /></Field>
          <Field label="GitHub"><input className={inputClass} {...register('personalInfo.github')} /></Field>
          <Field label="LinkedIn"><input className={inputClass} {...register('personalInfo.linkedin')} /></Field>
          <Field label="Portfolio"><input className={inputClass} {...register('personalInfo.portfolio')} /></Field>
        </div>
      </section>

      {/* Tóm tắt */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Tóm tắt</h3>
        <textarea rows={3} className={inputClass} {...register('summary')} />
      </section>

      {/* Kinh nghiệm */}
      <section className="space-y-3">
        <SectionHeader title="Kinh nghiệm" onAdd={() => expArr.append(EMPTY_EXP)} />
        {expArr.fields.map((field, i) => (
          <ItemCard key={field.id} onRemove={() => expArr.remove(i)}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Công ty"><input className={inputClass} {...register(`experience.${i}.company`)} /></Field>
              <Field label="Vị trí"><input className={inputClass} {...register(`experience.${i}.position`)} /></Field>
              <Field label="Địa điểm"><input className={inputClass} {...register(`experience.${i}.location`)} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Từ (YYYY-MM)"><input className={inputClass} {...register(`experience.${i}.startDate`)} /></Field>
                <Field label="Đến"><input className={inputClass} {...register(`experience.${i}.endDate`)} /></Field>
              </div>
            </div>
            <Field label="Mô tả"><textarea rows={2} className={inputClass} {...register(`experience.${i}.description`)} /></Field>
            <Field label="Công nghệ (mỗi dòng 1 mục)"><textarea rows={2} className={inputClass} {...register(`experience.${i}.technologies`)} /></Field>
            <Field label="Thành tích (mỗi dòng 1 mục)"><textarea rows={2} className={inputClass} {...register(`experience.${i}.achievements`)} /></Field>
          </ItemCard>
        ))}
      </section>

      {/* Học vấn */}
      <section className="space-y-3">
        <SectionHeader title="Học vấn" onAdd={() => eduArr.append(EMPTY_EDU)} />
        {eduArr.fields.map((field, i) => (
          <ItemCard key={field.id} onRemove={() => eduArr.remove(i)}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Trường"><input className={inputClass} {...register(`education.${i}.school`)} /></Field>
              <Field label="Bằng cấp"><input className={inputClass} {...register(`education.${i}.degree`)} /></Field>
              <Field label="Chuyên ngành"><input className={inputClass} {...register(`education.${i}.major`)} /></Field>
              <Field label="GPA"><input className={inputClass} {...register(`education.${i}.gpa`)} /></Field>
              <Field label="Từ (YYYY-MM)"><input className={inputClass} {...register(`education.${i}.startDate`)} /></Field>
              <Field label="Đến"><input className={inputClass} {...register(`education.${i}.endDate`)} /></Field>
            </div>
            <Field label="Thành tích (mỗi dòng 1 mục)"><textarea rows={2} className={inputClass} {...register(`education.${i}.achievements`)} /></Field>
          </ItemCard>
        ))}
      </section>

      {/* Kỹ năng */}
      <section className="space-y-3">
        <SectionHeader title="Kỹ năng" onAdd={() => skillArr.append(EMPTY_SKILL)} />
        {skillArr.fields.map((field, i) => (
          <ItemCard key={field.id} onRemove={() => skillArr.remove(i)}>
            <Field label="Nhóm (vd: Programming Languages)"><input className={inputClass} {...register(`skills.${i}.category`)} /></Field>
            <Field label="Mục (mỗi dòng 1 mục)"><textarea rows={2} className={inputClass} {...register(`skills.${i}.items`)} /></Field>
          </ItemCard>
        ))}
      </section>

      {/* Dự án */}
      <section className="space-y-3">
        <SectionHeader title="Dự án" onAdd={() => projArr.append(EMPTY_PROJECT)} />
        {projArr.fields.map((field, i) => (
          <ItemCard key={field.id} onRemove={() => projArr.remove(i)}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Tên"><input className={inputClass} {...register(`projects.${i}.name`)} /></Field>
              <Field label="Vai trò"><input className={inputClass} {...register(`projects.${i}.role`)} /></Field>
              <Field label="Link"><input className={inputClass} {...register(`projects.${i}.link`)} /></Field>
            </div>
            <Field label="Mô tả"><textarea rows={2} className={inputClass} {...register(`projects.${i}.description`)} /></Field>
            <Field label="Công nghệ (mỗi dòng 1 mục)"><textarea rows={2} className={inputClass} {...register(`projects.${i}.technologies`)} /></Field>
          </ItemCard>
        ))}
      </section>

      {/* Chứng chỉ */}
      <section className="space-y-3">
        <SectionHeader title="Chứng chỉ" onAdd={() => certArr.append(EMPTY_CERT)} />
        {certArr.fields.map((field, i) => (
          <ItemCard key={field.id} onRemove={() => certArr.remove(i)}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Tên"><input className={inputClass} {...register(`certifications.${i}.name`)} /></Field>
              <Field label="Nơi cấp"><input className={inputClass} {...register(`certifications.${i}.issuer`)} /></Field>
              <Field label="Ngày (YYYY-MM)"><input className={inputClass} {...register(`certifications.${i}.date`)} /></Field>
            </div>
          </ItemCard>
        ))}
      </section>

      {/* Ngôn ngữ */}
      <section className="space-y-3">
        <SectionHeader title="Ngôn ngữ" onAdd={() => langArr.append(EMPTY_LANG)} />
        {langArr.fields.map((field, i) => (
          <ItemCard key={field.id} onRemove={() => langArr.remove(i)}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Ngôn ngữ"><input className={inputClass} {...register(`languages.${i}.language`)} /></Field>
              <Field label="Trình độ"><input className={inputClass} {...register(`languages.${i}.level`)} /></Field>
            </div>
          </ItemCard>
        ))}
      </section>

      {saveError ? <p className="text-sm text-red-600">{getErrorMessage(saveError)}</p> : null}

      <div className="sticky bottom-0 -mx-1 border-t border-gray-200 bg-white py-3">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </div>
    </form>
  );
}

// ── Sub-components dùng chung cho mọi section mảng ─────────────────────────────
function SectionHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <Button type="button" variant="outline" size="sm" onClick={onAdd}>
        + Thêm
      </Button>
    </div>
  );
}

function ItemCard({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="space-y-3 rounded-md border border-gray-200 p-3">
      {children}
      <div className="flex justify-end">
        <button type="button" onClick={onRemove} className="text-xs text-red-600 hover:underline">
          Xóa mục này
        </button>
      </div>
    </div>
  );
}
