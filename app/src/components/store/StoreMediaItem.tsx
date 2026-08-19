import { StoreMedia } from '@/lib/types';
import { MediaImage } from '@/components/common/MediaImage';
import { ServiceDescription } from '../service-fields';

export function StoreMediaItem({ media }: { media: StoreMedia }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="relative w-full aspect-video bg-muted">
        {media.type === 'video' ? (
          <video src={media.url} controls className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <MediaImage
            src={media.url}
            alt={media.title}
            fill
            rounded="none"
            sizes="
              (max-width: 640px) 100vw,
              (max-width: 1280px) 50vw,
              (max-width: 1536px) 33vw,
              25vw
            "
          />
        )}
      </div>

      {(media.title || media.description) && (
        <div className="p-2 space-y-0.5">
          {media.title && <p className="text-sm font-medium">{media.title}</p>}
          {media.description && <ServiceDescription value={media.description} />}
        </div>
      )}
    </div>
  );
}
