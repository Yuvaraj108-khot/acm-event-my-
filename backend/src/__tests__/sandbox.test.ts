import 'dotenv/config';
import { describe, it, expect } from 'vitest';
import { executeCode } from '../jobs/sandbox.js';

describe('Code Execution Sandbox', () => {
  it('should successfully run JavaScript code and return accepted', async () => {
    const params = {
      languageSlug: 'javascript',
      sourceCode: `
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
          terminal: false
        });
        rl.on('line', (line) => {
          console.log(parseInt(line) * 2);
        });
      `,
      testCases: [
        { id: 'tc1', input: '5\n', expectedOutput: '10', isSample: true },
        { id: 'tc2', input: '10\n', expectedOutput: '20', isSample: false }
      ],
      timeLimitMs: 2000,
      memoryLimitMb: 256
    };

    const res = await executeCode(params);
    
    expect(res.compilationError).toBeUndefined();
    expect(res.overallStatus).toBe('accepted');
    expect(res.totalPassed).toBe(2);
    expect(res.testResults.length).toBe(2);

    // Verify sample testcase results are fully visible
    const sample = res.testResults.find(r => r.testCaseId === 'tc1');
    expect(sample).toBeDefined();
    expect(sample?.passed).toBe(true);
    expect(sample?.input).toBe('5\n');
    expect(sample?.expectedOutput).toBe('10');
    expect(sample?.actualOutput).toBe('10');

    // Verify hidden testcase results are strictly masked
    const hidden = res.testResults.find(r => r.testCaseId !== 'tc1');
    expect(hidden).toBeDefined();
    expect(hidden?.testCaseId).toBe('hidden_2'); // genericized id
    expect(hidden?.passed).toBe(true);
    expect(hidden?.input).toBe('[hidden]');
    expect(hidden?.expectedOutput).toBe('[hidden]');
    expect(hidden?.actualOutput).toBe('[correct]');
  });

  it('should detect wrong answers', async () => {
    const params = {
      languageSlug: 'javascript',
      sourceCode: `
        console.log('wrong output');
      `,
      testCases: [
        { id: 'tc1', input: '5\n', expectedOutput: '10', isSample: true },
        { id: 'tc2', input: '10\n', expectedOutput: '20', isSample: false }
      ],
      timeLimitMs: 2000,
      memoryLimitMb: 256
    };

    const res = await executeCode(params);
    expect(res.overallStatus).toBe('wrong_answer');
    expect(res.totalPassed).toBe(0);

    const hidden = res.testResults.find(r => r.testCaseId !== 'tc1');
    expect(hidden?.actualOutput).toBe('[wrong answer]');
  });

  it('should detect runtime errors and mask error messages for hidden test cases', async () => {
    const params = {
      languageSlug: 'javascript',
      sourceCode: `
        throw new Error('Explosion!');
      `,
      testCases: [
        { id: 'tc1', input: '5\n', expectedOutput: '10', isSample: true },
        { id: 'tc2', input: '10\n', expectedOutput: '20', isSample: false }
      ],
      timeLimitMs: 2000,
      memoryLimitMb: 256
    };

    const res = await executeCode(params);
    expect(res.overallStatus).toBe('runtime_error');

    const sample = res.testResults.find(r => r.testCaseId === 'tc1');
    expect(sample?.status).toBe('runtime_error');
    expect(sample?.errorMessage).toContain('Explosion!');

    const hidden = res.testResults.find(r => r.testCaseId !== 'tc1');
    expect(hidden?.status).toBe('runtime_error');
    expect(hidden?.errorMessage).toBe('Runtime error occurred on hidden test case');
  });

  it('should detect time limit exceeded', async () => {
    const params = {
      languageSlug: 'javascript',
      sourceCode: `
        while(true) {}
      `,
      testCases: [
        { id: 'tc1', input: '5\n', expectedOutput: '10', isSample: true }
      ],
      timeLimitMs: 300, // short time limit for testing
      memoryLimitMb: 256
    };

    const res = await executeCode(params);
    expect(res.overallStatus).toBe('time_limit_exceeded');
  });
});
