import { db } from '../config/db.js';
import type { CreateRoundInput, UpdateRoundInput } from '../validators/rounds.js';

export async function getRoundsByCompetition(competitionId: string, isAdmin = false) {
  const snap = await db.collection('rounds')
    .where('competitionId', '==', competitionId)
    .get();

  let allRounds = snap.docs.map((doc: any) => doc.data());

  // Sort by orderIndex ascending
  allRounds.sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));

  if (!isAdmin) {
    allRounds = allRounds.filter((r: any) => r.isPublished);
  }
  return allRounds;
}

export async function getRound(id: string) {
  const doc = await db.collection('rounds').doc(id).get();
  if (!doc.exists) throw Object.assign(new Error('Round not found'), { statusCode: 404 });
  return doc.data()!;
}

export async function createRound(data: CreateRoundInput) {
  const { maxPoints, negativeMarkingValue, passingScore, scheduledStartAt, ...roundData } = data;
  const docRef = db.collection('rounds').doc();
  const formattedData = {
    id: docRef.id,
    ...roundData,
    status: 'upcoming',
    isPublished: true,
    maxPoints: String(maxPoints),
    negativeMarkingValue: String(negativeMarkingValue),
    passingScore: (passingScore !== undefined && passingScore !== null) ? String(passingScore) : null,
    scheduledStartAt: scheduledStartAt ? new Date(scheduledStartAt) : null,
    actualStartAt: null,
    actualEndAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await docRef.set(formattedData);
  return formattedData;
}

export async function updateRound(id: string, data: UpdateRoundInput) {
  const docRef = db.collection('rounds').doc(id);
  const doc = await docRef.get();
  if (!doc.exists) throw Object.assign(new Error('Round not found'), { statusCode: 404 });

  const { maxPoints, negativeMarkingValue, passingScore, scheduledStartAt, ...roundData } = data;
  const formattedData: any = {
    ...roundData,
    ...(maxPoints !== undefined ? { maxPoints: String(maxPoints) } : {}),
    ...(negativeMarkingValue !== undefined ? { negativeMarkingValue: String(negativeMarkingValue) } : {}),
    ...(passingScore !== undefined && passingScore !== null ? { passingScore: String(passingScore) } : {}),
    ...(scheduledStartAt !== undefined ? { scheduledStartAt: scheduledStartAt ? new Date(scheduledStartAt) : null } : {}),
    updatedAt: new Date(),
  };

  await docRef.update(formattedData);
  const updatedDoc = await docRef.get();
  return updatedDoc.data();
}

export async function deleteRound(id: string) {
  await db.collection('rounds').doc(id).delete();
  
  // Clean up round participants
  const snap = await db.collection('round_participants').where('roundId', '==', id).get();
  if (!snap.empty) {
    const batch = db.batch();
    snap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }
}

export async function reorderRounds(competitionId: string, roundOrder: { id: string; orderIndex: number }[]) {
  const batch = db.batch();
  for (const item of roundOrder) {
    const docRef = db.collection('rounds').doc(item.id);
    batch.update(docRef, { orderIndex: item.orderIndex, updatedAt: new Date() });
  }
  await batch.commit();
  return getRoundsByCompetition(competitionId, true);
}

export async function startRound(id: string) {
  const docRef = db.collection('rounds').doc(id);
  await docRef.update({
    status: 'active',
    isPublished: true,
    actualStartAt: new Date(),
    updatedAt: new Date(),
  });
  const doc = await docRef.get();
  if (!doc.exists) throw new Error('Round not found');
  return doc.data()!;
}

export async function endRound(id: string) {
  const docRef = db.collection('rounds').doc(id);
  await docRef.update({
    status: 'completed',
    actualEndAt: new Date(),
    updatedAt: new Date(),
  });
  const doc = await docRef.get();
  if (!doc.exists) throw new Error('Round not found');
  return doc.data()!;
}

export async function enrollParticipantsInRound(roundId: string, competitionId: string) {
  // Get all registered participants
  const registrationsSnap = await db.collection('competition_registrations')
    .where('competitionId', '==', competitionId)
    .get();

  if (registrationsSnap.empty) return;

  const batch = db.batch();
  for (const doc of registrationsSnap.docs) {
    const reg = doc.data();
    const docId = `${roundId}_${reg.userId}`;
    const pRef = db.collection('round_participants').doc(docId);
    batch.set(pRef, {
      id: docId,
      roundId,
      userId: reg.userId,
      competitionId,
      status: 'joined',
      joinedAt: new Date(),
      score: '0.00',
    });
  }
  await batch.commit();
}

export async function getUserRoundStatus(roundId: string, userId: string) {
  const snap = await db.collection('round_participants')
    .where('roundId', '==', roundId)
    .where('userId', '==', userId)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0].data();
}

export function isRoundTimeWindowActive(round: any): boolean {
  if (round.status !== 'active') {
    return false;
  }
  if (!round.actualStartAt) {
    return false;
  }
  
  const startTime = round.actualStartAt.toDate ? round.actualStartAt.toDate() : new Date(round.actualStartAt);
  const durationMs = (Number(round.durationMinutes) || 60) * 60 * 1000;
  const now = new Date();
  
  // 15-second grace period for latency
  const gracePeriodMs = 15 * 1000;
  
  return now.getTime() <= startTime.getTime() + durationMs + gracePeriodMs;
}

