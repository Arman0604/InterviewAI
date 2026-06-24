"use client";
import Navbar from "@/components/Navbar";
import { INTERVIEW_ROLES } from "@/lib/roles";
import {
  PROCTORING_ALLOWED_VIOLATIONS,
  PROCTORING_EVENT_LABELS,
  ProctoringEventRecord,
  ProctoringViolationType,
  isCountedProctoringViolation,
} from "@/lib/proctoring";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ScoredQ {
  questionId?: string;
  questionText: string;
  candidateAnswer: string;
  topic: string;
  subject: string;
  score: number;
  matchedKeywords?: string[];
  missingKeywords?: string[];
  options?: string[];
  selectedOption?: string;
  selectedAnswer?: string;
  correctOption?: string;
  correctAnswer?: string;
  marksAwarded?: number;
  maxMarks?: number;
}

interface WeakSubject {
  name: string;
  questionsAsked: number;
  weakCount: number;
  weakPercent: number;
  pieContribution: number;
}

interface WeakTopic {
  topic: string;
  subject: string;
  score: number;
}

interface WeakSubjectAnalysis {
  subjects: WeakSubject[];
  weakTopics: WeakTopic[];
  totalWeakPercent: number;
}

interface Props {
  attempt: {
    id: string;
    role: string;
    score: number;
    feedback: string;
    summary: string;
    started_at: string;
    completed_at: string;
    candidate_name: string;
    candidate_email: string;
    is_mock: number;
    tab_switch_count?: number;
    proctored?: number;
    proctoring_camera_status?: string;
    proctoring_violation_count?: number;
    proctoring_flagged?: number;
    proctoring_summary?: string;
    proctoring_events?: ProctoringEventRecord[];
    round?: string;
  };
  viewerType?: string;
}

// ─── Pie chart helper (SVG donut) ─────────────────────────────────────────────
const PIE_COLORS: Record<string, string> = {
  "Operating System":      "#6366f1",
  "DBMS":                  "#f59e0b",
  "OOP":                   "#10b981",
  "Computer Networks":     "#ef4444",
  "Programming Languages": "#3b82f6",
  "Quantitative":           "#6366f1",
  "Verbal Ability":         "#f59e0b",
  "Logical Reasoning":      "#10b981",
  "Non-Verbal Reasoning":   "#ef4444",
  "Problem Solving":        "#6366f1",
  "Code Implementation":    "#10b981",
  "Complexity Analysis":    "#f59e0b",
  "Solution Approach":      "#3b82f6",
  "Edge Case Handling":     "#ef4444",
  "General":               "#8b5cf6",
};

function formatReportDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
}

function formatAptitudeDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const day = String(date.getDate()).padStart(2, "0");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, "0");

  return `${day} ${month} ${year}, ${formattedHours}:${minutes}:${seconds} ${ampm}`;
}

function formatDuration(startedAt: string, completedAt: string) {
  const start = new Date(startedAt);
  const end = new Date(completedAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "15:00";

  const diffSeconds = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
  const mins = Math.floor(diffSeconds / 60);
  const secs = diffSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function DonutChart({ subjects }: { subjects: WeakSubject[] }) {
  const active = subjects.filter((s) => s.weakPercent > 0);
  if (active.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
        🎉 No weak subjects — all topics scored ≥ 50%!
      </div>
    );
  }

  const R = 70;
  const cx = 100;
  const cy = 100;
  let cumulativeAngle = -Math.PI / 2; // start at top

  const slices = active.map((s) => {
    const angle = (s.pieContribution / 100) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(cumulativeAngle);
    const y1 = cy + R * Math.sin(cumulativeAngle);
    cumulativeAngle += angle;
    const x2 = cx + R * Math.cos(cumulativeAngle);
    const y2 = cy + R * Math.sin(cumulativeAngle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
    return { path, color: PIE_COLORS[s.name] || "#94a3b8", label: s.name, pct: s.pieContribution };
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
      <svg width="200" height="200" viewBox="0 0 200 200">
        {slices.map((sl, i) => (
          <path key={i} d={sl.path} fill={sl.color} opacity={0.9} stroke="var(--bg-base)" strokeWidth="2" />
        ))}
        {/* Inner hole */}
        <circle cx={cx} cy={cy} r="42" fill="var(--bg-card)" />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="11" fill="var(--text-secondary)" fontFamily="inherit">Weak</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="11" fill="var(--text-secondary)" fontFamily="inherit">Subjects</text>
      </svg>
      {/* Legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {slices.map((sl, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: sl.color, flexShrink: 0 }} />
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{sl.label}</span>
            <span style={{ color: "var(--text-secondary)" }}>({sl.pct.toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Score badge colour helper ────────────────────────────────────────────────
function scoreBadgeClass(score: number) {
  if (score === 0) return "badge-rose";
  if (score >= 70) return "badge-emerald";
  if (score >= 40) return "badge-amber";
  return "badge-rose";
}

function scoreTone(score: number) {
  if (score >= 70) return "good";
  if (score >= 30) return "average";
  return "poor";
}

function scoreColor(score: number) {
  if (score >= 70) return "var(--emerald)";
  if (score >= 30) return "var(--amber)";
  return "var(--rose)";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "C";
}

function getTechnicalInterviewerName(role: string) {
  if (role === "ai-ml-engineer") return "Sofia";
  if (role === "system-design-architect") return "Alisa";
  return "Maria";
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReportClient({ attempt, viewerType }: Props) {
  const roleData = INTERVIEW_ROLES.find((r) => r.id === attempt.role);

  let fd: any = {};
  try { fd = JSON.parse(attempt.feedback || "{}"); } catch {}

  const score   = attempt.score || 0;
  const verdict = fd.verdict || "Borderline";

  // New format fields
  const questionScores: ScoredQ[]             = fd.questionScores || [];
  const weakAnalysis: WeakSubjectAnalysis | null = fd.weakSubjectAnalysis || null;
  const totalMarks: number                    = fd.totalMarks ?? 0;
  const maxMarks: number                      = fd.maxMarks ?? 20;
  const aiFeedback: string                    = fd.aiFeedback || "";
  const strengths: string[]                   = fd.strengths || [];
  const improvements: string[]                = fd.improvements || [];
  const hiringRecommendation: string          = fd.hiringRecommendation || "";

  // Legacy fallback fields
  const questionFeedback: any[] = fd.questionFeedback || [];
  const qnaSummary: any[]       = fd.qnaSummary || [];
  const roadmap: any[]          = fd.roadmap || [];

  const isHRRound      = attempt.round === "hr"      || fd.round === "hr";
  const isAptitudeRound = attempt.round === "aptitude" || fd.round === "aptitude";
  const isDSARound      = attempt.round === "dsa"      || fd.round === "dsa";
  const isSENewFormat   = questionScores.length > 0 && !isHRRound && !isAptitudeRound && !isDSARound;
  const proctoringEvents = attempt.proctoring_events ?? [];
  const proctoringViolationCount = attempt.proctoring_violation_count ?? proctoringEvents.length;
  const proctoringCameraStatus = attempt.proctoring_camera_status || "unknown";
  const proctoringFlagged =
    Boolean(attempt.proctoring_flagged) ||
    proctoringViolationCount > PROCTORING_ALLOWED_VIOLATIONS ||
    proctoringCameraStatus === "denied" ||
    proctoringCameraStatus === "lost";
  const proctoringTypes = Array.from(
    new Set(
      proctoringEvents
        .filter((event) => isCountedProctoringViolation(event.event_type))
        .map((event) => event.event_type as ProctoringViolationType)
    )
  );
  const proctoringClean =
    proctoringViolationCount === 0 &&
    !proctoringFlagged &&
    proctoringCameraStatus !== "denied" &&
    proctoringCameraStatus !== "lost";
  const cameraBadgeClass =
    proctoringCameraStatus === "active" || proctoringCameraStatus === "granted"
      ? "badge-emerald"
      : proctoringCameraStatus === "denied" || proctoringCameraStatus === "lost"
        ? "badge-rose"
        : "badge-amber";
  const violationBadgeClass =
    proctoringViolationCount === 0
      ? "badge-emerald"
      : proctoringViolationCount <= PROCTORING_ALLOWED_VIOLATIONS
        ? "badge-amber"
        : "badge-rose";

  // Score ring
  const radius         = 70;
  const circumference  = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const verdictClass =
    verdict.toLowerCase().includes("strongly")    ? "verdict-strongly" :
    verdict.toLowerCase().includes("recommended") ? "verdict-recommended" :
    verdict.toLowerCase().includes("borderline")  ? "verdict-borderline" : "verdict-not";

  const proctoringCard = (
    <div className="card">
      <h3 style={{ marginBottom: 14 }}>Proctoring &amp; Integrity</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="flex items-center justify-between" style={{ gap: 12 }}>
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>Camera access status</div>
            <div className="text-xs text-muted mt-1">WEBCAM REQUIREMENT</div>
          </div>
          <div className={`badge ${cameraBadgeClass}`} style={{ textTransform: "capitalize" }}>
            {proctoringCameraStatus}
          </div>
        </div>

        <div className="flex items-center justify-between" style={{ gap: 12 }}>
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>Proctoring violations</div>
            <div className="text-xs text-muted mt-1">CAMERA / TAB SWITCH EVENTS</div>
          </div>
          <div className={`badge ${violationBadgeClass}`} style={{ fontSize: "1rem", padding: "5px 12px" }}>
            {proctoringViolationCount}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted mt-4" style={{ lineHeight: 1.55 }}>
        {proctoringClean
          ? "Clean round: camera access stayed active and no proctoring violations were recorded."
          : proctoringFlagged
            ? "Flagged round: proctoring recorded violations, tab switches, or camera access issues."
            : "Warnings recorded: review the timestamped proctoring events below."}
      </p>

      {proctoringTypes.length > 0 && (
        <div className="mt-4">
          <div className="text-xs text-muted mb-4">Violation types</div>
          <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
            {proctoringTypes.map((type) => (
              <span key={type} className="badge badge-rose" style={{ fontSize: "0.68rem" }}>
                {PROCTORING_EVENT_LABELS[type] ?? type}
              </span>
            ))}
          </div>
        </div>
      )}

      {proctoringEvents.length > 0 && (
        <div className="mt-4" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="text-xs text-muted">Timestamps</div>
          {proctoringEvents.slice(0, 8).map((event) => (
            <div
              key={`${event.event_type}-${event.occurred_at}`}
              style={{
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 10px",
                background: "var(--bg-elevated)",
              }}
            >
              <div style={{ fontSize: "0.78rem", fontWeight: 600 }}>
                {PROCTORING_EVENT_LABELS[event.event_type] ?? event.event_type}
              </div>
              <div className="text-xs text-muted mt-1">
                {formatReportDateTime(event.occurred_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── Aptitude Round early return ───────────────────────────────────────────
  if (isAptitudeRound) {
    const correctCount = totalMarks;
    const unansweredCount = questionScores.filter((q) => !q.selectedOption).length;
    const incorrectCount = Math.max(0, maxMarks - correctCount - unansweredCount);

    const R = 70;
    const circ = 2 * Math.PI * R;
    const offset = circ - (score / 100) * circ;

    const getCandidateInitials = (name: string) => {
      return name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "C";
    };
    const candidateInitials = getCandidateInitials(attempt.candidate_name);

    return (
      <div className="aptitude-report-page">
        <Navbar userName={attempt.candidate_name} />

        <div className="aptitude-report-shell">
          {/* Actions */}
          <div className="flex justify-between items-center no-print" style={{ flexWrap: "wrap", gap: "10px" }}>
            <a href="/candidate/dashboard" className="btn btn-secondary btn-sm">
              ⬅️ Back to Dashboard
            </a>
            <button onClick={() => window.print()} className="btn btn-primary btn-sm">
              📄 Download PDF Report
            </button>
          </div>

          {/* Evaluation Header */}
          <div className="aptitude-report-header">
            <span className="aptitude-badge-pill">Aptitude Round</span>
            <h1>Evaluation: {attempt.candidate_name}</h1>
            <div className="aptitude-report-meta">
              <div className="aptitude-report-meta-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>Completed on {formatAptitudeDateTime(attempt.completed_at)}</span>
              </div>
              <div className="aptitude-report-meta-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Duration: {formatDuration(attempt.started_at, attempt.completed_at)}</span>
              </div>
            </div>
          </div>

          {/* Main Layout Grid */}
          <div className="aptitude-report-grid">
            {/* Left Column */}
            <div className="flex flex-col gap-6">
              {/* Overall Score */}
              <div className="aptitude-report-card aptitude-ring-card">
                <h3>Overall Score</h3>
                <div className="aptitude-score-ring-wrapper">
                  <svg width="160" height="160">
                    <circle className="aptitude-score-ring-bg" cx="80" cy="80" r="70" />
                    <circle
                      className="aptitude-score-ring-fill"
                      cx="80"
                      cy="80"
                      r="70"
                      strokeDasharray={circ}
                      strokeDashoffset={offset}
                    />
                  </svg>
                  <div className="aptitude-score-ring-content">
                    <span className="aptitude-score-ring-number">{Math.round(score)}</span>
                    <span className="aptitude-score-ring-label">OUT OF 100</span>
                  </div>
                </div>
                <div className="aptitude-ring-accuracy">{score.toFixed(1)}% Accuracy</div>
                <div className="aptitude-ring-ratio">({correctCount} / {maxMarks} Correct)</div>
              </div>

              {/* Proctoring & Integrity */}
              <div className="aptitude-report-card">
                <h3>Proctoring &amp; Integrity</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="aptitude-integrity-item">
                    <div>
                      <div className="integrity-title">Camera Access</div>
                      <div className="integrity-label">Webcam Requirement</div>
                    </div>
                    <span className={`integrity-badge ${proctoringCameraStatus === "active" || proctoringCameraStatus === "granted" ? "active" : "inactive"}`}>
                      {proctoringCameraStatus === "active" || proctoringCameraStatus === "granted" ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="aptitude-integrity-item">
                    <div>
                      <div className="integrity-title">Violations Detected</div>
                    </div>
                    <span className={`integrity-count-badge ${proctoringViolationCount === 0 ? "zero" : "flagged"}`}>
                      {proctoringViolationCount}
                    </span>
                  </div>
                </div>
                <p className="integrity-summary mt-4">
                  {proctoringViolationCount === 0
                    ? "No suspicious activity detected during the test."
                    : `Recorded ${proctoringViolationCount} proctoring violations.`}
                </p>
              </div>

              {/* Test Overview */}
              <div className="aptitude-report-card">
                <h3>Test Overview</h3>
                <div className="aptitude-overview-list">
                  <div className="aptitude-overview-item">
                    <div className="overview-item-label">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="8" y1="6" x2="21" y2="6" />
                        <line x1="8" y1="12" x2="21" y2="12" />
                        <line x1="8" y1="18" x2="21" y2="18" />
                        <line x1="3" y1="6" x2="3.01" y2="6" />
                        <line x1="3" y1="12" x2="3.01" y2="12" />
                        <line x1="3" y1="18" x2="3.01" y2="18" />
                      </svg>
                      Total Questions
                    </div>
                    <div className="overview-item-value">{maxMarks}</div>
                  </div>

                  <div className="aptitude-overview-item">
                    <div className="overview-item-label">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Correct Answers
                    </div>
                    <div className="overview-item-value correct">{correctCount}</div>
                  </div>

                  <div className="aptitude-overview-item">
                    <div className="overview-item-label">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Incorrect Answers
                    </div>
                    <div className="overview-item-value incorrect">{incorrectCount}</div>
                  </div>

                  <div className="aptitude-overview-item">
                    <div className="overview-item-label">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      Unanswered
                    </div>
                    <div className="overview-item-value">{unansweredCount}</div>
                  </div>

                  <div className="aptitude-overview-item">
                    <div className="overview-item-label">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      Time Taken
                    </div>
                    <div className="overview-item-value">{formatDuration(attempt.started_at, attempt.completed_at)}</div>
                  </div>
                </div>
              </div>

              {/* Weak Subject Analysis (Donut chart) */}
              {weakAnalysis && (
                <div className="aptitude-report-card" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <h3 style={{ alignSelf: "flex-start", width: "100%" }}>Weak Subject Analysis</h3>
                  <DonutChart subjects={weakAnalysis.subjects} />
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-6">
              {/* Score Summary Grid */}
              <div className="aptitude-score-summary-grid">
                <div className="aptitude-summary-box correct-border">
                  <div className="aptitude-summary-icon correct-bg">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div className="aptitude-summary-value correct-text">{correctCount}</div>
                  <div className="aptitude-summary-label">Correct</div>
                </div>

                <div className="aptitude-summary-box incorrect-border">
                  <div className="aptitude-summary-icon incorrect-bg">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </div>
                  <div className="aptitude-summary-value incorrect-text">{incorrectCount}</div>
                  <div className="aptitude-summary-label">Incorrect</div>
                </div>

                <div className="aptitude-summary-box unanswered-border">
                  <div className="aptitude-summary-icon unanswered-bg">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <div className="aptitude-summary-value unanswered-text">{unansweredCount}</div>
                  <div className="aptitude-summary-label">Unanswered</div>
                </div>
              </div>

              {/* Question Review List */}
              <div className="aptitude-report-card" style={{ padding: "30px" }}>
                <div className="aptitude-review-header">
                  <h2>Question Review ({maxMarks} Questions)</h2>
                  <div className="aptitude-review-legend">
                    <div>
                      <span className="review-legend-dot correct" />
                      Correct
                    </div>
                    <div>
                      <span className="review-legend-dot incorrect" />
                      Incorrect
                    </div>
                    <div>
                      <span className="review-legend-dot unanswered" />
                      Unanswered
                    </div>
                  </div>
                </div>

                <div className="aptitude-review-card-list">
                  {questionScores.map((q, idx) => {
                    const isCorrect = q.marksAwarded === 1;
                    const isUnanswered = !q.selectedOption;
                    const statusClass = isUnanswered ? "unanswered" : isCorrect ? "correct" : "incorrect";
                    const displayIndex = String(idx + 1).padStart(2, "0");

                    return (
                      <div key={q.questionId || idx} className="aptitude-review-item-card">
                        <div className={`aptitude-review-item-index ${statusClass}`}>
                          {displayIndex}
                        </div>

                        <div className="aptitude-review-item-body">
                          <h4 className="review-question-text">{q.questionText}</h4>
                          <div className="review-question-topic">Topic: {q.topic}</div>

                          <div className="review-answers-row">
                            <div className="review-answer-box">
                              <div className="review-answer-box-label">Your Answer</div>
                              <div className={`review-answer-box-value ${statusClass}`}>
                                {isUnanswered ? "Not answered" : `${q.selectedOption}. ${q.selectedAnswer}`}
                              </div>
                            </div>
                            <div className="review-answer-box">
                              <div className="review-answer-box-label">Correct Option</div>
                              <div className="review-answer-box-value correct">
                                {q.correctOption}. {q.correctAnswer}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="aptitude-review-item-status-icon">
                          <div className={`status-icon-circle ${statusClass}`}>
                            {isUnanswered ? (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                              </svg>
                            ) : isCorrect ? (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Keep Practicing Banner */}
              <div className="aptitude-report-banner">
                <div className="banner-left">
                  <div className="banner-icon-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .6 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                      <path d="M9 18h6" />
                      <path d="M10 22h4" />
                    </svg>
                  </div>
                  <div>
                    <div className="banner-title">Keep Practicing!</div>
                    <div className="banner-desc">Review your mistakes and focus on weak areas to improve your performance.</div>
                  </div>
                </div>
                <button onClick={() => window.print()} className="banner-download-btn no-print">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── DSA Round early return ───────────────────────────────────────────────
  if (isDSARound) {
    const ds = fd;
    const scores  = ds.scores || {};
    const total   = scores.total ?? attempt.score ?? 0;
    const dsVerdict = ds.verdict || (total >= 70 ? "Recommended" : total >= 50 ? "Borderline" : "Not Recommended");
    const dsVerdictClass =
      dsVerdict.toLowerCase().includes("strongly")    ? "verdict-strongly" :
      dsVerdict.toLowerCase().includes("recommended") ? "verdict-recommended" :
      dsVerdict.toLowerCase().includes("borderline")  ? "verdict-borderline" : "verdict-not";

    const R = 70;
    const circ = 2 * Math.PI * R;
    const offset = circ - (total / 100) * circ;

    const SCORE_CATS = [
      { label: "Problem Solving",    key: "problemSolving",    max: 30, color: "#6366f1" },
      { label: "Code Implementation",key: "codeImplementation", max: 20, color: "#10b981" },
      { label: "Complexity Analysis",key: "complexityAnalysis", max: 15, color: "#f59e0b" },
      { label: "Solution Approach",  key: "solutionApproach",   max: 25, color: "#3b82f6" },
      { label: "Edge Case Handling", key: "edgeCaseHandling",   max: 10, color: "#ef4444" },
    ] as const;

    const weakAnalysisDSA = ds.weakSubjectAnalysis || null;
    const suggestedTopics: string[] = ds.suggestedTopics || [];
    const matchedTerms: string[]    = ds.matchedApproachTerms  || [];
    const missingTerms: string[]    = ds.missingApproachTerms  || [];
    const sampleResults: any[] = ds.sampleResults || [];
    const hiddenResults: any[] = ds.hiddenResults || [];
    const edgeResults: any[] = ds.edgeResults || [];
    const failedEdges: any[] = ds.failedEdgeCases || edgeResults.filter((tc) => !tc.passed);
    const totalTCs = ds.totalTCs ?? sampleResults.length + hiddenResults.length + edgeResults.length;
    const passedTCs = ds.passedTCs ?? [...sampleResults, ...hiddenResults, ...edgeResults].filter((tc) => tc.passed).length;
    const testGroups = [
      { label: "Sample", results: sampleResults },
      { label: "Hidden", results: hiddenResults },
      { label: "Edge", results: edgeResults },
    ];
    const firstFailedTC = [
      ...sampleResults.map((tc) => ({ group: "Sample", tc })),
      ...hiddenResults.map((tc) => ({ group: "Hidden", tc })),
      ...edgeResults.map((tc) => ({ group: "Edge", tc })),
    ].find((item) => !item.tc.passed) ?? null;
    const dsaScoreValue = (key: (typeof SCORE_CATS)[number]["key"]) => Number(scores[key] ?? 0);

    return (
      <div className="page-wrapper">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            .no-print, .navbar, nav, button { display: none !important; }
            body { background: #fff !important; color: #000 !important; }
            .card, .card-glass { background: #fff !important; border: 1px solid #e2e8f0 !important; box-shadow: none !important; }
            .gradient-text { background: none !important; -webkit-text-fill-color: #000 !important; }
          }
          .dsa-score-bar-track { background: var(--bg-secondary); border-radius: 4px; height: 8px; overflow: hidden; }
          .dsa-score-bar-fill  { height: 100%; border-radius: 4px; transition: width 1s ease; }
          .tc-row { display: flex; gap: 8px; align-items: center; padding: 8px 12px; border-radius: 6px; font-size: 0.8rem; font-family: monospace; border: 1px solid var(--border); background: var(--bg-elevated); margin-bottom: 6px; }
          .tc-badge { padding: 2px 8px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; }
          .tc-pass  { background: rgba(16,185,129,0.1); color: var(--emerald); }
          .tc-fail  { background: rgba(244,63,94,0.1);  color: var(--rose); }
          .approach-tag { padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; }
          .approach-match   { background: rgba(16,185,129,0.1); color: var(--emerald); }
          .approach-missing { background: rgba(244,63,94,0.1);  color: var(--rose); }
        ` }} />

        <Navbar userName={attempt.candidate_name} />

        <div className="container" style={{ padding: "40px 24px" }}>

          {/* Actions */}
          <div className="mb-6 flex justify-between items-center no-print" style={{ flexWrap: "wrap", gap: 10 }}>
            <a href="/candidate/dashboard" className="btn btn-secondary btn-sm">⬅️ Back to Dashboard</a>
            <button onClick={() => window.print()} className="btn btn-primary btn-sm">📄 Download PDF Report</button>
          </div>

          {/* Header */}
          <div className="card mb-8">
            <div className="flex justify-between items-start" style={{ flexWrap: "wrap", gap: 20 }}>
              <div>
                <span className="badge badge-indigo mb-2">
                  {attempt.is_mock ? "Mock Practice Session" : "Official Interview Session"}
                </span>
                <h1 className="gradient-text" style={{ fontSize: "2rem" }}>DSA Evaluation: {attempt.candidate_name}</h1>
                <p className="text-muted text-sm mt-1">
                  💻 DSA Round · Completed on {formatReportDateTime(attempt.completed_at)}
                </p>
              </div>
              <div className={`verdict-badge ${dsVerdictClass}`}>⚖️ {dsVerdict}</div>
            </div>
          </div>

          <div className="report-grid">
            {/* ── Left Column ── */}
            <div className="flex flex-col gap-6">

              {/* Score Ring */}
              <div className="card text-center flex flex-col items-center">
                <h3 style={{ marginBottom: 20 }}>Overall Score</h3>
                <div className="score-ring-wrapper">
                  <div className="score-ring">
                    <svg width="160" height="160">
                      <circle className="ring-bg" cx="80" cy="80" r="70" />
                      <circle
                        className="ring-fill"
                        cx="80" cy="80" r="70"
                        stroke={total >= 70 ? "var(--emerald)" : total >= 50 ? "var(--amber)" : "#ef4444"}
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                      />
                    </svg>
                    <div className="score-ring-value">
                      <span className="score-ring-number">{total}</span>
                      <span className="score-ring-label">Out of 100</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-secondary mt-3" style={{ lineHeight: 1.5 }}>Composite of 5 evaluation categories</p>
              </div>

              {proctoringCard}

              {/* Score Breakdown */}
              <div className="card">
                <h3 style={{ marginBottom: 18 }}>📊 Score Breakdown (100 marks)</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {SCORE_CATS.map((cat) => {
                    const raw = Number(scores[cat.key] ?? 0);
                    const pct = cat.max > 0 ? Math.min(100, Math.max(0, (raw / cat.max) * 100)) : 0;

                    return (
                      <div key={cat.key}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", marginBottom: 6 }}>
                          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{cat.label}</span>
                          <span style={{ color: "var(--text-secondary)" }}>
                            {raw} / {cat.max} marks
                          </span>
                        </div>
                        <div className="dsa-score-bar-track">
                          <div
                            className="dsa-score-bar-fill"
                            style={{ width: `${pct}%`, background: cat.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Suggested Topics */}
              <div className="card">
                <h3 style={{ marginBottom: 18 }}>🎯 Suggested Topics to Improve</h3>
                {suggestedTopics.length > 0 ? (
                  <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                    {suggestedTopics.map((topic, idx) => (
                      <span key={`${topic}-${idx}`} className="badge badge-cyan" style={{ fontSize: "0.78rem" }}>
                        {topic}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-secondary" style={{ lineHeight: 1.6 }}>
                    No priority topic gaps were detected for this DSA attempt.
                  </p>
                )}
              </div>

              {/* Weakness Donut */}
              {weakAnalysisDSA && (
                <div className="card">
                  <h3 style={{ marginBottom: 18 }}>📊 Category Weakness Distribution</h3>
                  <div className="card-glass" style={{ padding: 16 }}>
                    <DonutChart subjects={weakAnalysisDSA.subjects} />
                  </div>
                </div>
              )}

            </div>

            {/* Main Detail Column */}
            <div className="flex flex-col gap-6">
              <div className="card">
                <div className="flex justify-between items-start" style={{ flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
                  <div>
                    <div className="flex items-center gap-2" style={{ flexWrap: "wrap", marginBottom: 6 }}>
                      <h3 style={{ margin: 0 }}>Test Case Results</h3>
                      <span className="badge badge-indigo" style={{ fontSize: "0.72rem" }}>
                        Problem Solving: {dsaScoreValue("problemSolving")} / 30 marks
                      </span>
                    </div>
                    <p className="text-xs text-secondary" style={{ lineHeight: 1.5 }}>
                      Execution summary across sample, hidden, and edge test cases.
                    </p>
                  </div>
                  <span className={`badge ${passedTCs === totalTCs ? "badge-emerald" : passedTCs > 0 ? "badge-amber" : "badge-rose"}`}>
                    {passedTCs} / {totalTCs} passed
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 18 }}>
                  {testGroups.map((group) => {
                    const passed = group.results.filter((tc) => tc.passed).length;
                    return (
                      <div key={group.label} className="card-glass" style={{ padding: 12 }}>
                        <div className="text-xs text-muted mb-1">{group.label} cases</div>
                        <div style={{ fontWeight: 800, fontSize: "1.25rem", color: "var(--text-primary)" }}>
                          {passed}/{group.results.length}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 14 }}>
                  <div className="text-xs font-mono mb-2" style={{ color: "var(--indigo)", fontWeight: 600 }}>
                    FIRST FAILED TEST CASE
                  </div>
                  {firstFailedTC ? (
                    <div className="card-glass" style={{ padding: 14, borderLeft: "3px solid var(--rose)" }}>
                      <div className="flex items-center gap-2 mb-3" style={{ flexWrap: "wrap" }}>
                        <span className="tc-badge tc-fail">FAIL</span>
                        <span className="badge badge-rose" style={{ fontSize: "0.68rem" }}>
                          {firstFailedTC.group} test
                        </span>
                      </div>
                      <p className="text-xs" style={{ lineHeight: 1.6 }}>Input: {String(firstFailedTC.tc.input ?? "-")}</p>
                      <p className="text-xs" style={{ lineHeight: 1.6 }}>Expected: {String(firstFailedTC.tc.expectedOutput ?? "-")}</p>
                      <p className="text-xs" style={{ lineHeight: 1.6 }}>Actual: {String(firstFailedTC.tc.actualOutput ?? "-")}</p>
                      {firstFailedTC.tc.stderr && (
                        <p className="text-xs text-secondary mt-2" style={{ lineHeight: 1.6 }}>Error: {String(firstFailedTC.tc.stderr)}</p>
                      )}
                    </div>
                  ) : (
                    <div className="tc-row">
                      <span className="tc-badge tc-pass">PASS</span>
                      <span>All executed test cases passed.</span>
                    </div>
                  )}
                </div>

                {edgeResults.length > 0 && (
                  <div style={{ marginTop: 18 }}>
                    <div className="flex justify-between items-center mb-2" style={{ gap: 12, flexWrap: "wrap" }}>
                      <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
                        <div className="text-xs font-mono" style={{ color: "var(--indigo)", fontWeight: 600 }}>
                          EDGE CASE TESTS
                        </div>
                        <span className="badge badge-indigo" style={{ fontSize: "0.68rem" }}>
                          Edge Case Handling: {dsaScoreValue("edgeCaseHandling")} / 10 marks
                        </span>
                      </div>
                      <span className={`badge ${failedEdges.length === 0 ? "badge-emerald" : "badge-rose"}`} style={{ fontSize: "0.7rem" }}>
                        {edgeResults.length - failedEdges.length}/{edgeResults.length} passed
                      </span>
                    </div>
                    {edgeResults.map((tc, idx) => (
                      <div key={`edge-${idx}`} className="tc-row" style={{ alignItems: "flex-start" }}>
                        <span className={`tc-badge ${tc.passed ? "tc-pass" : "tc-fail"}`}>
                          {tc.passed ? "PASS" : "FAIL"}
                        </span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            Input: {String(tc.input ?? "-")}
                          </div>
                          <div className="text-xs text-secondary mt-1" style={{ whiteSpace: "normal", lineHeight: 1.5 }}>
                            Expected: {String(tc.expectedOutput ?? "-")} | Actual: {String(tc.actualOutput ?? "-")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <div className="flex items-center gap-2" style={{ flexWrap: "wrap", marginBottom: 18 }}>
                  <h3 style={{ margin: 0 }}>Complexity Analysis</h3>
                  <span className="badge badge-indigo" style={{ fontSize: "0.72rem" }}>
                    {dsaScoreValue("complexityAnalysis")} / 15 marks
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  <div className="card-glass" style={{ padding: 14 }}>
                    <div className="text-xs text-muted mb-2">TIME COMPLEXITY</div>
                    <div className="flex justify-between" style={{ gap: 12, flexWrap: "wrap" }}>
                      <span>Candidate: <strong>{ds.candidateTimeComplexity || "-"}</strong></span>
                      <span>Expected: <strong>{ds.expectedTimeComplexity || "-"}</strong></span>
                    </div>
                  </div>
                  <div className="card-glass" style={{ padding: 14 }}>
                    <div className="text-xs text-muted mb-2">SPACE COMPLEXITY</div>
                    <div className="flex justify-between" style={{ gap: 12, flexWrap: "wrap" }}>
                      <span>Candidate: <strong>{ds.candidateSpaceComplexity || "-"}</strong></span>
                      <span>Expected: <strong>{ds.expectedSpaceComplexity || "-"}</strong></span>
                    </div>
                  </div>
                </div>
                {ds.complexityFeedback && (
                  <p className="text-sm text-secondary mt-4" style={{ lineHeight: 1.65 }}>
                    {ds.complexityFeedback}
                  </p>
                )}
              </div>

              <div className="card">
                <div className="flex items-center gap-2" style={{ flexWrap: "wrap", marginBottom: 18 }}>
                  <h3 style={{ margin: 0 }}>Solution Approach</h3>
                  <span className="badge badge-indigo" style={{ fontSize: "0.72rem" }}>
                    {dsaScoreValue("solutionApproach")} / 25 marks
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }}>
                  <div className="card-glass" style={{ padding: 14 }}>
                    <div className="text-xs text-muted mb-2">CANDIDATE ALGORITHMS</div>
                    <p className="text-sm" style={{ lineHeight: 1.55 }}>{ds.candidateAlgorithms || "Not provided"}</p>
                  </div>
                  <div className="card-glass" style={{ padding: 14 }}>
                    <div className="text-xs text-muted mb-2">CANDIDATE DATA STRUCTURES</div>
                    <p className="text-sm" style={{ lineHeight: 1.55 }}>{ds.candidateDataStructures || "Not provided"}</p>
                  </div>
                </div>

                {Array.isArray(ds.expectedApproach) && ds.expectedApproach.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div className="text-xs font-mono mb-2" style={{ color: "var(--indigo)", fontWeight: 600 }}>EXPECTED APPROACH TERMS</div>
                    <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                      {ds.expectedApproach.map((term: string, idx: number) => (
                        <span key={`${term}-${idx}`} className="approach-tag badge-indigo">{term}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <div className="text-xs text-muted mb-2">Matched terms</div>
                    <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                      {matchedTerms.length > 0
                        ? matchedTerms.map((term, idx) => <span key={`${term}-${idx}`} className="approach-tag approach-match">{term}</span>)
                        : <span className="text-xs text-muted">None</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted mb-2">Missing terms</div>
                    <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                      {missingTerms.length > 0
                        ? missingTerms.map((term, idx) => <span key={`${term}-${idx}`} className="approach-tag approach-missing">{term}</span>)
                        : <span className="text-xs text-muted">None</span>}
                    </div>
                  </div>
                </div>

                {(ds.algorithmFeedback || ds.dataStructureFeedback) && (
                  <div className="card-glass" style={{ padding: 14, marginTop: 16 }}>
                    {ds.algorithmFeedback && <p className="text-sm text-secondary" style={{ lineHeight: 1.6 }}>{ds.algorithmFeedback}</p>}
                    {ds.dataStructureFeedback && <p className="text-sm text-secondary mt-2" style={{ lineHeight: 1.6 }}>{ds.dataStructureFeedback}</p>}
                  </div>
                )}
              </div>

              {ds.codeImplementationFeedback && (
                <div className="card">
                  <div className="flex items-center gap-2" style={{ flexWrap: "wrap", marginBottom: 12 }}>
                    <h3 style={{ margin: 0 }}>Code Implementation Feedback</h3>
                    <span className="badge badge-indigo" style={{ fontSize: "0.72rem" }}>
                      {dsaScoreValue("codeImplementation")} / 20 marks
                    </span>
                  </div>
                  <p className="text-sm text-secondary" style={{ lineHeight: 1.7 }}>
                    {ds.codeImplementationFeedback}
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isSENewFormat) {
    const totalQuestions = questionScores.length;
    const satisfactoryCount = questionScores.filter((q) => q.score >= 70).length;
    const interviewerName = getTechnicalInterviewerName(attempt.role);
    const subjectMap = new Map<string, { total: number; count: number }>();

    questionScores.forEach((q) => {
      const subject = q.subject || "General";
      const current = subjectMap.get(subject) || { total: 0, count: 0 };
      subjectMap.set(subject, { total: current.total + q.score, count: current.count + 1 });
    });

    const subjectPerformance = Array.from(subjectMap.entries()).map(([name, stats]) => ({
      name,
      score: stats.count > 0 ? stats.total / stats.count : 0,
    }));
    const weakTopics = weakAnalysis?.weakTopics?.length
      ? weakAnalysis.weakTopics
      : questionScores
          .filter((q) => q.score < 50)
          .map((q) => ({ topic: q.topic || q.questionText, subject: q.subject || "General", score: q.score }));
    const reportSummary =
      attempt.summary ||
      `The candidate answered ${totalQuestions} technical questions with an overall score of ${score.toFixed(1)}%. ${satisfactoryCount} out of ${totalQuestions} questions were answered satisfactorily.`;

    return (
      <div className="technical-report-page">
        <Navbar userName={attempt.candidate_name} />

        <main className="technical-report-shell">
          <div className="technical-report-actions no-print">
            <a href="/candidate/dashboard" className="btn btn-secondary btn-sm">Back to Dashboard</a>
            <button onClick={() => window.print()} className="btn btn-primary btn-sm">Download PDF Report</button>
          </div>

          <header className="technical-report-header">
            <span className="technical-report-pill">
              {attempt.is_mock ? "Mock Practice Session" : "Official Interview Session"}
            </span>
            <h1>Evaluation: {attempt.candidate_name}</h1>
            <div className="technical-report-meta">
              <span>{roleData?.label || "Technical Round"}</span>
              <span aria-hidden="true">•</span>
              <span>Completed on {formatReportDateTime(attempt.completed_at)}</span>
            </div>
          </header>

          <section className="technical-report-top-grid">
            <article className="technical-report-card technical-score-card">
              <div className="technical-card-title">
                <span className="technical-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3 4 7v6c0 5 3.4 7.7 8 8 4.6-.3 8-3 8-8V7l-8-4Z" />
                  </svg>
                </span>
                <h2>Overall Score</h2>
              </div>
              <div className="technical-score-ring">
                <svg width="154" height="154">
                  <circle className="technical-score-ring-bg" cx="77" cy="77" r="62" />
                  <circle
                    className="technical-score-ring-fill"
                    cx="77"
                    cy="77"
                    r="62"
                    strokeDasharray={2 * Math.PI * 62}
                    strokeDashoffset={(2 * Math.PI * 62) - (score / 100) * (2 * Math.PI * 62)}
                  />
                </svg>
                <div className="technical-score-ring-value">
                  <strong>{score.toFixed(1)}</strong>
                  <span>OUT OF 100</span>
                </div>
              </div>
              <p>Average of {totalQuestions} technical question scores using keyword-based evaluation.</p>
            </article>

            <article className="technical-report-card technical-summary-card">
              <div className="technical-card-title">
                <span className="technical-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5V5a2 2 0 0 1 2-2h11" />
                    <path d="M8 7h8" />
                    <path d="M8 11h8" />
                    <path d="M8 15h5" />
                  </svg>
                </span>
                <h2>Interview Summary</h2>
              </div>
              <p>{reportSummary}</p>
              <div className="technical-summary-metrics">
                <div>
                  <strong>{totalQuestions}</strong>
                  <span>Questions Asked</span>
                </div>
                <div>
                  <strong>{satisfactoryCount}</strong>
                  <span>Questions Answered Satisfactorily</span>
                </div>
                <div>
                  <strong>{score.toFixed(1)}%</strong>
                  <span>Overall Score</span>
                </div>
              </div>
            </article>

            <article className="technical-report-card technical-proctor-card">
              <div className="technical-card-title">
                <span className="technical-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3 4 7v6c0 5 3.4 7.7 8 8 4.6-.3 8-3 8-8V7l-8-4Z" />
                    <path d="m9 12 2 2 4-5" />
                  </svg>
                </span>
                <h2>Proctoring &amp; Integrity</h2>
              </div>
              <div className="technical-proctor-row">
                <div>
                  <strong>Camera Access Status</strong>
                  <span>WEBCAM REQUIREMENT</span>
                </div>
                <span className={`technical-status-pill ${cameraBadgeClass}`}>{proctoringCameraStatus}</span>
              </div>
              <div className="technical-proctor-row">
                <div>
                  <strong>Webcam Violations</strong>
                  <span>FACE / FEED / FOREGROUND EVENTS</span>
                </div>
                <span className={`technical-count-pill ${violationBadgeClass}`}>{proctoringViolationCount}</span>
              </div>
              <p>{proctoringClean ? "Clean round: no webcam violations detected during the interview." : "Proctoring warnings were recorded during the interview."}</p>
            </article>
          </section>

          <section className="technical-report-mid-grid">
            <article className="technical-report-card technical-questions-card">
              <div className="technical-questions-header">
                <div>
                  <div className="technical-card-title">
                    <span className="technical-card-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 11h6" />
                        <path d="M9 15h4" />
                        <path d="M4 4h16v16H4z" />
                      </svg>
                    </span>
                    <h2>Question-wise Technical Scores</h2>
                  </div>
                  <p>Score per question = (keywords matched in answer / total keywords) x 100. Score &lt; 30% is counted as a wrong answer; 0% means irrelevant.</p>
                </div>
                <div className="technical-score-legend">
                  <span><i className="good" />Good (&gt; 70%)</span>
                  <span><i className="average" />Average (30% - 70%)</span>
                  <span><i className="poor" />Poor (&lt; 30%)</span>
                </div>
              </div>

              <div className="technical-question-grid">
                {questionScores.map((q, idx) => {
                  const missing = q.missingKeywords || [];
                  return (
                    <div
                      key={q.questionId || idx}
                      className={`technical-question-box ${scoreTone(q.score)} ${missing.length > 0 ? "has-missing" : ""}`}
                      tabIndex={0}
                    >
                      <div className="technical-question-box-top">
                        <span>{String(idx + 1).padStart(2, "0")}</span>
                        <strong>{q.score.toFixed(1)}%</strong>
                      </div>
                      <h3>{q.topic || q.questionText}</h3>
                      <p>{q.subject || "General"}</p>
                      {missing.length > 0 && (
                        <div className="technical-missing-popover">
                          <strong>Missing keywords</strong>
                          <div>
                            {missing.map((keyword, keywordIndex) => (
                              <span key={`${keyword}-${keywordIndex}`}>{keyword}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>

            {weakAnalysis && (
              <article className="technical-report-card technical-weak-card">
                <div className="technical-card-title">
                  <span className="technical-card-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3v18h18" />
                      <path d="M7 14h3v4H7z" />
                      <path d="M12 9h3v9h-3z" />
                      <path d="M17 5h3v13h-3z" />
                    </svg>
                  </span>
                  <h2>Weak Subject Analysis</h2>
                </div>
                <h3>Subject Weakness Distribution (Pie)</h3>
                <DonutChart subjects={weakAnalysis.subjects} />
              </article>
            )}
          </section>

          <section className="technical-report-bottom-grid">
            <article className="technical-report-card technical-bars-card">
              <div className="technical-card-title">
                <span className="technical-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19V5" />
                    <path d="M4 19h17" />
                    <path d="M8 15v-4" />
                    <path d="M13 15V8" />
                    <path d="M18 15v-2" />
                  </svg>
                </span>
                <h2>Performance by Subject</h2>
              </div>
              <div className="technical-subject-bars">
                {subjectPerformance.map((subject) => (
                  <div key={subject.name} className="technical-subject-bar">
                    <strong>{Math.round(subject.score)}%</strong>
                    <div>
                      <span style={{ height: `${Math.max(4, subject.score)}%`, background: scoreColor(subject.score) }} />
                    </div>
                    <p>{subject.name}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="technical-report-card technical-topic-card">
              <div className="technical-card-title">
                <h2>Topic-wise Weakness (Score &lt; 50%)</h2>
              </div>
              <table className="technical-topic-table">
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>Subject</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {weakTopics.slice(0, 8).map((topic, idx) => (
                    <tr key={`${topic.topic}-${idx}`}>
                      <td>{topic.topic}</td>
                      <td><span>{topic.subject}</span></td>
                      <td><strong>{topic.score.toFixed(1)}%</strong></td>
                    </tr>
                  ))}
                  {weakTopics.length === 0 && (
                    <tr>
                      <td colSpan={3}>No weak topics under 50%.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </article>

            <article className="technical-report-card technical-feedback-card">
              <div className="technical-card-title">
                <span className="technical-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                  </svg>
                </span>
                <h2>Interviewer Feedback</h2>
              </div>
              <p>"{aiFeedback || "Focus on the highlighted weak topics and build a stronger conceptual foundation before your next interview."}"</p>
              <span>- {interviewerName}, AI Interviewer</span>
            </article>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print, .navbar, nav, button { display: none !important; }
          body { background: #ffffff !important; color: #000000 !important; }
          .page-wrapper { min-height: auto !important; z-index: auto !important; }
          .bg-mesh { display: none !important; }
          .container { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
          .card, .card-glass, .card-glow, .qna-item {
            background: #ffffff !important; color: #000000 !important;
            border: 1px solid #e2e8f0 !important; box-shadow: none !important;
            margin-bottom: 20px !important; page-break-inside: avoid !important;
          }
          .qna-answer { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; color: #000000 !important; }
          .gradient-text { background: none !important; -webkit-text-fill-color: #000000 !important; color: #000000 !important; }
          .text-muted, .text-secondary { color: #475569 !important; }
          .score-ring .ring-bg { stroke: #e2e8f0 !important; }
          .weak-table th, .weak-table td { border-color: #e2e8f0 !important; color: #000 !important; }
        }
        .score-bar-track { background: var(--bg-secondary); border-radius: 4px; height: 6px; overflow: hidden; }
        .score-bar-fill  { height: 100%; border-radius: 4px; transition: width 0.8s ease; }
        .weak-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
        .weak-table th { text-align: left; padding: 8px 12px; background: var(--bg-elevated); color: var(--text-secondary); font-weight: 600; border-bottom: 1px solid var(--border); }
        .weak-table td { padding: 8px 12px; border-bottom: 1px solid var(--border); color: var(--text-primary); }
        .weak-table tr:last-child td { border-bottom: none; }
        .q-score-item { border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px; margin-bottom: 12px; background: var(--bg-elevated); }
        .q-score-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
        .q-score-text { font-size: 0.9rem; font-weight: 500; color: var(--text-primary); flex: 1; }
        .q-score-meta { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
        .kw-row { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; font-size: 0.75rem; }
        .kw-label { font-weight: 600; color: var(--text-secondary); }
        .kw-tag { padding: 2px 8px; border-radius: 20px; font-size: 0.7rem; }
        .kw-matched { background: rgba(16,185,129,0.1); color: var(--emerald); }
        .kw-missing { background: rgba(244,63,94,0.1); color: var(--rose); }
      ` }} />

      <Navbar userName={attempt.candidate_name} />

      <div className="container" style={{ padding: "40px 24px" }}>

        {/* Actions */}
        <div className="mb-6 flex justify-between items-center no-print" style={{ flexWrap: "wrap", gap: "10px" }}>
          <a href="/candidate/dashboard" className="btn btn-secondary btn-sm">
            ⬅️ Back to Dashboard
          </a>
          <button onClick={() => window.print()} className="btn btn-primary btn-sm">
            📄 Download PDF Report
          </button>
        </div>

        {/* Header */}
        <div className="card mb-8">
          <div className="flex justify-between items-start" style={{ flexWrap: "wrap", gap: "20px" }}>
            <div>
              <span className="badge badge-indigo mb-2">
                {attempt.is_mock ? "Mock Practice session" : "Official Interview session"}
              </span>
              <h1 className="gradient-text" style={{ fontSize: "2rem" }}>
                Evaluation: {attempt.candidate_name}
              </h1>
              <p className="text-muted text-sm mt-1">
                {attempt.round === "aptitude" ? "📝" : roleData?.icon} {attempt.round === "aptitude" ? "General Aptitude" : roleData?.label} {attempt.round === "hr" ? "(HR Round)" : ""} · Completed on {formatReportDateTime(attempt.completed_at)}
              </p>
            </div>
            <div className={`verdict-badge ${verdictClass}`}>⚖️ {verdict}</div>
          </div>
        </div>

        <div className="report-grid">
          {/* ── Left Column ── */}
          <div className="flex flex-col gap-6">

            {/* Score Ring */}
            <div className="card text-center flex flex-col items-center">
              <h3 style={{ marginBottom: "20px" }}>Overall Score</h3>
              <div className="score-ring-wrapper">
                <div className="score-ring">
                  <svg width="160" height="160">
                    <circle className="ring-bg" cx="80" cy="80" r="70" />
                    <circle
                      className="ring-fill"
                      cx="80" cy="80" r="70"
                      stroke={score >= 70 ? "var(--emerald)" : score >= 40 ? "var(--amber)" : "var(--rose, #ef4444)"}
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                    />
                  </svg>
                  <div className="score-ring-value">
                    <span className="score-ring-number">{isAptitudeRound ? totalMarks : score}</span>
                    <span className="score-ring-label">{isAptitudeRound ? `Out of ${maxMarks}` : "Out of 100"}</span>
                  </div>
                </div>
              </div>
              {isAptitudeRound && (
                <p className="text-xs text-secondary mt-3" style={{ lineHeight: 1.5 }}>
                  {score}% accuracy across {maxMarks} aptitude questions
                </p>
              )}
              {isSENewFormat && (
                <p className="text-xs text-secondary mt-3" style={{ lineHeight: 1.5 }}>
                  Average of {questionScores.length} technical question scores<br />
                  using keyword-based evaluation
                </p>
              )}
              {isHRRound && (
                <p className="text-xs text-secondary mt-3" style={{ lineHeight: 1.5 }}>
                  Average of {questionScores.length} HR question scores<br />
                  based on weighted core factors
                </p>
              )}
            </div>

            {proctoringCard}

            {/* Strengths */}
            {!isHRRound && !isAptitudeRound && (
              <div className="card">
                <h3 style={{ marginBottom: "14px" }}>Key Strengths</h3>
                {strengths.length === 0
                  ? <p className="text-muted text-sm">None noted.</p>
                  : <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      {strengths.map((s: string, i: number) => <li key={i} className="text-sm" style={{ color: "var(--text-primary)" }}>{s}</li>)}
                    </ul>}
              </div>
            )}

            {/* Improvements */}
            {!isHRRound && !isAptitudeRound && (
              <div className="card">
                <h3 style={{ marginBottom: "14px" }}>Areas of Improvement</h3>
                {improvements.length === 0
                  ? <p className="text-muted text-sm">None noted.</p>
                  : <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      {improvements.map((imp: string, i: number) => <li key={i} className="text-sm" style={{ color: "var(--text-secondary)" }}>{imp}</li>)}
                    </ul>}
              </div>
            )}
          </div>

          {/* ── Right Column ── */}
          <div className="flex flex-col gap-6">

            {/* Summary */}
            <div className="card">
              <h3 style={{ marginBottom: "12px" }}>{isAptitudeRound ? "Score Summary" : "Interview Summary"}</h3>
              <p className="text-sm text-secondary" style={{ lineHeight: 1.7 }}>{attempt.summary}</p>
            </div>

            {/* ── NEW: Question-wise Technical Scores ── */}
            {isAptitudeRound && (
              <div className="card">
                <h3 style={{ marginBottom: "18px" }}>Aptitude Scorecard</h3>
                {questionScores.map((q, idx) => {
                  const isCorrect = q.marksAwarded === 1;
                  return (
                    <div key={q.questionId || idx} className="q-score-item">
                      <div className="q-score-header">
                        <div className="q-score-text">Q{idx + 1}: {q.questionText}</div>
                        <span
                          className={`badge ${isCorrect ? "badge-emerald" : "badge-rose"}`}
                          style={{ fontSize: "0.82rem", padding: "3px 12px", fontWeight: 700, whiteSpace: "nowrap" }}
                        >
                          {q.marksAwarded || 0} / {q.maxMarks || 1}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "10px" }}>
                        <span style={{ fontWeight: 600 }}>Topic:</span> {q.topic}
                      </div>
                      <div className="q-score-meta">
                        <div style={{
                          fontSize: "0.8rem",
                          color: isCorrect ? "var(--emerald)" : "var(--rose)",
                          background: isCorrect ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                          borderRadius: "6px",
                          padding: "8px 10px",
                          borderLeft: `3px solid ${isCorrect ? "var(--emerald)" : "var(--rose)"}`,
                        }}>
                          <span style={{ fontWeight: 700 }}>Candidate selected:</span>{" "}
                          {q.selectedOption ? `${q.selectedOption}. ${q.selectedAnswer}` : "Not answered"}
                        </div>
                        <div style={{
                          fontSize: "0.8rem",
                          color: "var(--text-primary)",
                          background: "var(--bg-elevated)",
                          borderRadius: "6px",
                          padding: "8px 10px",
                          border: "1px solid var(--border)",
                          borderLeft: "3px solid var(--emerald)",
                        }}>
                          <span style={{ fontWeight: 700 }}>Correct option:</span>{" "}
                          {q.correctOption}. {q.correctAnswer}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {isAptitudeRound && weakAnalysis && (
              <div className="card">
                <h3 style={{ marginBottom: "18px" }}>Weak Topic Distribution</h3>
                <div className="card-glass" style={{ padding: "16px" }}>
                  <DonutChart subjects={weakAnalysis.subjects} />
                </div>
              </div>
            )}

            {isSENewFormat && (
              <div className="card">
                <h3 style={{ marginBottom: "18px" }}>📋 Question-wise Technical Scores</h3>
                <p className="text-xs text-secondary mb-4" style={{ lineHeight: 1.5 }}>
                  Score per question = (keywords matched in answer / total keywords) × 100.
                  Score ≤ 30% is counted as a wrong answer; 0% means irrelevant.
                </p>
                {questionScores.map((q, idx) => (
                  <div key={idx} className="q-score-item">
                    <div className="q-score-header">
                      <div className="q-score-text">Q{idx + 1}: {q.questionText}</div>
                      <span
                        className={`badge ${scoreBadgeClass(q.score)}`}
                        style={{ fontSize: "0.82rem", padding: "3px 12px", fontWeight: 700, whiteSpace: "nowrap" }}
                      >
                        {q.score.toFixed(1)}%
                      </span>
                    </div>

                    {/* Score bar */}
                    <div className="score-bar-track mb-2">
                      <div
                        className="score-bar-fill"
                        style={{
                          width: `${q.score}%`,
                          background: q.score >= 70 ? "var(--emerald)" : q.score >= 40 ? "var(--amber)" : "#ef4444",
                        }}
                      />
                    </div>

                    <div className="q-score-meta">
                      <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                        <span style={{ fontWeight: 600 }}>Subject:</span> {q.subject} &nbsp;|&nbsp;
                        <span style={{ fontWeight: 600 }}>Topic:</span> {q.topic}
                      </div>

                      {/* Candidate answer preview */}
                      <div style={{
                        fontSize: "0.76rem", color: "var(--text-secondary)",
                        background: "var(--bg-elevated)", borderRadius: "6px",
                        padding: "8px 12px", border: "1px solid var(--border)", borderLeft: "3px solid var(--indigo)"
                      }}>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Answer: </span>
                        {q.candidateAnswer.length > 160
                          ? q.candidateAnswer.substring(0, 160) + "…"
                          : q.candidateAnswer}
                      </div>

                      {/* Missing keywords */}
                      <div className="kw-row">
                        <span className="kw-label">Missing keywords:</span>
                        {(q.missingKeywords || []).length === 0
                          ? <span className="kw-tag kw-matched">None ✓</span>
                          : (q.missingKeywords || []).map((kw, ki) => (
                              <span key={ki} className="kw-tag kw-missing">{kw}</span>
                            ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── NEW: HR Round Question-wise Scores ── */}
            {isHRRound && questionScores.length > 0 && (
              <div className="card">
                <h3 style={{ marginBottom: "18px" }}>🤝 HR Round Question Evaluation</h3>
                <p className="text-xs text-secondary mb-4" style={{ lineHeight: 1.5 }}>
                  Each question is graded out of 100 based on Relevance (35%), Clarity (20%), Confidence (20%), Honesty (15%), and Positive Attitude (10%).
                </p>
                {questionScores.map((q: any, idx: number) => (
                  <div key={idx} className="q-score-item">
                    <div className="q-score-header">
                      <div className="q-score-text" style={{ fontSize: "0.95rem", fontWeight: "600", color: "var(--text-primary)" }}>
                        Q{idx + 1}: {q.questionText}
                      </div>
                      <span
                        className={`badge ${scoreBadgeClass(q.score)}`}
                        style={{ fontSize: "0.82rem", padding: "3px 12px", fontWeight: 700, whiteSpace: "nowrap" }}
                      >
                        {Math.round(q.score)}%
                      </span>
                    </div>

                    {/* Score bar */}
                    <div className="score-bar-track mb-3">
                      <div
                        className="score-bar-fill"
                        style={{
                          width: `${q.score}%`,
                          background: q.score >= 70 ? "var(--emerald)" : q.score >= 50 ? "var(--amber)" : "#ef4444",
                        }}
                      />
                    </div>

                    <div className="q-score-meta" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {/* Candidate answer preview */}
                      <div style={{
                        fontSize: "0.82rem", color: "var(--text-secondary)",
                        background: "var(--bg-elevated)", borderRadius: "6px",
                        padding: "10px 14px", border: "1px solid var(--border)", borderLeft: "3px solid var(--indigo)",
                        lineHeight: 1.6
                      }}>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Answer: </span>
                        {q.candidateAnswer}
                      </div>

                      {/* Factor Scores Grid */}
                      {q.factors && (
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                          gap: "8px",
                          marginTop: "4px"
                        }}>
                          <div style={{ background: "var(--bg-elevated)", padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border)" }}>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>Relevance (35)</div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--indigo)" }}>{q.factors.relevance}%</div>
                          </div>
                          <div style={{ background: "var(--bg-elevated)", padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border)" }}>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>Clarity (20)</div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--indigo)" }}>{q.factors.clarity}%</div>
                          </div>
                          <div style={{ background: "var(--bg-elevated)", padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border)" }}>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>Confidence (20)</div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--indigo)" }}>{q.factors.confidence}%</div>
                          </div>
                          <div style={{ background: "var(--bg-elevated)", padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border)" }}>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>Honesty (15)</div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--indigo)" }}>{q.factors.honesty}%</div>
                          </div>
                          <div style={{ background: "var(--bg-elevated)", padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border)" }}>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>Positive Attitude (10)</div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--indigo)" }}>{q.factors.positiveAttitude || q.factors.positive_attitude}%</div>
                          </div>
                        </div>
                      )}

                      {/* Scope of improvement */}
                      <div style={{ fontSize: "0.8rem", marginTop: "4px" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Scope of Improvement: </span>
                        {(!q.improvement || q.improvement.toLowerCase() === "none") ? (
                          <span className="badge badge-emerald" style={{ fontSize: "0.72rem", padding: "2px 8px" }}>None ✓</span>
                        ) : (
                          <span className="badge badge-rose" style={{ fontSize: "0.72rem", padding: "2px 8px" }}>
                            ⚠️ {q.improvement}
                          </span>
                        )}
                      </div>

                      {/* AI Feedback */}
                      {q.aiFeedback && (
                        <div style={{
                          fontSize: "0.8rem", color: "var(--text-primary)", fontStyle: "italic",
                          background: "rgba(99,102,241,0.05)", borderRadius: "6px",
                          padding: "8px 12px", borderLeft: "3px solid var(--indigo)"
                        }}>
                          "{q.aiFeedback}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── NEW: Weak Subject Analysis ── */}
            {isSENewFormat && weakAnalysis && weakAnalysis.totalWeakPercent > 0 && (
              <div className="card">
                <h3 style={{ marginBottom: "18px" }}>📊 Weak Subject Analysis</h3>

                {/* Subject score bars */}
                <div style={{ marginBottom: "20px" }}>
                  {weakAnalysis.subjects.filter(s => s.questionsAsked > 0).map((s, i) => (
                    <div key={i} style={{ marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "4px" }}>
                        <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{s.name}</span>
                        <span style={{ color: "var(--text-secondary)" }}>
                          {s.weakCount}/{s.questionsAsked} weak &nbsp;
                          <span style={{ fontWeight: 700, color: s.weakPercent > 50 ? "#ef4444" : "var(--amber)" }}>
                            ({s.weakPercent.toFixed(0)}%)
                          </span>
                        </span>
                      </div>
                      <div className="score-bar-track">
                        <div
                          className="score-bar-fill"
                          style={{
                            width: `${s.weakPercent}%`,
                            background: s.weakPercent > 66 ? "#ef4444" : s.weakPercent > 33 ? "var(--amber)" : "var(--emerald)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pie chart */}
                <div className="card-glass" style={{ padding: "16px", marginBottom: "20px" }}>
                  <div className="text-xs font-mono mb-3" style={{ color: "var(--indigo)", fontWeight: 600 }}>
                    SUBJECT WEAKNESS DISTRIBUTION (PIE)
                  </div>
                  <DonutChart subjects={weakAnalysis.subjects} />
                </div>

                {/* Weak Topics Table */}
                {weakAnalysis.weakTopics.length > 0 && (
                  <>
                    <div className="text-xs font-mono mb-2" style={{ color: "var(--indigo)", fontWeight: 600 }}>
                      WEAK TOPICS (Score &lt; 50%)
                    </div>
                    <table className="weak-table">
                      <thead>
                        <tr>
                          <th>Topic</th>
                          <th>Subject</th>
                          <th>Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weakAnalysis.weakTopics.map((t, i) => (
                          <tr key={i}>
                            <td>{t.topic}</td>
                            <td>
                              <span className="badge badge-indigo" style={{ fontSize: "0.7rem", padding: "1px 8px" }}>
                                {t.subject}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${scoreBadgeClass(t.score)}`} style={{ fontSize: "0.7rem", padding: "1px 8px" }}>
                                {t.score.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            )}

            {/* ── NEW: AI Feedback ── */}
            {aiFeedback && (
              <div className="card" style={{ border: "1px solid rgba(99,102,241,0.25)" }}>
                <h3 style={{ marginBottom: "10px" }}>💬 Interviewer Feedback</h3>
                <p className="text-sm" style={{ lineHeight: 1.75, color: "var(--text-primary)", fontStyle: "italic" }}>
                  "{aiFeedback}"
                </p>
                <p className="text-xs text-muted mt-2">— Maria, AI Interviewer</p>
              </div>
            )}

            {/* ── Legacy: Q&A Summary (non-SE or old reports) ── */}
            {!isSENewFormat && qnaSummary.length > 0 && (
              <div className="card">
                <h3 style={{ marginBottom: "20px" }}>Q&amp;A Summary</h3>
                <div className="flex flex-col gap-4">
                  {qnaSummary.map((item: any, idx: number) => (
                    <div key={idx} className="qna-item">
                      <div className="qna-question">Question {idx + 1}: {item.question}</div>
                      <div className="qna-answer" style={{ padding: "8px 12px", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                        <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>Answer:</span> {item.answer}
                      </div>
                      {item.takeaway && (
                        <div className="qna-feedback">
                          <span style={{ fontWeight: 600, color: "var(--indigo-light)" }}>Summary:</span> {item.takeaway}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Legacy: Study Roadmap (non-SE) ── */}
            {!isSENewFormat && roadmap && roadmap.length > 0 && (
              <div className="card" style={{ pageBreakInside: "avoid" }}>
                <h3 style={{ marginBottom: "20px" }}>🎯 Personalized Study Roadmap</h3>
                <div className="flex flex-col" style={{ gap: "24px", position: "relative", paddingLeft: "16px" }}>
                  <div style={{ position: "absolute", left: "24px", top: "10px", bottom: "10px", width: "2px", background: "linear-gradient(to bottom, var(--indigo) 0%, var(--violet) 100%)", opacity: 0.35 }} />
                  {roadmap.map((step: any, idx: number) => (
                    <div key={idx} className="flex gap-4" style={{ position: "relative", zIndex: 1 }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--bg-elevated)", border: "2px solid var(--indigo)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, color: "var(--indigo-light)", flexShrink: 0 }}>
                        {idx + 1}
                      </div>
                      <div className="card-glass" style={{ flex: 1, padding: "16px", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                        <div className="flex justify-between items-start" style={{ flexWrap: "wrap", gap: "8px" }}>
                          <h4 style={{ color: "var(--text-primary)", fontSize: "0.95rem", margin: 0 }}>{step.step}</h4>
                          <span className="badge badge-indigo font-mono" style={{ fontSize: "0.7rem", padding: "2px 8px" }}>⏱️ {step.duration || "Study Step"}</span>
                        </div>
                        <p className="text-xs text-secondary mt-2" style={{ lineHeight: 1.6 }}>{step.description}</p>
                        {step.resources && step.resources.length > 0 && (
                          <div style={{ marginTop: "12px" }}>
                            <div className="text-xs font-mono" style={{ color: "var(--cyan)", fontWeight: 600 }}>Suggested Focus Topics:</div>
                            <div className="flex gap-2" style={{ flexWrap: "wrap", marginTop: "6px" }}>
                              {step.resources.map((res: string, rIdx: number) => (
                                <span key={rIdx} className="badge badge-cyan" style={{ fontSize: "0.68rem" }}>{res}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Legacy: Detailed Q&A Evaluation (non-SE) ── */}
            {!isSENewFormat && questionFeedback.length > 0 && (
              <div className="card">
                <h3 style={{ marginBottom: "20px" }}>Detailed Q&amp;A Evaluation</h3>
                <div>
                  {questionFeedback.map((q: any, idx: number) => (
                    <div key={idx} className="qna-item">
                      <div className="flex justify-between items-start mb-2" style={{ flexWrap: "wrap", gap: "10px" }}>
                        <div className="qna-question">Question {idx + 1}: {q.question}</div>
                        <div className="flex items-center gap-3" style={{ flexWrap: "wrap" }}>
                          {q.marksAwarded !== undefined && (
                            <span className={`badge ${q.marksAwarded === 0 ? "badge-rose" : q.marksAwarded >= (q.maxMarks ?? 10) * 0.8 ? "badge-emerald" : "badge-amber"}`} style={{ fontSize: "0.8rem", padding: "3px 12px", fontWeight: 700 }}>
                              {q.marksAwarded} / {q.maxMarks ?? 10} marks
                            </span>
                          )}
                          <div className="star-rating">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span key={star} className={`star ${star <= q.rating ? "filled" : "empty"}`}>★</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="qna-answer" style={{ padding: "8px 12px", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                        <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>Answer:</span> {q.answer}
                      </div>
                      {q.scoringReason && (
                        <div style={{ marginTop: "6px", padding: "6px 10px", background: "rgba(99,102,241,0.07)", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--indigo)", fontSize: "0.78rem", color: "var(--text-secondary)", fontStyle: "italic", lineHeight: 1.5 }}>
                          📊 {q.scoringReason}
                        </div>
                      )}
                      <div className="qna-feedback">
                        <span style={{ fontWeight: 600, color: "var(--indigo-light)" }}>AI feedback:</span> {q.comment}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
