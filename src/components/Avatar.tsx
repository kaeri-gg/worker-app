interface AvatarProps {
  name: string;
  src?: string;
  size?: number;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({ name, src, size = 40 }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="rounded-full object-cover bg-neutral-100"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-brand-100 text-brand-800 flex items-center justify-center font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden="true"
    >
      {initials(name) || '?'}
    </div>
  );
}
