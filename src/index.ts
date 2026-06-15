import { existsSync, readFileSync, statSync } from 'node:fs';
import { Command } from 'commander';

const program = new Command();

program
  .name('resume-grade')
  .description('Compare a resume against a job description')
  .version('0.1.0');

program
  .requiredOption('--jd <value>', 'job description as a file path or raw text')
  .option('--resume <path>', 'path to resume file')
  .action((options) => {
    let jdContent = options.jd;
    if (existsSync(options.jd) && statSync(options.jd).isFile()) {
      jdContent = readFileSync(options.jd, 'utf-8');
    }
    console.log(jdContent.slice(0, 100));
    console.log('Resume path:', options.resume);
  });

program.parse();
