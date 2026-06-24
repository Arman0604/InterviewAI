/**
 * Question Bank — Central module
 *
 * Architecture:
 *  ┌─────────────────────────────────────────────────────────────┐
 *  │  Coding Round  (common across SE, AI/ML, SDA; not aptitude) │
 *  │  → lib/questions-coding.ts                                   │
 *  ├─────────────────────────────────────────────────────────────┤
 *  │  DSA Round  (common across all technical roles)              │
 *  │  → lib/questions-dsa.ts                                      │
 *  ├─────────────────────────────────────────────────────────────┤
 *  │  Technical Round  (each role has its own question bank)      │
 *  │  → lib/questions-se-technical.ts   (Software Engineer)       │
 *  │  → lib/questions-aiml-technical.ts (AI/ML Engineer)          │
 *  │  → lib/questions-sda-technical.ts  (System Design Architect) │
 *  ├─────────────────────────────────────────────────────────────┤
 *  │  Aptitude Round  (MCQ aptitude test)                         │
 *  │  → lib/questions-online-assessment.ts                        │
 *  └─────────────────────────────────────────────────────────────┘
 *
 * Fields per question:
 *  id             – unique identifier
 *  role           – "software-engineer" | "ai-ml-engineer" | "system-design-architect" | "common" | "online-assessment"
 *  roundType      – "technical" | "coding" | "hr" | "online-assessment"
 *  topic          – subject area (OS, DBMS, OOP, Quantitative, Verbal Ability, etc.)
 *  question       – the exact question text asked by the interviewer
 *  answerKeywords – array of key concepts required for a correct answer (used for scoring)
 *  expectedAnswer – full answer string derived from keywords (used by AI for semantic scoring)
 *
 * Aptitude-specific extra fields (see OAQuestion in question-types.ts):
 *  options        – four answer choices (index 0-3 → A-D)
 *  answer         – correct option letter ("A" | "B" | "C" | "D")
 */

// ─── Re-export shared types (consumers import from here) ────────────────────
export type { InterviewQuestion, OAQuestion, DSAQuestion, DSATestCase } from "./question-types";

// ─── Imports ──────────────────────────────────────────────────────────────────
import { SE_TECHNICAL_QUESTIONS } from "./questions-se-technical";
import { AIML_TECHNICAL_QUESTIONS } from "./questions-aiml-technical";
import { SDA_TECHNICAL_QUESTIONS } from "./questions-sda-technical";
import { CODING_ROUND_QUESTIONS } from "./questions-coding";
import { DSA_QUESTIONS } from "./questions-dsa";
import { HR_ROUND_QUESTIONS } from "./questions-hr";
import { OA_QUESTIONS } from "./questions-online-assessment";
import type { InterviewQuestion, OAQuestion, DSAQuestion } from "./question-types";

// ─── Combined Question Bank ───────────────────────────────────────────────────
/**
 * Master question bank — all questions from all rounds and roles.
 * Scoring and selection logic uses `role` and `roundType` to filter appropriately.
 */
export const QUESTION_BANK: InterviewQuestion[] = [
  ...SE_TECHNICAL_QUESTIONS,
  ...AIML_TECHNICAL_QUESTIONS,
  ...SDA_TECHNICAL_QUESTIONS,
  ...CODING_ROUND_QUESTIONS,
  ...DSA_QUESTIONS,
  ...HR_ROUND_QUESTIONS,
  ...OA_QUESTIONS,
];

function randomIndex(max: number): number {
  if (max <= 0) return 0;

  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return buf[0] % max;
  }

  return Math.floor(Math.random() * max);
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sampleQuestions<T extends { id: string }>(
  pool: T[],
  count: number,
  excludeIds: string[] = []
): T[] {
  const excluded = new Set(excludeIds);
  const preferred = pool.filter((item) => !excluded.has(item.id));
  const source = preferred.length >= count ? preferred : pool;
  return shuffleArray(source).slice(0, Math.min(count, source.length));
}

export function getHRQuestions(count: number = 7): InterviewQuestion[] {
  const hrQuestions = QUESTION_BANK.filter((q) => q.roundType === "hr");
  return sampleQuestions(hrQuestions, count);
}

/**
 * Get a random subset of DSA round problems.
 * All 5 problems are returned by default (the full bank).
 *
 * @param count - Maximum number of problems to return (default 5 = all)
 */
export function getDSAQuestions(count: number = 5, excludeIds: string[] = []): DSAQuestion[] {
  const dsaQs = QUESTION_BANK.filter(
    (q): q is DSAQuestion => q.roundType === "dsa"
  );
  return sampleQuestions(dsaQs, count, excludeIds);
}

/**
 * Get all 60 aptitude MCQ questions.
 * Questions span four categories:
 *   - Quantitative / Arithmetic  (20 questions)
 *   - Verbal Ability             (15 questions)
 *   - Logical Reasoning          (15 questions)
 *   - Non-Verbal Reasoning       (10 questions)
 *
 * @param count - Maximum number of questions to return (default 60 = all)
 */
export function getOAQuestions(count: number = 60): OAQuestion[] {
  const oaQs = QUESTION_BANK.filter(
    (q): q is OAQuestion => q.roundType === "online-assessment"
  );
  return sampleQuestions(oaQs, count);
}

/**
 * Select the aptitude round question set with a fixed per-session distribution:
 *   8  Quantitative Aptitude   (pool: 20 questions)
 *   6  Logical Reasoning       (pool: 20 questions)
 *   4  Verbal Ability          (pool: 15 questions)
 *   2  Non-Verbal Reasoning    (pool:  5 questions)
 *  ─────────────────────────────────────────────────
 *  20  questions total per session
 *
 * Questions within each category are picked randomly (no duplicates).
 * The final set is shuffled so category order is randomised too.
 */
export function getAptitudeQuestions(excludeIds: string[] = []): OAQuestion[] {
  const oaQs = QUESTION_BANK.filter(
    (q): q is OAQuestion => q.roundType === "online-assessment"
  );

  function pick(topic: string, count: number): OAQuestion[] {
    const pool = oaQs.filter((q) => q.topic === topic);
    return sampleQuestions(pool, count, excludeIds);
  }

  return shuffleArray([
    ...pick("Quantitative",       8),  // 8 from 20 Quantitative questions
    ...pick("Logical Reasoning",  6),  // 6 from 20 Logical Reasoning questions
    ...pick("Verbal Ability",     4),  // 4 from 15 Verbal Ability questions
    ...pick("Non-Verbal Reasoning", 2), // 2 from  5 Non-Verbal questions
  ]);   // shuffle so sections are interleaved
}

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * SE-specific: select exactly 10 technical questions with the required topic distribution:
 *   3 Operating System  (id prefix: se-tech-os-)
 *   3 DBMS              (id prefix: se-tech-dbms-)
 *   2 OOP               (id prefix: se-tech-oop-)
 *   1 Computer Networks (id prefix: se-tech-cn-)
 *   1 Programming Lang  (id prefix: se-tech-pl-)
 *
 * Questions are picked randomly (no duplicates within each category) then
 * shuffled together for a random asking order within the technical phase.
 */
export function getSETechnicalQuestions(): InterviewQuestion[] {
  const allSE = QUESTION_BANK.filter(
    (q) => q.role === "software-engineer" && q.roundType === "technical"
  );

  function pick(prefix: string, count: number): InterviewQuestion[] {
    const pool = allSE.filter((q) => q.id.startsWith(prefix));
    return sampleQuestions(pool, count);
  }

  const selected = [
    ...pick("se-tech-os-", 3),   // 3 Operating System
    ...pick("se-tech-dbms-", 3), // 3 DBMS
    ...pick("se-tech-oop-", 2),  // 2 OOP
    ...pick("se-tech-cn-", 1),   // 1 Computer Networks
    ...pick("se-tech-pl-", 1),   // 1 Programming Languages
  ];

  // Shuffle for a random asking order during the technical phase
  return shuffleArray(selected);
}

/**
 * Get shuffled technical round questions for a specific role.
 * For Software Engineer the exact topic distribution (3+3+2+1+1 = 10) is always
 * used via getSETechnicalQuestions(); the `count` parameter is ignored for that role.
 *
 * @param role   - The role id (e.g. "software-engineer")
 * @param count  - Maximum number of questions to return (default 8, ignored for SE)
 */
export function getQuestionsForRole(
  role: string,
  count: number = 8
): InterviewQuestion[] {
  if (role === "software-engineer") {
    return getSETechnicalQuestions();
  }
  const roleQuestions = QUESTION_BANK.filter(
    (q) => q.role === role && q.roundType === "technical"
  );
  return sampleQuestions(roleQuestions, count);
}

/**
 * Get shuffled coding round questions (common across SE, AI/ML, SDA).
 * The aptitude round does NOT use coding round questions.
 *
 * @param count - Maximum number of questions to return (default 8)
 */
export function getQuestionsForCodingRound(
  count: number = 8
): InterviewQuestion[] {
  const codingQuestions = QUESTION_BANK.filter(
    (q) => q.roundType === "coding" && q.role === "common"
  );
  return sampleQuestions(codingQuestions, count);
}

/**
 * Get all questions for a given role and round type.
 * Useful for admin dashboards and question management.
 *
 * @param role      - The role id, or "common" for coding round
 * @param roundType - "technical" or "coding"
 */
export function getQuestionsByRoundType(
  role: string,
  roundType: "technical" | "coding"
): InterviewQuestion[] {
  return QUESTION_BANK.filter(
    (q) => q.role === role && q.roundType === roundType
  );
}

/**
 * Format a list of questions into a numbered string for the AI system prompt.
 * Includes topic label for better Gemini context.
 */
export function formatQuestionsForPrompt(questions: InterviewQuestion[]): string {
  return questions
    .map((q, i) => `Q${i + 1} [${q.topic}]: ${q.question}`)
    .join("\n");
}
