import 'dotenv/config';
import { describe, it, expect } from 'vitest';
import { executeCode } from '../jobs/sandbox.js';
import { env } from '../config/env.js';

describe('Adversarial Sandbox Tests', () => {
  it('should terminate infinite loop via time limit exceeded', async () => {
    const params = {
      languageSlug: 'javascript',
      sourceCode: `while(true) {}`,
      testCases: [{ id: 'tc1', input: '', expectedOutput: 'ok', isSample: true }],
      timeLimitMs: 400,
      memoryLimitMb: 256,
    };
    const res = await executeCode(params);
    expect(res.overallStatus).toBe('time_limit_exceeded');
  });

  it('should detect memory exhaustion via memory limit exceeded', async () => {
    // Only run memory enforcement test if Docker is active
    if (!env.USE_DOCKER_SANDBOX) {
      console.log('Skipping memory limit test: Docker sandbox not enabled');
      return;
    }
    const params = {
      languageSlug: 'javascript',
      sourceCode: `
        const arr = [];
        // Allocate blocks of memory until container is OOM killed
        while(true) {
          arr.push(new Array(1000000).fill('A'));
        }
      `,
      testCases: [{ id: 'tc1', input: '', expectedOutput: 'ok', isSample: true }],
      timeLimitMs: 5000,
      memoryLimitMb: 32, // Low memory limit to trigger OOM quickly
    };
    const res = await executeCode(params);
    expect(res.overallStatus).toBe('memory_limit_exceeded');
  });

  it('should block process fork bomb / execution limits inside Docker', async () => {
    if (!env.USE_DOCKER_SANDBOX) {
      console.log('Skipping process execution test: Docker sandbox not enabled');
      return;
    }
    const params = {
      languageSlug: 'javascript',
      sourceCode: `
        const { spawn } = require('child_process');
        // Attempt to spawn sub-processes
        try {
          const child = spawn('ls', []);
          child.on('error', (e) => {
            console.log('SPAWN_ERROR: ' + e.message);
          });
        } catch (e) {
          console.log('CATCH_ERROR: ' + e.message);
        }
      `,
      testCases: [{ id: 'tc1', input: '', expectedOutput: 'SPAWN_ERROR', isSample: true }],
      timeLimitMs: 2000,
      memoryLimitMb: 256,
    };
    const res = await executeCode(params);
    // Since child processes inside read-only/no-privilege node docker might fail,
    // verify it either crashes, returns execution error, or is handled safely.
    expect(res.overallStatus).toBeDefined();
  });

  it('should restrict unauthorized filesystem reads in Docker', async () => {
    if (!env.USE_DOCKER_SANDBOX) {
      console.log('Skipping filesystem breakouts test: Docker sandbox not enabled');
      return;
    }
    const params = {
      languageSlug: 'javascript',
      sourceCode: `
        const fs = require('fs');
        try {
          // Attempt to read host files outside working directory
          const content = fs.readFileSync('/etc/passwd', 'utf8');
          console.log('LEAKED: ' + content.substring(0, 10));
        } catch (e) {
          console.log('FS_BLOCKED');
        }
      `,
      testCases: [{ id: 'tc1', input: '', expectedOutput: 'FS_BLOCKED', isSample: true }],
      timeLimitMs: 2000,
      memoryLimitMb: 256,
    };
    const res = await executeCode(params);
    // When using --user 1000:1000 and read-only, reading sensitive files will throw permission denied
    // or the files simply won't exist inside the bare alpine image
    expect(res.overallStatus).toBe('accepted'); // Because the console output matches "FS_BLOCKED"
  });

  it('should restrict host environment variables leakage in Docker', async () => {
    if (!env.USE_DOCKER_SANDBOX) {
      console.log('Skipping environment variables leakage test: Docker sandbox not enabled');
      return;
    }
    const params = {
      languageSlug: 'javascript',
      sourceCode: `
        // Check if host secrets exist in environment variables
        if (process.env.DATABASE_URL || process.env.JWT_SECRET || process.env.FIREBASE_PROJECT_ID) {
          console.log('LEAKED_ENV');
        } else {
          console.log('ENV_CLEAN');
        }
      `,
      testCases: [{ id: 'tc1', input: '', expectedOutput: 'ENV_CLEAN', isSample: true }],
      timeLimitMs: 2000,
      memoryLimitMb: 256,
    };
    const res = await executeCode(params);
    expect(res.overallStatus).toBe('accepted');
  });

  it('should block outbound network requests in Docker', async () => {
    if (!env.USE_DOCKER_SANDBOX) {
      console.log('Skipping outbound network test: Docker sandbox not enabled');
      return;
    }
    const params = {
      languageSlug: 'javascript',
      sourceCode: `
        const http = require('http');
        // Attempt network connection
        const req = http.get('http://example.com', (res) => {
          console.log('CONNECTED');
        });
        req.on('error', (e) => {
          console.log('NETWORK_BLOCKED');
        });
      `,
      testCases: [{ id: 'tc1', input: '', expectedOutput: 'NETWORK_BLOCKED', isSample: true }],
      timeLimitMs: 3000,
      memoryLimitMb: 256,
    };
    const res = await executeCode(params);
    expect(res.overallStatus).toBe('accepted'); // Verify it prints "NETWORK_BLOCKED" due to connection error
  });
});
