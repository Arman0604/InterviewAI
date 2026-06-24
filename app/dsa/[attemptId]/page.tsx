import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { queryOne } from "@/lib/db";
import { QUESTION_BANK, DSAQuestion } from "@/lib/questions";
import DSAWorkspaceClient from "./DSAWorkspaceClient";

export default async function DSAWorkspacePage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.userType !== "candidate") redirect("/hiring/dashboard");

  const { attemptId } = await params;
  const attempt = await queryOne<{
      id: string; role: string; round: string; status: string;
      selected_questions: string | null;
    }>(
    "SELECT * FROM interview_attempts WHERE id = $1 AND candidate_id = $2",
    [attemptId, session.userId]
  );

  if (!attempt) redirect("/candidate/dashboard");
  if (attempt.round !== "dsa") redirect(`/interview/${attemptId}`);
  if (attempt.status === "completed") redirect(`/report/${attemptId}`);
  if (attempt.status === "abandoned") redirect("/candidate/dashboard");

  // Resolve the one DSA question for this attempt
  let question: DSAQuestion | null = null;
  if (attempt.selected_questions) {
    try {
      const ids: string[] = JSON.parse(attempt.selected_questions);
      const found = QUESTION_BANK.find(q => q.id === ids[0]);
      if (found && found.roundType === "dsa") question = found as DSAQuestion;
    } catch { /* ignore */ }
  }

  if (!question) redirect("/candidate/dashboard");

  return (
    <DSAWorkspaceClient
      attemptId={attemptId}
      question={question}
    />
  );
}
