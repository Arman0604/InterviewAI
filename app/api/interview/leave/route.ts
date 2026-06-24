import { NextRequest, NextResponse } from "next/server";
import { execute, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.userType !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { attemptId } = await request.json();
    if (!attemptId) {
      return NextResponse.json({ error: "Attempt ID required" }, { status: 400 });
    }

    const attempt = await queryOne<{ id: string; status: string }>(
      "SELECT id, status FROM interview_attempts WHERE id = $1 AND candidate_id = $2",
      [attemptId, session.userId]
    );

    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    if (attempt.status === "completed") {
      return NextResponse.json({ error: "Interview already completed" }, { status: 400 });
    }

    await execute(
      "UPDATE interview_attempts SET status = 'abandoned', completed_at = CURRENT_TIMESTAMP WHERE id = $1",
      [attemptId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Leave interview error:", error);
    return NextResponse.json({ error: "Failed to leave interview" }, { status: 500 });
  }
}
