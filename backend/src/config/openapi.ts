export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ACM Competition Platform API',
    version: '1.0.0',
    description:
      'Production REST API for ACM technical competitions, MCQ quizzes, multi-language sandboxed code execution, and real-time leaderboards.',
    contact: {
      name: 'ACM Competition Admin',
      email: 'admin@acm-nmamit.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Local Development Server',
    },
    {
      url: 'https://api.acm-competition.com',
      description: 'Production Server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide your JWT access token.',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'UNAUTHORIZED' },
              message: { type: 'string', example: 'Authentication token missing or expired' },
            },
          },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          timestamp: { type: 'string', example: '2026-09-01T12:00:00.000Z' },
          version: { type: 'string', example: '1.0.0' },
          environment: { type: 'string', example: 'development' },
          sandbox: { type: 'boolean', example: true },
        },
      },
      SendOtpRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email', example: 'student@example.com' },
        },
      },
      VerifyOtpRequest: {
        type: 'object',
        required: ['email', 'otp'],
        properties: {
          email: { type: 'string', format: 'email', example: 'student@example.com' },
          otp: { type: 'string', example: '123456' },
          name: { type: 'string', example: 'Jane Doe' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsIn...' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'usr_12345' },
                  email: { type: 'string', example: 'student@example.com' },
                  name: { type: 'string', example: 'Jane Doe' },
                  role: { type: 'string', enum: ['participant', 'admin'], example: 'participant' },
                },
              },
            },
          },
        },
      },
      CodeSubmissionRequest: {
        type: 'object',
        required: ['problemId', 'roundId', 'language', 'sourceCode'],
        properties: {
          problemId: { type: 'string', example: 'prob_two_sum' },
          roundId: { type: 'string', example: 'round_coding_01' },
          language: { type: 'string', enum: ['c', 'cpp', 'java', 'python', 'javascript'], example: 'cpp' },
          sourceCode: { type: 'string', example: '#include <iostream>\nusing namespace std;\nint main() { return 0; }' },
        },
      },
      CodeSubmissionResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              submissionId: { type: 'string', example: 'sub_98765' },
              overallStatus: {
                type: 'string',
                enum: ['accepted', 'wrong_answer', 'time_limit_exceeded', 'memory_limit_exceeded', 'compilation_error', 'runtime_error'],
                example: 'accepted',
              },
              totalPassed: { type: 'integer', example: 10 },
              totalTests: { type: 'integer', example: 10 },
              executionTimeMs: { type: 'integer', example: 45 },
              memoryUsedKb: { type: 'integer', example: 14200 },
              compilationError: { type: 'string', nullable: true },
            },
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'System health probe',
        tags: ['System'],
        responses: {
          '200': {
            description: 'System is healthy',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } },
          },
        },
      },
    },
    '/ready': {
      get: {
        summary: 'Readiness & sandbox capability probe',
        tags: ['System'],
        responses: {
          '200': {
            description: 'Backend and Docker sandbox are ready to receive submissions',
          },
        },
      },
    },
    '/api/auth/send-otp': {
      post: {
        summary: 'Send authentication OTP to email',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SendOtpRequest' } } },
        },
        responses: {
          '200': { description: 'OTP sent successfully' },
          '429': { description: 'Rate limit exceeded' },
        },
      },
    },
    '/api/auth/verify-otp': {
      post: {
        summary: 'Verify OTP and authenticate user',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyOtpRequest' } } },
        },
        responses: {
          '200': {
            description: 'Authenticated successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          '400': { description: 'Invalid or expired OTP' },
        },
      },
    },
    '/api/competitions': {
      get: {
        summary: 'List active and past competitions',
        tags: ['Competitions'],
        responses: {
          '200': { description: 'List of competitions returned' },
        },
      },
    },
    '/api/coding/submit': {
      post: {
        summary: 'Submit code for sandboxed grading',
        tags: ['Coding Round'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CodeSubmissionRequest' } } },
        },
        responses: {
          '200': {
            description: 'Code executed and graded',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CodeSubmissionResponse' } } },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/leaderboard/{competitionId}': {
      get: {
        summary: 'Fetch competition leaderboard',
        tags: ['Leaderboard'],
        parameters: [
          {
            name: 'competitionId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Leaderboard standings' },
        },
      },
    },
    '/api/admin/export/csv': {
      get: {
        summary: 'Export participant results as CSV (Admin only)',
        tags: ['Admin'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'competitionId', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'CSV file download stream' },
          '403': { description: 'Admin access required' },
        },
      },
    },
  },
};
