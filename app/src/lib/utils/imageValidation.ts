/**
 * Image validation utilities for banner images
 * Minimum required size: 369 × 152 pixels
 */

const MIN_BANNER_WIDTH = 369;
const MIN_BANNER_HEIGHT = 152;

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  dimensions?: ImageDimensions;
}

/**
 * Get image dimensions from a file
 */
export function getImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Validate banner image dimensions
 */
export async function validateBannerImage(file: File): Promise<ImageValidationResult> {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return {
      isValid: false,
      error: 'Please upload a valid image file',
    };
  }

  // Check file size (max 5MB)
  const maxSizeInBytes = 5 * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    return {
      isValid: false,
      error: 'Image size must be less than 5MB',
    };
  }

  try {
    const dimensions = await getImageDimensions(file);

    // Check minimum dimensions
    if (dimensions.width < MIN_BANNER_WIDTH || dimensions.height < MIN_BANNER_HEIGHT) {
      return {
        isValid: false,
        error: `Image must be at least ${MIN_BANNER_WIDTH}×${MIN_BANNER_HEIGHT}px. Your image is ${dimensions.width}×${dimensions.height}px.`,
        dimensions,
      };
    }

    return {
      isValid: true,
      dimensions,
    };
  } catch {
    return {
      isValid: false,
      error: 'Failed to validate image. Please try another file.',
    };
  }
}
