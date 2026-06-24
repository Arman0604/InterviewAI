import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { getSession } from "@/lib/auth";


export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const attempts = await query(
    `
      SELECT
        a.id,
        a.session_id,
        a.role,
        a.round,
        a.is_mock,
        a.status,
        a.score,
        a.summary,
        a.completed_at,
        s.title as session_title,
        s.short_id
      FROM interview_attempts a
      LEFT JOIN interview_sessions s ON s.id = a.session_id
      WHERE a.candidate_id = $1 AND a.status = 'completed'
      ORDER BY a.completed_at DESC
    `,
    [session.userId]
  );
  return NextResponse.json({ reports: attempts });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const attemptId = request.nextUrl.searchParams.get("attemptId");
  if (!attemptId) {
    return NextResponse.json({ error: "Attempt ID required" }, { status: 400 });
  }

  const result = await execute(
    "DELETE FROM interview_attempts WHERE id = $1 AND candidate_id = $2 AND status = 'completed'",
    [attemptId, session.userId]
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
