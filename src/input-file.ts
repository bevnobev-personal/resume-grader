import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname } from 'node:path';

/** The only extensions we accept for a resume or job description. */
export const TEXT_EXTENSIONS: readonly string[] = ['.txt', '.md'];

/**
 * Control bytes that appear legitimately in plain text: tab, line feed,
 * form feed and carriage return. Every other byte below 0x20 is a sign
 * we are looking at a binary file rather than text.
 */
const ALLOWED_CONTROL_BYTES = new Set([0x09, 0x0a, 0x0c, 0x0d]);

/** How the file is described back to the user in error messages. */
export type InputLabel = 'Resume' | 'Job description';

/**
 * An input problem we can explain to the user, as opposed to an unexpected
 * crash. The CLI catches these, prints the message and exits non-zero.
 */
export class InputFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InputFileError';
  }
}

/**
 * Decides whether a file's raw bytes look like plain text.
 *
 * Three signals, any one of which means "not plain text":
 *   1. A null byte (0x00). Real text never contains one; PDFs, Word files
 *      and images are full of them.
 *   2. Any other control byte, apart from the whitespace ones above.
 *   3. Bytes that aren't valid UTF-8 at all. This catches binary files that
 *      happen not to have a null byte near the start, which PDFs sometimes
 *      manage.
 */
export function looksLikePlainText(bytes: Uint8Array): boolean {
  for (const byte of bytes) {
    if (byte === 0x00) {
      return false;
    }
    if (byte < 0x20 && !ALLOWED_CONTROL_BYTES.has(byte)) {
      return false;
    }
  }

  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return false;
  }

  return true;
}

/**
 * Reads a resume or job description, refusing anything that isn't usable.
 *
 * Checks run cheapest-and-most-fundamental first: a path that doesn't exist
 * is reported as missing even if its extension is also wrong, because the
 * path is the thing the user needs to fix.
 */
export function readTextInput(path: string, label: InputLabel): string {
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new InputFileError(
      `Couldn't find ${path}.`,
    );
  }

  if (!TEXT_EXTENSIONS.includes(extname(path).toLowerCase())) {
    throw new InputFileError(
      `${label} must be a .txt or .md file. Save or export it in one of those formats and try again.`,
    );
  }

  const bytes = readFileSync(path);
  if (!looksLikePlainText(bytes)) {
    throw new InputFileError(
      `${path} doesn't look like a plain text file. It may be a PDF or Word file that was renamed. Save it as plain text and try again.`,
    );
  }

  return bytes.toString('utf-8');
}
