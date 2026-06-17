import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^next/headers$': '<rootDir>/__mocks__/next-headers.ts',
    '^@/lib/prisma$': '<rootDir>/__mocks__/prisma.ts',
    '^uuid$': '<rootDir>/__mocks__/uuid.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'commonjs' } }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!uuid/)',
  ],
};

export default config;
