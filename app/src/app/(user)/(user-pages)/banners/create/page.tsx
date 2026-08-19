import React from 'react';
import { BannerCreateForm } from './BannerCreateForm';
import { BackButton } from '@/components/common/BackButton';

export default function CreateBannerRoute() {
  return (
    <div className="py-6 max-w-6xl mx-auto space-y-4">
      <div>
        <BackButton />
        <h1 className="text-2xl font-semibold tracking-tight mt-2">Create Banner</h1>

        <p className="text-sm text-muted-foreground mt-1">
          Upload a new banner for the customer or service provider app.
        </p>
      </div>

      <BannerCreateForm />
    </div>
  );
}
