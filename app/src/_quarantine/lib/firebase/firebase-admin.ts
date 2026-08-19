import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getStorage, type Storage } from 'firebase-admin/storage';

// Initialized lazily: reading these at module scope crashes `next build` during
// "Collecting page data", which imports every route module without runtime env.
let cached: ReturnType<Storage['bucket']> | null = null;

export function getBucket() {
  if (cached) return cached;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  if (!projectId || !clientEmail || !privateKey || !storageBucket) {
    throw new Error(
      'Firebase Admin is not configured: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY and FIREBASE_STORAGE_BUCKET.'
    );
  }

  const app =
    getApps().length === 0
      ? initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
          storageBucket,
        })
      : getApps()[0];

  cached = getStorage(app).bucket();
  return cached;
}
