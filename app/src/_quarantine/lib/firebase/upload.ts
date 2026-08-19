import { getBucket } from './firebase-admin';
import crypto from 'crypto';

export async function uploadImageToFirebase(file: File, folder = 'banners'): Promise<string> {
  const bucket = getBucket();
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `${folder}/${crypto.randomUUID()}-${file.name}`;
  const fileRef = bucket.file(fileName);

  // Generate a download token to allow public access via Firebase URL
  const downloadToken = crypto.randomUUID();

  await fileRef.save(buffer, {
    metadata: {
      contentType: file.type,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
    resumable: false,
  });

  // Return the Firebase Storage URL instead of the default GCP Storage URL
  const encodedFileName = encodeURIComponent(fileName);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedFileName}?alt=media&token=${downloadToken}`;
}
