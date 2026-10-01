import { describe, expect, it } from 'vitest';
import { looksLikePlainText } from '../src/input-file.js';

/** Convenience: treat a JS string as the bytes of a UTF-8 text file. */
const text = (value: string) => new TextEncoder().encode(value);

/**
 * Builds a byte array from a mix of strings and raw byte values, so that test
 * cases can describe binary content without putting real control characters
 * in this file. A literal null byte here would make Git treat the whole file
 * as binary and refuse to show a readable diff.
 */
const bytes = (...parts: Array<string | number>) =>
  new Uint8Array(
    parts.flatMap((part) => (typeof part === 'number' ? [part] : [...text(part)])),
  );

const NUL = 0x00;
const TAB = 0x09;
const LF = 0x0a;
const CR = 0x0d;
const BELL = 0x07;

describe('looksLikePlainText', () => {
  it('accepts ordinary text', () => {
    expect(looksLikePlainText(text('Senior engineer, five years.'))).toBe(true);
  });

  it('accepts tabs, newlines and carriage returns', () => {
    expect(looksLikePlainText(bytes('a', TAB, 'b', LF, 'c', CR, LF, 'd'))).toBe(true);
  });

  it('accepts accented characters and emoji', () => {
    // A resume for "Zoë Ramírez" must not be mistaken for a binary file.
    expect(looksLikePlainText(text('Zoë Ramírez — Engineer 🚀'))).toBe(true);
  });

  it('accepts an empty file', () => {
    // Empty is useless input, but it is not a *renamed PDF*, so this rule
    // should stay quiet and let the comparison produce an empty report.
    expect(looksLikePlainText(text(''))).toBe(true);
  });

  it('rejects a null byte', () => {
    expect(looksLikePlainText(bytes('resume', NUL, 'text'))).toBe(false);
  });

  it('rejects other control bytes', () => {
    expect(looksLikePlainText(bytes('hi', BELL))).toBe(false);
  });

  it('rejects bytes that are not valid UTF-8', () => {
    // 0xC3 starts a two-byte sequence but 0x28 cannot continue it. Binary
    // files trip this constantly; real text files never do.
    expect(looksLikePlainText(new Uint8Array([0xc3, 0x28]))).toBe(false);
  });

  it('rejects a PDF header', () => {
    expect(looksLikePlainText(bytes('%PDF-1.4', LF, NUL, 0x01, 'stream'))).toBe(false);
  });
});
