import 'dotenv/config';
import { db } from '../config/db.js';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding Firestore database...');

  try {
    // ── Super Admin ────────────────────────────────────────────────────────────
    console.log('  → Creating super admin...');
    const adminSnap = await db.collection('users')
      .where('email', '==', 'yuvarajkhot2005@gmail.com')
      .limit(1)
      .get();

    let adminId: string;
    const passwordHash = await bcrypt.hash('123456', 10);

    if (adminSnap.empty) {
      const adminRef = db.collection('users').doc();
      adminId = adminRef.id;
      await adminRef.set({
        id: adminId,
        email: 'yuvarajkhot2005@gmail.com',
        role: 'super_admin',
        passwordHash,
        isActive: true,
        profileCompleted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('  ✅ Super admin created: yuvarajkhot2005@gmail.com');
    } else {
      adminId = adminSnap.docs[0].id;
      await db.collection('users').doc(adminId).update({
        role: 'super_admin',
        passwordHash,
        isActive: true,
        updatedAt: new Date(),
      });
      console.log('  ✅ Super admin already exists, role verified and password updated.');
    }

    // ── Coding Languages ───────────────────────────────────────────────────────
    console.log('  → Seeding coding languages...');
    const languagesToSeed = [
      {
        name: 'C',
        slug: 'c',
        version: 'GCC 13',
        monacoLanguage: 'c',
        starterCode: `#include <stdio.h>\n\nint main() {\n    // Your code here\n    return 0;\n}\n`,
        isEnabled: true,
      },
      {
        name: 'C++',
        slug: 'cpp',
        version: 'GCC 13 (C++17)',
        monacoLanguage: 'cpp',
        starterCode: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    // Your code here\n    \n    return 0;\n}\n`,
        isEnabled: true,
      },
      {
        name: 'Java',
        slug: 'java',
        version: 'Java 21',
        monacoLanguage: 'java',
        starterCode: `import java.util.*;\nimport java.io.*;\n\npublic class Solution {\n    public static void main(String[] args) throws IOException {\n        Scanner sc = new Scanner(System.in);\n        // Your code here\n    }\n}\n`,
        isEnabled: true,
      },
      {
        name: 'Python',
        slug: 'python',
        version: 'Python 3.11',
        monacoLanguage: 'python',
        starterCode: `import sys\ninput = sys.stdin.readline\n\ndef solve():\n    # Your code here\n    pass\n\nsolve()\n`,
        isEnabled: true,
      },
      {
        name: 'JavaScript',
        slug: 'javascript',
        version: 'Node.js 20',
        monacoLanguage: 'javascript',
        starterCode: `const readline = require('readline');\nconst rl = readline.createInterface({ input: process.stdin });\nconst lines = [];\nrl.on('line', (line) => lines.push(line.trim()));\nrl.on('close', () => {\n    // Your code here\n});\n`,
        isEnabled: true,
      },
    ];

    for (const lang of languagesToSeed) {
      const langSnap = await db.collection('coding_languages')
        .where('slug', '==', lang.slug)
        .limit(1)
        .get();

      if (langSnap.empty) {
        const docRef = db.collection('coding_languages').doc();
        await docRef.set({
          id: docRef.id,
          ...lang,
          createdAt: new Date(),
        });
        console.log(`  ✅ Language seeded: ${lang.name}`);
      } else {
        console.log(`  ℹ️  Language already exists: ${lang.name}`);
      }
    }

    // ── Demo Competition ───────────────────────────────────────────────────────
    console.log('  → Creating demo competition...');
    const compSnap = await db.collection('competitions')
      .where('slug', '==', 'acm-code-challenge-2024')
      .limit(1)
      .get();

    let compId: string;

    if (compSnap.empty) {
      const compRef = db.collection('competitions').doc();
      compId = compRef.id;

      await compRef.set({
        id: compId,
        title: 'ACM Code Challenge 2024',
        slug: 'acm-code-challenge-2024',
        description: 'The flagship ACM NMAMIT programming competition featuring MCQ and coding rounds to test your algorithmic thinking and problem-solving skills.',
        shortDescription: 'ACM NMAMIT flagship programming competition',
        status: 'published',
        isPublic: true,
        maxParticipants: 200,
        registrationStartsAt: new Date(),
        registrationEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        startsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('  ✅ Demo competition created');

      // MCQ Round
      const mcqRoundRef = db.collection('rounds').doc();
      const mcqRoundId = mcqRoundRef.id;
      await mcqRoundRef.set({
        id: mcqRoundId,
        competitionId: compId,
        title: 'Round 1: MCQ Elimination',
        description: 'Test your theoretical knowledge with 20 multiple choice questions covering Data Structures, Algorithms, and Computer Science fundamentals.',
        type: 'mcq',
        orderIndex: 0,
        status: 'upcoming',
        durationMinutes: 30,
        maxPoints: '20',
        negativeMarkingEnabled: true,
        negativeMarkingValue: '0.25',
        maxAdvancingParticipants: 50,
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Coding Round
      const codingRoundRef = db.collection('rounds').doc();
      const codingRoundId = codingRoundRef.id;
      await codingRoundRef.set({
        id: codingRoundId,
        competitionId: compId,
        title: 'Round 2: Coding Challenge',
        description: 'Solve 3 algorithmic problems of varying difficulty. Only participants who pass Round 1 can participate.',
        type: 'coding',
        orderIndex: 1,
        status: 'upcoming',
        durationMinutes: 90,
        maxPoints: '300',
        isPublished: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Add sample MCQ questions
      const sampleQuestions = [
        {
          text: 'What is the time complexity of binary search on a sorted array of n elements?',
          options: [
            { text: 'O(n)', correct: false },
            { text: 'O(log n)', correct: true },
            { text: 'O(n log n)', correct: false },
            { text: 'O(1)', correct: false },
          ],
          explanation: 'Binary search divides the search space in half at each step, giving O(log n) time complexity.',
        },
        {
          text: 'Which data structure uses LIFO (Last In First Out) ordering?',
          options: [
            { text: 'Queue', correct: false },
            { text: 'Stack', correct: true },
            { text: 'Linked List', correct: false },
            { text: 'Priority Queue', correct: false },
          ],
          explanation: 'A Stack follows LIFO ordering where the last element inserted is the first to be removed.',
        },
        {
          text: 'What is the worst-case time complexity of QuickSort?',
          options: [
            { text: 'O(n log n)', correct: false },
            { text: 'O(n)', correct: false },
            { text: 'O(n²)', correct: true },
            { text: 'O(log n)', correct: false },
          ],
          explanation: 'QuickSort has O(n²) worst case when the pivot is always the smallest or largest element.',
        },
      ];

      for (let i = 0; i < sampleQuestions.length; i++) {
        const q = sampleQuestions[i];
        const qRef = db.collection('mcq_questions').doc();
        const optionsValues = q.options.map((opt, oIdx) => ({
          id: db.collection('dummy').doc().id,
          optionText: opt.text,
          isCorrect: opt.correct,
          orderIndex: oIdx,
        }));

        await qRef.set({
          id: qRef.id,
          roundId: mcqRoundId,
          questionText: q.text,
          explanation: q.explanation,
          difficulty: 'medium',
          points: '1',
          orderIndex: i,
          options: optionsValues,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      console.log('  ✅ Sample MCQ questions added');

      // Add sample coding problem
      const pRef = db.collection('coding_problems').doc();
      const problemId = pRef.id;

      const testCases = [
        {
          id: db.collection('dummy').doc().id,
          input: '4 9\n2 7 11 15',
          expectedOutput: '0 1',
          isSample: true,
          explanation: 'nums[0] + nums[1] = 2 + 7 = 9',
          orderIndex: 0,
        },
        {
          id: db.collection('dummy').doc().id,
          input: '3 6\n3 2 4',
          expectedOutput: '1 2',
          isSample: true,
          explanation: 'nums[1] + nums[2] = 2 + 4 = 6',
          orderIndex: 1,
        },
        {
          id: db.collection('dummy').doc().id,
          input: '10 10\n1 5 3 7 2 9 4 6 8 0',
          expectedOutput: '0 5',
          isSample: false,
          orderIndex: 2,
        },
      ];

      await pRef.set({
        id: problemId,
        roundId: codingRoundId,
        title: 'Two Sum',
        slug: 'two-sum',
        description: 'Given an array of integers `nums` and an integer `target`, return the **indices** of the two numbers that add up to the target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
        inputFormat: 'First line: n (size of array) and target (space separated)\nSecond line: n space-separated integers',
        outputFormat: 'Two space-separated integers: the indices (0-indexed) of the two numbers',
        constraints: '2 ≤ n ≤ 10⁴\n-10⁹ ≤ nums[i] ≤ 10⁹\n-10⁹ ≤ target ≤ 10⁹',
        difficulty: 'easy',
        points: '100',
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        orderIndex: 0,
        testCases,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('  ✅ Sample coding problem added');
    } else {
      console.log('  ℹ️  Demo competition already exists');
    }

    console.log('\n✅ Firestore database seeded successfully!');
    console.log('\n📝 Login credentials:');
    console.log('   Super Admin: yuvarajkhot2005@gmail.com');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
