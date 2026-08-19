import { StoreService } from '@/lib/types';
import { MediaImage } from '@/components/common/MediaImage';
import {
  ServiceTitle,
  ServiceCategory,
  ServiceDescription,
  ServicePrice,
  ServiceDuration,
  ServiceInHome,
} from '@/components/service-fields';

export function ServiceCard({ service }: { service: StoreService }) {
  return (
    <div className="group rounded-xl border bg-card hover:shadow-md transition-shadow overflow-hidden">
      <div className="relative w-full h-52 bg-muted">
        <MediaImage
          src={service.servicePhoto}
          alt={service.serviceTitle}
          fill
          rounded="top"
          className="group-hover:scale-105 transition-transform"
          sizes="
            (max-width: 640px) 100vw,
            (max-width: 1280px) 50vw,
            (max-width: 1536px) 33vw,
            25vw
          "
        />
        <div className="absolute top-3 left-3">
          <ServiceCategory value={service.serviceCategory} />
        </div>
      </div>

      <div className="p-4 space-y-2">
        <ServiceTitle value={service.serviceTitle} />
        <ServiceDescription value={service.serviceDescription} />

        <div className="pt-2 text-sm space-y-1">
          <ServicePrice value={service.inStorePrice} />
          <ServiceDuration value={service.duration} />
          <ServiceInHome offered={service.inHomeServiceOffered} price={service.inHomePrice} />
        </div>
      </div>
    </div>
  );
}
