import Image from 'next/image';

const isLocalFile = (src?: string) => !src || src.startsWith('file://');

const getInitials = (name?: string) => {
  if (!name) return '?';

  return (
    name
      .trim()
      .split(/\s+/) // handles multiple spaces
      .filter(Boolean) // removes empty strings
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join('') || '?'
  );
};

const getInitialFontSize = (size: number) => {
  if (size <= 32) return 'text-xs';
  if (size <= 40) return 'text-sm';
  if (size <= 64) return 'text-base';
  if (size <= 96) return 'text-lg';
  if (size <= 128) return 'text-xl';
  return 'text-3xl'; // for 160+
};

export function Avatar({
  src,
  name,
  size = 32,
  rounded = 'full',
}: {
  src?: string;
  name?: string;
  size?: number;
  rounded?: 'full' | 'md' | 'lg';
}) {
  const fontSize = getInitialFontSize(size);

  if (!isLocalFile(src)) {
    return (
      <Image
        src={src!}
        alt={name || 'Avatar'}
        width={size}
        height={size}
        className={`object-cover aspect-square ${
          rounded === 'full' ? 'rounded-full' : rounded === 'lg' ? 'rounded-lg' : 'rounded-md'
        }`}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`bg-muted flex items-center justify-center font-semibold aspect-square ${
        rounded === 'full' ? 'rounded-full' : rounded === 'lg' ? 'rounded-lg' : 'rounded-md'
      } ${fontSize}`}
    >
      {getInitials(name)}
    </div>
  );
}
