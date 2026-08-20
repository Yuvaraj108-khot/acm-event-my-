import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { env } from '../config/env.js';

const execFileAsync = promisify(execFile);

export interface SandboxResult {
  status: 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'memory_limit_exceeded' | 'compilation_error' | 'runtime_error';
  output: string;
  errorOutput: string;
  executionTimeMs: number;
  memoryUsedKb: number;
}

export interface TestCaseResult {
  testCaseId: string;
  passed: boolean;
  status: SandboxResult['status'];
  executionTimeMs: number;
  memoryUsedKb: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  errorMessage?: string;
}

interface Language {
  slug: string;
  compile?: (srcFile: string, outFile: string) => { cmd: string; args: string[] };
  run: (srcFile: string, outFile: string) => { cmd: string; args: string[] };
  extension: string;
}

const isWindows = process.platform === 'win32';
const exeExtension = isWindows ? '.exe' : '';
const pythonCmd = isWindows ? 'python' : 'python3';

const LANGUAGES: Record<string, Language> = {
  c: {
    slug: 'c',
    extension: '.c',
    compile: (srcFile, outFile) => ({ cmd: 'gcc', args: [srcFile, '-o', outFile, '-O2', '-Wall', '-lm'] }),
    run: (_srcFile, outFile) => ({ cmd: outFile, args: [] }),
  },
  cpp: {
    slug: 'cpp',
    extension: '.cpp',
    compile: (srcFile, outFile) => ({ cmd: 'g++', args: [srcFile, '-o', outFile, '-O2', '-std=c++17', '-lm'] }),
    run: (_srcFile, outFile) => ({ cmd: outFile, args: [] }),
  },
  java: {
    slug: 'java',
    extension: '.java',
    compile: (srcFile) => ({ cmd: 'javac', args: [srcFile] }),
    run: (srcFile) => ({ cmd: 'java', args: ['-cp', path.dirname(srcFile), 'Solution'] }),
  },
  python: {
    slug: 'python',
    extension: '.py',
    run: (srcFile) => ({ cmd: pythonCmd, args: [srcFile] }),
  },
  javascript: {
    slug: 'javascript',
    extension: '.js',
    run: (srcFile) => ({ cmd: 'node', args: [srcFile] }),
  },
};

/**
 * Executes a single test case against the given code.
 */
async function runTestCase(
  workDir: string,
  srcFile: string,
  compiledFile: string,
  langConfig: Language,
  input: string,
  timeLimitMs: number,
): Promise<{ stdout: string; stderr: string; timeMs: number; timedOut: boolean }> {
  return new Promise((resolve) => {
    const { cmd, args } = langConfig.run(srcFile, compiledFile);
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const child = spawn(cmd, args, {
      cwd: workDir,
      timeout: timeLimitMs,
    });

    if (child.stdin) {
      child.stdin.write(input);
      child.stdin.end();
    }

    child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeLimitMs);

    child.on('close', () => {
      clearTimeout(timer);
      const timeMs = Date.now() - startTime;
      resolve({ stdout, stderr, timeMs, timedOut });
    });

    child.on('error', (err: any) => {
      clearTimeout(timer);
      const timeMs = Date.now() - startTime;
      let errMsg = err.message;
      if (err.code === 'ENOENT') {
        errMsg = `Runtime command '${cmd}' is not installed or not found on the host machine.`;
      }
      resolve({ stdout, stderr: errMsg, timeMs, timedOut: false });
    });
  });
}

/**
 * Main sandbox execution function.
 * Compiles (if needed) and runs code against all test cases.
 */
export async function executeCode(params: {
  languageSlug: string;
  sourceCode: string;
  testCases: Array<{ id: string; input: string; expectedOutput: string; isSample: boolean }>;
  timeLimitMs: number;
  memoryLimitMb: number;
}): Promise<{
  compilationError?: string;
  testResults: TestCaseResult[];
  overallStatus: SandboxResult['status'];
  totalPassed: number;
  totalTests: number;
}> {
  const { languageSlug, sourceCode, testCases, timeLimitMs } = params;

  const langConfig = LANGUAGES[languageSlug];
  if (!langConfig) {
    throw new Error(`Unsupported language: ${languageSlug}`);
  }

  // Create temp working directory
  const workDir = path.join(os.tmpdir(), `acm-sandbox-${randomUUID()}`);
  await fs.mkdir(workDir, { recursive: true });

  const srcFileName = langConfig.slug === 'java' ? 'Solution.java' : `solution${langConfig.extension}`;
  const srcFile = path.join(workDir, srcFileName);
  const compiledFile = path.join(workDir, langConfig.slug === 'java' ? 'Solution' : `solution${exeExtension}`);

  try {
    // Write source code
    await fs.writeFile(srcFile, sourceCode, 'utf-8');

    // Compile (if needed)
    if (langConfig.compile) {
      let compilerCmd = '';
      try {
        const { cmd, args } = langConfig.compile(srcFile, compiledFile);
        compilerCmd = cmd;
        await execFileAsync(cmd, args, {
          timeout: 30000,
          cwd: workDir,
        });
      } catch (err: any) {
        let errMsg = err instanceof Error ? err.message : String(err);
        if (err.code === 'ENOENT') {
          errMsg = `Compiler command '${compilerCmd}' is not installed or not found on the host machine. Please ensure Java JDK (for javac) or GCC (for gcc/g++) is installed.`;
        }
        return {
          compilationError: errMsg,
          testResults: [],
          overallStatus: 'compilation_error',
          totalPassed: 0,
          totalTests: testCases.length,
        };
      }
    }

    // Run each test case
    const testResults: TestCaseResult[] = [];
    let allPassed = true;
    let anyTle = false;

    for (const tc of testCases) {
      const { stdout, stderr, timeMs, timedOut } = await runTestCase(
        workDir,
        srcFile,
        compiledFile,
        langConfig,
        tc.input,
        timeLimitMs + 500, // add buffer
      );

      if (timedOut || timeMs > timeLimitMs) {
        testResults.push({
          testCaseId: tc.id,
          passed: false,
          status: 'time_limit_exceeded',
          executionTimeMs: timeMs,
          memoryUsedKb: 0,
          input: tc.isSample ? tc.input : '[hidden]',
          expectedOutput: tc.isSample ? tc.expectedOutput : '[hidden]',
          actualOutput: '[time limit exceeded]',
        });
        allPassed = false;
        anyTle = true;
        continue;
      }

      if (stderr && !stdout) {
        testResults.push({
          testCaseId: tc.id,
          passed: false,
          status: 'runtime_error',
          executionTimeMs: timeMs,
          memoryUsedKb: 0,
          input: tc.isSample ? tc.input : '[hidden]',
          expectedOutput: tc.isSample ? tc.expectedOutput : '[hidden]',
          actualOutput: '',
          errorMessage: stderr.substring(0, 500),
        });
        allPassed = false;
        continue;
      }

      const actualOutput = stdout.trim();
      const expectedOutput = tc.expectedOutput.trim();
      const passed = actualOutput === expectedOutput;

      testResults.push({
        testCaseId: tc.id,
        passed,
        status: passed ? 'accepted' : 'wrong_answer',
        executionTimeMs: timeMs,
        memoryUsedKb: 0,
        input: tc.isSample ? tc.input : '[hidden]',
        expectedOutput: tc.isSample ? tc.expectedOutput : '[hidden]',
        actualOutput: tc.isSample ? actualOutput : (passed ? '[correct]' : '[wrong answer]'),
      });

      if (!passed) allPassed = false;
    }

    const totalPassed = testResults.filter(r => r.passed).length;
    let overallStatus: SandboxResult['status'] = allPassed ? 'accepted' : 'wrong_answer';
    if (anyTle) overallStatus = 'time_limit_exceeded';
    if (testResults.some(r => r.status === 'runtime_error')) overallStatus = 'runtime_error';

    return { testResults, overallStatus, totalPassed, totalTests: testCases.length };
  } finally {
    // Clean up temp directory
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
