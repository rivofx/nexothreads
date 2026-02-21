import Image from 'next/image';

interface AvatarProps {
  src: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
}

export default function Avatar({ src, name, size = 40, className = '' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  const colors = [
    'bg-orange-700',
    'bg-amber-700',
    'bg-rose-700',
    'bg-teal-700',
    'bg-indigo-700',
    'bg-violet-700',
  ];
  const colorIndex = name.charCodeAt(0) % colors.length;

  return (
    <div
      className={`${colors[colorIndex]} rounded-full flex items-center justify-center flex-shrink-0 text-white font-medium ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
