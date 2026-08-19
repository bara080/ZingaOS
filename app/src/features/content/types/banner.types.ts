export type BannerAudience = 'customer' | 'service-provider' | 'both';

export type BannerButtonAction = 'navigate' | 'url';

export interface Banner {
  _id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  audience: BannerAudience;
  buttonText?: string;
  buttonAction?: BannerButtonAction;
  buttonTarget?: string;
  isActive: boolean;
  sortOrder: number;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: Date;
  updatedAt?: Date;
}
