import { Banner, BannerAudience } from '../types/banner.types';

export const BannerService = {
  async getBanners(audience?: BannerAudience): Promise<Banner[]> {
    const url = new URL('/api/banners', window.location.origin);

    if (audience) {
      url.searchParams.set('audience', audience);
    }

    const res = await fetch(url.toString(), {
      method: 'GET',
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error('Failed to fetch banners');
    }

    return res.json();
  },

  async deleteBanner(id: string) {
    const res = await fetch(`/api/banners/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    return res.json();
  },

  async toggleBanner(id: string) {
    const res = await fetch(`/api/banners/${id}/toggle`, {
      method: 'PATCH',
      credentials: 'include',
    });

    return res.json();
  },
};
