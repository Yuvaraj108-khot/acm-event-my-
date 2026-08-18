import { db } from '../config/db.js';
import { executeCode } from '../jobs/sandbox.js';
import type { CreateProblemInput, SubmitCodeInput } from '../validators/coding.js';
import { slugify } from '../utils/helpers.js';
import { getRound } from './roundService.js';

export async function getLanguages() {
  const snap = await db.collection('coding_languages')
    .where('isEnabled', '==', true)
    .get();
  return snap.docs.map((doc: any) => doc.data());
}

export async function getProblemsForRound(roundId: string, isAdmin = false) {
  const snap = await db.collection('coding_problems')
    .where('roundId', '==', roundId)
    .get();

  const problems = snap.docs.map((doc: any) => doc.data());

  // Sort by orderIndex ascending
  problems.sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));

  return problems.map((p: any) => {
    // Hide non-sample test cases from participants
    const testCases = (p.testCases || []).filter((tc: any) => isAdmin ? true : tc.isSample);
    
    // Sort test cases by orderIndex
    testCases.sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));

    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      description: p.description,
      inputFormat: p.inputFormat,
      outputFormat: p.outputFormat,
      constraints: p.constraints,
      difficulty: p.difficulty,
      points: p.points,
      timeLimitMs: p.timeLimitMs,
      memoryLimitMb: p.memoryLimitMb,
      orderIndex: p.orderIndex,
      tipDurationSeconds: p.tipDurationSeconds ?? 10,
      tips: p.tips || [],
      testCases,
    };
  });
}

export async function createProblem(data: CreateProblemInput) {
  const { testCases, ...problemData } = data;
  const slug = slugify(problemData.title) + '-' + Date.now();

  const docRef = db.collection('coding_problems').doc();
  const tcValues = testCases.map((tc, i) => ({
    id: db.collection('dummy').doc().id,
    input: tc.input,
    expectedOutput: tc.expectedOutput,
    isSample: tc.isSample,
    orderIndex: tc.orderIndex ?? i,
  }));

  const problem = {
    id: docRef.id,
    ...problemData,
    slug,
    points: String(problemData.points),
    testCases: tcValues,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await docRef.set(problem);
  return problem;
}

export async function updateProblem(id: string, data: Partial<CreateProblemInput>) {
  const docRef = db.collection('coding_problems').doc(id);
  const doc = await docRef.get();
  if (!doc.exists) throw Object.assign(new Error('Problem not found'), { statusCode: 404 });

  const { testCases, points, ...problemData } = data;

  const formattedData: any = {
    ...problemData,
    ...(points !== undefined ? { points: String(points) } : {}),
    updatedAt: new Date(),
  };

  if (testCases) {
    formattedData.testCases = testCases.map((tc, i) => ({
      id: db.collection('dummy').doc().id,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isSample: tc.isSample,
      orderIndex: tc.orderIndex ?? i,
    }));
  }

  await docRef.update(formattedData);
  const updatedDoc = await docRef.get();
  return updatedDoc.data();
}

export async function deleteProblem(id: string) {
  await db.collection('coding_problems').doc(id).delete();
}

export async function submitCode(data: SubmitCodeInput, userId: string) {
  const { problemId, roundId, languageId, sourceCode, isRunOnly } = data;

  // Verify round is active
  const round = await getRound(roundId);
  if (!round) throw Object.assign(new Error('Round not found'), { statusCode: 404 });
  if (!isRunOnly && round.status !== 'active') {
    throw Object.assign(new Error('Round is not active'), { statusCode: 400 });
  }

  // Get language
  const langSnap = await db.collection('coding_languages').doc(languageId).get();
  if (!langSnap.exists) throw Object.assign(new Error('Language not found'), { statusCode: 404 });
  const language = langSnap.data()!;

  // Get problem
  const probSnap = await db.collection('coding_problems').doc(problemId).get();
  if (!probSnap.exists) throw Object.assign(new Error('Problem not found'), { statusCode: 404 });
  const problem = probSnap.data()!;

  const allTestCases = problem.testCases || [];
  const testCasesToRun = isRunOnly ? allTestCases.filter((tc: any) => tc.isSample) : allTestCases;

  // Execute code
  const result = await executeCode({
    languageSlug: language.slug,
    sourceCode,
    testCases: testCasesToRun.map((tc: any) => ({
      id: tc.id,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isSample: tc.isSample,
    })),
    timeLimitMs: problem.timeLimitMs,
    memoryLimitMb: problem.memoryLimitMb,
  });

  // Calculate score
  const scorePercentage = result.totalTests > 0 ? result.totalPassed / result.totalTests : 0;
  const score = parseFloat(problem.points) * scorePercentage;

  const executionTimeMs = result.testResults.length > 0
    ? Math.max(...result.testResults.map(r => r.executionTimeMs))
    : 0;

  // Save submission (skip if run-only)
  if (!isRunOnly) {
    const subRef = db.collection('coding_submissions').doc();
    const submission = {
      id: subRef.id,
      problemId,
      roundId,
      userId,
      languageId,
      sourceCode,
      status: result.overallStatus,
      score: String(score),
      executionTimeMs,
      testCasesPassed: result.totalPassed,
      totalTestCases: result.totalTests,
      errorMessage: result.compilationError || null,
      testResults: result.testResults,
      submittedAt: new Date(),
      isRunOnly: false,
    };
    await subRef.set(submission);

    // Update round result (best score)
    await updateRoundBestScore(roundId, userId, round.competitionId);

    return { submission, result };
  }

  return { submission: null, result };
}

async function updateRoundBestScore(roundId: string, userId: string, competitionId: string) {
  // Get all submissions for this user in this round
  const snap = await db.collection('coding_submissions')
    .where('roundId', '==', roundId)
    .where('userId', '==', userId)
    .where('isRunOnly', '==', false)
    .get();

  let maxScore = 0;
  snap.docs.forEach(doc => {
    const scoreVal = parseFloat(doc.data().score || '0');
    if (scoreVal > maxScore) {
      maxScore = scoreVal;
    }
  });

  const totalScore = maxScore;

  // Upsert round results
  const resSnap = await db.collection('round_results')
    .where('roundId', '==', roundId)
    .where('userId', '==', userId)
    .limit(1)
    .get();

  const resData = {
    roundId,
    userId,
    competitionId,
    totalScore: String(totalScore),
    updatedAt: new Date(),
  };

  if (!resSnap.empty) {
    await resSnap.docs[0].ref.update(resData);
  } else {
    const rRef = db.collection('round_results').doc();
    await rRef.set({
      id: rRef.id,
      ...resData,
      createdAt: new Date(),
    });
  }

  // Update participant score in round_participants
  const pSnap = await db.collection('round_participants')
    .where('roundId', '==', roundId)
    .where('userId', '==', userId)
    .limit(1)
    .get();

  if (!pSnap.empty) {
    await pSnap.docs[0].ref.update({
      score: String(totalScore),
      updatedAt: new Date(),
    });
  }
}

export async function getUserSubmissions(problemId: string, userId: string) {
  const snap = await db.collection('coding_submissions')
    .where('problemId', '==', problemId)
    .where('userId', '==', userId)
    .get();

  const subs = snap.docs.map((doc: any) => doc.data());

  // Sort by submittedAt descending
  subs.sort((a: any, b: any) => {
    const aTime = a.submittedAt ? (a.submittedAt.toDate ? a.submittedAt.toDate().getTime() : new Date(a.submittedAt).getTime()) : 0;
    const bTime = b.submittedAt ? (b.submittedAt.toDate ? b.submittedAt.toDate().getTime() : new Date(b.submittedAt).getTime()) : 0;
    return bTime - aTime;
  });

  return subs.slice(0, 20).map(s => ({
    id: s.id,
    status: s.status,
    score: s.score,
    executionTimeMs: s.executionTimeMs,
    testCasesPassed: s.testCasesPassed,
    totalTestCases: s.totalTestCases,
    languageId: s.languageId,
    submittedAt: s.submittedAt,
    isRunOnly: s.isRunOnly,
  }));
}
