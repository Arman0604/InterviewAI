import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import CandidateDashboardClient, { type Report } from "./CandidateDashboardClient";

type DashboardSearchParams = Promise<{
  role?: string | string[];
  view?: string | string[];
}>;

export default async function CandidateDashboard({
  searchParams,
}: {
  searchParams: DashboardSearchParams;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const requestedRole = (await searchParams).role;
  const requestedView = (await searchParams).view;
  const initialRole = Array.isArray(requestedRole) ? requestedRole[0] : requestedRole;
  const initialView = Array.isArray(requestedView) ? requestedView[0] : requestedView;

  const reports = await query<Report>(
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

  return (
    <CandidateDashboardClient
      user={session}
      initialReports={reports}
      initialRole={initialRole}
      initialView={initialView}
    />
  );
}
