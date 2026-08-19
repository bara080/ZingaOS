import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const zcDb = await getDb('ZC');
  const spDb = await getDb('SP');

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [customers, providers, stores, activeUsers, signupsZC, signupsSP] = await Promise.all([
    zcDb.collection('firebaseusers').countDocuments(),
    spDb.collection('firebaseusers').countDocuments(),
    spDb.collection('stores').countDocuments(),

    // Active users
    zcDb.collection('firebaseusers').countDocuments({ lastActiveAt: { $gte: since } }),

    // Signups
    zcDb.collection('firebaseusers').countDocuments({ createdAt: { $gte: since } }),
    spDb.collection('firebaseusers').countDocuments({ createdAt: { $gte: since } }),

    // Booking stats
    zcDb
      .collection('servicerequests')
      .aggregate([
        { $unwind: '$candidates' },
        {
          $group: {
            _id: null,
            acceptedBookings: {
              $sum: {
                $cond: [{ $eq: ['$candidates.status', 'completed'] }, 1, 0],
              },
            },
            cancelledBookings: {
              $sum: {
                $cond: [{ $eq: ['$candidates.status', 'canceled'] }, 1, 0],
              },
            },
            rejectedAfterAccept: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$candidates.status', 'canceled'] },
                      { $eq: ['$isCustomerConnected', true] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ])
      .toArray(),
  ]);

  const bookingsAgg = await zcDb
    .collection('servicerequests')
    .aggregate([
      { $unwind: '$candidates' },

      {
        $group: {
          _id: null,

          acceptedBookings: {
            $sum: {
              $cond: [
                {
                  $in: ['$candidates.status', ['accepted', 'completed']],
                },
                1,
                0,
              ],
            },
          },

          cancelledBookings: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$candidates.status', 'canceled'] },
                    { $ne: ['$isCustomerConnected', true] },
                  ],
                },
                1,
                0,
              ],
            },
          },

          rejectedAfterAccept: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$candidates.status', 'canceled'] },
                    { $eq: ['$isCustomerConnected', true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ])
    .toArray();

  const [walletsZC, walletsSP] = await Promise.all([
    zcDb
      .collection('wallets')
      .aggregate([{ $group: { _id: null, pending: { $sum: '$pendingBalance' } } }])
      .toArray(),

    spDb
      .collection('wallets')
      .aggregate([{ $group: { _id: null, pending: { $sum: '$pendingBalance' } } }])
      .toArray(),
  ]);

  const [txZC, txSP] = await Promise.all([
    zcDb.collection('wallettransactions').countDocuments(),
    spDb.collection('wallettransactions').countDocuments(),
  ]);

  const bookingStats = bookingsAgg[0] ?? {
    acceptedBookings: 0,
    cancelledBookings: 0,
    rejectedAfterAccept: 0,
  };

  return NextResponse.json({
    users: {
      customers,
      providers,
      activeUsers,
      stores,
    },

    signups: {
      signups: signupsZC + signupsSP,
      visits: 0,
    },

    bookings: bookingStats,

    wallets: {
      pendingWalletAmount: (walletsZC[0]?.pending ?? 0) + (walletsSP[0]?.pending ?? 0),
      transactions: txZC + txSP,
    },

    meta: {
      disputes: 0,
      deleted: 0,
      totalOrganizations: 0,
      activeOrganizations: 0,
    },
  });
}
