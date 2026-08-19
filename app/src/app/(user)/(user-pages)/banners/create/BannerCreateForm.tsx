'use client';

import { useMemo, useState, useEffect } from 'react';
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
import { AlertCircle, Loader2 } from 'lucide-react';
import { BannerAudience } from '@/features/content/types/banner.types';
import { ImageCropper } from '@/components/common/ImageCropper';
import { validateBannerImage, getImageDimensions } from '@/lib/utils/imageValidation';

const MIN_IMAGE_WIDTH = 369;
const MIN_IMAGE_HEIGHT = 152;

export function BannerCreateForm() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [imageValidating, setImageValidating] = useState(false);

  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    audience: 'both' as BannerAudience,
    buttonText: '',
    buttonAction: 'navigate' as 'navigate' | 'url',
    buttonTarget: '',
    sortOrder: 0,
  });

  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string>('');
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [cropperOpen, setCropperOpen] = useState(false);
  const [tempImagePreview, setTempImagePreview] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Auto-update sort order when audience changes
  useEffect(() => {
    const fetchNextSortOrder = async () => {
      try {
        const res = await fetch(`/api/banners?audience=${form.audience}`);
        if (!res.ok) throw new Error('Failed to fetch banners');

        const banners = await res.json();

        // Find the highest sort order and increment by 1
        const maxSortOrder =
          banners.length > 0
            ? Math.max(...banners.map((b: { sortOrder?: number }) => b.sortOrder || 0))
            : -1;

        setForm((prev) => ({
          ...prev,
          sortOrder: maxSortOrder + 1,
        }));
      } catch (error) {
        console.error('Error fetching next sort order:', error);
        // Fallback: set to 0 if fetch fails
        setForm((prev) => ({
          ...prev,
          sortOrder: 0,
        }));
      }
    };

    fetchNextSortOrder();
  }, [form.audience]);

  const preview = useMemo(() => {
    if (!image) return null;
    return URL.createObjectURL(image);
  }, [image]);

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
        setImageDimensions(null);
        e.target.value = '';
      } else {
        // Image is valid, open cropper
        const reader = new FileReader();
        reader.onload = (event) => {
          setTempImagePreview(event.target?.result as string);
          setCropperOpen(true);
          if (validation.dimensions) {
            setImageDimensions(validation.dimensions);
          }
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
      const dimensions = await getImageDimensions(croppedFile);
      setImage(croppedFile);
      setImageDimensions(dimensions);
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

    // Validate image
    if (!image) {
      errors.image = 'Image is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    // Validate form before submitting
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

      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, String(value));
      });

      formData.append('image', image!);

      const res = await fetch('/api/banners', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to create banner');
      }

      router.push('/banners');
      router.refresh();
    } catch (error) {
      console.error('Banner creation error:', error);
      const message = error instanceof Error ? error.message : 'Error creating banner';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 space-y-6">
      {/* GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: FORM */}
        <Card>
          <CardHeader>
            <CardTitle>Banner Details</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => {
                  setForm({ ...form, title: e.target.value });
                  if (formErrors.title) {
                    setFormErrors({ ...formErrors, title: '' });
                  }
                }}
                placeholder="Enter banner title"
                className={formErrors.title ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {formErrors.title && (
                <p className="text-sm text-red-600 dark:text-red-400">{formErrors.title}</p>
              )}
            </div>

            {/* Subtitle */}
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Textarea
                id="subtitle"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="Enter banner subtitle"
              />
            </div>

            {/* Audience */}
            <div className="space-y-2">
              <Label htmlFor="audience">Audience</Label>
              <Select
                value={form.audience}
                onValueChange={(v) => {
                  setForm({ ...form, audience: v as BannerAudience });
                  if (formErrors.audience) {
                    setFormErrors({ ...formErrors, audience: '' });
                  }
                }}
              >
                <SelectTrigger
                  id="audience"
                  className={formErrors.audience ? 'border-red-500' : ''}
                >
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

            {/* Button Text */}
            <div className="space-y-2">
              <Label htmlFor="button-text">Button Label</Label>
              <Input
                id="button-text"
                value={form.buttonText}
                onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
                placeholder="e.g. Book now"
              />
            </div>

            {/* Button Action */}
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

            {/* Button Target */}
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
                className={
                  formErrors.buttonTarget ? 'border-red-500 focus-visible:ring-red-500' : ''
                }
              />
              {formErrors.buttonTarget && (
                <p className="text-sm text-red-600 dark:text-red-400">{formErrors.buttonTarget}</p>
              )}
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <Label htmlFor="sort-order">Sort Order</Label>
              <Input
                id="sort-order"
                type="number"
                value={form.sortOrder}
                readOnly
                disabled
                className="bg-muted cursor-not-allowed"
              />
            </div>
          </CardContent>
        </Card>

        {/* RIGHT: IMAGE + ACTION */}
        <Card>
          <CardHeader>
            <CardTitle>Banner Preview</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Upload */}
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

            {/* Error Message */}
            {imageError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-900">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="text-sm text-red-700 dark:text-red-200">
                  <p className="font-medium">Image Error</p>
                  <p className="mt-1">{imageError}</p>
                </div>
              </div>
            )}

            {/* Image Dimensions Display */}
            {image && imageDimensions && (
              <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-900">
                <div className="text-sm text-green-700 dark:text-green-200">
                  <p className="font-medium">Image Ready</p>
                  <p className="mt-1">
                    Resolution: {imageDimensions.width}×{imageDimensions.height}px
                  </p>
                </div>
              </div>
            )}

            {/* Preview */}
            <div
              className="border rounded-lg overflow-hidden bg-muted flex items-center justify-center"
              style={{ aspectRatio: '369/152' }}
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Banner preview" className="w-full h-full object-cover" />
              ) : imageValidating ? (
                <div className="flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Validating image...</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No image selected</p>
              )}
            </div>

            {/* Submit */}
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={loading || !image || !!imageError || imageValidating}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Banner'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Image Cropper Modal */}
      <ImageCropper
        open={cropperOpen}
        imageSrc={tempImagePreview}
        onCropComplete={handleCropComplete}
        onClose={() => {
          setCropperOpen(false);
          setTempImagePreview('');
          // Reset file input
          const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        }}
        minWidth={MIN_IMAGE_WIDTH}
        minHeight={MIN_IMAGE_HEIGHT}
      />
    </div>
  );
}
