'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertCircle } from 'lucide-react';

interface ImageCropperProps {
  open: boolean;
  imageSrc: string;
  onCropComplete: (croppedImage: File) => void;
  onClose: () => void;
  minWidth?: number;
  minHeight?: number;
  aspectRatio?: number;
}

interface CroppedAreaPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN_IMAGE_WIDTH = 369;
const MIN_IMAGE_HEIGHT = 152;
const ASPECT_RATIO = MIN_IMAGE_WIDTH / MIN_IMAGE_HEIGHT; // 2.43:1

export function ImageCropper({
  open,
  imageSrc,
  onCropComplete,
  onClose,
  minWidth = MIN_IMAGE_WIDTH,
  minHeight = MIN_IMAGE_HEIGHT,
  aspectRatio = ASPECT_RATIO,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedAreaPixels | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCropAreaChange = useCallback(
    (_croppedArea: unknown, croppedAreaPixels: CroppedAreaPixels) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  const createCroppedImage = useCallback(async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);

    try {
      const image = new Image();
      image.src = imageSrc;

      await new Promise((resolve) => {
        image.onload = resolve;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Canvas context not available');

      // Set canvas size to cropped dimensions
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      // Draw the cropped image
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
      );

      // Convert canvas to blob and create file
      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          const file = new File([blob], 'banner-image.png', { type: 'image/png' });
          onCropComplete(file);
          onClose();
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error cropping image:', error);
      alert('Failed to crop image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [croppedAreaPixels, imageSrc, onCropComplete, onClose]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop Banner Image</DialogTitle>
          <p className="text-xs text-muted-foreground mt-2">
            Minimum size: {minWidth}×{minHeight}px | Aspect ratio: {aspectRatio.toFixed(2)}:1
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cropper */}
          <div className="relative h-80 bg-muted rounded-lg overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onCropAreaChange={handleCropAreaChange}
              onZoomChange={setZoom}
              minZoom={0.5}
              maxZoom={3}
            />
          </div>

          {/* Zoom Slider */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Zoom</label>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-900">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">Image Requirements:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>
                  Minimum resolution: {minWidth}×{minHeight}px
                </li>
                <li>Recommended resolution: 738×304px or higher</li>
                <li>Smaller images may appear blurry on mobile</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={createCroppedImage} disabled={isProcessing}>
            {isProcessing ? 'Processing...' : 'Apply Crop'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
