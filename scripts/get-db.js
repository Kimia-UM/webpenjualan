const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

if (!projectId || !clientEmail || !privateKey) {
  console.error('Error: Firebase credentials incomplete.');
  process.exit(1);
}

initializeApp({
  credential: cert({
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  }),
  databaseURL,
});

const db = getDatabase();

async function showDb() {
  try {
    const hostsSnap = await db.ref('host_accounts').once('value');
    const subsSnap = await db.ref('subscriptions').once('value');
    
    console.log('--- HOST ACCOUNTS ---');
    console.log(JSON.stringify(hostsSnap.val(), null, 2));
    
    console.log('\n--- SUBSCRIPTIONS ---');
    console.log(JSON.stringify(subsSnap.val(), null, 2));
  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    process.exit(0);
  }
}

showDb();
