/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/*.test.ts',
    '**/*.spec.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@cards/(.*)$': '<rootDir>/src/cards/$1',
    '^@game/(.*)$': '<rootDir>/src/game/$1',
    '^@combat/(.*)$': '<rootDir>/src/combat/$1',
    '^@keywords/(.*)$': '<rootDir>/src/keywords/$1',
    '^@effects/(.*)$': '<rootDir>/src/effects/$1',
    '^@events/(.*)$': '<rootDir>/src/events/$1',
    '^@heroes/(.*)$': '<rootDir>/src/heroes/$1',
    '^@races/(.*)$': '<rootDir>/src/races/$1',
    '^@starforge/(.*)$': '<rootDir>/src/starforge/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true
};
