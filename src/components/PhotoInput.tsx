import { useRef } from 'react';
import { Avatar } from './Avatar';

interface Props {
  value?: string;
  name: string;
  onChange: (dataUrl: string | undefined) => void;
}

async function compress(file: File, maxDim = 480, quality = 0.8): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

export function PhotoInput({ value, name, onChange }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  const pick = () => ref.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await compress(file);
      onChange(dataUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = () => onChange(String(reader.result));
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={pick}
        className="rounded-full ring-2 ring-neutral-200"
      >
        <Avatar name={name || '?'} src={value} size={64} />
      </button>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary" onClick={pick}>
          {value ? 'Change' : 'Add photo'}
        </button>
        {value && (
          <button
            type="button"
            className="btn-ghost text-red-600"
            onClick={() => onChange(undefined)}
          >
            Remove
          </button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleFile}
      />
    </div>
  );
}
