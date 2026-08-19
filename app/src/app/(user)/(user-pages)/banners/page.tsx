'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Banner } from '@/features/content/types/banner.types';
import { BannerService } from '@/features/content/api/banner.service';
import { BannerTable } from '@/features/content/components/banner-table';

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [bannerToDelete, setBannerToDelete] = useState<string | null>(null);

  const loadBanners = async () => {
    setLoading(true);
    const data = await BannerService.getBanners();
    setBanners(data);
    setLoading(false);
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const customerBanners = useMemo(
    () => banners.filter((b) => b.audience === 'customer'),
    [banners],
  );

  const providerBanners = useMemo(
    () => banners.filter((b) => b.audience === 'service-provider'),
    [banners],
  );

  const bothBanners = useMemo(() => banners.filter((b) => b.audience === 'both'), [banners]);

  const handleToggle = async (id: string) => {
    setProcessingId(id);
    try {
      await BannerService.toggleBanner(id);
      await loadBanners();
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = (id: string) => {
    setBannerToDelete(id);
  };

  const confirmDelete = async () => {
    if (!bannerToDelete) return;

    const idToDelete = bannerToDelete;
    setProcessingId(idToDelete);
    setBannerToDelete(null);

    try {
      await BannerService.deleteBanner(idToDelete);
      await loadBanners();
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="py-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Home Banners</h1>
          <p className="text-sm text-muted-foreground">
            Manage home screen banners for customers, providers, or both.
          </p>
        </div>

        <Link href="/banners/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Banner
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="customer" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="customer">Customer</TabsTrigger>
          <TabsTrigger value="service-provider">Service Provider</TabsTrigger>
          <TabsTrigger value="both">Both</TabsTrigger>
        </TabsList>

        <TabsContent value="customer" className="mt-4">
          <BannerTable
            banners={customerBanners}
            isLoading={loading}
            processingId={processingId}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="service-provider" className="mt-4">
          <BannerTable
            banners={providerBanners}
            isLoading={loading}
            processingId={processingId}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="both" className="mt-4">
          <BannerTable
            banners={bothBanners}
            isLoading={loading}
            processingId={processingId}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={!!bannerToDelete}
        onOpenChange={(open) => !open && setBannerToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the banner.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
