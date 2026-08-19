export type PlayReview = {
  id: string;
  rating: number;        // 1–5
  text: string;
  authorName: string;
  language: string;
  thumbsUpCount: number;
  reviewedAt: string;    // ISO string
  replyText: string | null;
};

export type PlayStoreSummary = {
  averageRating: number | null;
  totalRatings: number;
  ratingDistribution: Record<string, number>;
  trend: { date: string; reviews: number; avgRating: number }[];
  recentReviews: PlayReview[];
};

export type PlayStoreReviewsResponse = {
  data: PlayReview[];
  total: number;
  page: number;
  pageSize: number;
};
