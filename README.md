# resume-grader

A CLI tool that compares a resume against a job description

## Requirements

Node 24. Other versions may work, but 24 is what CI tests against.

```bash
npm ci
```

## Usage

The package installs a `resume-grade` command. From a clone, build it first,
then link it onto your PATH:

```bash
npm run build
npm link

resume-grade --jd job-description.txt --resume resume.md
```

`npm link` is reversible with `npm unlink -g resume-grader`.

The build step is required because the command points at `dist/index.js`. If
`resume-grade` reports that the file is missing, the build has not been run.

To run it without installing anything, execute the TypeScript directly:

```bash
npx tsx src/index.ts --jd job-description.txt --resume resume.md
```

This is slower to start, since it compiles on each run, but needs no build
step — which is also why the tests use it.

### Options

| Option | Description |
| --- | --- |
| `--jd <path>` | Job description file, or `-` to read it from stdin. Required. |
| `--resume <path>` | Resume file. Required. |
| `-V`, `--version` | Print the version. |
| `-h`, `--help` | Print usage. |

Both files must be `.txt` or `.md`.

### Reading the job description from stdin

Useful when the posting is on your clipboard rather than in a file:

```bash
pbpaste | npx tsx src/index.ts --jd - --resume resume.md
```

A job description read this way skips the extension and content checks
described below, because there is no file to inspect.

## Output

The 15 most frequent notable words in the job description, as JSON on stdout,
with how often each appears in each document. Trimmed example:

```json
{
  "keywords": [
    { "keyword": "engineer",   "jdCount": 2, "resumeCount": 1, "status": "Underweight" },
    { "keyword": "typescript", "jdCount": 2, "resumeCount": 1, "status": "Underweight" },
    { "keyword": "build",      "jdCount": 1, "resumeCount": 1, "status": "Strong" },
    { "keyword": "culture",    "jdCount": 1, "resumeCount": 0, "status": "Gap" }
  ]
}
```

| Status | Meaning |
| --- | --- |
| `Strong` | The resume uses the word at least as often as the job description. |
| `Underweight` | The resume uses it, but fewer times than the job description. |
| `Gap` | The resume does not use it at all. |

Matching ignores case, skips common stopwords and words shorter than three
characters, and compares word stems, so "engineering" in a job description
counts a resume's "engineer" as a match.

Counts are a blunt instrument: they measure vocabulary overlap, not whether
the resume is any good. Treat `Gap` as "worth a second look", not as a defect.

## Input requirements

Both files must be plain text with a `.txt` or `.md` extension. Anything else
exits with status `1` and an explanation rather than a misleading report:

| Problem | Message |
| --- | --- |
| File does not exist | `Couldn't find <path>. Check the file path and try again.` |
| Not plain text, e.g. a renamed PDF | `<path> doesn't look like a plain text file. It may be a PDF or Word file that was renamed. Save it as plain text and try again.` |
| Extension is not `.txt` or `.md` | `Resume must be a .txt or .md file. Save or export it in one of those formats and try again.` |

Exporting a PDF or Word resume to plain text first is the usual fix. A file is
treated as binary if it contains a null byte, a control character other than
whitespace, or bytes that are not valid UTF-8.

## Continuous integration

[![CI](https://github.com/bevnobev-personal/resume-grader/actions/workflows/ci.yml/badge.svg)](https://github.com/bevnobev-personal/resume-grader/actions/workflows/ci.yml)

Every pull request, and every push to `main`, runs two jobs in parallel. The
workflow lives in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) and
pins Node to 24 LTS.

- **Typecheck and test** — the TypeScript compiler, then the test suite.
- **Package** — builds the tarball `npm publish` would upload, installs it into
  a scratch project, and runs the resulting `resume-grade` command. The tests
  run the CLI from source, so only this job can catch a packaging fault: a
  missing shebang, a `bin` entry pointing at the wrong path, or `dist` left out
  of the published files would all keep the tests green while the installed
  command was broken.

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
npm pack            # build the tarball, as the Package job does
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
