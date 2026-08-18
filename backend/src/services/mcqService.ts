import { db } from '../config/db.js';
import { calculateMcqScore } from '../utils/helpers.js';
import type { CreateQuestionInput } from '../validators/mcq.js';
import { getRound } from './roundService.js';
import { calculateRoundRanks, rebuildCompetitionLeaderboard } from './leaderboardService.js';

export async function getQuestionsForRound(roundId: string, userId: string, isAdmin = false) {
  const snap = await db.collection('mcq_questions')
    .where('roundId', '==', roundId)
    .get();

  const questions = snap.docs.map((doc: any) => doc.data());

  // Sort by orderIndex
  questions.sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));

  // Get user's existing attempts
  let attempts: any[] = [];
  if (userId) {
    const attemptsSnap = await db.collection('quiz_attempts')
      .where('roundId', '==', roundId)
      .where('userId', '==', userId)
      .get();
    attempts = attemptsSnap.docs.map((doc: any) => doc.data());
  }

  const attemptMap = new Map(attempts.map(a => [a.questionId, a]));

  return questions.map(q => {
    // Hide isCorrect from options for non-admins
    const options = (q.options || []).map((o: any) => {
      const { isCorrect, ...userOpt } = o;
      return isAdmin ? o : userOpt;
    });

    return {
      id: q.id,
      questionText: q.questionText,
      questionImageUrl: q.questionImageUrl || null,
      difficulty: q.difficulty,
      points: q.points,
      orderIndex: q.orderIndex,
      options,
      userAnswer: attemptMap.get(q.id) || null,
    };
  });
}

export async function createQuestion(data: CreateQuestionInput) {
  const { options, ...questionData } = data;

  const docRef = db.collection('mcq_questions').doc();
  const optionValues = options.map((opt, idx) => ({
    id: db.collection('dummy').doc().id, // Generate a unique ID for the option
    optionText: opt.optionText,
    optionImageUrl: opt.optionImageUrl || null,
    isCorrect: opt.isCorrect,
    orderIndex: opt.orderIndex ?? idx,
  }));

  const formattedData = {
    id: docRef.id,
    ...questionData,
    points: String(questionData.points),
    options: optionValues,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await docRef.set(formattedData);
  return formattedData;
}

export async function updateQuestion(id: string, data: Partial<CreateQuestionInput>) {
  const docRef = db.collection('mcq_questions').doc(id);
  const doc = await docRef.get();
  if (!doc.exists) throw Object.assign(new Error('Question not found'), { statusCode: 404 });

  const { options, points, ...questionData } = data;

  const formattedData: any = {
    ...questionData,
    ...(points !== undefined ? { points: String(points) } : {}),
    updatedAt: new Date(),
  };

  if (options) {
    formattedData.options = options.map((opt, idx) => ({
      id: opt.optionImageUrl ? db.collection('dummy').doc().id : (idx + '').padStart(4, '0'),
      optionText: opt.optionText,
      optionImageUrl: opt.optionImageUrl || null,
      isCorrect: opt.isCorrect,
      orderIndex: opt.orderIndex ?? idx,
    }));
  }

  await docRef.update(formattedData);
  const updatedDoc = await docRef.get();
  return updatedDoc.data();
}

export async function deleteQuestion(id: string) {
  await db.collection('mcq_questions').doc(id).delete();
  
  // Clean up attempts
  const snap = await db.collection('quiz_attempts').where('questionId', '==', id).get();
  if (!snap.empty) {
    const batch = db.batch();
    snap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }
}

export async function saveAnswer(params: {
  roundId: string;
  userId: string;
  questionId: string;
  selectedOptionId: string | null;
  isMarkedForReview: boolean;
}) {
  const { roundId, userId, questionId, selectedOptionId, isMarkedForReview } = params;

  // Verify round is active
  const round = await getRound(roundId);
  if (!round || round.status !== 'active') {
    throw Object.assign(new Error('Round is not active'), { statusCode: 400 });
  }

  // Get question to verify option
  const qDoc = await db.collection('mcq_questions').doc(questionId).get();
  if (!qDoc.exists) throw Object.assign(new Error('Question not found'), { statusCode: 404 });
  const question = qDoc.data()!;

  let isCorrect: boolean | null = null;
  let pointsAwarded = '0';

  if (selectedOptionId) {
    const option = (question.options || []).find((o: any) => o.id === selectedOptionId);
    if (option) {
      isCorrect = !!option.isCorrect;
      const pts = parseFloat(question.points ?? '1');
      const negVal = parseFloat(round.negativeMarkingValue ?? '0');
      const score = calculateMcqScore(isCorrect, pts, round.negativeMarkingEnabled, negVal);
      pointsAwarded = String(score);
    }
  }

  // Find existing attempt for upsert using deterministic doc ID or query
  const attemptDocId = `${userId}_${questionId}`;
  const attemptRef = db.collection('quiz_attempts').doc(attemptDocId);
  const attemptSnap = await attemptRef.get();

  const attemptData = {
    id: attemptDocId,
    roundId,
    userId,
    questionId,
    selectedOptionId,
    isMarkedForReview,
    isCorrect,
    pointsAwarded,
    answeredAt: selectedOptionId ? new Date() : null,
    updatedAt: new Date(),
  };

  if (attemptSnap.exists) {
    await attemptRef.update(attemptData);
  } else {
    // Clean up any legacy non-deterministic attempt docs for this user and question
    const legacySnap = await db.collection('quiz_attempts')
      .where('roundId', '==', roundId)
      .where('userId', '==', userId)
      .where('questionId', '==', questionId)
      .get();
    
    if (!legacySnap.empty) {
      const batch = db.batch();
      legacySnap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    await attemptRef.set({
      ...attemptData,
      createdAt: new Date(),
    });
  }

  return { success: true };
}

export async function submitMcqRound(roundId: string, userId: string) {
  const round = await getRound(roundId);

  let totalScore = 0;
  let correct = 0;
  let attempted = 0;

  if (round.type === 'coding') {
    // Fetch valid problems
    const pSnap = await db.collection('coding_problems')
      .where('roundId', '==', roundId)
      .get();
    const validProblemIds = new Set(pSnap.docs.map((doc: any) => doc.id));

    // Fetch coding submissions
    const snap = await db.collection('coding_submissions')
      .where('roundId', '==', roundId)
      .where('userId', '==', userId)
      .where('isRunOnly', '==', false)
      .get();
    
    const subs = snap.docs
      .map((doc: any) => doc.data())
      .filter((s: any) => validProblemIds.has(s.problemId));
    
    // Group by problemId to get max score per problem
    const problemScores = new Map<string, { maxScore: number; status: string }>();
    subs.forEach((s: any) => {
      const prev = problemScores.get(s.problemId) || { maxScore: 0, status: 'failed' };
      const scoreVal = parseFloat(s.score || '0');
      problemScores.set(s.problemId, {
        maxScore: Math.max(prev.maxScore, scoreVal),
        status: s.status === 'accepted' || prev.status === 'accepted' ? 'accepted' : s.status,
      });
    });

    attempted = problemScores.size;
    problemScores.forEach(info => {
      totalScore += info.maxScore;
      if (info.status === 'accepted' || info.maxScore > 0) {
        correct++;
      }
    });
  } else {
    // MCQ round: fetch valid questions first
    const qSnap = await db.collection('mcq_questions')
      .where('roundId', '==', roundId)
      .get();
    const validQuestionIds = new Set(qSnap.docs.map((doc: any) => doc.id));

    // Fetch attempts
    const snap = await db.collection('quiz_attempts')
      .where('roundId', '==', roundId)
      .where('userId', '==', userId)
      .get();

    const attempts = snap.docs.map((doc: any) => doc.data());

    // Deduplicate by questionId and filter to valid questions in current round
    const attemptMap = new Map<string, any>();
    attempts.forEach((a: any) => {
      if (validQuestionIds.has(a.questionId)) {
        const existing = attemptMap.get(a.questionId);
        // Keep the attempt with selectedOptionId or the latest update
        if (!existing || (!existing.selectedOptionId && a.selectedOptionId)) {
          attemptMap.set(a.questionId, a);
        }
      }
    });

    attempted = Array.from(attemptMap.values()).filter((a: any) => a.selectedOptionId !== null && a.selectedOptionId !== undefined).length;

    attemptMap.forEach((a: any) => {
      totalScore += parseFloat(a.pointsAwarded || '0');
      if (a.isCorrect === true) {
        correct++;
      }
    });
  }

  totalScore = Math.max(0, totalScore);

  // Upsert round result using deterministic doc ID
  const resultDocId = `${userId}_${roundId}`;
  const resultRef = db.collection('round_results').doc(resultDocId);
  const resultSnap = await resultRef.get();

  const resultData = {
    id: resultDocId,
    roundId,
    userId,
    competitionId: round.competitionId,
    totalScore: String(totalScore),
    questionsAttempted: attempted,
    questionsCorrect: correct,
    updatedAt: new Date(),
  };

  if (resultSnap.exists) {
    await resultRef.update(resultData);
  } else {
    // Clean up any legacy non-deterministic round_result docs for this user and round
    const legacySnap = await db.collection('round_results')
      .where('roundId', '==', roundId)
      .where('userId', '==', userId)
      .get();

    if (!legacySnap.empty) {
      const batch = db.batch();
      legacySnap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    await resultRef.set({
      ...resultData,
      createdAt: new Date(),
    });
  }

  // Update participant status
  const pSnap = await db.collection('round_participants')
    .where('roundId', '==', roundId)
    .where('userId', '==', userId)
    .limit(1)
    .get();

  if (!pSnap.empty) {
    await pSnap.docs[0].ref.update({
      completedAt: new Date(),
      status: 'completed',
      score: String(totalScore),
      updatedAt: new Date(),
    });
  }

  // Calculate ranks and rebuild competition leaderboard
  await calculateRoundRanks(roundId);
  if (round?.competitionId) {
    await rebuildCompetitionLeaderboard(round.competitionId);
  }

  // Update total points in user profile (deduplicated by roundId)
  const userResultsSnap = await db.collection('round_results')
    .where('userId', '==', userId)
    .get();
  
  const roundScores = new Map<string, number>();
  userResultsSnap.docs.forEach((doc: any) => {
    const data = doc.data();
    roundScores.set(data.roundId, parseFloat(data.totalScore || '0'));
  });

  let overallPoints = 0;
  roundScores.forEach(score => {
    overallPoints += score;
  });

  const profileSnap = await db.collection('profiles')
    .where('userId', '==', userId)
    .limit(1)
    .get();

  if (!profileSnap.empty) {
    await profileSnap.docs[0].ref.update({
      totalPoints: String(overallPoints),
      updatedAt: new Date(),
    });
  }

  return { totalScore, questionsAttempted: attempted, questionsCorrect: correct };
}
