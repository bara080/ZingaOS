import Image from 'next/image';

const isLocalFile = (src?: string) => !src || src.startsWith('file://');

const radiusMap = {
  none: '',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  top: 'rounded-t-xl',
  bottom: 'rounded-b-xl',
  left: 'rounded-l-xl',
  right: 'rounded-r-xl',
} as const;

export function MediaImage({
  src,
  alt,
  fill = false,
  width,
  height,
  sizes,
  rounded = 'xl',
  className = '',
}: {
  src?: string;
  alt?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  rounded?: 'none' | 'md' | 'lg' | 'xl' | 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}) {
  const radius = radiusMap[rounded] ?? '';

  if (!isLocalFile(src)) {
    if (fill) {
      return (
        <Image
          src={src!}
          alt={alt || 'Media'}
          fill
          sizes={sizes}
          className={`object-cover ${radius} ${className}`}
        />
      );
    }

    return (
      <Image
        src={src!}
        alt={alt || 'Media'}
        width={width}
        height={height}
        className={`object-cover ${radius} ${className}`}
      />
    );
  }

  return (
    <div
      className={`bg-muted flex items-center justify-center text-muted-foreground ${radius} ${className}`}
      style={width && height ? { width, height } : undefined}
    >
      <span className="text-xs">No image</span>
    </div>
  );
}
