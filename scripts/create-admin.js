const admin = require('firebase-admin');

// Ensure env variables are present
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error('Error: Kredensial Firebase Admin SDK tidak lengkap di .env.local!');
  console.error('Pastikan FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, dan FIREBASE_PRIVATE_KEY sudah diisi.');
  process.exit(1);
}

// Initialize Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'), // handle newlines in private key
  }),
});

const adminEmail = 'admin@gmail.com';
const adminPassword = 'admin123';

async function createAdminUser() {
  try {
    console.log(`Memeriksa apakah user ${adminEmail} sudah terdaftar...`);
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(adminEmail);
      console.log(`User ${adminEmail} sudah ada dengan UID: ${userRecord.uid}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // User doesn't exist, create it
        userRecord = await admin.auth().createUser({
          email: adminEmail,
          password: adminPassword,
          emailVerified: true,
        });
        console.log(`Sukses! Akun admin berhasil dibuat dengan UID: ${userRecord.uid}`);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Gagal membuat akun admin:', error);
  } finally {
    process.exit(0);
  }
}

createAdminUser();
