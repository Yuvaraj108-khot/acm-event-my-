import 'dotenv/config';
import { db } from '../config/db.js';

async function run() {
  console.log('Resetting participant roles in Firestore...');
  const snap = await db.collection('users').get();
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.email !== 'yuvarajkhot2005@gmail.com') {
      await doc.ref.update({ role: 'participant' });
      console.log(`Updated ${data.email} to participant`);
    } else {
      await doc.ref.update({ role: 'super_admin' });
      console.log(`Confirmed ${data.email} as super_admin`);
    }
  }
  process.exit(0);
}

run().catch(console.error);
