/**
 * DSA Round — 5-Category Scoring Engine
 *
 * TOTAL SCORE = 100 marks
 * ─────────────────────────────────────────────────
 * 1. Problem Solving     30 marks  (test case pass ratio)
 * 2. Code Implementation 20 marks  (AI quality evaluation)
 * 3. Complexity Analysis 15 marks  (candidate vs expected)
 * 4. Solution Approach   25 marks  (algo + DS keyword match)
 * 5. Edge Case Handling  10 marks  (edge TCs pass/fail)
 * ─────────────────────────────────────────────────
 */

import { geminiModel } from "./gemini";
import type { DSAQuestion } from "./question-types";

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface TCResult {
  input:          string;
  expectedOutput: string;
  actualOutput:   string | null;
  passed:         boolean;
  stderr:         string | null;
  time:           string | null;
  memory:         number | null;
  statusDesc:     string;
}

export interface DSAScoreBreakdown {
  /** 0-30: (passed sample+hidden+edge TCs) / total TCs * 30 */
  problemSolving:    number;
  /** 0-20: AI evaluation of code quality */
  codeImplementation: number;
  /** 0-15: complexity match */
  complexityAnalysis: number;
  /** 0-25: algo/DS keyword match */
  solutionApproach:  number;
  /** 0 or 10: all edge TCs pass */
  edgeCaseHandling:  number;
  /** Sum of all above */
  total:             number;
}

export interface DSAFeedback {
  round: "dsa";
  verdict: string;

  // scores
  scores: DSAScoreBreakdown;

  // problem solving
  sampleResults:  TCResult[];
  hiddenResults:  TCResult[];
  edgeResults:    TCResult[];
  totalTCs:       number;
  passedTCs:      number;

  // complexity
  candidateTimeComplexity:  string;
  candidateSpaceComplexity: string;
  expectedTimeComplexity:   string;
  expectedSpaceComplexity:  string;
  complexityFeedback:       string;

  // approach
  candidateAlgorithms:   string;
  candidateDataStructures: string;
  expectedApproach:      string[];
  matchedApproachTerms:  string[];
  missingApproachTerms:  string[];
  algorithmFeedback:     string;
  dataStructureFeedback: string;

  // code quality
  codeImplementationFeedback: string;

  // edge details
  failedEdgeCases: TCResult[];

  // one failing hidden TC (for report teaser)
  failingHiddenTCSample: TCResult | null;

  // suggested topics
  suggestedTopics: string[];

  // weak subject analysis (for donut chart, reusing existing report format)
  weakSubjectAnalysis: {
    subjects: {
      name:            string;
      questionsAsked:  number;
      weakCount:       number;
      weakPercent:     number;
      pieContribution: number;
    }[];
    weakTopics:       { topic: string; subject: string; score: number }[];
    totalWeakPercent: number;
  };
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/** Normalise a complexity string for comparison (strip spaces, lowercase). */
function normComplexity(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

/**
 * Tokenise a free-text string into searchable keywords.
 * Splits on spaces, commas, punctuation; lowercases everything.
 */
function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,;/|+\-()[\]{}]+/)
    .map(t => t.trim())
    .filter(t => t.length > 1);
}

function stemToken(token: string): string {
  return token.endsWith("s") && token.length > 3 ? token.slice(0, -1) : token;
}

function aliasesForTerm(term: string): string[] {
  const key = term.toLowerCase();
  const aliases: Record<string, string[]> = {
    "dynamic programming": ["dp"],
    "linear dp": ["linear dynamic programming", "house robber dp"],
    "depth first search": ["dfs"],
    "breadth first search": ["bfs"],
    "binary search": ["bs"],
    "binary search on answer": ["bsoa", "binary search answer", "answer binary search"],
    "two pointers": ["two pointer", "left right pointers"],
    "prefix sum": ["prefix sums", "prefix array"],
    "monotonic deque": ["monotone deque", "monotonic queue", "monotone queue"],
    "deque": ["double ended queue"],
    "array": ["arrays", "vector", "vectors", "list", "lists"],
    "matrix": ["grid", "2d array", "2d matrix"],
    "hashmap": ["hash map", "map", "dictionary", "dict"],
  };
  return [term, ...(aliases[key] ?? [])];
}

function termMatchesCandidate(term: string, candidateText: string, candidateTokens: Set<string>): boolean {
  const compactCandidate = candidateText.toLowerCase().replace(/[^a-z0-9]/g, "");

  return aliasesForTerm(term).some(alias => {
    const compactAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (compactAlias && compactCandidate.includes(compactAlias)) return true;

    const aliasTokens = tokenise(alias).map(stemToken);
    return aliasTokens.length > 0 && aliasTokens.every(t => candidateTokens.has(t));
  });
}

/** Check if two complexity strings are semantically equal. */
function complexityMatch(candidate: string, expected: string): boolean {
  const c = normComplexity(candidate);
  const e = normComplexity(expected);
  if (c === e) return true;
  // Handle O(n) vs o(n) or O(N)
  return c.replace(/o\(/g, "") === e.replace(/o\(/g, "");
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    ),
  ]);
}

// ─── Scoring Functions ─────────────────────────────────────────────────────────

/**
 * 1. Problem Solving — 30 marks
 * (passedSampleAndHidden / totalSampleAndHidden) × 30
 */
function scoreProblemSolving(
  sampleResults:  TCResult[],
  hiddenResults:  TCResult[],
  edgeResults:    TCResult[]
): number {
  const all   = [...sampleResults, ...hiddenResults, ...edgeResults];
  const total = all.length;
  if (total === 0) return 0;
  const passed = all.filter(r => r.passed).length;
  return Math.round((passed / total) * 30);
}

/**
 * 2. Code Implementation — 20 marks (Gemini AI)
 */
async function scoreCodeImplementation(
  code: string,
  languageName: string,
  problemStatement: string
): Promise<{ score: number; feedback: string }> {
  const hasKey =
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== "your_gemini_api_key_here";

  if (!hasKey || !code.trim()) {
    return { score: 10, feedback: "Code quality evaluation unavailable (no AI key)." };
  }

  const prompt = `You are an expert software engineer evaluating code quality during a technical interview.

Problem: "${problemStatement}"
Language: ${languageName}

Candidate's Code:
\`\`\`
${code.slice(0, 3000)}
\`\`\`

Evaluate the code on these criteria:
1. Meaningful variable / function names
2. Readable, clean structure
3. Proper indentation and formatting
4. Maintainability (not overly convoluted)
5. Avoidance of unnecessary complexity

Return ONLY a JSON object in this exact format:
{"score": <integer 0-20>, "feedback": "<1-2 sentence plain text feedback>"}`;

  try {
    const result = await withTimeout(geminiModel.generateContent(prompt), 10000);
    const raw = result.response.text().trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON");
    const parsed = JSON.parse(match[0]);
    const score = Math.max(0, Math.min(20, Math.round(Number(parsed.score) || 0)));
    return { score, feedback: parsed.feedback || "" };
  } catch {
    // Fallback heuristic
    const lines = code.split("\n").length;
    const score = lines > 5 ? 12 : 6;
    return { score, feedback: "Code quality assessed via structural heuristic (AI unavailable)." };
  }
}

/**
 * 3. Complexity Analysis — 15 marks
 * Both correct: 15 | Time only: 8 | Space only: 7 | None: 0
 */
function scoreComplexity(
  candidateTime:  string,
  candidateSpace: string,
  expectedTime:   string,
  expectedSpace:  string
): { score: number; feedback: string } {
  const timeOk  = complexityMatch(candidateTime,  expectedTime);
  const spaceOk = complexityMatch(candidateSpace, expectedSpace);

  let score = 0;
  if (timeOk && spaceOk) score = 15;
  else if (timeOk)        score = 8;
  else if (spaceOk)       score = 7;

  const lines: string[] = [];
  if (timeOk)   lines.push(`Time complexity ${candidateTime} is correct.`);
  else           lines.push(`Time complexity: expected ${expectedTime}, got "${candidateTime}".`);
  if (spaceOk)  lines.push(`Space complexity ${candidateSpace} is correct.`);
  else           lines.push(`Space complexity: expected ${expectedSpace}, got "${candidateSpace}".`);

  return { score, feedback: lines.join(" ") };
}

/**
 * 4. Solution Approach — 25 marks
 * matched keywords / total expected keywords × 25
 */
function scoreSolutionApproach(
  algorithmsUsed:     string,
  dataStructuresUsed: string,
  expectedAlgorithms: string[],
  expectedDataStructures: string[]
): {
  score:       number;
  matched:     string[];
  missing:     string[];
  algoFeedback: string;
  dsFeedback:   string;
} {
  const candidateText = `${algorithmsUsed} ${dataStructuresUsed}`;
  const candidateTokens = new Set([
    ...tokenise(candidateText).map(stemToken),
  ]);

  function matchTerms(terms: string[]) {
    const matched: string[] = [];
    const missing: string[] = [];

    for (const term of terms) {
      if (termMatchesCandidate(term, candidateText, candidateTokens)) matched.push(term);
      else missing.push(term);
    }

    return { matched, missing };
  }

  const algoMatch = matchTerms(expectedAlgorithms);
  const dsMatch = matchTerms(expectedDataStructures);
  const matched = [...algoMatch.matched, ...dsMatch.matched];
  const missing = [...algoMatch.missing, ...dsMatch.missing];
  const total = expectedAlgorithms.length + expectedDataStructures.length;
  const score =
    total === 0
      ? 25
      : Math.round((matched.length / total) * 25);

  const algoFeedback =
    algoMatch.missing.length === 0
      ? "All expected algorithms were correctly identified."
      : `Identified ${algoMatch.matched.length} of ${expectedAlgorithms.length} expected algorithms. Missing: ${algoMatch.missing.join(", ")}.`;

  const dsFeedback =
    dsMatch.missing.length === 0
      ? "All expected data structures were correctly identified."
      : `Identified ${dsMatch.matched.length} of ${expectedDataStructures.length} expected data structures. Missing: ${dsMatch.missing.join(", ")}.`;

  return { score, matched, missing, algoFeedback, dsFeedback };
}

/**
 * 5. Edge Case Handling — 10 marks
 * All edge TCs pass → 10, otherwise 0.
 */
function scoreEdgeCases(edgeResults: TCResult[]): number {
  if (edgeResults.length === 0) return 10; // no edge TCs defined → full marks
  return edgeResults.every(r => r.passed) ? 10 : 0;
}

// ─── Verdict ──────────────────────────────────────────────────────────────────

function getVerdict(score: number): string {
  if (score >= 85) return "Strongly Recommended";
  if (score >= 70) return "Recommended";
  if (score >= 50) return "Borderline";
  return "Not Recommended";
}

// ─── Weak Subject Analysis (for donut chart) ──────────────────────────────────

function buildWeakSubjectAnalysis(scores: DSAScoreBreakdown): DSAFeedback["weakSubjectAnalysis"] {
  const categories = [
    { name: "Problem Solving",      score: scores.problemSolving,     max: 30 },
    { name: "Code Implementation",  score: scores.codeImplementation, max: 20 },
    { name: "Complexity Analysis",  score: scores.complexityAnalysis, max: 15 },
    { name: "Solution Approach",    score: scores.solutionApproach,   max: 25 },
    { name: "Edge Case Handling",   score: scores.edgeCaseHandling,   max: 10 },
  ];

  const subjects = categories.map(c => {
    const pct         = c.max > 0 ? (c.score / c.max) * 100 : 100;
    const isWeak      = pct < 50;
    return {
      name:            c.name,
      questionsAsked:  c.max,
      weakCount:       isWeak ? 1 : 0,
      weakPercent:     isWeak ? Math.round(100 - pct) : 0,
      pieContribution: 0, // filled below
    };
  });

  const totalWeak = subjects.reduce((acc, s) => acc + s.weakCount, 0);
  if (totalWeak > 0) {
    subjects.forEach(s => {
      s.pieContribution = totalWeak > 0 ? Math.round((s.weakCount / totalWeak) * 100) : 0;
    });
  }

  const weakTopics = subjects
    .filter(s => s.weakCount > 0)
    .map(s => ({
      topic:   s.name,
      subject: "DSA Round",
      score:   Math.round((1 - s.weakPercent / 100) * 100),
    }));

  return {
    subjects,
    weakTopics,
    totalWeakPercent: totalWeak > 0 ? Math.round((totalWeak / subjects.length) * 100) : 0,
  };
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export interface DSASubmission {
  code:                string;
  languageName:        string;
  candidateTimeComplexity:   string;
  candidateSpaceComplexity:  string;
  algorithmsUsed:      string;
  dataStructuresUsed:  string;
  sampleResults:       TCResult[];
  hiddenResults:       TCResult[];
  edgeResults:         TCResult[];
}

export async function scoreDSASubmission(
  submission: DSASubmission,
  question:   DSAQuestion
): Promise<DSAFeedback> {
  // ── 1. Problem Solving ───────────────────────────────────────────────────
  const problemSolvingScore = scoreProblemSolving(
    submission.sampleResults,
    submission.hiddenResults,
    submission.edgeResults
  );

  // ── 2. Code Implementation ───────────────────────────────────────────────
  const { score: codeScore, feedback: codeFeedback } =
    await scoreCodeImplementation(
      submission.code,
      submission.languageName,
      question.question
    );

  // ── 3. Complexity Analysis ───────────────────────────────────────────────
  const { score: complexityScore, feedback: complexityFeedback } =
    scoreComplexity(
      submission.candidateTimeComplexity,
      submission.candidateSpaceComplexity,
      question.expectedTimeComplexity,
      question.expectedSpaceComplexity
    );

  // ── 4. Solution Approach ─────────────────────────────────────────────────
  const {
    score:       approachScore,
    matched:     matchedTerms,
    missing:     missingTerms,
    algoFeedback,
    dsFeedback,
  } = scoreSolutionApproach(
    submission.algorithmsUsed,
    submission.dataStructuresUsed,
    question.expectedAlgorithms ?? question.expectedApproach,
    question.expectedDataStructures ?? []
  );

  // ── 5. Edge Case Handling ────────────────────────────────────────────────
  const edgeScore = scoreEdgeCases(submission.edgeResults);

  // ── Totals ───────────────────────────────────────────────────────────────
  const scores: DSAScoreBreakdown = {
    problemSolving:     problemSolvingScore,
    codeImplementation: codeScore,
    complexityAnalysis: complexityScore,
    solutionApproach:   approachScore,
    edgeCaseHandling:   edgeScore,
    total: problemSolvingScore + codeScore + complexityScore + approachScore + edgeScore,
  };

  const allTCs = [
    ...submission.sampleResults,
    ...submission.hiddenResults,
    ...submission.edgeResults,
  ];
  const passedTCs = allTCs.filter(r => r.passed).length;

  // ── Suggested Topics ─────────────────────────────────────────────────────
  const suggestedTopics = missingTerms.length > 0
    ? missingTerms
    : scores.total < 70
    ? question.expectedApproach
    : [];

  // ── One failing hidden TC for report ────────────────────────────────────
  const failingHiddenTCSample =
    submission.hiddenResults.find(r => !r.passed) ?? null;

  return {
    round:   "dsa",
    verdict: getVerdict(scores.total),
    scores,

    sampleResults: submission.sampleResults,
    hiddenResults: submission.hiddenResults,
    edgeResults:   submission.edgeResults,
    totalTCs:      allTCs.length,
    passedTCs,

    candidateTimeComplexity:  submission.candidateTimeComplexity,
    candidateSpaceComplexity: submission.candidateSpaceComplexity,
    expectedTimeComplexity:   question.expectedTimeComplexity,
    expectedSpaceComplexity:  question.expectedSpaceComplexity,
    complexityFeedback,

    candidateAlgorithms:    submission.algorithmsUsed,
    candidateDataStructures: submission.dataStructuresUsed,
    expectedApproach:        [
      ...(question.expectedAlgorithms ?? question.expectedApproach),
      ...(question.expectedDataStructures ?? []),
    ],
    matchedApproachTerms:    matchedTerms,
    missingApproachTerms:    missingTerms,
    algorithmFeedback:       algoFeedback,
    dataStructureFeedback:   dsFeedback,

    codeImplementationFeedback: codeFeedback,

    failedEdgeCases:       submission.edgeResults.filter(r => !r.passed),
    failingHiddenTCSample,

    suggestedTopics,
    weakSubjectAnalysis:   buildWeakSubjectAnalysis(scores),
  };
}
