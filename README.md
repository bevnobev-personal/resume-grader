# resume-grader

A CLI tool that compares a resume against a job description

## Continuous integration

[![CI](https://github.com/bevnobev-personal/resume-grader/actions/workflows/ci.yml/badge.svg)](https://github.com/bevnobev-personal/resume-grader/actions/workflows/ci.yml)

Every pull request, and every push to `main`, runs the TypeScript compiler and
the test suite. The workflow lives in [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
and pins Node to 24 LTS.

### Running the same checks locally

These are the exact commands CI runs, so a green run here means a green run there:

```bash
npm ci              # install the exact versions in package-lock.json
npm run typecheck   # tsc --noEmit: type errors only, no output files
npm test            # vitest run: the whole suite once
```

Also available:

```bash
npm run test:watch  # re-run affected tests as you edit
npm run build       # compile to dist/
```

### How the tests are organised

Two layers, testing different things:

- **`test/cli.test.ts`** runs the CLI from source, via `tsx`, in a real child
  process, and checks
  what a user would see: the exit code and the message on stderr. A child
  process is necessary because an exit code belongs to a process and cannot be
  asserted on a function call. Each test writes its fixtures into a temporary
  directory, so the suite never depends on files in the repository.
- **`test/input-file.test.ts`** tests the byte-level rule that decides whether
  a file is plain text, including accented names and emoji. These run in
  milliseconds, so edge cases live here rather than in the slower layer.

Spawning a process per test is slow enough to matter. `vitest.config.ts` raises
the per-test timeout to 30 seconds because the default of 5 seconds was close
enough to the real cost that the suite failed at random roughly one run in four.

### Branch protection

`main` is protected. You cannot push to it directly, and a pull request cannot
be merged until the `Typecheck and test` check passes. This applies to
administrators too, so the only way to merge a failing branch is to change the
rule deliberately.

Note that the required check is named after the **job** (`Typecheck and test`),
not the workflow (`CI`). Requiring the workflow name instead leaves pull
requests waiting forever for a check that never reports.

### Dependency updates

[`.github/dependabot.yml`](.github/dependabot.yml) watches two ecosystems
monthly:

- **`github-actions`** — action tags go stale silently, because something like
  `actions/checkout@v4` keeps working long after the Node runtime it declares
  has been removed from the runners.
- **`npm`** — minor and patch upgrades arrive grouped in one pull request;
  each major gets its own, so a breaking change can be evaluated alone and a
  routine patch is never blocked behind a risky one.

Dependabot only opens pull requests. They pass through CI and branch protection
like any other change, which is what makes an automated bump safe to consider.

A green check on a dependency bump means it did not break anything. It does not
mean the dependency is needed: `@types/natural` sat in `devDependencies`
unreferenced for a while, and every bump to it passed.
