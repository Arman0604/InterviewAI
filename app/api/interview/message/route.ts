import { NextRequest, NextResponse } from "next/server";
import { execute, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getNextQuestion, Message } from "@/lib/interview-engine";
import { getQuestionsForRole, QUESTION_BANK } from "@/lib/questions";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.userType !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { attemptId, answer } = await request.json();
    if (!attemptId || !answer?.trim()) {
      return NextResponse.json({ error: "Attempt ID and answer required" }, { status: 400 });
    }

    const attempt = await queryOne<{
        id: string;
        role: string;
        conversation: string;
        session_id: string | null;
        status: string;
        resume_text: string | null;
        selected_questions: string | null;
        round: string;
      }>(
      "SELECT * FROM interview_attempts WHERE id = $1 AND candidate_id = $2",
      [attemptId, session.userId]
    );

    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    if (attempt.status !== "in_progress") {
      return NextResponse.json({ error: "Interview already completed" }, { status: 400 });
    }

    const conversation: Message[] = JSON.parse(attempt.conversation || "[]");

    // Add candidate's answer
    conversation.push({
      role: "candidate",
      content: answer.trim(),
      timestamp: new Date().toISOString(),
    });

    // Restore the pre-selected questions for this session
    let dbQuestions = getQuestionsForRole(attempt.role, 10);
    if (attempt.selected_questions) {
      try {
        const ids: string[] = JSON.parse(attempt.selected_questions);
        const restored = ids
          .map((id) => QUESTION_BANK.find((q) => q.id === id))
          .filter(Boolean) as typeof dbQuestions;
        if (restored.length > 0) dbQuestions = restored;
      } catch {
        // Use freshly selected questions
      }
    }

    // Get custom questions if linked to a session
    let customQuestions: string[] = [];
    if (attempt.session_id) {
      const interviewSession = await queryOne<{ custom_questions: string }>(
        "SELECT custom_questions FROM interview_sessions WHERE id = $1",
        [attempt.session_id]
      );
      if (interviewSession) {
        customQuestions = JSON.parse(interviewSession.custom_questions || "[]");
      }
    }

    // Get next question from AI (with DB fallback)
    const { question, isComplete } = await getNextQuestion(
      attempt.role,
      conversation,
      customQuestions,
      attempt.resume_text || undefined,
      dbQuestions,
      attempt.round
    );

    if (question) {
      conversation.push({
        role: "interviewer",
        content: question,
        timestamp: new Date().toISOString(),
      });
    }

    await execute(
      "UPDATE interview_attempts SET conversation = $1 WHERE id = $2",
      [JSON.stringify(conversation), attemptId]
    );

    return NextResponse.json({
      question,
      isComplete,
      conversationLength: conversation.length,
    });
  } catch (error) {
    console.error("Message error:", error);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
