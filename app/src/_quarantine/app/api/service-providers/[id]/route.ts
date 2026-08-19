import { NextResponse, NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    // Extract storeId
    const { pathname } = req.nextUrl;
    const segments = pathname.split('/');
    const storeId = segments[segments.length - 1];

    /* ────────────────────
       SP DB: Store profile
    ──────────────────── */
    const spDb = await getDb('SP');
    const storesCol = spDb.collection('stores');
    const usersCol = spDb.collection('firebaseusers');

    const store = await storesCol.findOne({ storeId });
    if (!store) {
      return NextResponse.json({ provider: null }, { status: 404 });
    }

    let owner = null;
    if (store.owner) {
      const ownerData = await usersCol.findOne(
        { uid: store.owner },
        {
          projection: {
            displayName: 1,
            email: 1,
            phoneNumber: 1,
            avatar: 1,
            uid: 1,
            linkedAccounts: 1,
            stores: 1,
            sessions: 1,
            isBlocked: 1,
          },
        },
      );

      if (ownerData) {
        const ownedStores = await storesCol
          .find({ owner: ownerData.uid })
          .project({ storeId: 1 })
          .toArray();

        const linkedStores = ownedStores.map((s) => s.storeId);

        owner = {
          uid: ownerData.uid,
          name: ownerData.displayName || 'Unknown',
          email: ownerData.email || '',
          phone: ownerData.phoneNumber || '',
          avatar: ownerData.avatar || '',
          isBlocked: ownerData.isBlocked ?? false,

          // ✅ pass linkedAccounts as-is
          linkedAccounts: ownerData.linkedAccounts ?? {},

          // ✅ normalized linked stores
          stores: linkedStores,

          sessions: Array.isArray(ownerData.sessions) ? ownerData.sessions : [],
        };
      }
    }

    const provider = {
      storeId,
      storeLogo: store.storeLogo,
      storeName: store.storeName,
      storeEmail: store.storeEmail,
      storePhone: store.storePhone,
      storeCategory: store.storeCategory,
      storeDescription: store.storeDescription || '',
      location: store.location,
      storeMedia: store.storeMedia || [],
      owner,
      services: store.services || [],
      reviews: store.reviews || [],
      stripeAccountId: store.stripeAccountId || '',
      isFreelancer: store.isFreelancer || false,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
    };

    /* ────────────────────
      ZC DB: Store stats
    ──────────────────── */
    const zcDb = await getDb('ZC');

    /* 1️⃣ Booking stats */
    const bookingStats = await zcDb
      .collection('servicerequests')
      .aggregate([
        {
          $facet: {
            /* 1️⃣ Booking requests (store is candidate) */
            bookingRequests: [
              {
                $match: {
                  candidates: {
                    $elemMatch: { storeId },
                  },
                },
              },
              { $count: 'count' },
            ],

            /* 2️⃣ Active bookings (store selected) */
            activeBookings: [
              {
                $match: {
                  'selectedCandidate.storeId': storeId,
                  status: { $in: ['pending', 'accepted', 'scheduled'] },
                },
              },
              { $count: 'count' },
            ],

            /* 3️⃣ Completed bookings (store selected) */
            completedBookings: [
              {
                $match: {
                  'selectedCandidate.storeId': storeId,
                  status: 'completed',
                },
              },
              { $count: 'count' },
            ],
          },
        },

        /* Flatten results */
        {
          $project: {
            bookingRequests: {
              $ifNull: [{ $arrayElemAt: ['$bookingRequests.count', 0] }, 0],
            },
            activeBookings: {
              $ifNull: [{ $arrayElemAt: ['$activeBookings.count', 0] }, 0],
            },
            completedBookings: {
              $ifNull: [{ $arrayElemAt: ['$completedBookings.count', 0] }, 0],
            },
          },
        },
      ])
      .next();

    /* 2️⃣ Earnings stats */
    const paymentStats = await zcDb
      .collection('payments')
      .aggregate([
        {
          $match: {
            storeId,
            isPaid: true,
          },
        },
        {
          $group: {
            _id: null,
            totalEarned: {
              $sum: { $ifNull: ['$amountBreakdown.total', 0] },
            },
          },
        },
      ])
      .next();

    /* 3️⃣ Merge results */
    const stats = {
      bookingRequests: bookingStats?.bookingRequests ?? 0,
      activeBookings: bookingStats?.activeBookings ?? 0,
      completedBookings: bookingStats?.completedBookings ?? 0,
      totalEarned: paymentStats?.totalEarned ?? 0,
      walletBalance: paymentStats?.totalEarned ?? 0, // adjust later if withdrawals exist
    };

    return NextResponse.json(
      {
        provider,
        stats: stats,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('❌ Error fetching service provider:', err);
    return NextResponse.json({ error: 'Failed to fetch service provider' }, { status: 500 });
  }
}
