import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

if (!getApps().length) {
  if (projectId && clientEmail && privateKey) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
      databaseURL,
    });
  } else {
    console.warn("Kredensial Firebase Admin SDK tidak lengkap di .env.local. Admin SDK diinisialisasi dalam mode simulasi.");
  }
}

// Access database using admin credentials
const adminDb = getApps().length ? getDatabase() : null;

export { adminDb };
export { cert } from 'firebase-admin/app';
