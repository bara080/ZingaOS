import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = await getDb('ZC');
  const payments = db.collection('payments');

  const data = await payments
    .aggregate([
      {
        $match: {
          isPaid: true,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$paidAt' },
            month: { $month: '$paidAt' },
          },
          revenue: { $sum: '$amountBreakdown.total' },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ])
    .toArray();

  return NextResponse.json({
    data: data.map((d) => ({
      year: d._id.year,
      month: d._id.month,
      revenue: Number(d.revenue.toFixed(2)),
    })),
  });
}
