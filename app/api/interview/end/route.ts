import { NextRequest, NextResponse } from "next/server";
import { execute, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateReport, Message } from "@/lib/interview-engine";
import { QUESTION_BANK } from "@/lib/questions";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.userType !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { attemptId, aptitudeAnswers } = await request.json();
    if (!attemptId) return NextResponse.json({ error: "Attempt ID required" }, { status: 400 });

    const attempt = await queryOne<{
        id: string; role: string; conversation: string; status: string;
        resume_text: string | null; selected_questions: string | null; round: string;
      }>(
      "SELECT * FROM interview_attempts WHERE id = $1 AND candidate_id = $2",
      [attemptId, session.userId]
    );

    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    if (attempt.status === "completed") {
      const existing = await queryOne("SELECT * FROM interview_attempts WHERE id = $1", [attemptId]);
      return NextResponse.json({ report: existing });
    }
    if (attempt.status === "abandoned") {
      return NextResponse.json(
        { error: "Interview was left before completion; report was not generated." },
        { status: 400 }
      );
    }

    const conversation: Message[] = JSON.parse(attempt.conversation || "[]");

    if (attempt.round === "aptitude" && aptitudeAnswers && typeof aptitudeAnswers === "object") {
      conversation.push({
        role: "candidate",
        content: `APTITUDE_ANSWERS:${JSON.stringify(aptitudeAnswers)}`,
        timestamp: new Date().toISOString(),
      });
      await execute(
        "UPDATE interview_attempts SET conversation = $1 WHERE id = $2",
        [JSON.stringify(conversation), attemptId]
      );
    }

    // Restore the exact questions that were selected for this session so the
    // keyword scorer uses them instead of re-randomising from the pool.
    let selectedQuestions: typeof QUESTION_BANK | undefined;
    if (attempt.selected_questions) {
      try {
        const ids: string[] = JSON.parse(attempt.selected_questions);
        const resolved = ids
          .map((id) => QUESTION_BANK.find((q) => q.id === id))
          .filter(Boolean) as typeof QUESTION_BANK;
        if (resolved.length > 0) selectedQuestions = resolved;
      } catch {
        // fall through — generateReport will re-randomise as fallback
      }
    }

    const { score, summary, feedback } = await generateReport(
      attempt.role,
      conversation,
      attempt.resume_text || undefined,
      selectedQuestions,
      attempt.round
    );

    await execute(`
      UPDATE interview_attempts
      SET status = 'completed', score = $1, summary = $2, feedback = $3, completed_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [score, summary, JSON.stringify(feedback), attemptId]);

    const updated = await queryOne("SELECT * FROM interview_attempts WHERE id = $1", [attemptId]);
    return NextResponse.json({ report: updated, score, summary });
  } catch (error) {
    console.error("End interview error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
