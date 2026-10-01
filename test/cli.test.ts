import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Path to the `tsx` runner and to the CLI itself. `tsx` lets us run the
// TypeScript source directly, with no build step in between.
const TSX = join(process.cwd(), 'node_modules', '.bin', 'tsx');
const CLI = join(process.cwd(), 'src', 'index.ts');

/**
 * Runs the CLI in a real child process and captures what a user would see.
 * We need a separate process because the thing under test is the *exit code*,
 * and a function call can't have one — only a process can.
 */
function runCli(args: string[]) {
  const result = spawnSync(TSX, [CLI, ...args], { encoding: 'utf-8' });
  return {
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

// Bytes from a real PDF header, including a null byte. No plain text file
// contains a null byte, which is what makes it a reliable giveaway.
const PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj\n<</Type/Catalog>>\nstream\n\x00\x01\x02 junk\n', 'binary');

let dir: string;
let jd: string;
let goodResume: string;

beforeAll(() => {
  // A throwaway directory so these tests never touch the real repo.
  dir = mkdtempSync(join(tmpdir(), 'resume-grader-'));
  jd = join(dir, 'jd.txt');
  goodResume = join(dir, 'resume.txt');
  writeFileSync(jd, 'Senior engineer with TypeScript experience.\n');
  writeFileSync(goodResume, 'TypeScript engineer, five years of experience.\n');
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('resume file validation', () => {
  it('succeeds on a valid .txt resume', () => {
    const result = runCli(['--jd', jd, '--resume', goodResume]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('"keyword"');
  });

  it('case 1: reports a missing resume file and exits non-zero', () => {
    const missing = join(dir, 'does-not-exist.txt');

    const result = runCli(['--jd', jd, '--resume', missing]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain(
      `Couldn't find ${missing}. Check the file path and try again.`,
    );
  });

  it('case 2: rejects a .txt file that is really a PDF', () => {
    const renamed = join(dir, 'renamed-pdf.txt');
    writeFileSync(renamed, PDF_BYTES);

    const result = runCli(['--jd', jd, '--resume', renamed]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain(
      `${renamed} doesn't look like a plain text file. It may be a PDF or Word file that was renamed. Save it as plain text and try again.`,
    );
    // The dangerous old behaviour: a confident-looking report built from
    // garbage. Asserted here rather than in its own test, because every
    // extra test means another slow child process.
    expect(result.stdout).not.toContain('"keyword"');
  });

  it('case 3: rejects a resume whose extension is not .txt or .md', () => {
    const pdf = join(dir, 'resume.pdf');
    writeFileSync(pdf, 'This is readable text in a badly named file.\n');

    const result = runCli(['--jd', jd, '--resume', pdf]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain(
      'Resume must be a .txt or .md file. Save or export it in one of those formats and try again.',
    );
  });

  it('accepts a .md resume', () => {
    const md = join(dir, 'resume.md');
    writeFileSync(md, '# Resume\n\nTypeScript engineer with experience.\n');

    const result = runCli(['--jd', jd, '--resume', md]);

    expect(result.exitCode).toBe(0);
  });
});

describe('job description file validation', () => {
  it('reports a missing job description file and exits non-zero', () => {
    const missing = join(dir, 'no-such-jd.txt');

    const result = runCli(['--jd', missing, '--resume', goodResume]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain(
      `Couldn't find ${missing}. Check the file path and try again.`,
    );
  });

  it('rejects a job description that is really a PDF', () => {
    const renamed = join(dir, 'renamed-jd.txt');
    writeFileSync(renamed, PDF_BYTES);

    const result = runCli(['--jd', renamed, '--resume', goodResume]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain(
      `${renamed} doesn't look like a plain text file. It may be a PDF or Word file that was renamed. Save it as plain text and try again.`,
    );
  });

  it('rejects a job description whose extension is not .txt or .md', () => {
    const docx = join(dir, 'jd.docx');
    writeFileSync(docx, 'Readable text in a badly named file.\n');

    const result = runCli(['--jd', docx, '--resume', goodResume]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain(
      'Job description must be a .txt or .md file. Save or export it in one of those formats and try again.',
    );
  });

  it('still accepts a job description piped in on stdin', () => {
    const result = spawnSync(TSX, [CLI, '--jd', '-', '--resume', goodResume], {
      encoding: 'utf-8',
      input: 'Senior engineer with TypeScript experience.\n',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('"keyword"');
  });
});
