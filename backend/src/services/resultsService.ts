import { db } from '../config/db.js';
import { calculateRoundRanks, rebuildCompetitionLeaderboard } from './leaderboardService.js';
import { advanceParticipantsToNextRound } from './participantService.js';
import { getRound } from './roundService.js';

export async function getRoundResults(roundId: string) {
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
      questionsAttempted: entry.questionsAttempted,
      questionsCorrect: entry.questionsCorrect,
      advanced: entry.advanced !== undefined ? entry.advanced : false,
      publishedAt: entry.publishedAt || null,
      name: profile ? profile.name : null,
      usn: profile ? profile.usn : null,
      email,
      department: profile ? profile.department : null,
    };
  }));
}

export async function getUserResult(roundId: string, userId: string) {
  const snap = await db.collection('round_results')
    .where('roundId', '==', roundId)
    .where('userId', '==', userId)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0].data();
}

export async function publishResults(roundId: string) {
  // Calculate ranks first
  await calculateRoundRanks(roundId);

  // Get round
  const round = await getRound(roundId);

  // Mark results as published
  const resultsSnap = await db.collection('round_results')
    .where('roundId', '==', roundId)
    .get();

  if (!resultsSnap.empty) {
    const batch = db.batch();
    resultsSnap.docs.forEach(doc => {
      batch.update(doc.ref, {
        publishedAt: new Date(),
        updatedAt: new Date(),
      });
    });
    await batch.commit();
  }

  // Rebuild competition leaderboard
  await rebuildCompetitionLeaderboard(round.competitionId);
}

export async function selectAdvancingParticipants(params: {
  currentRoundId: string;
  nextRoundId: string;
  participantIds: string[];
  adminId: string;
}) {
  const { currentRoundId, nextRoundId, participantIds, adminId } = params;

  // Mark selected participants as advanced in results
  const batch = db.batch();
  for (const userId of participantIds) {
    const snap = await db.collection('round_results')
      .where('roundId', '==', currentRoundId)
      .where('userId', '==', userId)
      .limit(1)
      .get();
    
    if (!snap.empty) {
      batch.update(snap.docs[0].ref, {
        advanced: true,
        updatedAt: new Date(),
      });
    }
  }
  await batch.commit();

  // Advance to next round
  await advanceParticipantsToNextRound(currentRoundId, nextRoundId, participantIds, adminId);

  return { advanced: participantIds.length };
}
