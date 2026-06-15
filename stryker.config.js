/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
module.exports = {

  // testRunner: 'jest' — runs Jest directly for each mutant via @stryker-mutator/jest-runner.
  // Replaces the previous command runner (ng test --browsers=ChromeHeadless) used with Karma.
  // Jest runs in Node.js via jsdom — no browser process, no ChromeHeadless, no port conflicts.
  // The runner invokes Jest programmatically and respects jest.config.js (preset, setupFilesAfterEnv,
  // testMatch) without any additional configuration here.
  testRunner: 'jest',

  // jest.configFile — tells the jest runner where to find jest.config.js.
  // Without this, Stryker spawns Jest from its sandbox temp directory where
  // <rootDir> resolves to the sandbox path and testMatch finds nothing.
  jest: {
    configFile: 'jest.config.js',
    // enableFindRelatedTests: false — Jest's --findRelatedTests flag fails in the Stryker
    // sandbox because TypeScript import graph resolution breaks over symlinked node_modules.
    // With coverageAnalysis: 'perTest', the Istanbul coverage map already handles per-mutant
    // test selection, so --findRelatedTests is redundant. Disabling it makes the dry run
    // execute all tests directly instead of tracing the import graph.
    enableFindRelatedTests: false,
    config: {
      // testMatch — two changes combined:
      // 1. Relative patterns (no '<rootDir>' prefix) avoid the Windows mixed path-separator bug
      //    where Stryker sets rootDir to a backslash path but jest.config.js uses forward slash,
      //    producing a glob like '...SmartCity-Frontend\.stryker-tmp/sandbox/src/**' that matches
      //    nothing. Relative patterns are resolved against roots without string concatenation.
      // 2. Scoped to domain + application layers only. Presentation and shared component tests
      //    pull in Angular TestBed + jsdom and take 3-5 s each to initialize; they don't cover
      //    the mutated source files anyway. Running only the relevant test layers makes the dry
      //    run ~10x faster and eliminates Angular DI environment errors in the sandbox.
      testMatch: [
        '**/asset/domain/**/*.spec.ts',
        '**/asset/application/**/*.spec.ts',
      ],
    },
  },

  // coverageAnalysis: 'perTest' — Stryker runs the full suite once to map which tests cover
  // which lines, then per mutant only executes the covering tests instead of the full suite.
  // With the previous command runner this was forced to 'off' (IPC hooks unavailable).
  // Jest runner supports perTest natively — equivalent to enabling PIT's greedy strategy on
  // the backend. Reduces runtime from (all tests × mutant count) to (covering tests × mutant count).
  coverageAnalysis: 'perTest',

  // concurrency: 1 — test one mutant at a time to keep memory predictable on CI.
  // Unlike the Karma setup, this is not forced (no port conflicts, no shared source files) —
  // the Jest runner uses sandboxes and jsdom. Kept for memory control: each concurrent slot
  // loads a full Node.js + jsdom + Angular environment (~150 MB). The performance gain from
  // coverageAnalysis: 'perTest' is independent of concurrency.
  concurrency: 1,

  // mutate — domain and application service layers only.
  // Mirrors backend pom.xml <targetClasses>: only classes containing branching business logic.
  // Presentation, infrastructure, DTOs, mappers, events, exceptions, and repository interfaces
  // are excluded — surviving mutants there indicate nothing about domain correctness.
  mutate: [
    // Domain layer — aggregate root, entities, value objects, specifications, shared enums.
    'src/app/asset/domain/aggregate/**/*.ts',
    'src/app/asset/domain/entity/**/*.ts',
    'src/app/asset/domain/value-object/**/*.ts',
    'src/app/asset/domain/specification/**/*.ts',
    'src/app/asset/domain/shared/**/*.ts',

    // Application service layer — write orchestration (AppService) and read projection (QueryService).
    'src/app/asset/application/service/**/*.ts',
    'src/app/asset/application/query/**/*.ts',

    // Exclude spec files — Stryker must not mutate the tests themselves.
    '!**/*.spec.ts',

    // Exclude pure data carriers and abstract interfaces — no implementation to mutate.
    '!src/app/asset/domain/event/**/*.ts',
    '!src/app/asset/domain/exception/**/*.ts',
    '!src/app/asset/domain/repository/**/*.ts'
  ],

  // ignoreStatic — skip mutants in code that runs at module-load time (enum member values,
  // top-level const initializers). Static mutants cannot use coverageAnalysis: 'perTest'
  // because the mutation fires before any test runs, forcing a full-suite re-run each time.
  // The 13 static mutants in this project (shared enums) accounted for 43% of estimated
  // runtime. Enum value identities are data, not branch logic — they belong in unit tests
  // that compare expected vs actual enum members, not in mutation scoring.
  ignoreStatic: true,

  // thresholds — mirrors backend pom.xml mutationThreshold (65) and coverageThreshold (75).
  // high (80): score above this → green in the HTML report
  // low (65): score between low and high → yellow (warning, not failure)
  // break (65): score below this → Stryker exits non-zero and CI fails
  thresholds: {
    high: 80,
    low: 65,
    break: 65
  },

  reporters: ['html', 'progress'],

  // HTML report path mirrors the backend's target/pit-reports convention.
  htmlReporter: {
    fileName: 'reports/mutation/mutation.html'
  },

  // timeoutMS / timeoutFactor — mirrors backend pom.xml <timeoutConstant>/<timeoutFactor>.
  timeoutMS: 60000,
  timeoutFactor: 1.5
};
