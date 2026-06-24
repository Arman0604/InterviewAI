import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { queryOne } from "@/lib/db";
import { QUESTION_BANK, OAQuestion } from "@/lib/questions";
import InterviewWorkspaceClient from "./InterviewWorkspaceClient";

export default async function InterviewWorkspace({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.userType !== "candidate") redirect("/hiring/dashboard");

  const { attemptId } = await params;
  const attempt = await queryOne<{
      id: string; role: string; conversation: string; status: string; round?: string; selected_questions?: string | null;
    }>(
    "SELECT * FROM interview_attempts WHERE id = $1 AND candidate_id = $2",
    [attemptId, session.userId]
  );

  if (!attempt) redirect("/candidate/dashboard");
  if (attempt.status === "completed") redirect(`/report/${attemptId}`);
  if (attempt.status === "abandoned") redirect("/candidate/dashboard");
  // DSA round has its own dedicated IDE workspace
  if (attempt.round === "dsa") redirect(`/dsa/${attemptId}`);

  let aptitudeQuestions: OAQuestion[] = [];
  if (attempt.round === "aptitude" && attempt.selected_questions) {
    try {
      const ids: string[] = JSON.parse(attempt.selected_questions);
      aptitudeQuestions = ids
        .map((id) => QUESTION_BANK.find((q) => q.id === id))
        .filter((q): q is OAQuestion => {
          return !!q && q.roundType === "online-assessment";
        });
    } catch {
      aptitudeQuestions = [];
    }
  }

  return (
    <InterviewWorkspaceClient
      attemptId={attemptId}
      initialAttempt={attempt}
      candidateName={session.name}
      aptitudeQuestions={aptitudeQuestions}
    />
  );
}
