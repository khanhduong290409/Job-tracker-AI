import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useUploadCv } from '../api/queries';

export function UploadCvForm() {
  const [label, setLabel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  // useRef để reset giá trị visual của <input type="file"> sau khi submit thành công.
  // setFile(null) chỉ reset state React, không reset DOM input — cần ref.value = ''.
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: uploadCv, isPending } = useUploadCv();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !label.trim()) return;

    uploadCv(
      { file, label: label.trim() },
      {
        onSuccess: () => {
          setLabel('');
          setFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Tải lên CV</h2>

      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="cv-label" className="block text-sm font-medium text-gray-700">
            Tên CV
          </label>
          <input
            id="cv-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="VD: CV intern fresher 2025"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="cv-file" className="block text-sm font-medium text-gray-700">
            File PDF
          </label>
          <input
            id="cv-file"
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
      </div>

      <div className="mt-4">
        <Button type="submit" disabled={!file || !label.trim() || isPending}>
          {isPending ? 'Đang tải lên...' : 'Tải lên'}
        </Button>
      </div>
    </form>
  );
}
