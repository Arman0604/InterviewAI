import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import ReportClient from "./ReportClient";
import type { ProctoringEventRecord } from "@/lib/proctoring";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { attemptId } = await params;
  // Retrieve attempt
  const attempt = await queryOne<{
      id: string; session_id: string | null; candidate_id: string;
      role: string; status: string; conversation: string; score: number;
      feedback: string; summary: string; started_at: string; completed_at: string;
      candidate_name: string; candidate_email: string; campaign_owner_id: string | null;
      is_mock: number;
      proctored?: number; proctoring_camera_status?: string; proctoring_violation_count?: number;
      proctoring_flagged?: number; proctoring_summary?: string;
    }>(
    `
      SELECT a.*, u.name as candidate_name, u.email as candidate_email, s.created_by as campaign_owner_id
      FROM interview_attempts a
      JOIN users u ON u.id = a.candidate_id
      LEFT JOIN interview_sessions s ON s.id = a.session_id
      WHERE a.id = $1
    `,
    [attemptId]
  );

  if (!attempt) redirect("/candidate/dashboard");
  if (attempt.status !== "completed") {
    redirect("/candidate/dashboard");
  }

  // Auth check: candidate can only view their own reports
  const isCandidateOwner = attempt.candidate_id === session.userId;

  if (!isCandidateOwner) {
    redirect("/candidate/dashboard");
  }

  const proctoringEvents = await query<ProctoringEventRecord>(
    `SELECT id, event_type, occurred_at, message, metadata
       FROM proctoring_events
       WHERE attempt_id = $1
       ORDER BY occurred_at ASC`,
    [attemptId]
  );

  return (
    <ReportClient
      attempt={{ ...attempt, proctoring_events: proctoringEvents }}
      viewerType="candidate"
    />
  );
}
