module.exports = {
  preset: 'jest-preset-angular',
  // testEnvironment must be explicit — jest-preset-angular sets it via the preset, but Stryker
  // reads jest.config.js before resolving presets and doesn't see preset-provided defaults.
  // Without this, Stryker's jest-environment-generic.cjs wraps Node.js instead of jsdom,
  // causing NG0200 / 'document is not defined' in all Angular TestBed tests.
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  coverageReporters: ['lcov', 'text-summary'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/main.server.ts',
    '!src/environments/**',
    // src/test/ contains ddd-architecture.ts — a ts-node script, not a Jest test.
    // Jest never executes it, so Istanbul would report it as 0% covered and inflate the
    // uncovered line count in both the lcov report and SonarCloud coverage metrics.
    '!src/test/**',
  ],
};
