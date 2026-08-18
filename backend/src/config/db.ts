import { db } from './firebase.js';

export { db };
export type DB = typeof db;

export async function checkDatabaseConnection(): Promise<void> {
  await db.listCollections();
  console.log('✅ Firestore database connection established');
}
