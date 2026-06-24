import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { QUESTION_BANK, DSAQuestion } from "@/lib/questions";
import { runCode, normaliseOutput, JUDGE0_LANGUAGES } from "@/lib/judge0";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.userType !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { attemptId, code, languageId } = await request.json();
    if (!attemptId || !code) {
      return NextResponse.json({ error: "attemptId and code are required" }, { status: 400 });
    }

    const attempt = await queryOne<{
        id: string; round: string; status: string; selected_questions: string | null;
      }>(
      "SELECT * FROM interview_attempts WHERE id = $1 AND candidate_id = $2",
      [attemptId, session.userId]
    );

    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    if (attempt.round !== "dsa") return NextResponse.json({ error: "Not a DSA round" }, { status: 400 });
    if (attempt.status === "completed") return NextResponse.json({ error: "Already submitted" }, { status: 400 });

    // Resolve the DSA question for this attempt
    const qId = attempt.selected_questions
      ? JSON.parse(attempt.selected_questions)[0]
      : null;
    const question = QUESTION_BANK.find(q => q.id === qId) as DSAQuestion | undefined;
    if (!question) {
      return NextResponse.json({ error: "DSA question not found" }, { status: 500 });
    }

    // Resolve language ID (default to Python 3 if not specified)
    const langId = languageId ?? JUDGE0_LANGUAGES["Python 3"];

    // Run each sample test case
    const results = await Promise.all(
      question.sampleTestCases.map(async (tc) => {
        const res = await runCode(code, langId, tc.stdin ?? tc.input);
        const actual   = normaliseOutput(res.stdout);
        const expected = normaliseOutput(tc.expectedOutput);
        return {
          input:          tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput:   res.stdout,
          passed:         actual === expected,
          stderr:         res.stderr ?? res.compile_output ?? null,
          time:           res.time,
          memory:         res.memory,
          statusDesc:     res.status.description,
        };
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("DSA run error:", error);
    return NextResponse.json({ error: "Run failed" }, { status: 500 });
  }
}
