import { Avatar } from '@/components/common/Avatar';

type AvatarCellProps = {
  name?: string;
  avatar?: string;
  subtitle?: string;
  size?: number;
  rounded?: 'full' | 'md' | 'lg';
};

export function AvatarCell({
  name,
  avatar,
  subtitle,
  size = 40,
  rounded = 'full',
}: AvatarCellProps) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar src={avatar} name={name || 'Unknown'} size={size} rounded={rounded} />

      <div className="min-w-0">
        <div className="font-medium truncate">{name || 'Unknown'}</div>
        {subtitle && (
          <div className="text-xs text-muted-foreground truncate max-w-[200px]">{subtitle}</div>
        )}
      </div>
    </div>
  );
}
