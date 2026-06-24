"use client";
/* eslint-disable react/no-unescaped-entities */
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { DSAQuestion } from "@/lib/question-types";
import { JUDGE0_LANGUAGES } from "@/lib/judge0-languages";
import VideoProctoring, { ProctoringPolicyAction } from "@/components/VideoProctoring";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TCResult {
  input: string;
  expectedOutput: string;
  actualOutput: string | null;
  passed: boolean;
  stderr: string | null;
  time: string | null;
  memory: number | null;
  statusDesc: string;
}

type SubmitStep = "idle" | "time" | "space" | "algo" | "ds" | "confirm" | "submitting" | "done";
type DSATermsIconType = "code" | "clipboard" | "shield" | "camera" | "window" | "user" | "alert" | "check";

interface Props {
  attemptId: string;
  question: DSAQuestion;
}

const LANGUAGE_OPTIONS = Object.entries(JUDGE0_LANGUAGES);
const DEFAULT_LANG = "Python 3";
const TIMER_SECONDS = 45 * 60;

const STARTERS: Record<string, string> = {
  "Python 3":         "import sys\n\n# Read stdin and print the answer.\ndef main():\n    data = sys.stdin.read().strip().split()\n    # Write your solution here\n\nif __name__ == \"__main__\":\n    main()\n",
  "JavaScript (Node)":"const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);\n\n// Write your solution here and print the answer.\n",
  "C++ (GCC 9)":      "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    // Read stdin and print the answer.\n    return 0;\n}\n",
  "Java (OpenJDK 13)":"import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Read stdin and print the answer.\n    }\n}\n",
  "Go":               "package main\n\nimport \"fmt\"\n\nfunc main() {\n    // Read stdin and print the answer.\n    fmt.Println()\n}\n",
  "C# (Mono)":        "using System;\n\nclass Solution {\n    static void Main() {\n        // Write your solution here\n    }\n}\n",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────
function DSATermsIcon({ type }: { type: DSATermsIconType }) {
  if (type === "code") {
    return <path d="m9 18-6-6 6-6M15 6l6 6-6 6M13 4l-2 16" />;
  }
  if (type === "clipboard") {
    return <path d="M9 4h6l1 2h3v15H5V6h3l1-2Zm0 6h6M9 14h6M9 18h4" />;
  }
  if (type === "shield") {
    return <path d="M12 3 5 6v5c0 4.6 2.9 8.4 7 10 4.1-1.6 7-5.4 7-10V6l-7-3Zm-2 9 1.6 1.6L15 10" />;
  }
  if (type === "camera") {
    return <path d="M4 8h4l1.5-2h5L16 8h4v11H4V8Zm8 8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />;
  }
  if (type === "window") {
    return <path d="M4 5h16v14H4V5Zm0 4h16M8 7h.01M11 7h.01" />;
  }
  if (type === "user") {
    return <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0" />;
  }
  if (type === "alert") {
    return <path d="m12 3 10 18H2L12 3Zm0 6v5m0 3h.01" />;
  }
  return <path d="m5 12 4 4L19 6" />;
}

function DSAIconBadge({ type }: { type: DSATermsIconType }) {
  return (
    <span className="dsa-terms-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <DSATermsIcon type={type} />
      </svg>
    </span>
  );
}

function DSATermsScreen({
  agreed,
  onAgreedChange,
  onBack,
  onStart,
}: {
  agreed: boolean;
  onAgreedChange: (agreed: boolean) => void;
  onBack: () => void;
  onStart: () => void;
}) {
  const howItWorks = [
    <>You will be given <strong>1 DSA question</strong> along with the problem description and <strong>sample test cases</strong>.</>,
    <>You can run your code <strong>any number of times</strong> to test with sample test cases.</>,
    <>You can submit your solution <strong>only once</strong>.</>,
    <>Once submitted, the interview will end automatically.</>,
    <>Your code will be evaluated on <strong>hidden test cases</strong>.</>,
  ];
  const overviewItems = [
    <>This is a <strong>DSA Coding Round</strong>.</>,
    <>You will be given <strong>1</strong> coding question.</>,
    <>Sample test cases will be provided for your reference.</>,
    <>Total time for this round is <strong>45 minutes</strong>.</>,
    <>You can run the code <strong>any number of times</strong>.</>,
    <>You can submit your code <strong>only once</strong>.</>,
    <>After submission, the code will be evaluated on <strong>hidden test cases</strong>.</>,
    <>Ensure your solution is efficient and handles edge cases.</>,
  ];
  const parameters = ["Problem Solving", "Solution Approach", "Implementation", "Edge Case Handling"];
  const rules = [
    { icon: "camera" as const, title: "Webcam Requirement", body: "Webcam must be ON throughout the interview. Your face should be clearly visible." },
    { icon: "window" as const, title: "No Tab Switching", body: "Do not switch tabs or windows during the interview. Doing so may lead to disqualification." },
    { icon: "user" as const, title: "No Additional Help", body: "Do not seek help from any other person or external resources. This is a fair evaluation of your abilities." },
    { icon: "alert" as const, title: "Clean Environment", body: "Ensure a quiet and distraction-free environment for the best coding experience." },
  ];

  return (
    <main className="dsa-terms-shell fade-in">
      <section className="dsa-terms-page">
        <header className="dsa-terms-header">
          <span className="dsa-terms-pill">DSA Round</span>
          <h1>DSA Round: Terms &amp; Conditions</h1>
          <p>Please read all the instructions and guidelines carefully before you begin.</p>
        </header>

        <article className="dsa-terms-card dsa-how-card">
          <div className="dsa-card-heading">
            <DSAIconBadge type="code" />
            <h2>How the DSA Round Works</h2>
          </div>
          <ol className="dsa-how-list">
            {howItWorks.map((item, index) => (
              <li key={index}>
                <span>{index + 1}</span>
                <p>{item}</p>
              </li>
            ))}
          </ol>
        </article>

        <div className="dsa-terms-grid">
          <article className="dsa-terms-card">
            <div className="dsa-card-heading compact">
              <DSAIconBadge type="clipboard" />
              <h2>Test Overview</h2>
            </div>
            <ul className="dsa-overview-list">
              {overviewItems.map((item, index) => (
                <li key={index}>
                  <span className="dsa-mini-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <DSATermsIcon type="check" />
                    </svg>
                  </span>
                  <p>{item}</p>
                </li>
              ))}
            </ul>
            <p className="dsa-param-label">Evaluation will be based on the following parameters:</p>
            <div className="dsa-param-tags">
              {parameters.map((parameter) => <span key={parameter}>{parameter}</span>)}
            </div>
          </article>

          <article className="dsa-terms-card">
            <div className="dsa-card-heading compact">
              <DSAIconBadge type="shield" />
              <h2>Proctoring &amp; Integrity Rules</h2>
            </div>
            <div className="dsa-rules-list">
              {rules.map((rule) => (
                <div key={rule.title} className="dsa-rule-row">
                  <DSAIconBadge type={rule.icon} />
                  <div>
                    <h3>{rule.title}</h3>
                    <p>{rule.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="dsa-rule-warning">
              Any violation of the above rules may result in disqualification from the interview process.
            </div>
          </article>
        </div>

        <label className="dsa-agree-card">
          <input type="checkbox" checked={agreed} onChange={(event) => onAgreedChange(event.target.checked)} />
          <span>
            I have read and understood all the terms and conditions.
            <small>I agree to follow the rules and guidelines.</small>
          </span>
        </label>

        <div className="dsa-terms-actions">
          <button type="button" className="dsa-back-button" onClick={onBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            Back
          </button>
          <button type="button" className="dsa-start-button" onClick={onStart} disabled={!agreed}>
            I'm Ready to Start the DSA Round
            <svg viewBox="0 0 24 18" fill="none" aria-hidden="true">
              <path d="M1 9h20M14 2l7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <p className="dsa-terms-footnote">
          <DSAIconBadge type="shield" />
          By proceeding, you agree to abide by all the terms and conditions mentioned above.
        </p>
      </section>
    </main>
  );
}

export default function DSAWorkspaceClient({ attemptId, question }: Props) {
  const router = useRouter();
  const [termsAccepted, setTermsAccepted] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(`dsaTermsAccepted:${attemptId}`) === "true";
  });
  const [termsAgreed, setTermsAgreed] = useState(false);

  // Editor state
  const [langName, setLangName]   = useState(DEFAULT_LANG);
  const [langId, setLangId]       = useState(JUDGE0_LANGUAGES[DEFAULT_LANG]);
  const [code, setCode]           = useState(STARTERS[DEFAULT_LANG] ?? "");
  const [activeTab, setActiveTab] = useState<"problem" | "results">("problem");

  // Run state
  const [running, setRunning]       = useState(false);
  const [runResults, setRunResults] = useState<TCResult[] | null>(null);
  const [runError, setRunError]     = useState("");

  // Submit modal state
  const [submitStep, setSubmitStep]       = useState<SubmitStep>("idle");
  const [timeComplexity, setTimeComplexity]   = useState("");
  const [spaceComplexity, setSpaceComplexity] = useState("");
  const [algorithmsUsed, setAlgorithmsUsed]   = useState("");
  const [dataStructsUsed, setDataStructsUsed] = useState("");
  const [submitError, setSubmitError]     = useState("");
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaveError, setLeaveError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const submitLockRef = useRef(false);

  // Webcam proctoring
  const [proctoringReady, setProctoringReady] = useState(false);
  const [proctoringViolations, setProctoringViolations] = useState(0);
  const proctoringPolicyTriggeredRef = useRef(false);

  // Timer
  const [timeLeft, setTimeLeft]   = useState(TIMER_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleAutoSubmit = useCallback(async () => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;

    try {
      await fetch("/api/dsa/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId, code,
          languageId:         langId,
          languageName:       langName,
          timeComplexity:     timeComplexity  || "Not provided",
          spaceComplexity:    spaceComplexity || "Not provided",
          algorithmsUsed:     algorithmsUsed  || "Not provided",
          dataStructuresUsed: dataStructsUsed || "Not provided",
        }),
      });
    } catch { /* best-effort */ }
    router.push(`/report/${attemptId}`);
  }, [algorithmsUsed, attemptId, code, dataStructsUsed, langId, langName, router, spaceComplexity, timeComplexity]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!proctoringReady) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [handleAutoSubmit, proctoringReady]);

  // ── Proctoring ─────────────────────────────────────────────────────────────
  // ── Language change ────────────────────────────────────────────────────────
  function handleLangChange(name: string) {
    setLangName(name);
    setLangId(JUDGE0_LANGUAGES[name]);
    setCode(STARTERS[name] ?? "// Write your solution here\n");
    setRunResults(null);
  }

  // ── Tab key in textarea ────────────────────────────────────────────────────
  function handleEditorKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end   = el.selectionEnd;
      const next  = code.substring(0, start) + "    " + code.substring(end);
      setCode(next);
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 4; });
    }
  }

  // ── RUN ────────────────────────────────────────────────────────────────────
  async function handleRun() {
    if (running) return;

    setRunning(true);
    setRunError("");
    setRunResults(null);
    setActiveTab("results");

    try {
      const res = await fetch("/api/dsa/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, code, languageId: langId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRunError(data.error ?? "Run failed");
      } else {
        setRunResults(data.results ?? []);
      }
    } catch {
      setRunError("Network error — could not reach the execution server.");
    } finally {
      setRunning(false);
    }
  }

  // ── SUBMIT flow ────────────────────────────────────────────────────────────
  function openSubmitModal() {
    if (submitLockRef.current) return;

    setSubmitError("");
    setSubmitStep("time");
  }

  async function handleFinalSubmit() {
    if (submitLockRef.current) return;

    submitLockRef.current = true;
    setSubmitStep("submitting");
    setSubmitError("");

    try {
      if (timerRef.current) clearInterval(timerRef.current);
      const res = await fetch("/api/dsa/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          code,
          languageId:         langId,
          languageName:       langName,
          timeComplexity,
          spaceComplexity,
          algorithmsUsed,
          dataStructuresUsed: dataStructsUsed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Submission failed. Please try again.");
        submitLockRef.current = false;
        setSubmitStep("confirm");
        return;
      }
      setSubmitStep("done");
      setTimeout(() => router.push(`/report/${attemptId}`), 1800);
    } catch {
      setSubmitError("Connection lost. Please try again.");
      submitLockRef.current = false;
      setSubmitStep("confirm");
    }
  }

  async function handleLeaveRound() {
    if (leaving || submitted) return;

    setLeaving(true);
    setLeaveError("");
    submitLockRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const res = await fetch("/api/interview/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setLeaveError(data.error ?? "Failed to leave the DSA round.");
        submitLockRef.current = false;
        setLeaving(false);
        return;
      }

      router.push("/candidate/dashboard");
    } catch {
      setLeaveError("Connection lost. Please try again.");
      submitLockRef.current = false;
      setLeaving(false);
    }
  }

  const handleProctorPolicyAction = useCallback((action: ProctoringPolicyAction) => {
    if (proctoringPolicyTriggeredRef.current || submitLockRef.current) return;
    proctoringPolicyTriggeredRef.current = true;
    submitLockRef.current = true;
    setLeaving(true);
    setSubmitError(
      `Proctoring policy limit exceeded after ${action.violationCount} total violations. This round will end without a report or score.`
    );
    if (timerRef.current) clearInterval(timerRef.current);
    void fetch("/api/interview/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId }),
    }).finally(() => {
      router.push("/candidate/dashboard");
    });
  }, [attemptId, router]);

  const isTimerLow    = timeLeft <= 300;
  const isTimerCritical = timeLeft <= 60;
  const submitted     = submitStep === "done" || submitStep === "submitting";

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!termsAccepted) {
    return (
      <DSATermsScreen
        agreed={termsAgreed}
        onAgreedChange={setTermsAgreed}
        onBack={() => router.push("/candidate/dashboard")}
        onStart={() => {
          if (!termsAgreed) return;
          window.sessionStorage.setItem(`dsaTermsAccepted:${attemptId}`, "true");
          setTermsAccepted(true);
        }}
      />
    );
  }

  return (
    <VideoProctoring
      attemptId={attemptId}
      active={!submitted && !leaving}
      previewPlacement="top-right"
      onReadyChange={setProctoringReady}
      onViolationCountChange={setProctoringViolations}
      onPolicyAction={handleProctorPolicyAction}
    >
      {() => (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", fontFamily: "inherit", overflow: "hidden" }}>

      {/* ── Proctor Overlay ─────────────────────────────────────────────── */}
      {/* ── Submit Modal Overlay ─────────────────────────────────────────── */}
      {submitStep !== "idle" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, backdropFilter: "blur(8px)" }}>
          <div className="card" style={{ width: "100%", maxWidth: 520, border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
            {submitStep === "done" ? (
              <div className="text-center" style={{ padding: "32px 0" }}>
                <span style={{ fontSize: "3rem" }}>🎉</span>
                <h3 className="gradient-text mt-4">Submission Received!</h3>
                <p className="text-sm text-secondary mt-2">Generating your evaluation report…</p>
                <span className="spinner mt-4" style={{ width: 28, height: 28, borderColor: "var(--indigo)" }} />
              </div>
            ) : submitStep === "submitting" ? (
              <div className="text-center" style={{ padding: "32px 0" }}>
                <span className="spinner" style={{ width: 36, height: 36, borderColor: "var(--indigo)" }} />
                <h3 className="mt-4">Evaluating Your Solution…</h3>
                <p className="text-sm text-secondary mt-2">Running test cases and scoring. Please wait.</p>
              </div>
            ) : (
              <>
                {/* Progress indicator */}
                <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
                  {["time", "space", "algo", "ds", "confirm"].map((s, i) => (
                    <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: ["time","space","algo","ds","confirm"].indexOf(submitStep) >= i ? "var(--indigo)" : "var(--bg-secondary)" }} />
                  ))}
                </div>

                {submitStep === "time" && (
                  <>
                    <h3 style={{ marginBottom: 8 }}>⏱ Time Complexity</h3>
                    <p className="text-sm text-secondary mb-4">What is the time complexity of your solution?</p>
                    <input
                      id="dsa-time-complexity"
                      className="form-input"
                      placeholder="e.g. O(n), O(n log n), O(n²)"
                      value={timeComplexity}
                      onChange={e => setTimeComplexity(e.target.value)}
                      autoFocus
                      style={{ marginBottom: 16, width: "100%" }}
                    />
                    <div className="flex gap-3 justify-end">
                      <button className="btn btn-ghost" onClick={() => setSubmitStep("idle")} disabled={submitted}>Cancel</button>
                      <button className="btn btn-primary" onClick={() => setSubmitStep("space")} disabled={!timeComplexity.trim()}>Next →</button>
                    </div>
                  </>
                )}

                {submitStep === "space" && (
                  <>
                    <h3 style={{ marginBottom: 8 }}>💾 Space Complexity</h3>
                    <p className="text-sm text-secondary mb-4">What is the space complexity of your solution?</p>
                    <input
                      id="dsa-space-complexity"
                      className="form-input"
                      placeholder="e.g. O(1), O(n), O(n²)"
                      value={spaceComplexity}
                      onChange={e => setSpaceComplexity(e.target.value)}
                      autoFocus
                      style={{ marginBottom: 16, width: "100%" }}
                    />
                    <div className="flex gap-3 justify-end">
                      <button className="btn btn-secondary" onClick={() => setSubmitStep("time")}>← Back</button>
                      <button className="btn btn-primary" onClick={() => setSubmitStep("algo")} disabled={!spaceComplexity.trim()}>Next →</button>
                    </div>
                  </>
                )}

                {submitStep === "algo" && (
                  <>
                    <h3 style={{ marginBottom: 8 }}>🧠 Algorithm(s) Used</h3>
                    <p className="text-sm text-secondary mb-2">What algorithm(s) does your solution use?</p>
                    <p className="text-xs text-muted mb-4" style={{ fontStyle: "italic" }}>Write in your own words — e.g. "Dynamic Programming", "Binary Search", "DFS", "Sliding Window"</p>
                    <textarea
                      id="dsa-algorithms"
                      className="form-input"
                      rows={3}
                      placeholder="Describe the algorithm(s) you used…"
                      value={algorithmsUsed}
                      onChange={e => setAlgorithmsUsed(e.target.value)}
                      autoFocus
                      style={{ marginBottom: 16, width: "100%", resize: "vertical" }}
                    />
                    <div className="flex gap-3 justify-end">
                      <button className="btn btn-secondary" onClick={() => setSubmitStep("space")}>← Back</button>
                      <button className="btn btn-primary" onClick={() => setSubmitStep("ds")} disabled={!algorithmsUsed.trim()}>Next →</button>
                    </div>
                  </>
                )}

                {submitStep === "ds" && (
                  <>
                    <h3 style={{ marginBottom: 8 }}>🗂 Data Structure(s) Used</h3>
                    <p className="text-sm text-secondary mb-2">What data structure(s) does your solution use?</p>
                    <p className="text-xs text-muted mb-4" style={{ fontStyle: "italic" }}>e.g. "HashMap", "Stack", "Deque", "Array", "Heap"</p>
                    <textarea
                      id="dsa-data-structures"
                      className="form-input"
                      rows={3}
                      placeholder="Describe the data structure(s) you used…"
                      value={dataStructsUsed}
                      onChange={e => setDataStructsUsed(e.target.value)}
                      autoFocus
                      style={{ marginBottom: 16, width: "100%", resize: "vertical" }}
                    />
                    <div className="flex gap-3 justify-end">
                      <button className="btn btn-secondary" onClick={() => setSubmitStep("algo")}>← Back</button>
                      <button className="btn btn-primary" onClick={() => setSubmitStep("confirm")} disabled={!dataStructsUsed.trim()}>Next →</button>
                    </div>
                  </>
                )}

                {submitStep === "confirm" && (
                  <>
                    <h3 style={{ marginBottom: 16 }}>✅ Confirm Submission</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                      {[
                        ["Time Complexity",    timeComplexity],
                        ["Space Complexity",   spaceComplexity],
                        ["Algorithm(s) Used",  algorithmsUsed],
                        ["Data Structure(s)",  dataStructsUsed],
                      ].map(([label, val]) => (
                        <div key={label} style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", padding: "10px 14px", border: "1px solid var(--border)" }}>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: 3 }}>{label}</div>
                          <div style={{ fontSize: "0.88rem", color: "var(--text-primary)" }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    <div className="badge badge-rose mb-4" style={{ width: "100%", textAlign: "center", padding: "8px 0" }}>
                      ⚠️ You can only submit ONCE. This action is final.
                    </div>
                    {submitError && <div className="alert alert-error mb-4">{submitError}</div>}
                    <div className="flex gap-3 justify-end">
                      <button className="btn btn-secondary" onClick={() => setSubmitStep("ds")}>← Back</button>
                      <button className="btn btn-success" onClick={handleFinalSubmit}>
                        🚀 Final Submit
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      {showLeaveConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", zIndex: 9997, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, backdropFilter: "blur(8px)" }}>
          <div className="card" style={{ width: "100%", maxWidth: 520, border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
            <h3 style={{ marginBottom: 10, color: "var(--rose)" }}>Leave DSA Round?</h3>
            <p className="text-sm text-secondary" style={{ lineHeight: 1.7, marginBottom: 16 }}>
              If you leave now without submitting, this DSA round will be marked as abandoned.
              No score or report will be generated for this attempt.
            </p>
            <div style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.18)", borderRadius: "var(--radius-md)", padding: "10px 14px", fontSize: "0.8rem", color: "var(--text-primary)", marginBottom: 16 }}>
              You will return to the candidate dashboard and this round cannot be resumed.
            </div>
            {leaveError && <div className="alert alert-error mb-4">{leaveError}</div>}
            <div className="flex gap-3 justify-end">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  if (leaving) return;
                  setLeaveError("");
                  setShowLeaveConfirm(false);
                }}
                disabled={leaving}
              >
                Stay
              </button>
              <button className="btn btn-danger" onClick={handleLeaveRound} disabled={leaving}>
                {leaving ? "Leaving..." : "Leave Round"}
              </button>
            </div>
          </div>
        </div>
      )}

      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 54, background: "var(--bg-card)", borderBottom: "1px solid var(--border)", flexShrink: 0, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="gradient-text" style={{ fontSize: "1.1rem", fontWeight: 700 }}>
            💻 DSA Round
          </span>
        </div>

        {/* Language selector */}
        <select
          id="dsa-language-selector"
          value={langName}
          onChange={e => handleLangChange(e.target.value)}
          disabled={submitted}
          style={{ background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "4px 10px", fontSize: "0.82rem", cursor: "pointer" }}
        >
          {LANGUAGE_OPTIONS.map(([name]) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => {
              setLeaveError("");
              setShowLeaveConfirm(true);
            }}
            disabled={submitted || leaving}
            style={{ padding: "5px 12px" }}
          >
            {leaving ? "Leaving..." : "Leave Round"}
          </button>

          {/* Timer */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: isTimerCritical ? "rgba(244,63,94,0.15)" : isTimerLow ? "rgba(245,158,11,0.12)" : "var(--bg-secondary)", padding: "4px 12px", borderRadius: 20, border: `1px solid ${isTimerCritical ? "var(--rose)" : isTimerLow ? "var(--amber)" : "var(--border)"}` }}>
            <span style={{ fontSize: "0.75rem" }}>⏱</span>
            <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "1rem", color: isTimerCritical ? "var(--rose)" : isTimerLow ? "var(--amber)" : "var(--text-primary)" }}>
              {formatTime(timeLeft)}
            </span>
          </div>

          <div className="badge badge-rose" style={{ fontSize: "0.7rem", padding: "3px 10px" }}>
            Proctoring violations: {proctoringViolations}
          </div>
        </div>
      </header>

      {/* ── Main Body ────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── LEFT PANEL: Problem ──────────────────────────────────────────── */}
        <div style={{ width: "42%", minWidth: 320, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)", overflow: "hidden" }}>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            {(["problem", "results"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{ flex: 1, padding: "10px 0", background: "none", border: "none", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: activeTab === tab ? "var(--indigo)" : "var(--text-secondary)", borderBottom: activeTab === tab ? "2px solid var(--indigo)" : "2px solid transparent", transition: "color 0.2s" }}
              >
                {tab === "problem" ? "📋 Problem" : `▶ Results${runResults ? ` (${runResults.filter(r => r.passed).length}/${runResults.length})` : ""}`}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            {activeTab === "problem" && (
              <div>
                <div style={{ fontSize: "0.85rem", lineHeight: 1.75, color: "var(--text-secondary)", whiteSpace: "pre-wrap", marginBottom: 20 }}>
                  {question.question}
                </div>

                {/* Examples */}
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--indigo)", marginBottom: 10, letterSpacing: "0.05em" }}>EXAMPLES</h4>
                  {question.sampleTestCases.map((tc, i) => (
                    <div key={i} style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", padding: "12px 14px", marginBottom: 10, border: "1px solid var(--border)", fontSize: "0.8rem" }}>
                      <div style={{ fontFamily: "monospace", marginBottom: 4 }}>
                        <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Input: </span>
                        <span style={{ color: "var(--text-primary)" }}>{tc.input}</span>
                      </div>
                      <div style={{ fontFamily: "monospace", marginBottom: tc.explanation ? 6 : 0 }}>
                        <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Output: </span>
                        <span style={{ color: "var(--emerald)" }}>{tc.expectedOutput}</span>
                      </div>
                      {tc.explanation && (
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.76rem", fontStyle: "italic", borderTop: "1px solid var(--border)", paddingTop: 6, marginTop: 6, lineHeight: 1.6 }}>
                          {tc.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Constraints */}
                <div>
                  <h4 style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--amber)", marginBottom: 10, letterSpacing: "0.05em" }}>CONSTRAINTS</h4>
                  <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                    {question.constraints.map((c, i) => (
                      <li key={i} style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--text-secondary)" }}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "results" && (
              <div>
                {running && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0" }}>
                    <span className="spinner" style={{ width: 20, height: 20, borderColor: "var(--indigo)" }} />
                    <span className="text-sm text-secondary">Running sample test cases…</span>
                  </div>
                )}
                {runError && <div className="alert alert-error mb-4">{runError}</div>}
                {!running && runResults === null && (
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", padding: "30px 0", textAlign: "center" }}>
                    <span style={{ fontSize: "2rem" }}>▶</span>
                    <p className="mt-3">Click <strong>Run</strong> to execute your code against the sample test cases.</p>
                  </div>
                )}
                {!running && runResults && runResults.map((r, i) => (
                  <div key={i} style={{ marginBottom: 14, border: `1px solid ${r.passed ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)"}`, borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: r.passed ? "rgba(16,185,129,0.07)" : "rgba(244,63,94,0.07)" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.82rem", color: r.passed ? "var(--emerald)" : "var(--rose)" }}>
                        {r.passed ? "✓ Passed" : "✗ Failed"} — Test Case {i + 1}
                      </span>
                      {r.time && <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>{r.time}s</span>}
                    </div>
                    <div style={{ padding: "10px 12px", fontSize: "0.78rem", fontFamily: "monospace", display: "flex", flexDirection: "column", gap: 6, background: "var(--bg-elevated)" }}>
                      <div><span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Input: </span><span>{r.input}</span></div>
                      <div><span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Expected: </span><span style={{ color: "var(--emerald)" }}>{r.expectedOutput}</span></div>
                      <div><span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Got: </span>
                        <span style={{ color: r.passed ? "var(--emerald)" : "var(--rose)" }}>
                          {r.actualOutput !== null ? r.actualOutput : <em style={{ color: "var(--text-muted)" }}>No output</em>}
                        </span>
                      </div>
                      {r.stderr && (
                        <div style={{ background: "rgba(244,63,94,0.08)", borderRadius: 4, padding: "6px 8px", color: "var(--rose)", whiteSpace: "pre-wrap" }}>
                          {r.stderr.slice(0, 300)}
                        </div>
                      )}
                      {!r.passed && r.statusDesc !== "Accepted" && (
                        <div style={{ fontSize: "0.72rem", color: "var(--amber)" }}>{r.statusDesc}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: Editor ──────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Line numbers + editor wrapper */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
            <textarea
              id="dsa-code-editor"
              value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={handleEditorKeyDown}
              spellCheck={false}
              disabled={submitted}
              style={{
                flex: 1,
                background: "#0d1117",
                color: "#e6edf3",
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
                fontSize: "0.88rem",
                lineHeight: 1.65,
                padding: "20px 20px 20px 20px",
                border: "none",
                outline: "none",
                resize: "none",
                whiteSpace: "pre",
                overflowWrap: "normal",
                overflowX: "auto",
                tabSize: 4,
              }}
              placeholder="// Write your solution here…"
            />
          </div>

          {/* Bottom toolbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", background: "var(--bg-card)", borderTop: "1px solid var(--border)", flexShrink: 0, gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
              {code.split("\n").length} lines · {code.length} chars
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                id="dsa-run-btn"
                onClick={handleRun}
                disabled={running || submitted || !code.trim()}
                className="btn btn-secondary"
                style={{ minWidth: 100 }}
              >
                {running ? (
                  <><span className="spinner" style={{ width: 13, height: 13, borderWidth: 2, borderColor: "var(--indigo)", marginRight: 6 }} />Running…</>
                ) : "▶ Run"}
              </button>
              <button
                id="dsa-submit-btn"
                onClick={openSubmitModal}
                disabled={submitted || !code.trim()}
                className="btn btn-success"
                style={{ minWidth: 100 }}
              >
                {submitted ? "✓ Submitted" : "🚀 Submit"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
      )}
    </VideoProctoring>
  );
}
