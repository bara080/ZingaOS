'use client';

import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Banner } from '../types/banner.types';
import { RowAction, RowActions } from '@/components/common/RowActions';

interface Props {
  banners: Banner[];
  isLoading?: boolean;
  onToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
  processingId?: string | null;
}

export function BannerTable({ banners, isLoading, onToggle, onDelete, processingId }: Props) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Banner</TableHead>
              <TableHead>Redirect</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Order</TableHead>
              <TableHead className="w-16 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-20 rounded-md" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-8" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <Skeleton className="h-10 w-10 rounded-md" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Banner</TableHead>
            <TableHead>Redirect</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Order</TableHead>
            <TableHead className="w-16 text-right" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {banners.map((banner) => {
            const actions: RowAction<Banner>[] = [
              {
                label: 'Edit',
                onClick: () => router.push(`/banners/${banner._id}`),
              },
              {
                label: banner.isActive ? 'Disable' : 'Enable',
                onClick: () => onToggle?.(banner._id!),
              },
              {
                label: 'Delete',
                onClick: () => onDelete?.(banner._id!),
                destructive: true,
                separatorBefore: true,
              },
            ];

            return (
              <TableRow key={banner._id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Image
                      src={banner.imageUrl}
                      alt={banner.title}
                      width={80}
                      height={48}
                      className="w-20 h-12 rounded-md object-cover border"
                    />

                    <div>
                      <p className="font-medium">{banner.title}</p>
                      <p className="text-xs text-muted-foreground">{banner.subtitle}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Audience:{' '}
                        {banner.audience === 'both' ? 'Customers + Providers' : banner.audience}
                      </p>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="text-sm space-y-1">
                    <p className="capitalize">{banner.buttonAction}</p>
                    {banner.buttonText ? (
                      <p className="text-[11px] text-primary">CTA: {banner.buttonText}</p>
                    ) : null}
                  </div>
                </TableCell>

                <TableCell>
                  <Badge variant={banner.isActive ? 'default' : 'secondary'}>
                    {banner.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>

                <TableCell>#{banner.sortOrder}</TableCell>

                <TableCell className="text-right">
                  {processingId === banner._id ? (
                    <div className="inline-flex justify-center items-center w-10 h-10">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    <RowActions item={banner} actions={actions} />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
