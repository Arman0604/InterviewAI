import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { execute, query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  PROCTORING_ALLOWED_VIOLATIONS,
  ProctoringCameraStatus,
  ProctoringEventRecord,
  isCountedProctoringViolation,
  isProctoringViolationType,
} from "@/lib/proctoring";

export const runtime = "nodejs";

const CAMERA_STATUSES = new Set<ProctoringCameraStatus>([
  "unknown",
  "granted",
  "denied",
  "lost",
  "active",
]);

interface AttemptRow {
  id: string;
  candidate_id: string;
  proctoring_camera_status?: ProctoringCameraStatus;
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "{}";
  }
}

function normalizeCameraStatus(value: unknown): ProctoringCameraStatus | null {
  if (typeof value !== "string") return null;
  return CAMERA_STATUSES.has(value as ProctoringCameraStatus)
    ? (value as ProctoringCameraStatus)
    : null;
}

function buildSummary(
  cameraStatus: ProctoringCameraStatus,
  events: ProctoringEventRecord[]
) {
  const countedEvents = events.filter((event) => isCountedProctoringViolation(event.event_type));
  const tabSwitchCount = countedEvents.filter((event) => event.event_type === "tab_switch_detected").length;
  const cameraViolationCount = countedEvents.length - tabSwitchCount;
  const violationTypes = Array.from(new Set(countedEvents.map((event) => event.event_type)));
  const policyExceeded = countedEvents.length > PROCTORING_ALLOWED_VIOLATIONS;

  return {
    cameraAccessStatus: cameraStatus,
    violationCount: countedEvents.length,
    cameraViolationCount,
    tabSwitchCount,
    violationTypes,
    eventCount: events.length,
    timestamps: events.map((event) => ({
      type: event.event_type,
      occurredAt: event.occurred_at,
    })),
    clean: countedEvents.length === 0 && cameraStatus !== "denied" && cameraStatus !== "lost",
    flagged: countedEvents.length > 0,
    policyExceeded,
  };
}

async function refreshAttemptSummary(
  attemptId: string,
  cameraStatus: ProctoringCameraStatus
) {
  const events = await query<ProctoringEventRecord>(
    `SELECT id, event_type, occurred_at, message, metadata
       FROM proctoring_events
       WHERE attempt_id = $1
       ORDER BY occurred_at ASC`,
    [attemptId]
  );

  const summary = buildSummary(cameraStatus, events);

  await execute(
    `UPDATE interview_attempts
     SET proctored = 1,
         proctoring_camera_status = $1,
         proctoring_violation_count = $2,
         tab_switch_count = $3,
         proctoring_flagged = $4,
         proctoring_summary = $5
     WHERE id = $6`,
    [
      cameraStatus,
      summary.violationCount,
      summary.tabSwitchCount,
      summary.flagged ? 1 : 0,
      JSON.stringify(summary),
      attemptId,
    ]
  );

  if (summary.policyExceeded) {
    await execute(
      `UPDATE interview_attempts
       SET status = 'abandoned',
           completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
       WHERE id = $1 AND status != 'completed'`,
      [attemptId]
    );
  }

  return { events, summary };
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.userType !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const attemptId = request.nextUrl.searchParams.get("attemptId");
  if (!attemptId) {
    return NextResponse.json({ error: "Attempt ID required" }, { status: 400 });
  }

  const attempt = await queryOne<AttemptRow>(
    "SELECT id, candidate_id, proctoring_camera_status FROM interview_attempts WHERE id = $1 AND candidate_id = $2",
    [attemptId, session.userId]
  );

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found or unauthorized" }, { status: 404 });
  }

  const cameraStatus = attempt.proctoring_camera_status ?? "unknown";
  const { events, summary } = await refreshAttemptSummary(attemptId, cameraStatus);

  return NextResponse.json({ success: true, events, summary });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.userType !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      attemptId,
      tabSwitches,
      eventType,
      message,
      metadata,
      occurredAt,
      proctored,
    } = body;

    if (!attemptId || typeof attemptId !== "string") {
      return NextResponse.json({ error: "Attempt ID required" }, { status: 400 });
    }

    const attempt = await queryOne<AttemptRow>(
      "SELECT id, candidate_id, proctoring_camera_status FROM interview_attempts WHERE id = $1 AND candidate_id = $2",
      [attemptId, session.userId]
    );

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found or unauthorized" }, { status: 404 });
    }

    if (typeof tabSwitches === "number") {
      await execute("UPDATE interview_attempts SET tab_switch_count = $1 WHERE id = $2", [tabSwitches, attemptId]);
    }

    const requestedCameraStatus = normalizeCameraStatus(body.cameraStatus);
    let cameraStatus = requestedCameraStatus ?? attempt.proctoring_camera_status ?? "unknown";

    if (isProctoringViolationType(eventType)) {
      if (eventType === "camera_permission_denied") cameraStatus = "denied";
      if (eventType === "camera_feed_lost") cameraStatus = "lost";

      await execute(
        `INSERT INTO proctoring_events
          (id, attempt_id, candidate_id, event_type, message, metadata, occurred_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          uuidv4(),
          attemptId,
          session.userId,
          eventType,
          typeof message === "string" ? message : null,
          safeJson(metadata),
          typeof occurredAt === "string" ? occurredAt : new Date().toISOString(),
        ]
      );
    } else if (eventType !== undefined) {
      return NextResponse.json({ error: "Invalid proctoring event type" }, { status: 400 });
    }

    if (proctored || requestedCameraStatus || isProctoringViolationType(eventType)) {
      const { events, summary } = await refreshAttemptSummary(attemptId, cameraStatus);
      return NextResponse.json({
        success: true,
        events,
        summary,
        violationCount: summary.violationCount,
        flagged: summary.flagged,
        policyAction: summary.policyExceeded ? "end_round" : "continue",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Proctoring API error:", error);
    return NextResponse.json({ error: "Failed to record proctor status" }, { status: 500 });
  }
}
