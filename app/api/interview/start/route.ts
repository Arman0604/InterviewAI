import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { execute, query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateIntroMessage } from "@/lib/interview-engine";
import { getQuestionsForRole, getHRQuestions, getAptitudeQuestions, getDSAQuestions } from "@/lib/questions";

async function getRecentQuestionIdsForRound(
  candidateId: string,
  round: string,
  recentAttempts: number
): Promise<string[]> {
  const rows = await query<{ selected_questions: string | null }>(
    `
      SELECT selected_questions
      FROM interview_attempts
      WHERE candidate_id = $1
        AND round = $2
        AND selected_questions IS NOT NULL
      ORDER BY started_at DESC
      LIMIT $3
    `,
    [candidateId, round, recentAttempts]
  );

  const ids: string[] = [];
  for (const row of rows) {
    if (!row.selected_questions) continue;
    try {
      const parsed = JSON.parse(row.selected_questions) as string[];
      ids.push(...parsed);
    } catch {
      // Ignore malformed historical data.
    }
  }

  return ids;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.userType !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { sessionId, role, isMock, resumeText, round } = await request.json();
    if (!role) return NextResponse.json({ error: "Role required" }, { status: 400 });
    const dbRound = round || "technical";
    // Resume required for every round except aptitude and dsa.
    if (dbRound !== "aptitude" && dbRound !== "dsa" && (!resumeText || !resumeText.trim())) {
      return NextResponse.json({ error: "Resume is required to start the interview" }, { status: 400 });
    }

    const recentQuestionIds =
      dbRound === "dsa"
        ? await getRecentQuestionIdsForRound(session.userId, "dsa", 3)
        : dbRound === "aptitude"
          ? await getRecentQuestionIdsForRound(session.userId, "aptitude", 2)
          : [];

    if (sessionId && !isMock) {
      const interviewSession = await queryOne<{ id: string }>(
        "SELECT id FROM interview_sessions WHERE id = $1 AND is_active = 1",
        [sessionId]
      );
      if (!interviewSession) {
        return NextResponse.json({ error: "Interview session not found" }, { status: 404 });
      }
    }

    // Pre-select DB questions for this session so they stay consistent
    const dbQuestions =
      dbRound === "aptitude"
        ? getAptitudeQuestions(recentQuestionIds)
        : dbRound === "hr"
        ? getHRQuestions(7)
        : dbRound === "dsa"
        ? getDSAQuestions(1, recentQuestionIds)        // one random DSA problem per session
        : getQuestionsForRole(role, 10);

    // DSA round skips the AI intro — goes straight to the IDE
    if (dbRound === "dsa") {
      const attemptId = uuidv4();
      const selectedQuestionIds = JSON.stringify(dbQuestions.map((q) => q.id));

      await execute(
        `INSERT INTO interview_attempts (id, session_id, candidate_id, role, is_mock, conversation, resume_text, tab_switch_count, round, selected_questions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9)`,
        [
          attemptId,
          isMock ? null : sessionId,
          session.userId,
          role,
          isMock ? 1 : 0,
          JSON.stringify([]),
          null,
          dbRound,
          selectedQuestionIds,
        ]
      );

      return NextResponse.json({ attemptId });
    }

    // Fetch candidate name only for conversational rounds that need an intro.
    const user = await queryOne<{ name: string }>("SELECT name FROM users WHERE id = $1", [session.userId]);
    const candidateName = user?.name || "there";

    // Generate the AI's opening introduction message (works WITHOUT Gemini)
    const introMessage = generateIntroMessage(candidateName, role, dbRound);

    // Build initial conversation with just the intro
    const initialConversation = [
      { role: "interviewer", content: introMessage, timestamp: new Date().toISOString() },
    ];

    const attemptId = uuidv4();

    // Store selected question IDs so the session stays consistent
    const selectedQuestionIds = JSON.stringify(dbQuestions.map((q) => q.id));

    await execute(
      `INSERT INTO interview_attempts (id, session_id, candidate_id, role, is_mock, conversation, resume_text, tab_switch_count, round, selected_questions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9)`,
      [
        attemptId,
        isMock ? null : sessionId,
        session.userId,
        role,
        isMock ? 1 : 0,
        JSON.stringify(initialConversation),
        resumeText || null,
        dbRound,
        selectedQuestionIds,
      ]
    );

    return NextResponse.json({ attemptId, question: introMessage });
  } catch (error) {
    console.error("Start interview error:", error);
    return NextResponse.json({ error: "Failed to start interview" }, { status: 500 });
  }
}
