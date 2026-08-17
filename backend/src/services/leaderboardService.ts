import { db } from '../config/db.js';

export async function getCompetitionLeaderboard(competitionId: string) {
  const snap = await db.collection('leaderboard')
    .where('competitionId', '==', competitionId)
    .get();

  const entries = snap.docs.map((doc: any) => doc.data());

  // Sort by rank ascending
  entries.sort((a: any, b: any) => (a.rank || 9999) - (b.rank || 9999));

  return Promise.all(entries.map(async (entry: any) => {
    const userDoc = await db.collection('users').doc(entry.userId).get();
    const email = userDoc.exists ? userDoc.data()!.email : null;

    const profileSnap = await db.collection('profiles')
      .where('userId', '==', entry.userId)
      .limit(1)
      .get();
    
    const profile = profileSnap.empty ? null : profileSnap.docs[0].data();

    return {
      rank: entry.rank,
      userId: entry.userId,
      totalScore: entry.totalScore,
      roundsCompleted: entry.roundsCompleted,
      lastUpdatedAt: entry.lastUpdatedAt,
      name: profile ? profile.name : null,
      usn: profile ? profile.usn : null,
      department: profile ? profile.department : null,
      email,
    };
  }));
}

export async function getRoundLeaderboard(roundId: string) {
  const snap = await db.collection('round_results')
    .where('roundId', '==', roundId)
    .get();

  const entries = snap.docs.map((doc: any) => doc.data());

  // Sort by rank ascending
  entries.sort((a: any, b: any) => (a.rank || 9999) - (b.rank || 9999));

  return Promise.all(entries.map(async (entry: any) => {
    const userDoc = await db.collection('users').doc(entry.userId).get();
    const email = userDoc.exists ? userDoc.data()!.email : null;

    const profileSnap = await db.collection('profiles')
      .where('userId', '==', entry.userId)
      .limit(1)
      .get();
    
    const profile = profileSnap.empty ? null : profileSnap.docs[0].data();

    return {
      rank: entry.rank,
      userId: entry.userId,
      totalScore: entry.totalScore,
      questionsAttempted: entry.questionsAttempted || 0,
      questionsCorrect: entry.questionsCorrect || 0,
      advanced: entry.advanced !== undefined ? entry.advanced : false,
      name: profile ? profile.name : null,
      usn: profile ? profile.usn : null,
      department: profile ? profile.department : null,
      email,
    };
  }));
}

/**
 * Recalculates and updates ranks for a round after results are finalized.
 */
export async function calculateRoundRanks(roundId: string) {
  const snap = await db.collection('round_results')
    .where('roundId', '==', roundId)
    .get();

  const results = snap.docs.map((doc: any) => ({
    id: doc.id,
    ref: doc.ref,
    ...doc.data(),
  }));

  // Sort by score descending
  results.sort((a: any, b: any) => parseFloat(b.totalScore || '0') - parseFloat(a.totalScore || '0'));

  let rank = 1;
  let prevScore: string | null = null;
  let sameRankCount = 0;

  const batch = db.batch();
  for (const result of results) {
    if (prevScore !== null && result.totalScore !== prevScore) {
      rank += sameRankCount;
      sameRankCount = 1;
    } else {
      sameRankCount++;
    }
    prevScore = result.totalScore;

    batch.update(result.ref, { rank });
  }
  await batch.commit();
}

/**
 * Rebuilds the competition-level leaderboard from round results.
 */
export async function rebuildCompetitionLeaderboard(competitionId: string) {
  // Fetch all round results for this competition
  const snap = await db.collection('round_results')
    .where('competitionId', '==', competitionId)
    .get();

  const results = snap.docs.map((doc: any) => doc.data());

  // Aggregate by userId
  const userAggregates = new Map<string, { totalScore: number; roundsCompleted: number }>();
  results.forEach(res => {
    const scoreVal = parseFloat(res.totalScore || '0');
    const prev = userAggregates.get(res.userId) || { totalScore: 0, roundsCompleted: 0 };
    userAggregates.set(res.userId, {
      totalScore: prev.totalScore + scoreVal,
      roundsCompleted: prev.roundsCompleted + 1,
    });
  });

  const batch = db.batch();
  const entries: any[] = [];

  for (const [userId, agg] of userAggregates.entries()) {
    // Check if entry already exists in leaderboard
    const leaderSnap = await db.collection('leaderboard')
      .where('competitionId', '==', competitionId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    const data = {
      competitionId,
      userId,
      totalScore: String(agg.totalScore),
      roundsCompleted: agg.roundsCompleted,
      lastUpdatedAt: new Date(),
    };

    if (!leaderSnap.empty) {
      const doc = leaderSnap.docs[0];
      batch.update(doc.ref, data);
      entries.push({ id: doc.id, ref: doc.ref, ...doc.data(), ...data });
    } else {
      const docRef = db.collection('leaderboard').doc();
      batch.set(docRef, { id: docRef.id, ...data });
      entries.push({ id: docRef.id, ref: docRef, ...data });
    }
  }
  await batch.commit();

  // Recalculate competition ranks
  // Sort entries by totalScore descending
  entries.sort((a: any, b: any) => parseFloat(b.totalScore) - parseFloat(a.totalScore));

  const rankBatch = db.batch();
  let rank = 1;
  let prevScore: string | null = null;
  let sameRankCount = 0;

  for (const entry of entries) {
    if (prevScore !== null && entry.totalScore !== prevScore) {
      rank += sameRankCount;
      sameRankCount = 1;
    } else {
      sameRankCount++;
    }
    prevScore = entry.totalScore;

    rankBatch.update(entry.ref, { rank });
  }
  await rankBatch.commit();
}
