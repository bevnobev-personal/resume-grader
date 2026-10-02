import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { compareResumeToJd } from './compare.js';
import { InputFileError, readTextInput } from './input-file.js';

const program = new Command();

program
  .name('resume-grade')
  .description('Compare a resume against a job description')
  .version('0.1.0');

program
  .requiredOption('--jd <path>', 'job description file path, or "-" for stdin')
  .requiredOption('--resume <path>', 'path to resume file')
  .action((options) => {
    try {
      const jdContent =
        options.jd === '-'
          ? readFileSync(0, 'utf-8')
          : readTextInput(options.jd, 'Job description');
      const resumeContent = readTextInput(options.resume, 'Resume');

      const result = compareResumeToJd(jdContent, resumeContent);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      // Input problems get a plain, actionable message. Anything else is a
      // genuine bug, so we let it crash with its stack trace intact.
      if (error instanceof InputFileError) {
        console.error(error.message);
        process.exit(1);
      }
      throw error;
    }
  });

program.parse();
