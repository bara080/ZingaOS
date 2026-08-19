export type AppStoreReview = {
  id: string;
  rating: number;        // 1–5
  title: string;
  body: string;
  userName: string;
  territory: string;     // 'USA', 'GBR', etc.
  createdAt: string;     // ISO string
};

export type AppStoreSummary = {
  averageRating: number | null;
  totalRatings: number;
  ratingDistribution: Record<string, number>;  // '1' | '2' | '3' | '4' | '5' → count
  trend: { date: string; reviews: number; avgRating: number }[];
  recentReviews: AppStoreReview[];
};

export type AppStoreReviewsResponse = {
  data: AppStoreReview[];
  total: number;
  page: number;
  pageSize: number;
};
