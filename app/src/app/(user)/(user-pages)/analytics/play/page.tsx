'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import type { PlayStoreSummary, PlayStoreReviewsResponse } from '@/features/google-play/types';

const trendChartConfig = {
  reviews: { label: 'Reviews', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const distChartConfig = {
  count: { label: 'Reviews', color: 'var(--chart-3)' },
} satisfies ChartConfig;

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 text-sm">
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
    </span>
  );
}

async function fetchSummary(): Promise<PlayStoreSummary> {
  const res = await fetch('/api/trackers/google-play/summary');
  if (!res.ok) throw new Error('Failed to fetch Google Play summary');
  return res.json();
}

async function fetchReviews(params: { page: number; rating: string }): Promise<PlayStoreReviewsResponse> {
  const query = new URLSearchParams({ page: String(params.page) });
  if (params.rating !== 'all') query.set('rating', params.rating);
  const res = await fetch(`/api/trackers/google-play/reviews?${query}`);
  if (!res.ok) throw new Error('Failed to fetch Google Play reviews');
  return res.json();
}

export default function PlayStorePage() {
  const [ratingFilter, setRatingFilter] = useState<'all' | '1' | '2' | '3' | '4' | '5'>('all');
  const [page, setPage] = useState(1);

  const summary = useQuery<PlayStoreSummary>({
    queryKey: ['google-play-summary'],
    queryFn: fetchSummary,
    staleTime: 5 * 60 * 1000,
  });

  const reviews = useQuery<PlayStoreReviewsResponse>({
    queryKey: ['google-play-reviews', page, ratingFilter],
    queryFn: () => fetchReviews({ page, rating: ratingFilter }),
    staleTime: 2 * 60 * 1000,
  });

  const totalPages = reviews.data
    ? Math.ceil(reviews.data.total / (reviews.data.pageSize ?? 20))
    : 1;

  const distData = ['5', '4', '3', '2', '1'].map((star) => ({
    star: `${star}★`,
    count: summary.data?.ratingDistribution?.[star] ?? 0,
  }));

  const statCards = [
    {
      label: 'Average Rating',
      display:
        summary.data?.averageRating != null
          ? `${summary.data.averageRating} ★`
          : '—',
      color:
        summary.data?.averageRating == null
          ? 'text-muted-foreground'
          : summary.data.averageRating >= 4.5
            ? 'text-emerald-500'
            : summary.data.averageRating >= 3.5
              ? 'text-amber-500'
              : 'text-red-500',
    },
    {
      label: 'Total Ratings',
      display: (summary.data?.totalRatings ?? 0).toLocaleString(),
      color: 'text-foreground',
    },
    {
      label: '5-Star Reviews',
      display: (summary.data?.ratingDistribution?.['5'] ?? 0).toLocaleString(),
      color: 'text-emerald-500',
    },
    {
      label: '1-Star Reviews',
      display: (summary.data?.ratingDistribution?.['1'] ?? 0).toLocaleString(),
      color:
        (summary.data?.ratingDistribution?.['1'] ?? 0) > 0
          ? 'text-red-500'
          : 'text-foreground',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Google Play Store</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="bg-primary-foreground">
            <CardContent className="pt-4">
              {summary.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-16" />
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.display}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="bg-primary-foreground">
          <CardHeader>
            <CardTitle className="text-sm">Review Trend (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.isLoading ? (
              <div className="h-[180px] animate-pulse rounded-md bg-muted" />
            ) : (summary.data?.trend.length ?? 0) === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
                No trend data yet — waiting for first cron sync
              </div>
            ) : (
              <ChartContainer config={trendChartConfig} className="h-[180px] w-full">
                <BarChart data={summary.data!.trend}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="reviews" fill="var(--color-reviews)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-primary-foreground">
          <CardHeader>
            <CardTitle className="text-sm">Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.isLoading ? (
              <div className="h-[180px] animate-pulse rounded-md bg-muted" />
            ) : (
              <ChartContainer config={distChartConfig} className="h-[180px] w-full">
                <BarChart data={distData} layout="vertical">
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis type="category" dataKey="star" tickLine={false} axisLine={false} tickMargin={8} width={30} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reviews table */}
      <Card className="bg-primary-foreground">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">All Reviews</CardTitle>
          <Select
            value={ratingFilter}
            onValueChange={(v) => {
              setRatingFilter(v as 'all' | '1' | '2' | '3' | '4' | '5');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Filter by rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ratings</SelectItem>
              <SelectItem value="5">5 stars</SelectItem>
              <SelectItem value="4">4 stars</SelectItem>
              <SelectItem value="3">3 stars</SelectItem>
              <SelectItem value="2">2 stars</SelectItem>
              <SelectItem value="1">1 star</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th scope="col" className="text-left px-4 py-2 text-xs text-muted-foreground font-medium w-28">Rating</th>
                  <th scope="col" className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Review</th>
                  <th scope="col" className="text-left px-4 py-2 text-xs text-muted-foreground font-medium hidden md:table-cell">Author</th>
                  <th scope="col" className="text-left px-4 py-2 text-xs text-muted-foreground font-medium hidden lg:table-cell">Reply</th>
                  <th scope="col" className="text-right px-4 py-2 text-xs text-muted-foreground font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {reviews.isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td colSpan={5} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    </tr>
                  ))}
                {!reviews.isLoading && (reviews.data?.data.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No reviews found
                    </td>
                  </tr>
                )}
                {reviews.data?.data.map((review) => (
                  <tr
                    key={review.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <StarRating rating={review.rating} />
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-xs text-foreground line-clamp-2">{review.text || '—'}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-foreground">{review.authorName || '—'}</p>
                      {review.thumbsUpCount > 0 && (
                        <p className="text-xs text-muted-foreground">{review.thumbsUpCount} 👍</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {review.replyText ? (
                        <p className="text-xs text-muted-foreground line-clamp-2 italic">
                          {review.replyText}
                        </p>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {new Date(review.reviewedAt).toLocaleString('en-GB')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {reviews.data?.total ?? 0} reviews
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="text-xs px-2 py-1 rounded border border-border disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="text-xs px-2 py-1 rounded border border-border disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
