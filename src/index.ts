import { existsSync, readFileSync, statSync } from 'node:fs';
import { Command } from 'commander';
import { compareResumeToJd } from './compare.js';

const program = new Command();

program
  .name('resume-grade')
  .description('Compare a resume against a job description')
  .version('0.1.0');

program
  .requiredOption('--jd <path>', 'job description file path, or "-" for stdin')
  .requiredOption('--resume <path>', 'path to resume file')
  .action((options) => {
    let jdContent: string;
    if (options.jd === '-') {
      jdContent = readFileSync(0, 'utf-8');
    } else if (!existsSync(options.jd) || !statSync(options.jd).isFile()) {
      console.error(`Error: job description file not found: ${options.jd}`);
      process.exit(1);
    } else {
      jdContent = readFileSync(options.jd, 'utf-8');
    }

    if (!existsSync(options.resume) || !statSync(options.resume).isFile()) {
      console.error(`Error: resume file not found: ${options.resume}`);
      process.exit(1);
    }
    const resumeContent = readFileSync(options.resume, 'utf-8');

    const result = compareResumeToJd(jdContent, resumeContent);
    console.log(JSON.stringify(result, null, 2));
  });

program.parse();
