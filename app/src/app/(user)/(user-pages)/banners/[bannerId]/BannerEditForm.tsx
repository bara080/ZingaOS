'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Loader2 } from 'lucide-react';
import { BannerAudience } from '@/features/content/types/banner.types';
import { ImageCropper } from '@/components/common/ImageCropper';
import { validateBannerImage } from '@/lib/utils/imageValidation';

const MIN_IMAGE_WIDTH = 369;
const MIN_IMAGE_HEIGHT = 152;

interface Props {
  bannerId: string;
}

export function BannerEditForm({ bannerId }: Props) {
  const router = useRouter();

  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false); // for submission
  const [imageValidating, setImageValidating] = useState(false);

  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string>('');
  const [cropperOpen, setCropperOpen] = useState(false);
  const [tempImagePreview, setTempImagePreview] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    audience: 'both' as BannerAudience,
    buttonText: '',
    buttonAction: 'navigate' as 'navigate' | 'url',
    buttonTarget: '',
    sortOrder: 0,
    imageUrl: '',
  });

  const preview = useMemo(() => {
    if (image) {
      return URL.createObjectURL(image);
    }

    return form.imageUrl;
  }, [image, form.imageUrl]);

  useEffect(() => {
    const loadBanner = async () => {
      setInitialLoading(true);
      try {
        const res = await fetch(`/api/banners/${bannerId}`);
        if (!res.ok) throw new Error('Failed to load banner');

        const data = await res.json();

        setForm({
          title: data.title || '',
          subtitle: data.subtitle || '',
          audience: data.audience || 'both',
          buttonText: data.buttonText || '',
          buttonAction: data.buttonAction || 'navigate',
          buttonTarget: data.buttonTarget || '',
          sortOrder: data.sortOrder || 0,
          imageUrl: data.imageUrl || '',
        });
      } catch (error) {
        console.error('Error loading banner:', error);
        alert('Failed to load banner');
      } finally {
        setInitialLoading(false);
      }
    };

    loadBanner();
  }, [bannerId]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImageError('');
      return;
    }

    setImageValidating(true);
    setImageError('');

    try {
      const validation = await validateBannerImage(file);

      if (!validation.isValid) {
        setImageError(validation.error || 'Invalid image');
        setImage(null);
        e.target.value = '';
      } else {
        // Image is valid, open cropper
        const reader = new FileReader();
        reader.onload = (event) => {
          setTempImagePreview(event.target?.result as string);
          setCropperOpen(true);
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('Image validation error:', error);
      setImageError('Failed to validate image. Please try again.');
      setImage(null);
      e.target.value = '';
    } finally {
      setImageValidating(false);
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    try {
      setImage(croppedFile);
      setImageError('');
      setCropperOpen(false);
      setTempImagePreview('');
    } catch (error) {
      console.error('Error processing cropped image:', error);
      setImageError('Failed to process cropped image. Please try again.');
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate title
    if (!form.title.trim()) {
      errors.title = 'Title is required';
    }

    // Validate audience
    if (!form.audience) {
      errors.audience = 'Audience is required';
    }

    // Validate CTA action and target
    if (!form.buttonAction) {
      errors.buttonAction = 'Button action is required';
    }

    if (!form.buttonTarget.trim()) {
      errors.buttonTarget = 'Target path or URL is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (imageError) {
      alert('Please fix image errors before submitting');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append('title', form.title);
      formData.append('subtitle', form.subtitle);
      formData.append('audience', form.audience);
      formData.append('buttonText', form.buttonText);
      formData.append('buttonAction', form.buttonAction);
      formData.append('buttonTarget', form.buttonTarget);
      formData.append('sortOrder', String(form.sortOrder));

      if (image) {
        formData.append('image', image);
      }

      const res = await fetch(`/api/banners/${bannerId}`, {
        method: 'PATCH',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to update banner');
      }

      router.push('/banners');
      router.refresh();
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Failed to update banner';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FORM SKELETON */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-20 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>

        {/* PREVIEW SKELETON */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="w-full rounded-lg" style={{ aspectRatio: '369/152' }} />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* FORM */}
      <Card>
        <CardHeader>
          <CardTitle>Banner Details</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>

            <Input
              id="title"
              value={form.title}
              onChange={(e) => {
                setForm({
                  ...form,
                  title: e.target.value,
                });
                if (formErrors.title) {
                  setFormErrors({ ...formErrors, title: '' });
                }
              }}
              className={formErrors.title ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {formErrors.title && (
              <p className="text-sm text-red-600 dark:text-red-400">{formErrors.title}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtitle">Subtitle</Label>

            <Textarea
              id="subtitle"
              value={form.subtitle}
              onChange={(e) =>
                setForm({
                  ...form,
                  subtitle: e.target.value,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="audience">Audience</Label>

            <Select
              value={form.audience}
              onValueChange={(v) => {
                setForm({
                  ...form,
                  audience: v as BannerAudience,
                });
                if (formErrors.audience) {
                  setFormErrors({ ...formErrors, audience: '' });
                }
              }}
            >
              <SelectTrigger id="audience" className={formErrors.audience ? 'border-red-500' : ''}>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="service-provider">Service Provider</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
            {formErrors.audience && (
              <p className="text-sm text-red-600 dark:text-red-400">{formErrors.audience}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="button-text">Button Label</Label>
            <Input
              id="button-text"
              value={form.buttonText}
              onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
              placeholder="e.g. Explore now"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="button-action">On Button Click</Label>
            <Select
              value={form.buttonAction}
              onValueChange={(v) => {
                setForm({ ...form, buttonAction: v as 'navigate' | 'url' });
                if (formErrors.buttonAction) {
                  setFormErrors({ ...formErrors, buttonAction: '' });
                }
              }}
            >
              <SelectTrigger id="button-action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="navigate">Navigate to screen/path</SelectItem>
                <SelectItem value="url">Open external URL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="button-target">Target Path / URL</Label>
            <Input
              id="button-target"
              value={form.buttonTarget}
              onChange={(e) => {
                setForm({ ...form, buttonTarget: e.target.value });
                if (formErrors.buttonTarget) {
                  setFormErrors({ ...formErrors, buttonTarget: '' });
                }
              }}
              placeholder={form.buttonAction === 'url' ? 'https://example.com' : '/services'}
              className={formErrors.buttonTarget ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {formErrors.buttonTarget && (
              <p className="text-sm text-red-600 dark:text-red-400">{formErrors.buttonTarget}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort-order">Sort Order</Label>

            <Input
              id="sort-order"
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm({
                  ...form,
                  sortOrder: Number(e.target.value),
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* PREVIEW */}
      <Card>
        <CardHeader>
          <CardTitle>Banner Preview</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="image">Image</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              disabled={imageValidating}
              className={
                formErrors.image || imageError ? 'border-red-500 focus-visible:ring-red-500' : ''
              }
            />
            <p className="text-xs text-muted-foreground">
              Minimum size: {MIN_IMAGE_WIDTH}×{MIN_IMAGE_HEIGHT}px
            </p>
            {formErrors.image && (
              <p className="text-sm text-red-600 dark:text-red-400">{formErrors.image}</p>
            )}
          </div>

          {imageError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-900">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700 dark:text-red-200">
                <p className="font-medium">Image Error</p>
                <p className="mt-1">{imageError}</p>
              </div>
            </div>
          )}

          <div
            className="border rounded-lg overflow-hidden bg-muted flex items-center justify-center"
            style={{ aspectRatio: '369/152' }}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Banner preview" className="w-full h-full object-cover" />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No image
              </div>
            )}
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={loading || imageValidating}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </CardContent>
      </Card>

      <ImageCropper
        open={cropperOpen}
        imageSrc={tempImagePreview}
        onCropComplete={handleCropComplete}
        onClose={() => {
          setCropperOpen(false);
          setTempImagePreview('');
          const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        }}
        minWidth={MIN_IMAGE_WIDTH}
        minHeight={MIN_IMAGE_HEIGHT}
      />
    </div>
  );
}
