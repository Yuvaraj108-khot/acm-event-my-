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

    if (paginatedRegs.length === 0) return [];

    // Batch fetch users
    const userRefs = paginatedRegs.map((reg: any) => db.collection('users').doc(reg.userId));
    const userDocs = await db.getAll(...userRefs);
    const usersMap: Record<string, any> = {};
    userDocs.forEach((doc) => {
      if (doc.exists) {
        usersMap[doc.id] = doc.data();
      }
    });

    // Batch fetch profiles in chunks of 30 (Firestore "in" limit)
    const userIds = paginatedRegs.map((reg: any) => reg.userId);
    const profilesMap: Record<string, any> = {};
    const chunkSize = 30;
    for (let i = 0; i < userIds.length; i += chunkSize) {
      const chunk = userIds.slice(i, i + chunkSize);
      const profileSnap = await db.collection('profiles')
        .where('userId', 'in', chunk)
        .get();
      profileSnap.docs.forEach((doc) => {
        const data = doc.data();
        profilesMap[data.userId] = data;
      });
    }

    return paginatedRegs.map((reg: any) => {
      const userData = usersMap[reg.userId] || {};
      const profileData = profilesMap[reg.userId] || {};

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
        isActive: userData.isActive !== false,
      };
    });
  }

  const snap = await db.collection('users')
    .where('role', '==', 'participant')
    .get();

  const users = snap.docs.map((doc: any) => doc.data());
  const paginatedUsers = users.slice(offset, offset + limit);

  if (paginatedUsers.length === 0) return [];

  // Batch fetch profiles in chunks of 30
  const userIds = paginatedUsers.map((user: any) => user.id);
  const profilesMap: Record<string, any> = {};
  const chunkSize = 30;
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize);
    const profileSnap = await db.collection('profiles')
      .where('userId', 'in', chunk)
      .get();
    profileSnap.docs.forEach((doc) => {
      const data = doc.data();
      profilesMap[data.userId] = data;
    });
  }

  return paginatedUsers.map((user: any) => {
    const profileData = profilesMap[user.id] || {};

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
  });
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

    const docId = `${nextRoundId}_${userId}`;
    const docRef = db.collection('round_participants').doc(docId);
    batch.set(docRef, {
      id: docId,
      roundId: nextRoundId,
      userId,
      competitionId,
      status: 'joined',
      joinedAt: new Date(),
      score: '0.00',
    });
  }
  await batch.commit();
}

export async function deactivateParticipant(userId: string) {
  await db.collection('users').doc(userId).update({ isActive: false });
}

export async function reactivateParticipant(userId: string) {
  await db.collection('users').doc(userId).update({ isActive: true });
}
