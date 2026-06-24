/**
 * Shared type definitions for the question bank.
 * Extracted to a separate file to avoid circular imports between:
 *   questions.ts  ←→  questions-*-technical.ts,  questions-coding.ts,
 *                     and  questions-dsa.ts
 */

export interface InterviewQuestion {
  /** Unique question identifier, e.g. "se-tech-os-1" */
  id: string;

  /**
   * The role this question belongs to.
   * Use "common" for questions shared across all roles (coding round).
   */
  role:
    | "software-engineer"
    | "ai-ml-engineer"
    | "system-design-architect"
    | "common"
    | "online-assessment";

  /**
   * Which interview round this question is for:
   * - "technical"          → role-specific technical interview
   * - "coding"             → coding round (shared across SE, AI/ML, SDA; NOT used for aptitude)
   * - "hr"                 → HR round
   * - "online-assessment"  → Aptitude MCQ round
   */
  roundType: "technical" | "coding" | "hr" | "online-assessment" | "dsa";

  /** Subject area, e.g. "OS", "DBMS", "OOP", "Threads", "Python" */
  topic: string;

  /** The question text exactly as the interviewer asks it */
  question: string;

  /**
   * Key concepts/keywords expected in a correct answer.
   * Used by the local scoring heuristic for keyword-overlap scoring.
   */
  answerKeywords: string[];

  /**
   * Full expected answer as a readable string (derived from answerKeywords).
   * Used by Gemini AI for semantic classification and by the fallback scorer.
   */
  expectedAnswer: string;
}

/**
 * Extended type for aptitude MCQ questions.
 * Adds the four answer options and the correct answer letter.
 */
export interface OAQuestion extends InterviewQuestion {
  role: "online-assessment";
  roundType: "online-assessment";

  /**
   * The four answer choices displayed to the candidate.
   * Index 0 → A, 1 → B, 2 → C, 3 → D.
   */
  options: [string, string, string, string];

  /**
   * The letter of the correct answer: "A" | "B" | "C" | "D".
   */
  answer: "A" | "B" | "C" | "D";
}

// ─────────────────────────────────────────────────────────────────────────────
// DSA Round Question
// ─────────────────────────────────────────────────────────────────────────────

export interface DSATestCase {
  /** The input, expressed as a human-readable string (e.g. "nums = [2,3,2]") */
  input: string;
  /** The exact stdin sent to Judge0/local runner. Falls back to input when omitted. */
  stdin?: string;
  /** The expected output as a string (e.g. "3") */
  expectedOutput: string;
  /** Optional explanation of why this is the correct answer */
  explanation?: string;
}

/**
 * Extended type for DSA (Data Structures & Algorithms) round problems.
 *
 * Extra fields beyond InterviewQuestion:
 *   - sampleTestCases    – 1-2 visible sample inputs with explanation
 *   - constraints        – problem constraints as a list of strings
 *   - hiddenTestCases    – test cases used for automated judging (not shown to candidate)
 *   - edgeTestCases      – edge / corner-case inputs
 *   - expectedTimeComplexity  – e.g. "O(n)"
 *   - expectedSpaceComplexity – e.g. "O(n)"
 *   - expectedApproach        – list of expected DS/Algo names
 */
export interface DSAQuestion extends InterviewQuestion {
  role: "common";
  roundType: "dsa";

  /** 1–2 sample test cases shown to the candidate during the problem statement */
  sampleTestCases: DSATestCase[];

  /** Problem constraints expressed as readable strings */
  constraints: string[];

  /** Hidden test cases used for judging (not revealed to the candidate) */
  hiddenTestCases: DSATestCase[];

  /** Edge / corner-case inputs that stress-test boundary conditions */
  edgeTestCases: DSATestCase[];

  /** Target time complexity, e.g. "O(n)" or "O(n log n)" */
  expectedTimeComplexity: string;

  /** Target space complexity, e.g. "O(1)" or "O(n)" */
  expectedSpaceComplexity: string;

  /**
   * Data structures and / or algorithm paradigms expected in the solution.
   * e.g. ["Dynamic Programming", "DP"]
   */
  expectedApproach: string[];

  /** Expected algorithm names/paradigms for approach matching. */
  expectedAlgorithms?: string[];

  /** Expected data structure names for approach matching. */
  expectedDataStructures?: string[];
}
