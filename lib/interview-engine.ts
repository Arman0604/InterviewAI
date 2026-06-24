import { geminiModel } from "./gemini";
import { getRoleById } from "./roles";
import {
  getQuestionsForRole,
  formatQuestionsForPrompt,
  InterviewQuestion,
  OAQuestion,
  QUESTION_BANK,
  getHRQuestions,
  getAptitudeQuestions,
} from "./questions";

export interface Message {
  role: "interviewer" | "candidate";
  content: string;
  timestamp: string;
}

export interface InterviewState {
  messages: Message[];
  questionCount: number;
  followUpCount: number;
  isComplete: boolean;
}

const TOTAL_QUESTIONS = 10; // SE: 3 OS + 3 DBMS + 2 OOP + 1 CN + 1 PL
const MAX_FOLLOW_UPS = 2;
const OUTRO_MESSAGES = [
  "That brings us to the end of today's interview. Thank you for your participation, I will now share your performance report based on your responses throughout the session. Thank you",
  "We've reached the end of the interview. Thank you for your time and participation. I will now generate your interview report and share detailed feedback based on your performance.",
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function isLowConfidenceAnswer(answer: string): boolean {
  const normalized = answer
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return [
    /\b(i\s*['\s]?\s*)?(do\s*not|don't|dont)\s+know\b/,
    /\b(i\s*['\s]?\s*m|im|i\s+am)?\s*not\s+getting\b/,
    /\bnot\s+getting\s+it\b/,
    /\bno\s+idea\b/,
    /\bnot\s+sure\b/,
    /\bunsure\b/,
  ].some((pattern) => pattern.test(normalized));
}

function getLastCandidateAnswer(history: Message[]): string {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "candidate") return history[i].content;
  }
  return "";
}

function questionWasAsked(content: string, question: string): boolean {
  return content.toLowerCase().includes(question.toLowerCase());
}

function isFollowUpMessage(content: string): boolean {
  return /\b(?:quick|brief)\s+follow-up\b|\bone\s+follow-up\b/i.test(content);
}

export interface SimState {
  phase: "introduction" | "project" | "experience" | "technical" | "outro";
  technicalQuestionIndex: number;
  askedTechnicalIds: Set<string>;
  followUpActive: boolean;
  challengeActive: boolean;
}

export function simulateInterview(
  history: Message[],
  questions: InterviewQuestion[],
  resumeText?: string
): SimState {
  const hasExp = hasExperienceSection(resumeText);
  let phase: "introduction" | "project" | "experience" | "technical" | "outro" = "introduction";
  let technicalQuestionIndex = 0;
  let followUpActive = false;
  let challengeActive = false;
  const askedTechnicalIds = new Set<string>();
  let isFirstInterviewerMessage = true;

  for (const message of history) {
    if (message.role !== "interviewer") continue;

    if (isOutroMessage(message.content)) {
      phase = "outro";
    } else if (isIrrelevantPrompt(message.content)) {
      // Redirect: no phase transition
    } else if (isChallengeMessage(message.content)) {
      challengeActive = true;
    } else if (isFollowUpMessage(message.content)) {
      followUpActive = true;
    } else {
      // Main question
      if (isFirstInterviewerMessage) {
        isFirstInterviewerMessage = false;
        phase = "introduction";
      } else {
        if (phase === "introduction") {
          phase = "project";
        } else if (phase === "project") {
          if (hasExp) {
            phase = "experience";
          } else {
            phase = "technical";
            technicalQuestionIndex = 0;
            if (questions[0]) askedTechnicalIds.add(questions[0].id);
          }
        } else if (phase === "experience") {
          phase = "technical";
          technicalQuestionIndex = 0;
          if (questions[0]) askedTechnicalIds.add(questions[0].id);
        } else if (phase === "technical") {
          technicalQuestionIndex++;
          followUpActive = false;
          challengeActive = false;
          if (questions[technicalQuestionIndex] && technicalQuestionIndex < TOTAL_QUESTIONS) {
            askedTechnicalIds.add(questions[technicalQuestionIndex].id);
          }
        }
      }
    }
  }

  return {
    phase,
    technicalQuestionIndex,
    askedTechnicalIds,
    followUpActive,
    challengeActive,
  };
}

export function getTechnicalAnswers(
  history: Message[],
  questions: InterviewQuestion[],
  resumeText?: string
): Record<string, string> {
  const hasExp = hasExperienceSection(resumeText);
  let phase: "introduction" | "project" | "experience" | "technical" | "outro" = "introduction";
  let technicalQuestionIndex = 0;
  let isFirstInterviewerMessage = true;

  const answers: Record<string, string> = {};

  for (let i = 0; i < history.length; i++) {
    const msg = history[i];
    if (msg.role === "interviewer") {
      if (isOutroMessage(msg.content)) {
        phase = "outro";
      } else if (isIrrelevantPrompt(msg.content)) {
        // Redirect: no phase transition
      } else if (isChallengeMessage(msg.content) || isFollowUpMessage(msg.content)) {
        // Challenge or follow-up: do not change phase/index
      } else {
        // Main question
        if (isFirstInterviewerMessage) {
          isFirstInterviewerMessage = false;
          phase = "introduction";
        } else {
          if (phase === "introduction") {
            phase = "project";
          } else if (phase === "project") {
            if (hasExp) {
              phase = "experience";
            } else {
              phase = "technical";
              technicalQuestionIndex = 0;
            }
          } else if (phase === "experience") {
            phase = "technical";
            technicalQuestionIndex = 0;
          } else if (phase === "technical") {
            technicalQuestionIndex++;
          }
        }
      }
    } else {
      // Candidate response
      const nextMsg = history[i + 1];
      if (nextMsg && nextMsg.role === "interviewer" && isIrrelevantPrompt(nextMsg.content)) {
        continue;
      }

      if (phase === "technical" && technicalQuestionIndex < TOTAL_QUESTIONS) {
        const q = questions[technicalQuestionIndex];
        if (q) {
          if (answers[q.id]) {
            answers[q.id] += " " + msg.content;
          } else {
            answers[q.id] = msg.content;
          }
        }
      }
    }
  }

  return answers;
}

function countTechnicalQuestionsAsked(history: Message[], questions: InterviewQuestion[], resumeText?: string): number {
  const state = simulateInterview(history, questions, resumeText);
  if (state.phase === "outro") {
    return TOTAL_QUESTIONS;
  }
  if (state.phase === "technical") {
    return state.technicalQuestionIndex + 1;
  }
  return 0;
}

function getAskedQuestionIds(history: Message[], questions: InterviewQuestion[], resumeText?: string): Set<string> {
  const state = simulateInterview(history, questions, resumeText);
  return state.askedTechnicalIds;
}

function getCurrentTechnicalQuestion(
  history: Message[],
  questions: InterviewQuestion[],
  resumeText?: string
): { question: InterviewQuestion; index: number } | null {
  const state = simulateInterview(history, questions, resumeText);
  if (state.phase === "technical" && state.technicalQuestionIndex < TOTAL_QUESTIONS) {
    const question = questions[state.technicalQuestionIndex];
    if (question) {
      return { question, index: state.technicalQuestionIndex };
    }
  }
  return null;
}

function getLastTechnicalQuestion(
  history: Message[],
  questions: InterviewQuestion[],
  resumeText?: string
): { question: InterviewQuestion; index: number } | null {
  return getCurrentTechnicalQuestion(history, questions, resumeText);
}

function getLastInterviewerMessage(history: Message[]): Message | null {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "interviewer") return history[i];
  }
  return null;
}

function isChallengeMessage(content: string): boolean {
  return /^(Are you sure\?|Interesting\. Can you walk me through your reasoning\?|Okay\. Can you think of a more precise answer\?)/i.test(
    content.trim()
  );
}

function wasLastInterviewerChallenge(history: Message[]): boolean {
  const lastInterviewer = getLastInterviewerMessage(history);
  return lastInterviewer ? isChallengeMessage(lastInterviewer.content) : false;
}

function isIrrelevantPrompt(content: string): boolean {
  return /^(I don't see how that relates|Could you answer in the context of (?:the [\w-]+ )?question\?)/i.test(
    content.trim()
  );
}

function wasLastInterviewerIrrelevantPrompt(history: Message[]): boolean {
  const lastInterviewer = getLastInterviewerMessage(history);
  return lastInterviewer ? isIrrelevantPrompt(lastInterviewer.content) : false;
}

function getLastActualInterviewerQuestion(history: Message[]): Message | null {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role !== "interviewer") continue;
    if (isChallengeMessage(history[i].content)) continue;
    if (isIrrelevantPrompt(history[i].content)) continue;
    return history[i];
  }
  return null;
}

function getInterviewerQuestionType(
  content: string,
  projectNames?: string | string[],
  companyName?: string
): "introduction" | "project" | "experience" | "technical" | "followup" {
  const normalized = content.toLowerCase();

  if (/\b(?:quick|brief)\s+follow-up\b|\bone\s+follow-up\b/i.test(content)) {
    return "followup";
  }

  if (
    normalized.includes("brief introduction") ||
    normalized.includes("about yourself") ||
    normalized.includes("dive into the technical questions")
  ) {
    return "introduction";
  }

  // Accept both a single project name (legacy) and an array of names
  const nameList = Array.isArray(projectNames)
    ? projectNames
    : projectNames
    ? [projectNames]
    : [];
  if (nameList.some((p) => p && normalized.includes(p.toLowerCase()))) {
    return "project";
  }
  if (
    normalized.includes("main technical challenges you faced while building") ||
    normalized.includes("challenges you faced while building") ||
    normalized.includes("also noticed another project") ||
    normalized.includes("also see another project")
  ) {
    return "project";
  }

  if (companyName && normalized.includes(companyName.toLowerCase())) {
    return "experience";
  }
  if (
    normalized.includes("work experience") ||
    normalized.includes("responsibilities") ||
    normalized.includes("day-to-day responsibilities")
  ) {
    return "experience";
  }

  return "technical";
}

function getNonTechnicalIrrelevantResponse(
  type: "introduction" | "project" | "experience",
  _question: string,
  repeatAttempt: boolean
): string {
  // Bug fix #1: Do NOT repeat the full intro/project/experience question — just redirect.
  if (type === "introduction") {
    const responses = [
      `I don't see how that relates. Let's specifically focus on the introduction — please introduce yourself properly, sharing your background, experience, and what made you interested in this position.`,
      `Could you please focus on the introduction? Tell me about your background, experience, and what brought you to apply for this role.`,
    ];
    return responses[(repeatAttempt ? 1 : 0) % responses.length];
  }

  // For project / experience, still re-state the question but strip any prior irrelevant prefix
  let cleanQuestion = _question;
  if (cleanQuestion.includes("\n\n")) {
    const parts = cleanQuestion.split("\n\n");
    if (/^(I don't see how that relates|Could you answer in the context of)/i.test(parts[0])) {
      cleanQuestion = parts.slice(1).join("\n\n");
    }
  }

  const responses = [
    `I don't see how that relates, Let's focus specifically on the ${type}..\n\n${cleanQuestion}`,
    `Could you answer in the context of the ${type} question?\n\n${cleanQuestion}`,
  ];
  return responses[(repeatAttempt ? 1 : 0) % responses.length];
}

async function classifyNonTechnicalAnswer(
  question: string,
  candidateAnswer: string,
  type: "introduction" | "project" | "experience"
): Promise<"correct" | "irrelevant"> {
  if (isLowConfidenceAnswer(candidateAnswer)) return "correct";

  const clean = candidateAnswer.trim();
  const tokens = tokenizeForScoring(clean);
  if (tokens.length < 2) {
    return "irrelevant";
  }

  const hasGeminiKey =
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_gemini_api_key_here";

  if (hasGeminiKey) {
    try {
      const classificationPrompt = `You are an expert technical interviewer evaluating a candidate's response to an interview stage.

Stage: "${type}"
Question/Prompt asked: "${question}"
Candidate's response: "${candidateAnswer}"

Classify the candidate's response as exactly ONE of:
- irrelevant: completely off-topic with no connection to the question/prompt whatsoever, a greeting only, a simple acknowledgment, or gibberish
- correct: candidate attempts to answer the prompt or gives relevant information about themselves/their background/their project/their experience.

Reply with only one word (irrelevant or correct):`;

      const result = await withTimeout(geminiModel.generateContent(classificationPrompt), 5000);
      const raw = result.response
        .text()
        .trim()
        .toLowerCase()
        .split(/[\s\n]/)[0]
        .replace(/[^a-z]/g, "");
      if (raw === "irrelevant") return "irrelevant";
      if (raw === "correct") return "correct";
    } catch {
      // Fallback
    }
  }

  return "correct";
}

function getValidCandidateAnswerCount(history: Message[]): number {
  let count = 0;
  for (let i = 0; i < history.length; i++) {
    if (history[i].role === "candidate") {
      const nextMessage = history[i + 1];
      if (nextMessage && nextMessage.role === "interviewer" && isIrrelevantPrompt(nextMessage.content)) {
        continue;
      }
      count++;
    }
  }
  return count;
}

function isIntroMessage(content: string): boolean {
  const normalized = content.toLowerCase();
  return (
    normalized.includes("brief introduction") ||
    normalized.includes("about yourself") ||
    normalized.includes("before we dive into the technical questions") ||
    normalized.includes("before we begin")
  );
}

function isOutroMessage(content: string): boolean {
  return OUTRO_MESSAGES.some((message) => content.includes(message));
}

function countAskedInterviewQuestions(history: Message[]): number {
  return history.filter((message) => {
    if (message.role !== "interviewer") return false;
    if (isIntroMessage(message.content)) return false;
    if (isChallengeMessage(message.content)) return false;
    if (isIrrelevantPrompt(message.content)) return false;
    if (isOutroMessage(message.content)) return false;
    return true;
  }).length;
}

function getOutroMessage(history: Message[]): string {
  return OUTRO_MESSAGES[countAskedInterviewQuestions(history) % OUTRO_MESSAGES.length];
}

function getFollowUpIrrelevantResponse(followUpQuestion: string, repeatAttempt: boolean): string {
  const responses = [
    `I don't see how that relates, Let's focus specifically on the follow-up question..\n\n${followUpQuestion}`,
    `Could you answer in the context of the follow-up question?\n\n${followUpQuestion}`,
  ];
  return responses[(repeatAttempt ? 1 : 0) % responses.length];
}

async function classifyFollowUpAnswer(
  followUpQuestion: string,
  candidateAnswer: string
): Promise<"correct" | "wrong" | "irrelevant"> {
  if (isLowConfidenceAnswer(candidateAnswer)) return "correct";

  const hasGeminiKey =
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_gemini_api_key_here";

  if (hasGeminiKey) {
    try {
      const classificationPrompt = `You are an expert technical interviewer evaluating a candidate's answer to a dynamic follow-up question in a live interview.

Follow-up question asked: "${followUpQuestion}"
Candidate's answer: "${candidateAnswer}"

Classify the candidate's answer as exactly ONE of:
- irrelevant: completely off-topic with no connection to the follow-up question whatsoever
- wrong: attempts to answer the follow-up question but is technically incorrect, makes wrong assumptions, or is highly unsatisfactory
- correct: correctly or partially answers the follow-up question with accurate technical information

Reply with only one word (irrelevant, wrong, or correct):`;

      const result = await withTimeout(geminiModel.generateContent(classificationPrompt), 5000);
      const raw = result.response
        .text()
        .trim()
        .toLowerCase()
        .split(/[\s\n]/)[0]
        .replace(/[^a-z]/g, "");
      if (raw === "irrelevant") return "irrelevant";
      if (raw === "wrong") return "wrong";
      if (raw === "correct") return "correct";
    } catch {
      // Fallback
    }
  }

  return "correct";
}

function alreadyAskedFollowUpForCurrentQuestion(
  history: Message[],
  questions: InterviewQuestion[],
  resumeText?: string
): boolean {
  const state = simulateInterview(history, questions, resumeText);
  if (state.phase !== "technical") return false;

  // Scan backwards to find the last main technical question message
  for (let i = history.length - 1; i >= 0; i--) {
    const message = history[i];
    if (message.role !== "interviewer") continue;
    if (isChallengeMessage(message.content)) continue;
    if (isIrrelevantPrompt(message.content)) continue;
    
    if (isFollowUpMessage(message.content)) {
      return true;
    }
    // Found the main question, and no follow-up was encountered after it
    return false;
  }
  return false;
}

function getIrrelevantResponse(questionIndex: number, question: string, repeatAttempt: boolean): string {
  const responses = [
    `I don't see how that relates, Let's focus specifically on the question..\n\n${question}`,
    `Could you answer in the context of question?\n\n${question}`,
  ];
  return responses[(questionIndex + (repeatAttempt ? 1 : 0)) % responses.length];
}

function getChallengeResponse(questionIndex: number): string {
  const responses = [
    "Are you sure?",
    "Interesting. Can you walk me through your reasoning?",
    "Okay. Can you think of a more precise answer?",
  ];
  return responses[questionIndex % responses.length];
}

function tokenizeForScoring(text: string): string[] {
  const stopWords = new Set([
    "a", "an", "and", "are", "as", "at", "be", "by", "can", "do", "does", "for",
    "from", "give", "how", "i", "in", "is", "it", "me", "of", "on", "or", "the",
    "their", "this", "to", "use", "using", "what", "when", "with", "would", "you",
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !stopWords.has(token));
}

/**
 * Count how many of the question's structured answerKeywords appear in the candidate's answer.
 * Each keyword entry may contain alternatives separated by "/" or " or " — any match counts.
 * Returns the number of matched keyword entries (not token count).
 */
function getKeywordMatchScore(answer: string, question: InterviewQuestion): number {
  if (!question.answerKeywords || question.answerKeywords.length === 0) return 0;
  const normalizedAnswer = answer.toLowerCase();
  let matched = 0;
  for (const keyword of question.answerKeywords) {
    // Split alternatives like "fast/faster/speed" or "block or stuck"
    const alternatives = keyword.toLowerCase().split(/\s*\/\s*|\s+or\s+/);
    if (alternatives.some((alt) => normalizedAnswer.includes(alt.trim()))) {
      matched++;
    }
  }
  return matched;
}

function hasAttemptShape(answer: string, question: InterviewQuestion): boolean {
  const normalizedAnswer = answer.toLowerCase();
  const normalizedQuestion = question.question.toLowerCase();

  if (/\b(one|first|1st).+\b(other|second|2nd)\b|\b(other|second|2nd).+\b(one|first|1st)\b/.test(normalizedAnswer)) {
    return true;
  }

  if (/\b(difference|different|compare|comparison|versus|vs|between)\b/.test(normalizedQuestion)) {
    return /\b(difference|different|compare|versus|vs|whereas|while|but|however|one|other|first|second)\b/.test(
      normalizedAnswer
    );
  }

  if (/\bhow would you|design|walk me through|key components\b/.test(normalizedQuestion)) {
    return /\b(use|using|build|create|database|server|api|cache|component|step|first|then)\b/.test(
      normalizedAnswer
    );
  }

  if (/\bwhat is|explain|why|when would you\b/.test(normalizedQuestion)) {
    return /\b(means|because|use|used|when|example|purpose|works|helps|handles)\b/.test(normalizedAnswer);
  }

  return false;
}

function isIrrelevantAnswer(answer: string, question: InterviewQuestion): boolean {
  if (isLowConfidenceAnswer(answer)) return false;

  const answerTokens = new Set(tokenizeForScoring(answer));
  if (answerTokens.size < 2) return true;

  // Prefer structured keyword matching when available
  if (question.answerKeywords && question.answerKeywords.length > 0) {
    if (getKeywordMatchScore(answer, question) > 0) return false;
    // Also check question-text token overlap as a fallback signal
    const questionTokens = new Set(tokenizeForScoring(question.question));
    let qOverlap = 0;
    for (const token of answerTokens) {
      if (questionTokens.has(token)) qOverlap++;
    }
    return qOverlap === 0 && !hasAttemptShape(answer, question);
  }

  // Legacy fallback: token overlap with expectedAnswer + question text
  const expectedTokens = new Set(tokenizeForScoring(question.expectedAnswer));
  const questionTokens = new Set(tokenizeForScoring(question.question));
  let overlap = 0;
  for (const token of answerTokens) {
    if (expectedTokens.has(token) || questionTokens.has(token)) overlap++;
  }
  return overlap === 0 && !hasAttemptShape(answer, question);
}

type TechnicalAnswerQuality = "unsure" | "weak" | "partial" | "strong";

function getTechnicalAnswerQuality(answer: string, question: InterviewQuestion): TechnicalAnswerQuality {
  if (isLowConfidenceAnswer(answer)) return "unsure";

  const answerTokens = new Set(tokenizeForScoring(answer));
  const meaningfulAnswerLength = answerTokens.size;
  if (meaningfulAnswerLength < 4) return "weak";

  // ── Structured keyword scoring (preferred when answerKeywords are present) ──
  if (question.answerKeywords && question.answerKeywords.length > 0) {
    const matched = getKeywordMatchScore(answer, question);
    const total = question.answerKeywords.length;
    if (matched === 0) return "weak";
    // ≥ 60 % of keywords matched → strong; ≥ 30 % → partial; else weak
    if (matched >= Math.ceil(total * 0.6)) return "strong";
    if (matched >= Math.max(1, Math.ceil(total * 0.3))) return "partial";
    return "weak";
  }

  // ── Legacy fallback: token overlap with expectedAnswer ──
  const expectedTokens = new Set(tokenizeForScoring(question.expectedAnswer));
  let overlap = 0;
  for (const token of answerTokens) {
    if (expectedTokens.has(token)) overlap++;
  }
  if (overlap === 0) return "weak";
  const expectedKeywordCount = Math.max(expectedTokens.size, 1);
  const strongOverlap = Math.max(3, Math.ceil(expectedKeywordCount * 0.18));
  if (overlap >= strongOverlap) return "strong";
  if (overlap >= 2) return "partial";
  return "weak";
}

function isAnswerUnsatisfactory(answer: string, question: InterviewQuestion): boolean {
  return getTechnicalAnswerQuality(answer, question) === "weak";
}

function shouldChallengeAnswer(history: Message[], questions: InterviewQuestion[], resumeText?: string): boolean {
  const lastAnswer = getLastCandidateAnswer(history);
  if (!lastAnswer || wasLastInterviewerChallenge(history)) return false;

  const lastTechnicalQuestion = getCurrentTechnicalQuestion(history, questions, resumeText);
  if (!lastTechnicalQuestion) return false;
  if (isIrrelevantAnswer(lastAnswer, lastTechnicalQuestion.question)) return false;

  return isAnswerUnsatisfactory(lastAnswer, lastTechnicalQuestion.question);
}

function countFollowUpsAsked(history: Message[]): number {
  return history.filter(
    (message) =>
      message.role === "interviewer" &&
      /\b(?:quick|brief)\s+follow-up\b|\bone\s+follow-up\b/i.test(message.content)
  ).length;
}

function getFollowUpSlots(questions: InterviewQuestion[]): Set<number> {
  const technicalQuestions = questions.slice(0, TOTAL_QUESTIONS);
  const eligibleIndexes = technicalQuestions
    .map((_, index) => index)
    .filter((index) => index > 0 && index < technicalQuestions.length - 1);
  const seed = hashString(technicalQuestions.map((question) => question.id).join("|"));
  const shuffled = eligibleIndexes.sort(
    (a, b) => hashString(`${seed}:${a}`) - hashString(`${seed}:${b}`)
  );

  return new Set(shuffled.slice(0, MAX_FOLLOW_UPS));
}

function shouldAskFollowUp(history: Message[], questions: InterviewQuestion[], resumeText?: string): boolean {
  const lastAnswer = getLastCandidateAnswer(history);
  if (!lastAnswer || isLowConfidenceAnswer(lastAnswer)) return false;
  if (countFollowUpsAsked(history) >= MAX_FOLLOW_UPS) return false;
  if (alreadyAskedFollowUpForCurrentQuestion(history, questions, resumeText)) return false;

  const lastTechnicalQuestion = getLastTechnicalQuestion(history, questions, resumeText);
  if (!lastTechnicalQuestion) return false;
  if (getTechnicalAnswerQuality(lastAnswer, lastTechnicalQuestion.question) !== "strong") {
    return false;
  }

  return getFollowUpSlots(questions).has(lastTechnicalQuestion.index);
}

function getLowConfidenceAcknowledgment(): string {
  const options = [
    "No worries, that's okay.",
    "It's okay, no worries.",
    "That's alright, no problem.",
  ];
  return options[Math.floor(Math.random() * options.length)];
}

function getPositiveAcknowledgment(questionIndex: number): string {
  const acks = [
    "That's great!",
    "Sounds good!",
    "That's helpful!",
    "That's great, well explained!",
  ];
  return acks[questionIndex % acks.length];
}

function getAnswerAcknowledgment(
  history: Message[],
  questions: InterviewQuestion[],
  fallbackIndex: number,
  resumeText?: string
): string {
  const lastAnswer = getLastCandidateAnswer(history);
  if (isLowConfidenceAnswer(lastAnswer)) return getLowConfidenceAcknowledgment();

  const lastInterviewer = getLastInterviewerMessage(history);
  const isFollowUpActive = lastInterviewer && /\b(?:quick|brief)\s+follow-up\b|\bone\s+follow-up\b/i.test(lastInterviewer.content);
  if (isFollowUpActive) {
    const lastTechnicalQuestion = getCurrentTechnicalQuestion(history, questions, resumeText);
    return getPositiveAcknowledgment(lastTechnicalQuestion ? lastTechnicalQuestion.index : fallbackIndex);
  }

  const lastTechnicalQuestion = getCurrentTechnicalQuestion(history, questions, resumeText);
  if (
    lastTechnicalQuestion &&
    getTechnicalAnswerQuality(lastAnswer, lastTechnicalQuestion.question) === "strong"
  ) {
    return getPositiveAcknowledgment(lastTechnicalQuestion.index);
  }

  return getAcknowledgment(fallbackIndex);
}

function getGeminiAcknowledgmentInstruction(
  history: Message[],
  questions: InterviewQuestion[],
  resumeText?: string
): string {
  const lastAnswer = getLastCandidateAnswer(history);
  if (isLowConfidenceAnswer(lastAnswer)) {
    return `Start with a brief supportive acknowledgement such as "No worries, that's okay." Do not say their answer was great or detailed.`;
  }

  const lastInterviewer = getLastInterviewerMessage(history);
  const isFollowUpActive = lastInterviewer && /\b(?:quick|brief)\s+follow-up\b|\bone\s+follow-up\b/i.test(lastInterviewer.content);
  if (isFollowUpActive) {
    return `Start with a brief positive acknowledgement such as "That's great!", "Sounds good!", or "That's helpful!" because the candidate answered the follow-up question well.`;
  }

  const lastTechnicalQuestion = getCurrentTechnicalQuestion(history, questions, resumeText);
  if (
    lastTechnicalQuestion &&
    getTechnicalAnswerQuality(lastAnswer, lastTechnicalQuestion.question) === "strong"
  ) {
    return `Start with a brief positive acknowledgement such as "That's great!", "Sounds good!", or "That's helpful!" because the answer addressed the question well.`;
  }

  return "Use a brief neutral acknowledgement without praising the answer.";
}

function normalizeResumeHeading(line: string): string {
  return line
    .replace(/^[\s\-*•o·■♦\d+\.\)]+/, "")
    .replace(/[:|]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasExperienceSection(text?: string): boolean {
  if (!text) return false;

  const experienceHeading =
    /^(?:(?:professional|work|relevant|industry|internship|employment|career)\s+)?(?:experience|experiences)$|^(?:employment|work|career)\s+history$|^professional\s+background$|^internships?$/i;

  return text
    .split("\n")
    .map(normalizeResumeHeading)
    .some((line) => line.length > 0 && line.length <= 50 && experienceHeading.test(line));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`API request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * Classify a candidate's technical answer using Gemini AI for semantic understanding,
 * falling back to local keyword heuristics when Gemini is unavailable.
 *
 * Returns:
 *  "irrelevant" — completely off-topic, no connection to the question
 *  "wrong"      — attempts the question but contains incorrect technical information
 *  "correct"    — correctly or partially addresses the question with accurate info
 */
async function classifyTechnicalAnswer(
  question: InterviewQuestion,
  candidateAnswer: string
): Promise<"correct" | "wrong" | "irrelevant"> {
  // Low-confidence answers are handled by the supportive path, not as wrong
  if (isLowConfidenceAnswer(candidateAnswer)) return "correct";

  const hasGeminiKey =
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_gemini_api_key_here";

  if (hasGeminiKey) {
    try {
      const classificationPrompt = `You are an expert technical interviewer evaluating a candidate's answer in a live interview.

Question asked: "${question.question}"
Expected key concepts: "${question.expectedAnswer.substring(0, 400)}"
Candidate's answer: "${candidateAnswer}"

Classify the candidate's answer as exactly ONE of:
- irrelevant: completely off-topic with no technical connection to the question whatsoever
- wrong: attempts to answer the question but contains incorrect technical information
- correct: correctly or partially addresses the question with accurate technical information

Reply with only one word (irrelevant, wrong, or correct):`;

      const result = await withTimeout(geminiModel.generateContent(classificationPrompt), 5000);
      const raw = result.response
        .text()
        .trim()
        .toLowerCase()
        .split(/[\s\n]/)[0]
        .replace(/[^a-z]/g, "");
      if (raw === "irrelevant") return "irrelevant";
      if (raw === "wrong") return "wrong";
      if (raw === "correct") return "correct";
    } catch {
      // Fall through to local heuristics
    }
  }

  // Local heuristic fallback
  if (isIrrelevantAnswer(candidateAnswer, question)) return "irrelevant";
  const quality = getTechnicalAnswerQuality(candidateAnswer, question);
  return quality === "weak" ? "wrong" : "correct";
}

export interface ExtractedResumeInfo {
  projectName: string;
  projectKeywords: string[];
  companyName: string;
}

const TECH_LIST = [
  "react", "node", "express", "next\\.js", "nextjs", "vue", "angular", "typescript", "javascript",
  "python", "django", "flask", "fastapi", "go", "golang", "rust", "java", "spring", "c\\+\\+", "c#",
  "ruby", "rails", "php", "laravel", "postgresql", "postgres", "mysql", "sqlite", "mongodb",
  "redis", "elasticsearch", "cassandra", "firebase", "supabase", "graphql", "rest", "grpc",
  "aws", "gcp", "azure", "docker", "kubernetes", "k8s", "terraform", "ci/cd", "github actions",
  "html", "css", "tailwind", "redux", "zustand", "prisma", "sequelize", "mongoose", "websockets",
  "socket\\.io", "oauth", "jwt", "stripe", "payment", "microservices", "serverless", "bill splitting",
  "billing", "real-time", "booking", "authentication", "auth", "search"
];

function isTechStackLine(str: string): boolean {
  const words = str.toLowerCase().split(/[\s,\|/\+:\(\)\{\}\[\]\-\d]+/);
  const cleanWords = words.filter(Boolean);
  if (cleanWords.length === 0) return false;
  
  let techCount = 0;
  for (const w of cleanWords) {
    if (TECH_LIST.some(t => {
      const cleanT = t.replace("\\", "");
      return cleanT === w || w.includes(cleanT);
    })) {
      techCount++;
    }
  }
  
  return techCount >= 2 || (techCount > 0 && techCount === cleanWords.length);
}

/**
 * Heuristically extracts a project, its keywords, and company name from parsed resume text.
 */
export function extractResumeInfo(text: string): ExtractedResumeInfo {
  let projectName = "";
  let projectKeywords: string[] = [];
  let companyName = "";

  if (!text) {
    return { projectName: "your key project", projectKeywords: [], companyName: "your previous company" };
  }

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  let projectsStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^(?:personal\s+|academic\s+|technical\s+|selected\s+|key\s+)?projects\b/i.test(line) && line.length < 30) {
      projectsStartIndex = i;
      break;
    }
  }

  const isDescriptionLine = (str: string): boolean => {
    const lower = str.toLowerCase();
    const actionVerbs = [
      "designed", "developed", "built", "implemented", "created", "worked", "used", "using", 
      "technologies", "tech stack", "collaborated", "managed", "led", "facilitated", "responsible",
      "integrated", "engineered", "deployed", "optimized", "architected", "programmed",
      "monitored", "wrote", "configured", "resolved", "enhanced"
    ];
    const firstWord = lower.split(/\s+/)[0];
    if (actionVerbs.includes(firstWord)) return true;
    if (str.length > 50) return true;
    if (str.length > 30 && (str.match(/[a-z]/g) || []).length > (str.match(/[A-Z]/g) || []).length * 3) {
      return true;
    }
    return false;
  };

  const cleanProjectLine = (line: string): string => {
    let clean = line;
    clean = clean.replace(/^[\s\-*•o·■♦\d+\.\)]+/, "").trim();
    clean = clean.replace(/[*_~`()]+/g, "").trim();

    const separators = [/\|/, /\s+-\s+/, /:/, /\s+–\s+/, /\s+—\s+/];
    for (const sep of separators) {
      const parts = clean.split(sep);
      if (parts.length > 1) {
        const potential = parts[0].trim();
        if (potential.length >= 2 && !isDescriptionLine(potential) && !isTechStackLine(potential)) {
          return potential;
        }
      }
    }
    return clean;
  };

  let foundProjectLineIdx = -1;

  if (projectsStartIndex !== -1) {
    for (let i = projectsStartIndex + 1; i < Math.min(lines.length, projectsStartIndex + 15); i++) {
      const line = lines[i];
      if (/^(?:experience|work|employment|education|skills|certifications|history|summary|about)\b/i.test(line) && line.length < 25) {
        break;
      }
      const cleaned = cleanProjectLine(line);
      if (cleaned && cleaned.length >= 3 && cleaned.length <= 45 && !isDescriptionLine(cleaned) && !isTechStackLine(cleaned)) {
        projectName = cleaned;
        foundProjectLineIdx = i;
        break;
      }
    }
  }

  if (!projectName) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const projectWordMatch = line.match(/(?:project[s]?\b[:\-\s]*)([A-Za-z0-9\s\-]{3,35})/i);
      if (projectWordMatch && projectWordMatch[1]) {
        const candidate = cleanProjectLine(projectWordMatch[1].trim());
        if (candidate.length >= 3 && !isDescriptionLine(candidate) && !isTechStackLine(candidate)) {
          projectName = candidate;
          foundProjectLineIdx = i;
          break;
        }
      }
    }
  }

  if (!projectName) {
    const actionMatch = text.match(/(?:built|developed|created|implemented)\s+([A-Z][A-Za-z0-9\s\-]{2,30}?)(?:\s+(?:app|website|system|platform|application|dashboard|tool|engine|portal)\b)/i);
    if (actionMatch && actionMatch[1]) {
      projectName = actionMatch[1].trim() + (actionMatch[0].toLowerCase().includes("app") ? " App" : " Project");
    }
  }

  if (!projectName) {
    const projectKeywords = [
      "portfolio", "e-commerce", "website", "mobile app", "dashboard", 
      "tracker", "platform", "system", "engine", "application", "database"
    ];
    for (const kw of projectKeywords) {
      if (text.toLowerCase().includes(kw)) {
        projectName = `your ${kw} project`;
        break;
      }
    }
  }

  if (!projectName) {
    projectName = "your primary portfolio project";
  }

  // Extract keywords if we found a project line
  if (foundProjectLineIdx !== -1) {
    const startScan = foundProjectLineIdx;
    for (let j = startScan; j < Math.min(lines.length, foundProjectLineIdx + 4); j++) {
      const line = lines[j];
      
      if (j > foundProjectLineIdx) {
        if (/^(?:experience|work|employment|education|skills|certifications|history|summary|about)\b/i.test(line) && line.length < 25) {
          break;
        }
        const cleaned = cleanProjectLine(line);
        if (cleaned && cleaned.length >= 3 && cleaned.length <= 45 && !isDescriptionLine(cleaned) && !isTechStackLine(cleaned)) {
          break;
        }
      }

      for (const kw of TECH_LIST) {
        const regex = new RegExp(`\\b${kw}\\b`, "i");
        if (regex.test(line)) {
          let displayKw = kw.replace("\\", "");
          if (displayKw === "react") displayKw = "React";
          else if (displayKw === "node") displayKw = "Node.js";
          else if (displayKw === "next.js" || displayKw === "nextjs") displayKw = "Next.js";
          else if (displayKw === "typescript") displayKw = "TypeScript";
          else if (displayKw === "javascript") displayKw = "JavaScript";
          else if (displayKw === "postgresql" || displayKw === "postgres") displayKw = "PostgreSQL";
          else if (displayKw === "mysql") displayKw = "MySQL";
          else if (displayKw === "mongodb") displayKw = "MongoDB";
          else if (displayKw === "redis") displayKw = "Redis";
          else if (displayKw === "graphql") displayKw = "GraphQL";
          else if (displayKw === "stripe") displayKw = "Stripe";
          else if (displayKw === "websockets" || displayKw === "socket.io") displayKw = "WebSockets";
          else if (displayKw === "prisma") displayKw = "Prisma";
          else displayKw = displayKw.charAt(0).toUpperCase() + displayKw.slice(1);

          if (!projectKeywords.includes(displayKw)) {
            projectKeywords.push(displayKw);
          }
        }
      }
    }
  }

  // Company extraction
  let experienceStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^(?:professional\s+|work\s+)?experience\b|employment|history/i.test(line) && line.length < 30) {
      experienceStartIndex = i;
      break;
    }
  }

  const roleKeywords = /\b(?:engineer|developer|designer|manager|lead|intern|analyst|consultant|specialist|architect|executive|expert|scientist|programmer)\b/i;

  const cleanCompanyLine = (line: string): string => {
    let clean = line;
    clean = clean.replace(/^[\s\-*•o·■♦\d+\.\)]+/, "").trim();
    clean = clean.replace(/[*_~`]+/g, "").trim();
    
    const separators = [/\|/, /\s+-\s+/, /:/, /\s+–\s+/, /\s+—\s+/];
    for (const sep of separators) {
      const parts = clean.split(sep);
      if (parts.length > 1) {
        const part0 = parts[0].trim();
        const part1 = parts[1].trim();
        if (roleKeywords.test(part0) && !roleKeywords.test(part1) && !/present|20\d\d/i.test(part1)) {
          return part1;
        }
        if (roleKeywords.test(part1) && !roleKeywords.test(part0) && !/present|20\d\d/i.test(part0)) {
          return part0;
        }
        if (part0.length >= 2 && !/present|20\d\d/i.test(part0) && !roleKeywords.test(part0)) {
          return part0;
        }
      }
    }
    if (roleKeywords.test(clean)) return "";
    return clean;
  };

  if (experienceStartIndex !== -1) {
    for (let i = experienceStartIndex + 1; i < Math.min(lines.length, experienceStartIndex + 15); i++) {
      const line = lines[i];
      if (/^(?:projects|education|skills|certifications|summary|about)\b/i.test(line) && line.length < 25) {
        break;
      }
      const cleaned = cleanCompanyLine(line);
      if (cleaned && cleaned.length >= 3 && cleaned.length <= 40 && /^[A-Z]/.test(cleaned) && !/experience|work|employment/i.test(cleaned)) {
        companyName = cleaned;
        break;
      }
    }
  }

  if (!companyName) {
    for (const line of lines) {
      if (/experience|work|employment|history/i.test(line)) {
        const match = text.match(/(?:at|with|for)\s+([A-Z][A-Za-z0-9\s]{2,20})\b/);
        if (match && match[1]) {
          companyName = match[1].trim();
          break;
        }
      }
    }
  }

  if (!companyName) {
    const companyKeywords = ["startup", "agency", "corporation", "company", "inc", "co"];
    for (const kw of companyKeywords) {
      if (text.toLowerCase().includes(kw)) {
        companyName = `your past ${kw}`;
        break;
      }
    }
  }

  if (!companyName) {
    companyName = "your previous company";
  }

  return { projectName, projectKeywords, companyName };
}

/**
 * Extract ALL project names mentioned in the resume's Projects section.
 * Returns an ordered array — one entry per distinct project found.
 * Falls back to an empty array when no Projects section is detected
 * (caller should use extractResumeInfo() as a fallback in that case).
 */
export function extractAllProjectNames(text: string): string[] {
  if (!text) return [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const names: string[] = [];

  // Locate the "Projects" section header
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (
      /^(?:personal\s+|academic\s+|technical\s+|selected\s+|key\s+)?projects\b/i.test(lines[i]) &&
      lines[i].length < 30
    ) {
      start = i;
      break;
    }
  }

  if (start === -1) return [];

  for (let i = start + 1; i < Math.min(lines.length, start + 40); i++) {
    const line = lines[i];

    // Stop when a new major section begins
    if (
      /^(?:experience|work|employment|education|skills|certifications|history|summary|about)\b/i.test(line) &&
      line.length < 25
    ) {
      break;
    }

    // Strip bullet points, numbering, and markdown formatting
    let clean = line
      .replace(/^[\s\-*•o·■♦\d+\.\)]+/, "")
      .replace(/[*_~`()]+/g, "")
      .trim();

    // Take only the first segment when a separator is present (project name before the pipe/dash)
    for (const sep of [/\|/, /\s+-\s+/, /:/, /\s+\u2013\s+/, /\s+\u2014\s+/]) {
      const parts = clean.split(sep);
      if (parts.length > 1 && parts[0].trim().length >= 2 && parts[0].trim().length <= 45) {
        clean = parts[0].trim();
        break;
      }
    }

    // Project title heuristic: short, not an action-verb description, not a pure tech-stack list
    const firstWord = clean.toLowerCase().split(/\s+/)[0] || "";
    const ACTION_VERBS = [
      "designed", "developed", "built", "implemented", "created", "worked",
      "used", "integrated", "engineered", "deployed", "optimized", "architected",
      "programmed", "monitored", "wrote", "configured", "resolved", "enhanced",
    ];
    const isDescription = ACTION_VERBS.includes(firstWord) || clean.length > 55;
    const techCount = (clean.match(
      /\b(?:react|node|python|django|flask|java|spring|postgres|mysql|mongodb|redis|aws|gcp|azure|docker|kubernetes|typescript|javascript|css|html|express|next\.?js|vue|angular)\b/gi
    ) || []).length;
    const isTechList = techCount >= 2;

    if (!isDescription && !isTechList && clean.length >= 3 && clean.length <= 45 && !names.includes(clean)) {
      names.push(clean);
    }
  }

  return names;
}

/**
 * Generate the AI's opening introduction message with candidate name.
 * This does NOT require Gemini — it's a fixed intro template.
 */
export function generateIntroMessage(candidateName: string, role: string, round: string = "technical"): string {
  const roleData = getRoleById(role);
  const roleLabel =
    role === "ai-ml-engineer"
      ? "Artificial Intelligence Engineer"
      : role === "system-design-architect"
        ? "System Design"
        : roleData?.label || role;
  const interviewerName =
    role === "ai-ml-engineer" ? "Sofia" : role === "system-design-architect" ? "Alisa" : "Maria";
  const positionLabel = role === "ai-ml-engineer" ? "AI Engineering" : roleLabel;
  const firstName = candidateName.split(" ")[0];
  if (round === "aptitude") {
    return `Hello ${firstName}! Your Aptitude Round is ready.`;
  }
  if (role === "ai-ml-engineer" && round !== "hr") {
    return `Hello ${firstName}! I'm ${interviewerName}, your AI interviewer for the ${roleLabel} role today. It's great to meet you!\n\nBefore we dive into the technical questions, could you please give me a brief introduction about yourself - your background, experience, and what made you interested in this ${positionLabel} position?`;
  }
  if (role === "system-design-architect" && round !== "hr") {
    return `Hello ${firstName}! I'm ${interviewerName}, your interviewer for the ${roleLabel} round.\n\nToday, we'll design scalable systems and discuss trade-offs. Before we get started, could you please tell me a bit about yourself - your background, experience, and what excites you about building thoughtful, reliable products?`;
  }
  return round === "hr"
    ? `Hello ${firstName}! I'm Maria, your HR interviewer today. It's great to meet you!\n\nBefore we begin, could you please give me a brief introduction about yourself - your background, interests, and what makes you a good fit for this company?`
    : `Hello ${firstName}! I'm Maria, your AI interviewer for the ${roleLabel} role today. It's great to meet you!\n\nBefore we dive into the technical questions, could you please give me a brief introduction about yourself - your background, experience, and what made you interested in this ${roleLabel} position?`;
  if (round === "hr") {
    return `Hello ${firstName}! 👋 I'm Maria, your HR interviewer today. It's great to meet you!\n\nBefore we begin, could you please give me a brief introduction about yourself — your background, interests, and what makes you a good fit for this company?`;
  }
  return `Hello ${firstName}! 👋 I'm Maria, your AI interviewer for the ${roleLabel} role today. It's great to meet you!\n\nBefore we dive into the technical questions, could you please give me a brief introduction about yourself — your background, experience, and what made you interested in this ${roleLabel} position?`;
}

function buildSystemPrompt(
  role: string,
  dbQuestions: InterviewQuestion[],
  customQuestions: string[] = [],
  resumeText?: string
): string {
  const roleData = getRoleById(role);
  const hasExperience = hasExperienceSection(resumeText);
  const isSE = role === "software-engineer";
  const interviewerName =
    role === "ai-ml-engineer" ? "Sofia" : role === "system-design-architect" ? "Alisa" : "Maria";
  const systemRoleLabel =
    role === "ai-ml-engineer"
      ? "Artificial Intelligence Engineer"
      : role === "system-design-architect"
        ? "System Design"
        : roleData?.label || role;

  const dbQSection =
    dbQuestions.length > 0
      ? `\n\nUse these exact technical questions as the technical question pool (ask one by one in the listed order):\n${formatQuestionsForPrompt(dbQuestions)}\n\nAsk them naturally without revealing numbering or saying "next question". Do NOT skip or repeat any question.`
      : "";

  const customQSection =
    customQuestions.length > 0
      ? `\n\nAdditional company-specific questions to include:\n${customQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
      : "";

  const resumeSection = resumeText
    ? `\n\nCandidate Resume/Experience:\n${resumeText}\n\nTailor your questions based on their actual experience and projects.`
    : "";

  const projectRule = isSE
    ? `- Start by praising/appreciating 1-2 positive points from the candidate's resume, then ask a focused technical question about EACH project mentioned in their resume — one project at a time, in the order they appear. Refer to each project EXACTLY by its name.`
    : `- First, praise/appreciate 1-2 positive points from candidate's resume/background, and ask a question about a specific project mentioned by name in their resume.`;

  const experienceRule = hasExperience
    ? `- After all project questions, ask ONE question about their work experience: the company name, what the company does, and their role/responsibilities.`
    : `- Skip experience probing because the candidate's resume does not have an experience or history section.`;

  const technicalRule = isSE
    ? `- After the project question(s)${hasExperience ? " and the experience question" : ""}, ask exactly ${TOTAL_QUESTIONS} technical questions from the provided pool one by one. The pool contains 3 Operating System, 3 DBMS, 2 OOP, 1 Computer Networks, and 1 Programming Languages question. Do not skip any.`
    : `- After the project and experience sections, ask technical questions from the provided pool.`;

  return `You are ${interviewerName}, an expert technical interviewer conducting a ${systemRoleLabel} interview.

Your personality: Professional, warm, encouraging. You make candidates feel comfortable while being thorough.

The candidate has already introduced themselves. Now conduct the technical interview following this exact sequence.

Interview Rules:
${projectRule}
${experienceRule}
${technicalRule}
- Do NOT ask the same question twice.
- If the candidate says they do not know, are not sure, or are not getting the question, respond supportively with phrases like "No worries" or "That's okay"; do not praise details they did not provide.
- Before acknowledging a technical answer, evaluate it against the expected answer. If the answer is technically wrong or incorrect, ask exactly one of: "Are you sure?", "Interesting. Can you walk me through your reasoning?", or "Okay. Can you think of a more precise answer?"
- If the candidate gives an irrelevant answer that does not address the question at all, ask exactly one of: "I don't see how that relates, Let's focus specifically on the question.." or "Could you answer in the context of question?" Then repeat the same technical question. Keep doing this while the answers remain irrelevant.
- If the candidate's answer is correct or accurately addresses the question, briefly praise with exactly one of: "That's great!", "Sounds good!", or "That's helpful!".
- If the answer is only partial or incomplete, use neutral wording and move on.
- After the candidate responds to a challenge question, say "Okay, let's move on.." and continue to the next question.
- Ask follow-up questions only when the user prompt specifically asks for one. Never add a follow-up after every answer.
- When all ${TOTAL_QUESTIONS} technical questions are complete, write exactly: INTERVIEW_COMPLETE followed by one of the provided warm closing remarks.
${dbQSection}
${customQSection}
${resumeSection}

Response format:
- For questions: Ask naturally and conversationally
- For follow-ups: Brief ack + follow-up question
- Keep responses concise and focused`;
}

/**
 * Use Gemini AI to get the next question, with fallback to DB questions.
 */
export async function getNextQuestion(
  role: string,
  history: Message[],
  customQuestions: string[] = [],
  resumeText?: string,
  dbQuestions?: InterviewQuestion[],
  round: string = "technical"
): Promise<{ question: string; isComplete: boolean }> {
  if (round === "hr") {
    const questions = dbQuestions || getHRQuestions(7);
    const candidateAnswerCount = getValidCandidateAnswerCount(history);
    const lastAnswer = getLastCandidateAnswer(history);
    const isUnsureAnswer = isLowConfidenceAnswer(lastAnswer);

    const hrIndex = candidateAnswerCount - 1; // 0 when candidateAnswerCount = 1 (after intro response)
    if (hrIndex >= 7) {
      return {
        question: getOutroMessage(history),
        isComplete: true,
      };
    }

    const hasGeminiKey =
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_gemini_api_key_here";

    if (hasGeminiKey) {
      try {
        const nextUnasked = questions[hrIndex];
        const acknowledgmentInstruction = isUnsureAnswer
          ? `Start with a brief supportive acknowledgement such as "No worries, that's okay." Do not praise details they did not provide.`
          : `Start with a brief natural acknowledgment acknowledging their previous response.`;
        const allDone = hrIndex >= 7;
        const prompt = allDone || !nextUnasked
          ? `All 7 HR questions have been asked and answered. The interview is now complete. Write exactly: "INTERVIEW_COMPLETE" followed by a warm closing remark.`
          : `${acknowledgmentInstruction} Then, ask this exact question ${hrIndex + 1} of 7: "${nextUnasked.question}". Ask it naturally and conversationally. Do not say "Question ${hrIndex + 1}" or "from the database" — ask it conversationally.`;

        const systemPrompt = `You are Maria, an expert HR interviewer conducting an HR interview.
Your personality: Professional, warm, encouraging. You make candidates feel comfortable.
You have already asked the candidate to introduce themselves, and they did. Now ask them 7 HR questions one by one.
Do not ask follow-up questions unless the candidate's answer is extremely short or unclear.
When all 7 HR questions are complete, write exactly: INTERVIEW_COMPLETE followed by a warm closing remark.

Use this exact pool of HR questions in the listed order:
${questions.map((q, i) => `Q${i + 1}: ${q.question}`).join("\n")}`;

        const conversationHistory = history.map((m) => ({
          role: m.role === "interviewer" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

        const chat = geminiModel.startChat({
          history: [
            { role: "user", parts: [{ text: systemPrompt }] },
            {
              role: "model",
              parts: [{ text: "Understood. I'll conduct the HR interview professionally and cover all 7 questions." }],
            },
            ...conversationHistory,
          ],
        });

        const result = await withTimeout(chat.sendMessage(prompt), 12000);
        const text = result.response.text().trim();

        if (text.includes("INTERVIEW_COMPLETE")) {
          return {
            question: getOutroMessage(history),
            isComplete: true,
          };
        }
        return { question: text, isComplete: false };
      } catch (err) {
        console.error("Gemini HR error, falling back to DB questions:", err);
      }
    }

    const nextQ = questions[hrIndex];
    const ack = isUnsureAnswer ? getLowConfidenceAcknowledgment() : "Thank you for sharing that.";
    return {
      question: `${ack}\n\n${nextQ.question}`,
      isComplete: false,
    };
  }

  // Get questions from DB if not provided
  const questions = dbQuestions || getQuestionsForRole(role, TOTAL_QUESTIONS);
  const candidateAnswerCount = getValidCandidateAnswerCount(history);
  const lastAnswer = getLastCandidateAnswer(history);
  const isUnsureAnswer = isLowConfidenceAnswer(lastAnswer);
  const hasExperience = hasExperienceSection(resumeText);

  // ── After challenge → always say "Okay, let's move on.." and advance to next question ──
  if (wasLastInterviewerChallenge(history)) {
    const dbIndex = countTechnicalQuestionsAsked(history, questions, resumeText);
    if (dbIndex >= questions.length || dbIndex >= TOTAL_QUESTIONS) {
      return {
        question: `Okay, let's move on..\n\n${getOutroMessage(history)}`,
        isComplete: true,
      };
    }
    return {
      question: `Okay, let's move on..\n\n${questions[dbIndex].question}`,
      isComplete: false,
    };
  }

  // ── Handle irrelevant answers for Introduction, Project, and Experience sections ──
  const lastActualQuestion = getLastActualInterviewerQuestion(history);
  if (lastActualQuestion && !isUnsureAnswer) {
    const info = extractResumeInfo(resumeText || "");
    const allProjectNames = extractAllProjectNames(resumeText || "");
    const questionType = getInterviewerQuestionType(
      lastActualQuestion.content,
      allProjectNames.length > 0 ? allProjectNames : [info.projectName],
      info.companyName
    );

    if (
      questionType === "introduction" ||
      questionType === "project" ||
      questionType === "experience"
    ) {
      const classification = await classifyNonTechnicalAnswer(
        lastActualQuestion.content,
        lastAnswer,
        questionType
      );

      if (classification === "irrelevant") {
        return {
          question: getNonTechnicalIrrelevantResponse(
            questionType,
            lastActualQuestion.content,
            wasLastInterviewerIrrelevantPrompt(history)
          ),
          isComplete: false,
        };
      }
    }
  }

  // ── Handle follow-up answer evaluation or 3-tier main question answer classification ──
  const lastInterviewer = getLastInterviewerMessage(history);
  const isFollowUpActive = lastInterviewer && /\b(?:quick|brief)\s+follow-up\b|\bone\s+follow-up\b/i.test(lastInterviewer.content);

  if (isFollowUpActive) {
    if (isUnsureAnswer) {
      // For low-confidence follow-up response, say "No worries" and move to the next main question
      const dbIndex = countTechnicalQuestionsAsked(history, questions, resumeText);
      if (dbIndex >= questions.length || dbIndex >= TOTAL_QUESTIONS) {
        return {
          question: `${getLowConfidenceAcknowledgment()}\n\n${getOutroMessage(history)}`,
          isComplete: true,
        };
      }
      return {
        question: `${getLowConfidenceAcknowledgment()}\n\n${questions[dbIndex].question}`,
        isComplete: false,
      };
    } else {
      let followUpQuestion = lastInterviewer.content;
      if (followUpQuestion.includes("\n\n")) {
        const parts = followUpQuestion.split("\n\n");
        followUpQuestion = parts[parts.length - 1];
      }

      const followUpClass = await classifyFollowUpAnswer(followUpQuestion, lastAnswer);
      if (followUpClass === "irrelevant") {
        return {
          question: getFollowUpIrrelevantResponse(
            followUpQuestion,
            wasLastInterviewerIrrelevantPrompt(history)
          ),
          isComplete: false,
        };
      }
      if (followUpClass === "wrong") {
        const dbIndex = countTechnicalQuestionsAsked(history, questions, resumeText);
        return {
          question: getChallengeResponse(dbIndex - 1),
          isComplete: false,
        };
      }
      // If "correct", fall through to the main Gemini/DB path to ask the next main question
    }
  } else {
    // ── 3-tier answer classification: irrelevant → wrong → correct ──
    const currentQuestion = getCurrentTechnicalQuestion(history, questions, resumeText);
    if (currentQuestion && !isUnsureAnswer) {
      // Tier 1: clearly off-topic (zero semantic overlap with question/expected answer)
      if (isIrrelevantAnswer(lastAnswer, currentQuestion.question)) {
        return {
          question: getIrrelevantResponse(
            currentQuestion.index,
            currentQuestion.question.question,
            wasLastInterviewerIrrelevantPrompt(history)
          ),
          isComplete: false,
        };
      }

      const localQuality = getTechnicalAnswerQuality(lastAnswer, currentQuestion.question);

      // Tier 2: clearly wrong (very low keyword overlap) → challenge immediately
      if (localQuality === "weak") {
        return {
          question: getChallengeResponse(currentQuestion.index),
          isComplete: false,
        };
      }

      // Tier 3: ambiguous "partial" answers — keyword heuristics alone can't determine correctness.
      if (localQuality === "partial") {
        const geminiClass = await classifyTechnicalAnswer(currentQuestion.question, lastAnswer);
        if (geminiClass === "irrelevant") {
          return {
            question: getIrrelevantResponse(
              currentQuestion.index,
              currentQuestion.question.question,
              wasLastInterviewerIrrelevantPrompt(history)
            ),
            isComplete: false,
          };
        }
        if (geminiClass === "wrong") {
          return {
            question: getChallengeResponse(currentQuestion.index),
            isComplete: false,
          };
        }
      }
    }
  }

  // End the interview once all TOTAL_QUESTIONS technical questions have been asked from the DB pool.
  const technicalQAsked = countTechnicalQuestionsAsked(history, questions, resumeText);
  if (technicalQAsked >= TOTAL_QUESTIONS) {
    return {
      question: getOutroMessage(history),
      isComplete: true,
    };
  }

  const hasGeminiKey =
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_gemini_api_key_here";

  // ─── GEMINI PATH ────────────────────────────────────────
  if (hasGeminiKey) {
    try {
      const systemPrompt = buildSystemPrompt(role, questions, customQuestions, resumeText);
      const conversationHistory = history.map((m) => ({
        role: m.role === "interviewer" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const chat = geminiModel.startChat({
        history: [
          { role: "user", parts: [{ text: systemPrompt }] },
          {
            role: "model",
            parts: [{ text: "Understood. I'll conduct the technical interview professionally and cover all the assigned questions." }],
          },
          ...conversationHistory,
        ],
      });

      let prompt = "";
      // ── Determine current interview phase using resume projects ──
      const allProjects = extractAllProjectNames(resumeText || "");
      const numProjects = 1;
      const info = extractResumeInfo(resumeText || "");
      const projectName = allProjects[0] || info.projectName || "your primary project";

      if (candidateAnswerCount === 1) {
        // Project question: exactly 1 project question
        const keywordsStr =
          info.projectKeywords.length > 0
            ? ` featuring technologies or features like ${info.projectKeywords.join(", ")}`
            : "";

        prompt = isUnsureAnswer
          ? `The candidate responded that they do not know or are not getting it. Start with a brief supportive acknowledgement such as "No worries, that's okay." Do NOT say "great" or thank them for an introduction they did not provide. Then, read their parsed resume and ask them a question about their specific project "${projectName}"${keywordsStr}. You MUST refer to this project EXACTLY by its name "${projectName}". Do NOT refer to it generically. Focus the question around their implementation and the technologies/features mentioned: ${info.projectKeywords.join(", ") || "the project details"}.`
          : `The candidate just introduced themselves. Now, read their parsed resume. Praise/appreciate 1-2 interesting points about their resume, then ask them a focused technical question about their specific project "${projectName}"${keywordsStr}. You MUST refer to this project EXACTLY by its name "${projectName}" (or its actual full name from the resume). Do NOT refer to it generically. Focus the question around their implementation and the technologies/features mentioned: ${info.projectKeywords.join(", ") || "the project details"}. Be encouraging.`;
      } else if (candidateAnswerCount === 2 && hasExperience) {
        // ── Experience question (after project) ──
        prompt = isUnsureAnswer
          ? `The candidate responded that they do not know or are not getting it. Start with a brief supportive acknowledgement such as "No worries, that's okay." Then ask them about their work experience based on their resume: specifically where they work/worked (naming the company if mentioned), what the company does, and what their role and responsibilities were.`
          : `The candidate answered the project question. Now ask them about their work experience based on their resume: specifically where they work/worked (naming the company if mentioned), what the company does, and what their role and responsibilities were.`;
      } else if (shouldAskFollowUp(history, questions, resumeText)) {
        // ── Follow-up on a strong technical answer ──
        const lastTechnicalQuestion = getLastTechnicalQuestion(history, questions, resumeText);
        prompt = `The candidate just answered this technical question well: "${lastTechnicalQuestion?.question.question}". Ask ONE concise, contextual quick follow-up question based on their answer. You may start with a brief positive acknowledgement such as "Great", "That's helpful", or "That's nice". Do not ask a new main technical question yet.`;
      } else {
        // ── Technical questions from the DB pool (no duplicates) ──
        const dbIndex = countTechnicalQuestionsAsked(history, questions, resumeText);
        const nextUnasked = questions[dbIndex];
        const acknowledgmentInstruction = getGeminiAcknowledgmentInstruction(history, questions, resumeText);
        const allDone = dbIndex >= TOTAL_QUESTIONS;
        prompt =
          allDone || !nextUnasked
            ? `All ${TOTAL_QUESTIONS} technical questions have been asked and answered. The interview is now complete. Write exactly: "INTERVIEW_COMPLETE" followed by a warm closing remark.`
            : `${acknowledgmentInstruction} Then, ask this exact technical question ${dbIndex + 1} of ${TOTAL_QUESTIONS}: "${nextUnasked.question}". Do not say "Question ${dbIndex + 1}" or "from the database" — ask it conversationally.`;
      }

      // Force a 12-second timeout to prevent the user from being stuck if Gemini is slow
      const result = await withTimeout(chat.sendMessage(prompt), 12000);
      const text = result.response.text().trim();

      if (text.includes("INTERVIEW_COMPLETE")) {
        // Validate Gemini's INTERVIEW_COMPLETE signal — only accept it once all
        // TOTAL_QUESTIONS technical questions have actually been asked from the DB pool.
        if (countTechnicalQuestionsAsked(history, questions, resumeText) >= TOTAL_QUESTIONS) {
          return {
            question: getOutroMessage(history),
            isComplete: true,
          };
        }
        // If Gemini fired too early, strip the signal and continue with next question
        const dbIndex = countTechnicalQuestionsAsked(history, questions, resumeText);
        const nextUnasked = questions[dbIndex];
        if (nextUnasked) {
          const ack = getAnswerAcknowledgment(history, questions, dbIndex, resumeText);
          return { question: `${ack}\n\n${nextUnasked.question}`, isComplete: false };
        }
        return {
          question: getOutroMessage(history),
          isComplete: true,
        };
      }
      return { question: text, isComplete: false };
    } catch (err) {
      console.error("Gemini error, falling back to DB questions:", err);
      // Fall through to DB fallback
    }
  }

  // ─── DB FALLBACK (no Gemini key or Gemini error) ────────
  return getNextQuestionFromDB(role, history, questions, resumeText);
}

/**
 * Fallback: Use questions from DB and templates when Gemini is not available.
 */
function getNextQuestionFromDB(
  role: string,
  history: Message[],
  questions: InterviewQuestion[],
  resumeText?: string
): { question: string; isComplete: boolean } {
  const candidateAnswerCount = getValidCandidateAnswerCount(history);
  const lastAnswer = getLastCandidateAnswer(history);
  const isUnsureAnswer = isLowConfidenceAnswer(lastAnswer);
  const hasExperience = hasExperienceSection(resumeText);
  const numProjects = 1;
  const allProjects = extractAllProjectNames(resumeText || "");
  const info = extractResumeInfo(resumeText || "");
  const projectName = allProjects[0] || info.projectName || "your primary project";

  // 1. Project Question (only 1 project)
  if (candidateAnswerCount === 1) {
    const kwText = info.projectKeywords.length > 0
      ? ` (built using ${info.projectKeywords.join(", ")})`
      : "";
    const introAck = isUnsureAnswer
      ? `${getLowConfidenceAcknowledgment()} We can still move forward with your resume.`
      : "Great, thank you for the introduction!";
    return {
      question: `${introAck} Looking at your resume, I noticed your work on "${projectName}"${kwText}. Could you explain the main technical challenges you faced while building it and how you resolved them?`,
      isComplete: false,
    };
  }

  // 2. Experience Question (exactly 1 experience, if resume has experience section)
  if (candidateAnswerCount === 2 && hasExperience) {
    const experienceAck = isUnsureAnswer
      ? getLowConfidenceAcknowledgment()
      : "Thank you for sharing that!";
    return {
      question: `${experienceAck} Now, looking at your work experience, could you tell me more about your time at "${info.companyName}"? Specifically, what does the company do, what was your role, and what were your day-to-day responsibilities?`,
      isComplete: false,
    };
  }

  if (shouldAskFollowUp(history, questions, resumeText)) {
    const lastTechnicalQuestion = getLastTechnicalQuestion(history, questions, resumeText);
    if (lastTechnicalQuestion) {
      return {
        question: `${getPositiveAcknowledgment(lastTechnicalQuestion.index)} ${buildFollowUpQuestion(lastTechnicalQuestion.question)}`,
        isComplete: false,
      };
    }
  }

  // 3. Technical Questions from DB
  const dbIndex = countTechnicalQuestionsAsked(history, questions, resumeText);
  if (dbIndex >= questions.length || dbIndex >= TOTAL_QUESTIONS) {
    return {
      question: isUnsureAnswer
        ? `${getLowConfidenceAcknowledgment()}\n\n${getOutroMessage(history)}`
        : getOutroMessage(history),
      isComplete: true,
    };
  }

  const nextQ = questions[dbIndex];
  const ack = getAnswerAcknowledgment(history, questions, dbIndex, resumeText);

  return {
    question: dbIndex === 0
      ? `${ack} Let's move into the role-specific technical questions for the ${role} position.\n\n${nextQ.question}`
      : `${ack}\n\n${nextQ.question}`,
    isComplete: false,
  };
}

function buildFollowUpQuestion(question: InterviewQuestion): string {
  const topic = question.topic.toLowerCase();

  if (/system|architecture|microservices|cloud|devops|kubernetes|docker/.test(topic)) {
    return "As a quick follow-up, what trade-off would you consider if this needed to scale for much higher traffic?";
  }

  if (/algorithm|data structures|problem solving|sql|statistics/.test(topic)) {
    return "As a quick follow-up, what edge case or complexity concern would you watch for in a real implementation?";
  }

  if (/react|frontend|javascript|html|css|browser/.test(topic)) {
    return "As a quick follow-up, how would you test or debug that in a production application?";
  }

  if (/machine learning|deep learning|mlops|data analysis/.test(topic)) {
    return "As a quick follow-up, how would you validate that this approach is working well in practice?";
  }

  return "As a quick follow-up, how would you apply that concept in a real project?";
}

function getAcknowledgment(questionIndex: number): string {
  const acks = [
    "Thanks for your response.",
    "Okay, noted.",
    "Thank you for answering.",
    "I see.",
    "Alright, noted.",
    "Thanks for sharing.",
    "Okay.",
    "Alright, noted.",
  ];
  return acks[questionIndex % acks.length];
}

function buildQnaSummary(history: Message[]) {
  const pairs: Array<{ question: string; answer: string }> = [];
  let pendingQuestion = "";

  for (const message of history) {
    if (message.role === "interviewer") {
      if (isIntroMessage(message.content) || isOutroMessage(message.content)) continue;
      pendingQuestion = message.content;
      continue;
    }
    if (pendingQuestion) {
      pairs.push({ question: pendingQuestion, answer: message.content });
      pendingQuestion = "";
    }
  }

  return pairs;
}

/**
 * Match conversation Q&A pairs to DB technical questions and return them
 * paired with the candidate's answer for keyword scoring.
 *
 * Strategy:
 *  1. Skip the intro + project + experience Q&A pairs (they precede the technical phase).
 *  2. For each DB question, find the conversation pair whose interviewer message
 *     contains the first 40 characters of that question (text-match pass).
 *  3. Any DB questions still unmatched are filled positionally from remaining pairs.
 */
function matchTechnicalQnA(
  history: Message[],
  questions: InterviewQuestion[],
  resumeText?: string
): Array<{ question: InterviewQuestion; candidateAnswer: string }> {
  const answers = getTechnicalAnswers(history, questions, resumeText);
  return questions
    .slice(0, TOTAL_QUESTIONS)
    .map((q) => ({
      question: q,
      candidateAnswer: answers[q.id] || "",
    }))
    .filter((item) => item.candidateAnswer);
}

function matchHRQnA(
  history: Message[],
  questions: InterviewQuestion[]
): Array<{ question: InterviewQuestion; candidateAnswer: string }> {
  const QnAPairs = buildQnaSummary(history);
  const matched: Array<{ question: InterviewQuestion; candidateAnswer: string }> = [];
  
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const pair = QnAPairs.find((p) => p.question.toLowerCase().includes(q.question.toLowerCase()))
      || QnAPairs[i];
      
    if (pair) {
      matched.push({
        question: q,
        candidateAnswer: pair.answer,
      });
    }
  }
  return matched;
}


// ─────────────────────────────────────────────────────────────────────────────
// Report generation — types and helpers
// ─────────────────────────────────────────────────────────────────────────────

/** One scored technical question entry placed in the report */
interface ScoredTechnicalQuestion {
  questionText: string;
  candidateAnswer: string;
  topic: string;
  subject: string;
  /** 0-100 percentage = (matched / total keywords) * 100 */
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
}

/** Compute keyword match score for a candidate answer against a DB question */
function scoreAnswerWithKeywords(
  answer: string,
  question: InterviewQuestion
): { score: number; matchedKeywords: string[]; missingKeywords: string[] } {
  const keywords = (question as any).answerKeywords ?? [];
  if (keywords.length === 0) return { score: 0, matchedKeywords: [], missingKeywords: [] };

  const normalizedAnswer = answer.toLowerCase();
  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  for (const kw of keywords) {
    // Support two alternative-separator styles so either word counts the keyword as matched:
    //   slash:  "mutex/semaphore"  → split on  /
    //   " or ": "stack or heap"    → split on  or
    // Both styles may appear in the question bank.
    const alts = kw.toLowerCase().split(/\s*\/\s*|\s+or\s+/);
    const matched = alts.some((alt: string) => normalizedAnswer.includes(alt.trim()));
    if (matched) matchedKeywords.push(kw);
    else missingKeywords.push(kw);
  }

  const score = (matchedKeywords.length / keywords.length) * 100;
  return { score, matchedKeywords, missingKeywords };
}

/** Map a question ID prefix to its human-readable subject name */
function getSubjectFromId(id: string): string {
  if (id.startsWith("se-tech-os-")) return "Operating System";
  if (id.startsWith("se-tech-dbms-")) return "DBMS";
  if (id.startsWith("se-tech-oop-")) return "OOP";
  if (id.startsWith("se-tech-cn-")) return "Computer Networks";
  if (id.startsWith("se-tech-pl-")) return "Programming Languages";
  return "General";
}

export interface WeakSubjectEntry {
  name: string;
  questionsAsked: number;
  weakCount: number;
  /** (weakCount / questionsAsked) * 100 */
  weakPercent: number;
  /** (weakPercent / totalWeakPercent) * 100 — pie-slice size */
  pieContribution: number;
}

export interface WeakTopicEntry {
  topic: string;
  subject: string;
  score: number;
}

export interface WeakSubjectAnalysis {
  subjects: WeakSubjectEntry[];
  weakTopics: WeakTopicEntry[];
  totalWeakPercent: number;
}

/** Compute weak-subject analysis from scored technical questions */
function computeWeakSubjectAnalysis(
  scoredQuestions: ScoredTechnicalQuestion[]
): WeakSubjectAnalysis {
  const SUBJECT_NAMES = [
    "Operating System",
    "DBMS",
    "OOP",
    "Computer Networks",
    "Programming Languages",
  ];

  const tally: Record<string, { total: number; weak: number }> = {};
  for (const s of SUBJECT_NAMES) tally[s] = { total: 0, weak: 0 };

  for (const q of scoredQuestions) {
    if (tally[q.subject]) {
      tally[q.subject].total++;
      if (q.score < 50) tally[q.subject].weak++;
    }
  }

  const rawSubjects = SUBJECT_NAMES.map((name) => ({
    name,
    questionsAsked: tally[name].total,
    weakCount: tally[name].weak,
    weakPercent:
      tally[name].total > 0
        ? (tally[name].weak / tally[name].total) * 100
        : 0,
  }));

  const totalWeakPercent = rawSubjects.reduce((s, r) => s + r.weakPercent, 0);

  const subjects: WeakSubjectEntry[] = rawSubjects.map((s) => ({
    ...s,
    pieContribution:
      totalWeakPercent > 0 ? (s.weakPercent / totalWeakPercent) * 100 : 0,
  }));

  const weakTopics: WeakTopicEntry[] = scoredQuestions
    .filter((q) => q.score < 50)
    .map((q) => ({ topic: q.topic, subject: q.subject, score: q.score }));

  return { subjects, weakTopics, totalWeakPercent };
}

function parseAptitudeAnswers(history: Message[]): Record<string, string> {
  const marker = "APTITUDE_ANSWERS:";

  for (let i = history.length - 1; i >= 0; i--) {
    const message = history[i];
    if (message.role !== "candidate" || !message.content.startsWith(marker)) continue;

    try {
      const parsed = JSON.parse(message.content.slice(marker.length));
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, string>;
      }
    } catch {
      return {};
    }
  }

  return {};
}

function optionText(question: OAQuestion, optionLetter?: string): string {
  const index = ["A", "B", "C", "D"].indexOf(optionLetter || "");
  return index >= 0 ? question.options[index] : "Not answered";
}

function computeAptitudeWeakSubjectAnalysis(
  questionScores: Array<{ subject: string; topic: string; score: number }>
): WeakSubjectAnalysis {
  const SUBJECT_NAMES = [
    "Quantitative",
    "Verbal Ability",
    "Logical Reasoning",
    "Non-Verbal Reasoning",
  ];

  const tally: Record<string, { total: number; weak: number }> = {};
  for (const subject of SUBJECT_NAMES) tally[subject] = { total: 0, weak: 0 };

  for (const q of questionScores) {
    if (!tally[q.subject]) continue;
    tally[q.subject].total++;
    if (q.score < 50) tally[q.subject].weak++;
  }

  const rawSubjects = SUBJECT_NAMES.map((name) => ({
    name,
    questionsAsked: tally[name].total,
    weakCount: tally[name].weak,
    weakPercent:
      tally[name].total > 0
        ? (tally[name].weak / tally[name].total) * 100
        : 0,
  }));

  const totalWeakPercent = rawSubjects.reduce((sum, subject) => sum + subject.weakPercent, 0);
  const subjects = rawSubjects.map((subject) => ({
    ...subject,
    pieContribution:
      totalWeakPercent > 0 ? (subject.weakPercent / totalWeakPercent) * 100 : 0,
  }));

  const weakTopics = questionScores
    .filter((q) => q.score < 50)
    .map((q) => ({ topic: q.topic, subject: q.subject, score: q.score }));

  return { subjects, weakTopics, totalWeakPercent };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: generateReport
// ─────────────────────────────────────────────────────────────────────────────

export async function generateReport(
  role: string,
  history: Message[],
  resumeText?: string,
  selectedQuestions?: InterviewQuestion[],
  round: string = "technical"
): Promise<{ score: number; summary: string; feedback: Record<string, unknown> }> {
  if (round === "aptitude") {
    const questions: OAQuestion[] =
      selectedQuestions && selectedQuestions.length > 0
        ? selectedQuestions.filter(
            (q): q is OAQuestion => q.roundType === "online-assessment"
          )
        : getAptitudeQuestions();

    const answers = parseAptitudeAnswers(history);
    const questionScores = questions.map((question) => {
      const selectedOption = answers[question.id] || "";
      const isCorrect = selectedOption === question.answer;

      return {
        questionId: question.id,
        questionText: question.question,
        topic: question.topic,
        subject: question.topic,
        options: question.options,
        selectedOption,
        selectedAnswer: optionText(question, selectedOption),
        correctOption: question.answer,
        correctAnswer: optionText(question, question.answer),
        marksAwarded: isCorrect ? 1 : 0,
        maxMarks: 1,
        score: isCorrect ? 100 : 0,
      };
    });

    const totalMarks = questionScores.reduce((sum, question) => sum + question.marksAwarded, 0);
    const maxMarks = questions.length || 20;
    const overallScore = maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100) : 0;
    const weakSubjectAnalysis = computeAptitudeWeakSubjectAnalysis(questionScores);
    const verdict =
      overallScore >= 70
        ? "Recommended"
        : overallScore >= 50
        ? "Borderline"
        : "Not Recommended";
    const summary = `The candidate completed the Aptitude Round with ${totalMarks} out of ${maxMarks} correct answers.`;

    return {
      score: overallScore,
      summary,
      feedback: {
        round: "aptitude",
        score: overallScore,
        totalMarks,
        maxMarks,
        summary,
        questionScores,
        weakSubjectAnalysis,
        verdict,
        hiringRecommendation: `Candidate scored ${totalMarks}/${maxMarks} in the aptitude round.`,
      },
    };
  }

  if (round === "hr") {
    const questions: InterviewQuestion[] =
      selectedQuestions && selectedQuestions.length > 0
        ? selectedQuestions
        : getHRQuestions(7);

    const matched = matchHRQnA(history, questions);

    const hasGeminiKey =
      process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY !== "your_gemini_api_key_here";

    if (hasGeminiKey) {
      try {
        const prompt = `You are an expert HR interviewer evaluating a candidate's responses in an HR interview.
        
Here is the job role they applied for: ${role}

Below are the 7 questions asked by the interviewer, along with the candidate's answers.

Evaluate each answer out of 100 based on these exact weighted factors:
- Relevance (35): Did the candidate answer the actual question? (Score out of 100)
- Clarity (20): Is the answer easy to understand? (Score out of 100)
- Confidence (20): Does the answer sound sure and stable? (Score out of 100)
- Honesty (15): Is the answer realistic and not fake? (Score out of 100)
- Positive attitude (10): Does it show maturity, learning mindset, teamwork? (Score out of 100)

The total score for each question must be calculated as:
(Relevance * 0.35) + (Clarity * 0.20) + (Confidence * 0.20) + (Honesty * 0.15) + (Positive attitude * 0.10)

For each question:
1. Provide the scores for each of the 5 factors (each out of 100).
2. Calculate the overall weighted score for the question (0-100).
3. Identify the "scope of improvement" indicating the factor or factors where the candidate performed poorly (e.g. scored under 70). Be constructive. If they did great on all, you can write "None".
4. Provide a 1-2 line encouraging feedback from the AI interviewer.

Also, provide:
1. An overall summary of the candidate's performance across the entire interview.
2. A 1-2 sentence overall honest, encouraging feedback directly addressed to the candidate (aiFeedback).

Questions and Answers:
${matched.map((m, idx) => `Q${idx + 1}: ${m.question.question}\nAnswer: ${m.candidateAnswer}`).join("\n\n")}

Respond in this EXACT JSON format (no markdown formatting, just raw JSON):
{
  "summary": "<2-sentence summary of overall performance>",
  "aiFeedback": "<1-2 sentence overall feedback directly addressed to candidate>",
  "questionScores": [
    {
      "questionText": "<question text>",
      "candidateAnswer": "<candidate answer>",
      "score": <overall calculated weighted score for this question, e.g. 78.5>,
      "factors": {
        "relevance": <0-100 score>,
        "clarity": <0-100 score>,
        "confidence": <0-100 score>,
        "honesty": <0-100 score>,
        "positiveAttitude": <0-100 score>
      },
      "improvement": "<Constructive list of poor factors, e.g. Clarity, Honesty>",
      "aiFeedback": "<1-2 line interviewer feedback for this question>"
    }
  ]
}`;

        const result = await withTimeout(geminiModel.generateContent(prompt), 15000);
        const text = result.response.text().trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON in Gemini response");
        const parsed = JSON.parse(jsonMatch[0]);

        const overallScore = Math.round(
          parsed.questionScores.reduce((sum: number, q: any) => sum + q.score, 0) /
          parsed.questionScores.length
        );

        const verdict =
          overallScore >= 70
            ? "Recommended"
            : overallScore >= 50
            ? "Borderline"
            : "Not Recommended";

        const feedback = {
          round: "hr",
          score: overallScore,
          summary: parsed.summary || "",
          aiFeedback: parsed.aiFeedback || "",
          questionScores: parsed.questionScores,
          verdict,
          hiringRecommendation: `Candidate scored ${overallScore}/100. ${
            verdict === "Recommended"
              ? "Highly aligned with culture and expectations."
              : "Some alignment gaps observed."
          }`,
        };

        return {
          score: overallScore,
          summary: parsed.summary || "",
          feedback,
        };
      } catch (err) {
        console.error("Gemini HR report error, using fallback:", err);
      }
    }

    const questionScores = matched.map(({ question, candidateAnswer }) => {
      const length = candidateAnswer.trim().length;
      const relevance = length > 20 ? 80 : length > 0 ? 50 : 0;
      const clarity = length > 30 ? 85 : length > 0 ? 60 : 0;
      const confidence = length > 25 ? 80 : length > 0 ? 55 : 0;
      const honesty = 80;
      const positiveAttitude = 85;
      const score = Math.round(
        relevance * 0.35 +
        clarity * 0.2 +
        confidence * 0.2 +
        honesty * 0.15 +
        positiveAttitude * 0.1
      );

      const poorFactors: string[] = [];
      if (relevance < 70) poorFactors.push("Relevance");
      if (clarity < 70) poorFactors.push("Clarity");
      if (confidence < 70) poorFactors.push("Confidence");

      return {
        questionText: question.question,
        candidateAnswer,
        score,
        factors: { relevance, clarity, confidence, honesty, positiveAttitude },
        improvement: poorFactors.length > 0 ? poorFactors.join(", ") : "None",
        aiFeedback: "You shared a candidate response that answers the prompt. Focus on structuring your points clearly.",
      };
    });

    const overallScore = Math.round(
      questionScores.reduce((sum, q) => sum + q.score, 0) / questionScores.length
    );

    const verdict =
      overallScore >= 70
        ? "Recommended"
        : overallScore >= 50
        ? "Borderline"
        : "Not Recommended";

    const summary = `The candidate completed the HR Round consisting of 7 questions. The candidate achieved an overall score of ${overallScore}%.`;

    const aiFeedback =
      overallScore >= 70
        ? "You did a fantastic job articulating your thoughts. You showed great communication skills, self-awareness, and a strong cultural fit. Keep up the positive attitude!"
        : "You answered all questions constructively. Focus on expressing your answers with more clarity and structuring them to show your team spirit and resilience.";

    const feedback = {
      round: "hr",
      score: overallScore,
      summary,
      aiFeedback,
      questionScores,
      verdict,
      hiringRecommendation: `Candidate scored ${overallScore}/100. ${
        verdict === "Recommended"
          ? "Highly aligned with culture and expectations."
          : "Some alignment gaps observed."
      }`,
    };

    return {
      score: overallScore,
      summary,
      feedback,
    };
  }
  const roleData = getRoleById(role);
  const hasGeminiKey =
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== "your_gemini_api_key_here";

  // ── Step 1: Resolve the 10 technical questions that were asked ──
  const questions: InterviewQuestion[] =
    selectedQuestions && selectedQuestions.length > 0
      ? selectedQuestions
      : getQuestionsForRole(role, TOTAL_QUESTIONS);

  // ── Step 2: Match Q&A pairs → DB questions and score each answer ──
  const matched = matchTechnicalQnA(history, questions, resumeText);

  const scoredQuestions: ScoredTechnicalQuestion[] = matched.map(({ question, candidateAnswer }) => {
    const { score, matchedKeywords, missingKeywords } = scoreAnswerWithKeywords(
      candidateAnswer,
      question
    );
    return {
      questionText: question.question,
      candidateAnswer,
      topic: question.topic,
      subject: getSubjectFromId(question.id),
      score,
      matchedKeywords,
      missingKeywords,
    };
  });

  // ── Step 3: Overall score = average of all 10 technical question scores ──
  const overallScore =
    scoredQuestions.length > 0
      ? Number(
          (
            scoredQuestions.reduce((sum, q) => sum + q.score, 0) /
            scoredQuestions.length
          ).toFixed(1)
        )
      : 0;

  // ── Step 4: Weak subject analysis ──
  const weakSubjectAnalysis = computeWeakSubjectAnalysis(scoredQuestions);

  // ── Step 5: Verdict ──
  const verdict =
    overallScore >= 76
      ? "Recommended"
      : overallScore >= 61
      ? "Borderline"
      : "Not Recommended";

  // ── Step 6: Gemini qualitative feedback (1-2 lines + strengths/improvements) ──
  if (hasGeminiKey) {
    try {
      const scoreSummary = scoredQuestions
        .map(
          (q, i) =>
            `Q${i + 1} [${q.subject} / ${q.topic}]: ${q.score.toFixed(0)}%` +
            (q.missingKeywords.length > 0
              ? ` | Missing: ${q.missingKeywords.join(", ")}`
              : " | Full marks")
        )
        .join("\n");

      const weakTopicStr = weakSubjectAnalysis.weakTopics
        .map((t) => `${t.topic} (${t.subject})`)
        .join(", ") || "None";

      const prompt = `You are an expert technical interviewer. The candidate just completed a ${roleData?.label || role} interview.

Keyword-based scoring per question:
${scoreSummary}

Overall Score: ${overallScore}%
Weak Topics: ${weakTopicStr}

Provide:
1. A 2-sentence summary of the candidate's overall performance.
2. 2-3 key strengths.
3. 2-3 areas for improvement.
4. A 1-2 sentence honest, encouraging feedback for the candidate.
5. A 1-2 sentence hiring recommendation for the hiring manager.

Respond in this EXACT JSON format (no markdown, just raw JSON):
{
  "summary": "<2-sentence summary>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<area 1>", "<area 2>", "<area 3>"],
  "aiFeedback": "<1-2 sentence feedback for candidate>",
  "hiringRecommendation": "<1-2 sentence recommendation for hiring manager>"
}`;

      const result = await withTimeout(geminiModel.generateContent(prompt), 15000);
      const text = result.response.text().trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in Gemini response");
      const parsed = JSON.parse(jsonMatch[0]);

      const feedback: Record<string, unknown> = {
        score: overallScore,
        summary: parsed.summary || "",
        questionScores: scoredQuestions,
        weakSubjectAnalysis,
        strengths: parsed.strengths || [],
        improvements: parsed.improvements || [],
        aiFeedback: parsed.aiFeedback || "",
        verdict,
        hiringRecommendation: parsed.hiringRecommendation || "",
      };

      return {
        score: Math.round(overallScore),
        summary: parsed.summary || "",
        feedback,
      };
    } catch (err) {
      console.error("Gemini report error, using fallback:", err);
    }
  }

  // ─── Fallback (no Gemini key or Gemini error) ────────────────────────────
  const strongCount = scoredQuestions.filter((q) => q.score >= 60).length;
  const summary = `The candidate answered ${scoredQuestions.length} technical questions with an overall score of ${overallScore}%. ${strongCount} out of ${scoredQuestions.length} questions were answered satisfactorily.`;

  const aiFeedback =
    overallScore >= 60
      ? "You demonstrated a solid grasp of several technical concepts — keep strengthening your weak areas for a stronger overall performance."
      : "Focus on the highlighted weak topics and build a stronger conceptual foundation before your next interview.";

  const feedback: Record<string, unknown> = {
    score: overallScore,
    summary,
    questionScores: scoredQuestions,
    weakSubjectAnalysis,
    strengths: ["Completed the full interview", "Engaged with all technical questions"],
    improvements: weakSubjectAnalysis.weakTopics
      .slice(0, 3)
      .map((t) => `Strengthen understanding of ${t.topic} (${t.subject})`),
    aiFeedback,
    verdict,
    hiringRecommendation: `Candidate scored ${Math.round(overallScore)}/100. ${
      verdict === "Recommended"
        ? "Consider proceeding to the next round."
        : "Further evaluation is recommended."
    }`,
  };

  return {
    score: Math.round(overallScore),
    summary,
    feedback,
  };
}
