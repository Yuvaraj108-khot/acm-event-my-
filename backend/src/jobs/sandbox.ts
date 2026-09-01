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

const DOCKER_IMAGES: Record<string, string> = {
  c: 'gcc:14-alpine',
  cpp: 'gcc:14-alpine',
  java: 'openjdk:17-alpine',
  python: 'python:3.11-alpine',
  javascript: 'node:20-alpine',
};

/**
 * Executes a single test case against the given code on the host (fallback).
 */
async function runTestCase(
  workDir: string,
  srcFile: string,
  compiledFile: string,
  langConfig: Language,
  input: string,
  timeLimitMs: number,
): Promise<{ stdout: string; stderr: string; timeMs: number; memoryKb: number; timedOut: boolean }> {
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
      resolve({ stdout, stderr, timeMs, memoryKb: 0, timedOut });
    });

    child.on('error', (err: any) => {
      clearTimeout(timer);
      const timeMs = Date.now() - startTime;
      let errMsg = err.message;
      if (err.code === 'ENOENT') {
        errMsg = `Runtime command '${cmd}' is not installed or not found on the host machine.`;
      }
      resolve({ stdout, stderr: errMsg, timeMs, memoryKb: 0, timedOut: false });
    });
  });
}

/**
 * Executes a single test case inside an isolated Docker container.
 */
async function runTestCaseDocker(
  workDir: string,
  langConfig: Language,
  input: string,
  timeLimitMs: number,
  memoryLimitMb: number,
): Promise<{ stdout: string; stderr: string; timeMs: number; memoryKb: number; timedOut: boolean; oomKilled: boolean }> {
  return new Promise((resolve) => {
    const containerName = `acm-run-${randomUUID()}`;
    const hostDir = workDir.replace(/\\/g, '/');
    const secret = randomUUID();
    const imageName = DOCKER_IMAGES[langConfig.slug] || 'alpine';
    
    const runCmd = langConfig.slug === 'java'
      ? 'java Solution'
      : (langConfig.slug === 'python'
         ? 'python solution.py'
         : (langConfig.slug === 'javascript'
            ? 'node solution.js'
            : './solution'));

    // Command runner inside Alpine shell. Appends peak memory and exit code securely.
    const shellScript = `${runCmd}; code=$?; echo ""; echo "===EXIT_CODE_${secret}==="; echo "$code"; echo "===MAX_MEM_${secret}==="; cat /sys/fs/cgroup/memory.peak 2>/dev/null || cat /sys/fs/cgroup/memory/memory.max_usage_in_bytes 2>/dev/null || echo 0; exit $code`;

    const dockerArgs = [
      'run',
      '--rm',
      '-i',
      '--name', containerName,
      '--network', 'none',
      `--memory=${memoryLimitMb}m`,
      '--cpus=1.0',
      '--pids-limit=50',
      '--read-only',
      '-v', `${hostDir}:/app:ro`,
      '-w', '/app',
      '--user', '1000:1000',
      imageName,
      '/bin/sh', '-c', shellScript
    ];

    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const child = spawn('docker', dockerArgs);

    if (child.stdin) {
      child.stdin.write(input);
      child.stdin.end();
    }

    child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
      // Terminate container running on daemon
      execFile('docker', ['rm', '-f', containerName], () => {});
    }, timeLimitMs);

    child.on('close', (code) => {
      clearTimeout(timer);
      const timeMs = Date.now() - startTime;
      
      const exitCodeMarker = `===EXIT_CODE_${secret}===`;
      const maxMemMarker = `===MAX_MEM_${secret}===`;
      
      let actualOutput = stdout;
      let parsedExitCode = code ?? 0;
      let parsedMemoryBytes = 0;

      if (stdout.includes(exitCodeMarker) && stdout.includes(maxMemMarker)) {
        const parts = stdout.split(exitCodeMarker);
        actualOutput = parts[0];
        
        const rest = parts[1];
        const memParts = rest.split(maxMemMarker);
        
        parsedExitCode = parseInt(memParts[0].trim(), 10);
        parsedMemoryBytes = parseInt(memParts[1].trim(), 10);
      }

      const memoryKb = Math.round(parsedMemoryBytes / 1024);
      
      let oomKilled = false;
      if (!timedOut && (code === 137 || parsedExitCode === 137 || stderr.includes('Out of memory') || stderr.includes('Killed'))) {
        oomKilled = true;
      }
      
      if (memoryKb >= memoryLimitMb * 1024) {
        oomKilled = true;
      }

      resolve({
        stdout: actualOutput,
        stderr: oomKilled ? 'Out of memory' : stderr,
        timeMs,
        memoryKb,
        timedOut,
        oomKilled
      });
    });

    child.on('error', (err: any) => {
      clearTimeout(timer);
      const timeMs = Date.now() - startTime;
      resolve({
        stdout,
        stderr: err.message,
        timeMs,
        memoryKb: 0,
        timedOut: false,
        oomKilled: false
      });
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
  const { languageSlug, sourceCode, testCases, timeLimitMs, memoryLimitMb } = params;

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

    // Compile step
    if (langConfig.compile) {
      if (env.USE_DOCKER_SANDBOX) {
        try {
          const hostDir = workDir.replace(/\\/g, '/');
          const compileCmdArgs = langConfig.slug === 'java'
            ? ['run', '--rm', '-v', `${hostDir}:/app`, '-w', '/app', 'openjdk:17-alpine', 'javac', 'Solution.java']
            : (langConfig.slug === 'c'
               ? ['run', '--rm', '-v', `${hostDir}:/app`, '-w', '/app', 'gcc:14-alpine', 'gcc', 'solution.c', '-o', 'solution', '-O2', '-Wall', '-lm']
               : ['run', '--rm', '-v', `${hostDir}:/app`, '-w', '/app', 'gcc:14-alpine', 'g++', 'solution.cpp', '-o', 'solution', '-O2', '-std=c++17', '-lm']);
          
          await execFileAsync('docker', compileCmdArgs, {
            timeout: 30000,
            cwd: workDir,
          });
        } catch (err: any) {
          const errMsg = err.stderr || err.message || String(err);
          return {
            compilationError: errMsg,
            testResults: [],
            overallStatus: 'compilation_error',
            totalPassed: 0,
            totalTests: testCases.length,
          };
        }
      } else {
        // Fallback compile on host
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
    }

    // Run test cases
    const testResults: TestCaseResult[] = [];
    let allPassed = true;
    let anyTle = false;
    let anyMle = false;
    let anyRe = false;

    for (const tc of testCases) {
      let stdout = '';
      let stderr = '';
      let timeMs = 0;
      let memoryKb = 0;
      let timedOut = false;
      let oomKilled = false;

      if (env.USE_DOCKER_SANDBOX) {
        const runRes = await runTestCaseDocker(
          workDir,
          langConfig,
          tc.input,
          timeLimitMs + 500, // buffer time
          memoryLimitMb,
        );
        stdout = runRes.stdout;
        stderr = runRes.stderr;
        timeMs = runRes.timeMs;
        memoryKb = runRes.memoryKb;
        timedOut = runRes.timedOut;
        oomKilled = runRes.oomKilled;
      } else {
        // Fallback host run
        const runRes = await runTestCase(
          workDir,
          srcFile,
          compiledFile,
          langConfig,
          tc.input,
          timeLimitMs + 500,
        );
        stdout = runRes.stdout;
        stderr = runRes.stderr;
        timeMs = runRes.timeMs;
        memoryKb = runRes.memoryKb;
        timedOut = runRes.timedOut;
      }

      const virtualTestCaseId = tc.isSample ? tc.id : `hidden_${testResults.length + 1}`;

      if (timedOut || timeMs > timeLimitMs) {
        testResults.push({
          testCaseId: virtualTestCaseId,
          passed: false,
          status: 'time_limit_exceeded',
          executionTimeMs: timeMs,
          memoryUsedKb: memoryKb,
          input: tc.isSample ? tc.input : '[hidden]',
          expectedOutput: tc.isSample ? tc.expectedOutput : '[hidden]',
          actualOutput: '[time limit exceeded]',
        });
        allPassed = false;
        anyTle = true;
        continue;
      }

      if (oomKilled) {
        testResults.push({
          testCaseId: virtualTestCaseId,
          passed: false,
          status: 'memory_limit_exceeded',
          executionTimeMs: timeMs,
          memoryUsedKb: memoryKb,
          input: tc.isSample ? tc.input : '[hidden]',
          expectedOutput: tc.isSample ? tc.expectedOutput : '[hidden]',
          actualOutput: '[memory limit exceeded]',
        });
        allPassed = false;
        anyMle = true;
        continue;
      }

      if (stderr && !stdout) {
        testResults.push({
          testCaseId: virtualTestCaseId,
          passed: false,
          status: 'runtime_error',
          executionTimeMs: timeMs,
          memoryUsedKb: memoryKb,
          input: tc.isSample ? tc.input : '[hidden]',
          expectedOutput: tc.isSample ? tc.expectedOutput : '[hidden]',
          actualOutput: '',
          errorMessage: tc.isSample ? stderr.substring(0, 500) : 'Runtime error occurred on hidden test case',
        });
        allPassed = false;
        anyRe = true;
        continue;
      }

      const actualOutput = stdout.trim();
      const expectedOutput = tc.expectedOutput.trim();
      const passed = actualOutput === expectedOutput;

      testResults.push({
        testCaseId: virtualTestCaseId,
        passed,
        status: passed ? 'accepted' : 'wrong_answer',
        executionTimeMs: timeMs,
        memoryUsedKb: memoryKb,
        input: tc.isSample ? tc.input : '[hidden]',
        expectedOutput: tc.isSample ? tc.expectedOutput : '[hidden]',
        actualOutput: tc.isSample ? actualOutput : (passed ? '[correct]' : '[wrong answer]'),
      });

      if (!passed) allPassed = false;
    }

    const totalPassed = testResults.filter(r => r.passed).length;
    let overallStatus: SandboxResult['status'] = allPassed ? 'accepted' : 'wrong_answer';
    if (anyTle) overallStatus = 'time_limit_exceeded';
    else if (anyMle) overallStatus = 'memory_limit_exceeded';
    else if (anyRe) overallStatus = 'runtime_error';

    return { testResults, overallStatus, totalPassed, totalTests: testCases.length };
  } finally {
    // Clean up temp directory
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

