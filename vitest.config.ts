import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Vitest allows 5 seconds per test by default. The end-to-end tests in
    // test/cli.test.ts each start a child process that compiles the
    // TypeScript source before running it, which usually takes under a
    // second but occasionally much longer on a busy machine. That made the
    // suite fail roughly one run in four, with a timeout rather than a real
    // assertion failure. A test that fails at random teaches you to ignore
    // it, so the limit is raised to something a slow spawn cannot reach.
    testTimeout: 30_000,
  },
});
