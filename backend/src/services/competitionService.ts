import { db } from '../config/db.js';
import { slugify } from '../utils/helpers.js';
import type { CreateCompetitionInput, UpdateCompetitionInput } from '../validators/competitions.js';

export async function listCompetitions(params: {
  status?: string;
  page: number;
  limit: number;
  search?: string;
  isAdmin?: boolean;
}) {
  const { page, limit, status, search, isAdmin = false } = params;

  let query: any = db.collection('competitions');

  if (status) {
    query = query.where('status', '==', status);
  }
  if (!isAdmin) {
    query = query.where('isPublic', '==', true);
  }

  const snapshot = await query.get();
  let comps = snapshot.docs.map((doc: any) => doc.data());

  // Filter by search term manually
  if (search) {
    const searchLower = search.toLowerCase();
    comps = comps.filter((c: any) => c.title && c.title.toLowerCase().includes(searchLower));
  }

  // Sort by createdAt descending
  comps.sort((a: any, b: any) => {
    const aTime = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime()) : 0;
    const bTime = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime()) : 0;
    return bTime - aTime;
  });

  const total = comps.length;
  const offset = (page - 1) * limit;
  const paginatedComps = comps.slice(offset, offset + limit);

  // Fetch registration counts
  const data = await Promise.all(paginatedComps.map(async (comp: any) => {
    const regSnap = await db.collection('competition_registrations')
      .where('competitionId', '==', comp.id)
      .get();
    return {
      ...comp,
      registrationCount: regSnap.size,
    };
  }));

  return { data, total };
}

export async function getCompetition(id: string, isAdmin = false) {
  const doc = await db.collection('competitions').doc(id).get();
  if (!doc.exists) throw Object.assign(new Error('Competition not found'), { statusCode: 404 });
  const comp = doc.data()!;
  if (!isAdmin && !comp.isPublic) throw Object.assign(new Error('Competition not found'), { statusCode: 404 });
  return comp;
}

export async function getCompetitionBySlug(slug: string) {
  const snap = await db.collection('competitions').where('slug', '==', slug).limit(1).get();
  if (snap.empty) throw Object.assign(new Error('Competition not found'), { statusCode: 404 });
  return snap.docs[0].data();
}

export async function createCompetition(data: CreateCompetitionInput, createdBy: string) {
  const slug = slugify(data.title) + '-' + Date.now();
  const docRef = db.collection('competitions').doc();
  const formatted = {
    id: docRef.id,
    title: data.title,
    description: data.description,
    shortDescription: data.shortDescription || null,
    bannerUrl: data.bannerUrl || null,
    status: 'draft',
    isPublic: data.isPublic !== undefined ? data.isPublic : false,
    maxParticipants: data.maxParticipants !== undefined ? data.maxParticipants : null,
    registrationStartsAt: data.registrationStartsAt ? new Date(data.registrationStartsAt) : null,
    registrationEndsAt: data.registrationEndsAt ? new Date(data.registrationEndsAt) : null,
    startsAt: data.startsAt ? new Date(data.startsAt) : null,
    endsAt: data.endsAt ? new Date(data.endsAt) : null,
    slug,
    createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await docRef.set(formatted);
  return formatted;
}

export async function updateCompetition(id: string, data: UpdateCompetitionInput) {
  const docRef = db.collection('competitions').doc(id);
  const doc = await docRef.get();
  if (!doc.exists) throw Object.assign(new Error('Competition not found'), { statusCode: 404 });

  const { registrationStartsAt, registrationEndsAt, startsAt, endsAt, ...compData } = data;
  const formatted: any = {
    ...compData,
    ...(registrationStartsAt !== undefined ? { registrationStartsAt: registrationStartsAt ? new Date(registrationStartsAt) : null } : {}),
    ...(registrationEndsAt !== undefined ? { registrationEndsAt: registrationEndsAt ? new Date(registrationEndsAt) : null } : {}),
    ...(startsAt !== undefined ? { startsAt: startsAt ? new Date(startsAt) : null } : {}),
    ...(endsAt !== undefined ? { endsAt: endsAt ? new Date(endsAt) : null } : {}),
    updatedAt: new Date(),
  };

  await docRef.update(formatted);
  const updatedDoc = await docRef.get();
  return updatedDoc.data();
}

export async function deleteCompetition(id: string) {
  // 1. Delete competition document
  await db.collection('competitions').doc(id).delete();

  // 2. Delete competition registrations
  const regSnap = await db.collection('competition_registrations').where('competitionId', '==', id).get();
  if (!regSnap.empty) {
    const batch = db.batch();
    regSnap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  // 3. Delete rounds for this competition
  const roundsSnap = await db.collection('rounds').where('competitionId', '==', id).get();
  for (const rDoc of roundsSnap.docs) {
    const roundId = rDoc.id;
    // Delete round questions & problems
    const mcqSnap = await db.collection('mcq_questions').where('roundId', '==', roundId).get();
    if (!mcqSnap.empty) {
      const b = db.batch();
      mcqSnap.docs.forEach(d => b.delete(d.ref));
      await b.commit();
    }
    const codingSnap = await db.collection('coding_problems').where('roundId', '==', roundId).get();
    if (!codingSnap.empty) {
      const b = db.batch();
      codingSnap.docs.forEach(d => b.delete(d.ref));
      await b.commit();
    }
    // Delete round participants & results
    const rpSnap = await db.collection('round_participants').where('roundId', '==', roundId).get();
    if (!rpSnap.empty) {
      const b = db.batch();
      rpSnap.docs.forEach(d => b.delete(d.ref));
      await b.commit();
    }
    const resSnap = await db.collection('round_results').where('roundId', '==', roundId).get();
    if (!resSnap.empty) {
      const b = db.batch();
      resSnap.docs.forEach(d => b.delete(d.ref));
      await b.commit();
    }
    // Delete the round doc
    await rDoc.ref.delete();
  }
}

export async function registerForCompetition(competitionId: string, userId: string) {
  const comp = await getCompetition(competitionId);
  if (comp.status === 'completed' || comp.status === 'cancelled') {
    throw Object.assign(new Error('Registration is closed for this competition'), { statusCode: 400 });
  }

  const existing = await db.collection('competition_registrations')
    .where('competitionId', '==', competitionId)
    .where('userId', '==', userId)
    .limit(1)
    .get();

  if (!existing.empty) {
    throw Object.assign(new Error('Already registered for this competition'), { statusCode: 409 });
  }

  if (comp.maxParticipants) {
    const regSnap = await db.collection('competition_registrations')
      .where('competitionId', '==', competitionId)
      .get();
    if (regSnap.size >= comp.maxParticipants) {
      throw Object.assign(new Error('Competition is full'), { statusCode: 409 });
    }
  }

  const docId = `${competitionId}_${userId}`;
  const regRef = db.collection('competition_registrations').doc(docId);
  const reg = {
    id: docId,
    competitionId,
    userId,
    status: 'registered',
    createdAt: new Date(),
  };
  await regRef.set(reg);
  return reg;
}

export async function getUserRegistration(competitionId: string, userId: string) {
  const snap = await db.collection('competition_registrations')
    .where('competitionId', '==', competitionId)
    .where('userId', '==', userId)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0].data();
}
