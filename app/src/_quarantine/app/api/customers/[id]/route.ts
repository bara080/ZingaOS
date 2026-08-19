import { NextResponse, NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    // Extract the "id" from the pathname
    const { pathname } = req.nextUrl;
    const segments = pathname.split('/');
    const id = segments[segments.length - 1]; // last segment = dynamic id

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ customer: null, error: 'Invalid ID' }, { status: 400 });
    }

    const db = await getDb('ZC');
    const customersCol = db.collection('firebaseusers');

    const customer = await customersCol
      .aggregate([
        { $match: { _id: new ObjectId(id) } },

        {
          $lookup: {
            from: 'servicerequests',
            localField: 'uid',
            foreignField: 'customer.uid',
            as: 'requests',
          },
        },

        {
          $lookup: {
            from: 'payments',
            localField: 'uid',
            foreignField: 'customerUid',
            as: 'payments',
          },
        },

        {
          $addFields: {
            bookingRequests: { $size: '$requests' },

            activeBookings: {
              $size: {
                $filter: {
                  input: '$requests',
                  as: 'r',
                  cond: {
                    $in: ['$$r.status', ['pending', 'accepted', 'scheduled']],
                  },
                },
              },
            },

            completedBookings: {
              $size: {
                $filter: {
                  input: '$requests',
                  as: 'r',
                  cond: { $eq: ['$$r.status', 'completed'] },
                },
              },
            },

            walletBalance: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$requests',
                      as: 'r',
                      cond: { $eq: ['$$r.status', 'completed'] },
                    },
                  },
                  as: 'r',
                  in: { $ifNull: ['$$r.payment.amount', 0] },
                },
              },
            },

            totalSpent: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$payments',
                      as: 'p',
                      cond: { $eq: ['$$p.isPaid', true] },
                    },
                  },
                  as: 'p',
                  in: { $ifNull: ['$$p.amountBreakdown.total', 0] },
                },
              },
            },
          },
        },

        {
          $project: {
            password: 0,
            requests: 0, // hide raw requests
            payments: 0, // hide raw payments
          },
        },
      ])
      .next();

    if (!customer) {
      return NextResponse.json({ customer: null }, { status: 404 });
    }

    return NextResponse.json({ customer }, { status: 200 });
  } catch (err) {
    console.error('❌ Error fetching customer:', err);
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}
