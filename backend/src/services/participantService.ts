import { db } from '../config/db.js';

export async function listParticipants(params: { competitionId?: string; page: number; limit: number }) {
  const { competitionId, page, limit } = params;
  const offset = (page - 1) * limit;

  if (competitionId) {
    const snap = await db.collection('competition_registrations')
      .where('competitionId', '==', competitionId)
      .get();

    const regs = snap.docs.map((doc: any) => doc.data());
    const paginatedRegs = regs.slice(offset, offset + limit);

    return Promise.all(paginatedRegs.map(async (reg: any) => {
      const userDoc = await db.collection('users').doc(reg.userId).get();
      const userData = userDoc.exists ? userDoc.data()! : {};

      const profileSnap = await db.collection('profiles')
        .where('userId', '==', reg.userId)
        .limit(1)
        .get();
      const profileData = profileSnap.empty ? {} : profileSnap.docs[0].data();

      return {
        userId: reg.userId,
        email: userData.email || null,
        name: profileData.name || null,
        usn: profileData.usn || null,
        department: profileData.department || null,
        semester: profileData.semester || null,
        phone: profileData.phone || null,
        registrationStatus: reg.status,
        registeredAt: reg.createdAt,
      };
    }));
  }

  const snap = await db.collection('users')
    .where('role', '==', 'participant')
    .get();

  const users = snap.docs.map((doc: any) => doc.data());
  const paginatedUsers = users.slice(offset, offset + limit);

  return Promise.all(paginatedUsers.map(async (user: any) => {
    const profileSnap = await db.collection('profiles')
      .where('userId', '==', user.id)
      .limit(1)
      .get();
    const profileData = profileSnap.empty ? {} : profileSnap.docs[0].data();

    return {
      userId: user.id,
      email: user.email,
      name: profileData.name || null,
      usn: profileData.usn || null,
      department: profileData.department || null,
      semester: profileData.semester || null,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }));
}

export async function getParticipant(userId: string) {
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) throw Object.assign(new Error('Participant not found'), { statusCode: 404 });
  const profileSnap = await db.collection('profiles')
    .where('userId', '==', userId)
    .limit(1)
    .get();
  const profile = profileSnap.empty ? null : profileSnap.docs[0].data();
  return { user: userDoc.data()!, profile };
}

export async function updateParticipantStatus(competitionId: string, userId: string, status: string) {
  const snap = await db.collection('competition_registrations')
    .where('competitionId', '==', competitionId)
    .where('userId', '==', userId)
    .limit(1)
    .get();

  if (snap.empty) throw Object.assign(new Error('Registration not found'), { statusCode: 404 });
  const doc = snap.docs[0];
  await doc.ref.update({
    status: status,
    updatedAt: new Date(),
  });
  const updatedDoc = await doc.ref.get();
  return updatedDoc.data();
}

export async function advanceParticipantsToNextRound(
  currentRoundId: string,
  nextRoundId: string,
  participantIds: string[],
  advancedBy: string,
) {
  const roundSnap = await db.collection('round_participants')
    .where('roundId', '==', currentRoundId)
    .limit(1)
    .get();

  if (roundSnap.empty) return;
  const competitionId = roundSnap.docs[0].data().competitionId;

  const batch = db.batch();
  for (const userId of participantIds) {
    const snap = await db.collection('round_participants')
      .where('roundId', '==', currentRoundId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (!snap.empty) {
      batch.update(snap.docs[0].ref, {
        advancedToNextRound: true,
        advancedAt: new Date(),
        advancedBy,
        updatedAt: new Date(),
      });
    }

    const nextSnap = await db.collection('round_participants')
      .where('roundId', '==', nextRoundId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (nextSnap.empty) {
      const docRef = db.collection('round_participants').doc();
      batch.set(docRef, {
        id: docRef.id,
        roundId: nextRoundId,
        userId,
        competitionId,
        status: 'joined',
        joinedAt: new Date(),
        score: '0.00',
      });
    }
  }
  await batch.commit();
}

export async function deactivateParticipant(userId: string) {
  await db.collection('users').doc(userId).update({ isActive: false });
}
