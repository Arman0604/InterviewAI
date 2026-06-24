import { NextRequest, NextResponse } from "next/server";
import { execute, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { QUESTION_BANK, DSAQuestion } from "@/lib/questions";
import { runCode, normaliseOutput, JUDGE0_LANGUAGES } from "@/lib/judge0";
import { scoreDSASubmission, DSASubmission, TCResult } from "@/lib/dsa-scorer";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.userType !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      attemptId,
      code,
      languageId,
      languageName,
      timeComplexity,
      spaceComplexity,
      algorithmsUsed,
      dataStructuresUsed,
    } = await request.json();

    if (!attemptId || !code) {
      return NextResponse.json({ error: "attemptId and code are required" }, { status: 400 });
    }

    const attempt = await queryOne<{
        id: string; round: string; status: string;
        selected_questions: string | null; dsa_submission: string | null;
      }>(
      "SELECT * FROM interview_attempts WHERE id = $1 AND candidate_id = $2",
      [attemptId, session.userId]
    );

    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    if (attempt.round !== "dsa") return NextResponse.json({ error: "Not a DSA round" }, { status: 400 });
    if (attempt.status === "abandoned") {
      return NextResponse.json(
        { error: "Round ended due to proctoring violations; report was not generated." },
        { status: 400 }
      );
    }

    // Guard: only one submission allowed
    if (attempt.status === "completed" || attempt.dsa_submission) {
      return NextResponse.json(
        { error: "Already submitted. Only one submission is allowed per attempt." },
        { status: 400 }
      );
    }

    // Resolve the DSA question
    const qId = attempt.selected_questions
      ? JSON.parse(attempt.selected_questions)[0]
      : null;
    const question = QUESTION_BANK.find(q => q.id === qId) as DSAQuestion | undefined;
    if (!question) {
      return NextResponse.json({ error: "DSA question not found" }, { status: 500 });
    }

    const langId   = languageId ?? JUDGE0_LANGUAGES["Python 3"];
    const langName = languageName ?? "Python 3";

    // ── Run all test case groups ───────────────────────────────────────────
    async function runGroup(
      tcs: { input: string; stdin?: string; expectedOutput: string }[]
    ): Promise<TCResult[]> {
      return Promise.all(
        tcs.map(async (tc) => {
          const res    = await runCode(code, langId, tc.stdin ?? tc.input);
          const actual = normaliseOutput(res.stdout);
          const exp    = normaliseOutput(tc.expectedOutput);
          return {
            input:          tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput:   res.stdout,
            passed:         actual === exp,
            stderr:         res.stderr ?? res.compile_output ?? null,
            time:           res.time,
            memory:         res.memory,
            statusDesc:     res.status.description,
          };
        })
      );
    }

    const [sampleResults, hiddenResults, edgeResults] = await Promise.all([
      runGroup(question.sampleTestCases),
      runGroup(question.hiddenTestCases),
      runGroup(question.edgeTestCases),
    ]);

    // ── Score ──────────────────────────────────────────────────────────────
    const submission: DSASubmission = {
      code,
      languageName:             langName,
      candidateTimeComplexity:  timeComplexity  ?? "",
      candidateSpaceComplexity: spaceComplexity ?? "",
      algorithmsUsed:           algorithmsUsed  ?? "",
      dataStructuresUsed:       dataStructuresUsed ?? "",
      sampleResults,
      hiddenResults,
      edgeResults,
    };

    const feedback = await scoreDSASubmission(submission, question);

    const score = feedback.scores.total; // 0-100

    // Build a concise summary for the report header
    const summary =
      `DSA Round — ${question.topic} problem. ` +
      `Passed ${feedback.passedTCs}/${feedback.totalTCs} test cases. ` +
      `Score: ${score}/100 (${feedback.verdict}).`;

    // ── Persist ────────────────────────────────────────────────────────────
    const dsaPayload = {
      ...submission,
      // strip full code from dsa_submission JSON to keep it small; keep first 4000 chars
      code: code.length > 4000 ? code.slice(0, 4000) + "\n// [truncated]" : code,
    };

    await execute(`
      UPDATE interview_attempts
      SET status       = 'completed',
          score        = $1,
          summary      = $2,
          feedback     = $3,
          dsa_submission = $4,
          completed_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `,
      [
        score,
        summary,
        JSON.stringify(feedback),
        JSON.stringify(dsaPayload),
        attemptId,
      ]
    );

    return NextResponse.json({ success: true, score, verdict: feedback.verdict });
  } catch (error) {
    console.error("DSA submit error:", error);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
