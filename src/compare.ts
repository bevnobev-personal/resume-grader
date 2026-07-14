import { PorterStemmer } from 'natural';
import { STOPWORDS } from './stopwords.js';

export type KeywordStatus = 'Strong' | 'Underweight' | 'Gap';

export interface KeywordComparison {
  keyword: string;
  jdCount: number;
  resumeCount: number;
  status: KeywordStatus;
}

export interface ComparisonResult {
  keywords: KeywordComparison[];
}

const TOKEN_SPLIT = /[\s\p{P}]+/u;
const MIN_WORD_LENGTH = 3;
const TOP_KEYWORD_COUNT = 15;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(TOKEN_SPLIT)
    .filter((word) => word.length > 0);
}

function extractNotableTerms(jd: string): Map<string, number> {
  const counts = new Map<string, number>();

  for (const word of tokenize(jd)) {
    if (word.length < MIN_WORD_LENGTH || STOPWORDS.has(word)) {
      continue;
    }
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, TOP_KEYWORD_COUNT);

  return new Map(sorted);
}

function countStemmedMatches(keyword: string, resume: string): number {
  const stemmedKeyword = PorterStemmer.stem(keyword);
  let count = 0;

  for (const word of tokenize(resume)) {
    if (PorterStemmer.stem(word) === stemmedKeyword) {
      count++;
    }
  }

  return count;
}

function classifyKeyword(jdCount: number, resumeCount: number): KeywordStatus {
  if (resumeCount === 0) {
    return 'Gap';
  }
  if (resumeCount >= jdCount) {
    return 'Strong';
  }
  return 'Underweight';
}

export function compareResumeToJd(jd: string, resume: string): ComparisonResult {
  const notableTerms = extractNotableTerms(jd);

  const keywords: KeywordComparison[] = [...notableTerms.entries()].map(
    ([keyword, jdCount]) => {
      const resumeCount = countStemmedMatches(keyword, resume);
      return {
        keyword,
        jdCount,
        resumeCount,
        status: classifyKeyword(jdCount, resumeCount),
      };
    },
  );

  return { keywords };
}
