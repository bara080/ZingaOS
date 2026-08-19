import { BannerEditForm } from './BannerEditForm';
import { BackButton } from '@/components/common/BackButton';

interface Props {
  params: Promise<{
    bannerId: string;
  }>;
}

export default async function EditBannerRoute({ params }: Props) {
  const { bannerId } = await params;

  return (
    <div className="py-6 max-w-6xl mx-auto space-y-4">
      <div>
        <BackButton />
        <h1 className="text-2xl font-semibold tracking-tight mt-2">Edit Banner</h1>

        <p className="text-sm text-muted-foreground mt-1">Update banner details and image.</p>
      </div>

      <BannerEditForm bannerId={bannerId} />
    </div>
  );
}
