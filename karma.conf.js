module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      jasmine: {},
      clearContext: false
    },
    jasmineHtmlReporter: {
      suppressAll: true
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'lcov' }
      ],
      check: {
        // global = whole codebase aggregated; thresholds apply to the final merged report,
        // not per-file — one heavily-tested file can offset a lightly-tested one.
        global: {
          // 70%: primary coverage signal; covers the main logic paths without requiring
          // exhaustive edge-case tests for every branch. Conservative starting point —
          // raise gradually as test suite grows.
          statements: 70,

          // 60%: lowest threshold because branches are the hardest metric to saturate.
          // Every if/else, ternary (?:), &&, ||, and optional chain (?.) counts as two
          // branches. Angular templates and RxJS pipelines add many implicit branches
          // (null checks, async pipe empty states) that are difficult to exercise in
          // unit tests alone.
          branches: 60,

          // 75%: higher than statements/lines because uncovered functions typically signal
          // dead code or a public API that has no test at all — easier to detect and fix
          // than partially-covered logic inside a tested function.
          functions: 75,

          // 70%: mirrors statements. Lines and statements diverge only when multiple
          // statements share one line (rare in TypeScript), so keeping them equal avoids
          // a confusing gap between the two metrics.
          lines: 70
        }
      }
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    restartOnFileChange: true
  });
};
