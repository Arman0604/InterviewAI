"use client";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import {
  FeatureShowcase,
  HomeTopBar,
  ROLE_VISUALS,
  RoleCardGrid,
  RolePickerPanel,
  ThemedRoleCard,
} from "@/components/InterviewHomeTheme";
import { INTERVIEW_ROLES } from "@/lib/roles";
import { useRouter } from "next/navigation";

export interface Report {
  id: string;
  session_id: string | null;
  role: string;
  round?: string | null;
  is_mock: number;
  status: string;
  score: number;
  summary: string;
  completed_at: string;
  session_title: string | null;
  short_id: string | null;
}

interface CandidateUser {
  name: string;
}

/* ── Role visual config ─────────────────────────────────────── */
const ROLE_VISUAL: Record<
  string,
  {
    abbr: string;
    fullName: string;
    topics: string;
    color: string;
    bgColor: string;
    btnColor: string;
    Icon: () => React.ReactNode;
  }
> = {
  "software-engineer": {
    abbr: "SWE",
    fullName: "Software Engineer",
    topics: "DSA, System Design, Coding and more",
    color: "#7c3aed",
    bgColor: "#ede9fe",
    btnColor: "#7c3aed",
    Icon: () => (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  "ai-ml-engineer": {
    abbr: "AI",
    fullName: "Artificial Intelligence",
    topics: "ML, DL, NLP, Computer Vision and more",
    color: "#059669",
    bgColor: "#d1fae5",
    btnColor: "#059669",
    Icon: () => (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V11h2a2 2 0 0 1 2 2v1h1a2 2 0 0 1 0 4h-1v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-1H5a2 2 0 0 1 0-4h1v-1a2 2 0 0 1 2-2h2V9.5C8.8 8.8 8 7.5 8 6a4 4 0 0 1 4-4z" />
        <circle cx="9.5" cy="15" r="1" fill="currentColor" />
        <circle cx="14.5" cy="15" r="1" fill="currentColor" />
      </svg>
    ),
  },
  "system-design-architect": {
    abbr: "SD",
    fullName: "System Design",
    topics: "High level design, Architecture and more",
    color: "#d97706",
    bgColor: "#fef3c7",
    btnColor: "#d97706",
    Icon: () => (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  "online-assessment": {
    abbr: "Aptitude",
    fullName: "Aptitude & Reasoning",
    topics: "Quantitative, Logical, Verbal and more",
    color: "#2563eb",
    bgColor: "#dbeafe",
    btnColor: "#2563eb",
    Icon: () => (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="16" y2="10" />
        <line x1="8" y1="14" x2="12" y2="14" />
        <line x1="16" y1="18" x2="16" y2="14" />
        <line x1="14" y1="16" x2="18" y2="16" />
      </svg>
    ),
  },
};

/* ── Round definitions ──────────────────────────────────────── */
const ROUNDS = [
  { id: "technical", label: "Technical Round", icon: "🎯", available: true  },
  { id: "dsa",       label: "DSA Round",       icon: "💻", available: true  },
  { id: "hr",        label: "HR Round",         icon: "🤝", available: true  },
];

type RoundCardConfig = {
  id: string;
  title: string;
  description: string;
  color: string;
  tone: string;
  topics: string[];
  icon?: "architecture";
};

const SWE_ROUND_CARDS: RoundCardConfig[] = [
  {
    id: "technical",
    title: "Technical Round",
    description: "Test your core technical knowledge, programming concepts, and real-world problem solving.",
    color: "#6a35ff",
    tone: "purple",
    topics: ["CS Fundamentals", "Programming Concepts", "Projects & Resume"],
  },
  {
    id: "dsa",
    title: "DSA Round",
    description: "Evaluate your data structures and algorithms skills with a variety of challenging problems.",
    color: "#0976ff",
    tone: "blue",
    topics: ["Data Structures", "Algorithms", "Time & Space Complexity"],
  },
  {
    id: "hr",
    title: "HR Round",
    description: "Discuss your background, experience, behavior, and career goals in a conversational round.",
    color: "#ff5d0a",
    tone: "orange",
    topics: ["Behavioral Questions", "Experience Discussion", "Career & Goals"],
  },
];

const AI_ROUND_CARDS: RoundCardConfig[] = [
  {
    id: "technical",
    title: "Technical Round",
    description: "Evaluate your knowledge of AI concepts, algorithms, models, and real-world applications.",
    color: "#10a978",
    tone: "green",
    topics: ["Machine Learning Fundamentals", "Deep Learning Concepts", "AI Projects & Case Studies"],
  },
  {
    id: "dsa",
    title: "DSA Round",
    description: "Evaluate your data structures and algorithms skills with a variety of challenging problems.",
    color: "#0976ff",
    tone: "blue",
    topics: ["Data Structures", "Algorithms", "Time & Space Complexity"],
  },
  {
    id: "hr",
    title: "HR Round",
    description: "Discuss your background, experience, behavior, and career goals in a conversational round.",
    color: "#ff5d0a",
    tone: "orange",
    topics: ["Behavioral Questions", "Experience Discussion", "Career & Goals"],
  },
];

const SD_ROUND_CARDS: RoundCardConfig[] = [
  {
    id: "technical",
    title: "Technical Round",
    description: "Evaluate your system design skills, architectural thinking, and ability to build scalable and reliable systems.",
    color: "#ff5d0a",
    tone: "orange",
    icon: "architecture",
    topics: ["System Design Fundamentals", "Scalability & Performance", "High Level Design Problems"],
  },
  {
    id: "dsa",
    title: "DSA Round",
    description: "Evaluate your data structures and algorithms skills with a variety of challenging problems.",
    color: "#0976ff",
    tone: "blue",
    topics: ["Data Structures", "Algorithms", "Time & Space Complexity"],
  },
  {
    id: "hr",
    title: "HR Round",
    description: "Discuss your background, experience, behavior, and career goals in a conversational round.",
    color: "#ff5d0a",
    tone: "orange",
    topics: ["Behavioral Questions", "Experience Discussion", "Career & Goals"],
  },
];

/* ── Decorative dots for role cards ────────────────────────── */
const ORDERED_ROLE_IDS = [
  "software-engineer",
  "ai-ml-engineer",
  "system-design-architect",
  "online-assessment",
];

function CardDecorations({ color }: { color: string }) {
  return (
    <>
      <span style={{ position: "absolute", top: 12, left: 14, color, opacity: 0.4, fontSize: 12, fontWeight: 700 }}>+</span>
      <span style={{ position: "absolute", top: 12, right: 14, opacity: 0.3, fontSize: 8 }}>
        <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" stroke={color} strokeWidth="1.5" fill="none"/></svg>
      </span>
      <span style={{ position: "absolute", bottom: 52, left: 12, opacity: 0.25, fontSize: 8 }}>
        <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" stroke={color} strokeWidth="1.5" fill="none"/></svg>
      </span>
      <span style={{ position: "absolute", bottom: 52, right: 14, color, opacity: 0.35, fontSize: 11, fontWeight: 700 }}>+</span>
    </>
  );
}

/* ── Resume upload sub-component ────────────────────────────── */
function SweRoundIcon({ tone, icon }: { tone: string; icon?: RoundCardConfig["icon"] }) {
  if (icon === "architecture") {
    return (
      <svg viewBox="0 0 72 72" aria-hidden="true">
        <rect x="28" y="8" width="16" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="4" />
        <rect x="10" y="48" width="16" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="4" />
        <rect x="46" y="48" width="16" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="4" />
        <rect x="28" y="34" width="16" height="12" rx="3" fill="currentColor" opacity="0.22" />
        <rect x="28" y="34" width="16" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M36 20V34M36 46V55M26 54H28M44 54H46M18 48V40H54V48" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 25H25M47 25H55M21 21V29M51 21V29" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" opacity="0.68" />
      </svg>
    );
  }

  if (tone === "green") {
    return (
      <svg viewBox="0 0 72 72" aria-hidden="true">
        <path d="M28 18C20 18 15 24 15 31C10 34 10 43 16 47C16 54 22 58 29 55C32 60 41 60 44 54C51 55 57 49 56 42C62 38 60 28 53 26C52 19 44 15 38 19C35 16 31 16 28 18Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M36 20V55M23 33H15M57 35H49M25 47H17M55 46H45M28 27H36M36 39H46M27 39H36" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="15" cy="31" r="3" fill="currentColor" />
        <circle cx="57" cy="35" r="3" fill="currentColor" />
        <circle cx="17" cy="47" r="3" fill="currentColor" />
        <circle cx="55" cy="46" r="3" fill="currentColor" />
      </svg>
    );
  }

  if (tone === "blue") {
    return (
      <svg viewBox="0 0 72 72" aria-hidden="true">
        <rect x="16" y="14" width="40" height="30" rx="5" fill="currentColor" opacity="0.95" />
        <rect x="20" y="18" width="32" height="22" rx="3" fill="#ffffff" opacity="0.18" />
        <path d="M30 25L24 31L30 37M42 25L48 31L42 37" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M35 38L38 24" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
        <path d="M20 49H52L58 58H14L20 49Z" fill="currentColor" opacity="0.86" />
      </svg>
    );
  }

  if (tone === "orange") {
    return (
      <span className="swe-round-emoji-icon" aria-hidden="true">🤝</span>
    );
  }

  return (
    <svg viewBox="0 0 72 72" aria-hidden="true">
      <circle cx="35" cy="35" r="22" fill="none" stroke="currentColor" strokeWidth="5" />
      <circle cx="35" cy="35" r="13" fill="none" stroke="currentColor" strokeWidth="5" opacity="0.74" />
      <circle cx="35" cy="35" r="5" fill="currentColor" />
      <path d="M35 35L55 18" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M55 10L64 18L54 27L55 10Z" fill="currentColor" />
    </svg>
  );
}

function SoftwareEngineerRoundSelection({
  onSelectRound,
  variant = "swe",
}: {
  onSelectRound: (round: string) => void;
  variant?: "swe" | "ai" | "sd";
}) {
  const isAi = variant === "ai";
  const isSd = variant === "sd";
  const rounds = isSd ? SD_ROUND_CARDS : isAi ? AI_ROUND_CARDS : SWE_ROUND_CARDS;
  const portrait = isSd ? "/system-design-interviewer.webp" : isAi ? "/sofia-interviewer.webp" : "/maria-interviewer.webp";
  const name = isSd ? "Alisa" : isAi ? "Sofia" : "Maria";
  const roleTitle = isSd ? "your System Design Interviewer." : isAi ? "your AI Interviewer." : "your Software Engineering Interviewer.";
  const description = isSd
    ? "I'll be conducting your mock interview across multiple rounds just like a real-world hiring process. Let's assess your skills, problem-solving ability, and system design thinking."
    : isAi
    ? "I'll be conducting your mock interview across multiple rounds just like a real-world hiring process. Let's assess your skills, problem-solving ability, and AI understanding."
    : "I'll be conducting your mock interview across multiple rounds just like a real-world hiring process. Let's assess your skills, problem-solving ability, and coding mindset.";

  return (
    <div className={`swe-round-page${isAi ? " ai-round-page" : ""}${isSd ? " sd-round-page" : ""} fade-in`}>
      <section className="swe-maria-hero">
        <div className="swe-hero-dots swe-hero-dots-left" aria-hidden="true" />
        <div className="swe-hero-dots swe-hero-dots-right" aria-hidden="true" />
        <div className="swe-maria-visual" aria-hidden="true">
          <span className="swe-orb swe-orb-left" />
          <Image
            src={portrait}
            alt=""
            width={512}
            height={768}
            sizes="(max-width: 640px) 300px, 370px"
            priority
          />
        </div>
        <div className="swe-maria-copy">
          <div className="swe-ai-badge">✣ AI Interviewer</div>
          <h1>
            Welcome!
            <strong>I&apos;m {name},</strong>
          </h1>
          <h2>{roleTitle}</h2>
          <p>{description}</p>
        </div>
      </section>

      <section className="swe-round-section">
        <div className="swe-section-heading">
          <span />
          <h2>Choose Your Interview Round</h2>
          <span />
        </div>
        <p>Select a round to begin your AI mock interview</p>

        <div className="swe-round-grid">
          {rounds.map((round) => (
            <article
              key={round.id}
              className={`swe-round-card swe-round-card-${round.tone}`}
              style={{ ["--swe-round-color" as string]: round.color }}
            >
              <div className="swe-round-icon" style={{ color: round.color }}>
                <SweRoundIcon tone={round.tone} icon={round.icon} />
              </div>
              <h3>{round.title}</h3>
              <div className="swe-round-line" style={{ background: round.color }} />
              <p>{round.description}</p>
              <div className="swe-round-topics">
                {round.topics.map((topic) => (
                  <div key={topic}>
                    <span>{round.tone === "blue" ? "</>" : round.tone === "orange" ? "☉" : "⌁"}</span>
                    {topic}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => onSelectRound(round.id)} style={{ background: round.color }}>
                Start {round.title}
                <svg width="30" height="22" viewBox="0 0 30 22" fill="none" aria-hidden="true">
                  <path d="M1 11H27M18 2L27 11L18 20" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </article>
          ))}
        </div>

        {(isAi || isSd) && (
          <div className="ai-experience-strip">
            <div className="ai-experience-icon">✓</div>
            <div>
              <h3>Real Interview Experience</h3>
              <p>Our AI interviews simulate real hiring scenarios to help you build confidence and improve with every attempt.</p>
            </div>
            <ul>
              <li>Real-time AI Evaluation</li>
              <li>Instant Feedback</li>
              <li>Performance Insights</li>
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function TermsIcon({ type }: { type: "info" | "doc" | "topic" | "shield" | "resume" | "camera" | "window" | "user" | "phone" | "alert" | "chart" | "upload" | "check" }) {
  if (type === "doc") {
    return <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM14 3v5h5M9 13h6M9 17h4" />;
  }
  if (type === "topic") {
    return <path d="M5 5h14v14H5zM9 9h6M9 13h6M9 17h4" />;
  }
  if (type === "shield") {
    return <path d="M12 3 5 6v5c0 4.6 2.9 8.4 7 10 4.1-1.6 7-5.4 7-10V6l-7-3ZM9.5 12l1.8 1.8 3.6-4" />;
  }
  if (type === "resume") {
    return <path d="M8 4h8l3 3v13H5V4h3ZM16 4v4h4M8 12h8M8 16h8" />;
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
  if (type === "phone") {
    return <path d="M9 2h6a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm3 17h.01" />;
  }
  if (type === "alert") {
    return <path d="m12 3 10 18H2L12 3Zm0 6v5m0 3h.01" />;
  }
  if (type === "chart") {
    return <path d="M5 20V10m7 10V4m7 16v-7" />;
  }
  if (type === "upload") {
    return <path d="M12 17V5m0 0 5 5m-5-5-5 5M5 19h14" />;
  }
  if (type === "check") {
    return <path d="m5 12 4 4L19 6" />;
  }
  return <path d="M12 8v5m0 3h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />;
}

function IconBadge({ type, danger = false }: { type: Parameters<typeof TermsIcon>[0]["type"]; danger?: boolean }) {
  return (
    <span className={`technical-terms-icon${danger ? " technical-terms-icon-danger" : ""}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <TermsIcon type={type} />
      </svg>
    </span>
  );
}

function TechnicalTermsScreen({
  variant = "swe",
  fileName,
  resumeReady,
  uploading,
  error,
  agreed,
  starting,
  onFileChange,
  onClear,
  onAgreedChange,
  onProceed,
}: {
  variant?: "swe" | "ai" | "sd";
  fileName: string;
  resumeReady: boolean;
  uploading: boolean;
  error: string;
  agreed: boolean;
  starting: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onAgreedChange: (agreed: boolean) => void;
  onProceed: () => void;
}) {
  const isAi = variant === "ai";
  const isSd = variant === "sd";
  const screenTitle = isAi ? "AI Round" : isSd ? "System Design Round" : "Technical Round";
  const questionBody = isAi
    ? "You will be asked 10 AI-related questions"
    : isSd
    ? "You will be asked 10 system design questions"
    : "You will be asked 10 technical questions";
  const topicBody = isAi
    ? "Questions will be based on AI fundamentals, ML, DL, NLP, and real-world applications."
    : isSd
    ? "Questions will be based on designing scalable, reliable and efficient systems."
    : "Questions will be based on CS fundamentals and programming concepts.";
  const reportItems = isSd
    ? [
        "Overall Score out of 100",
        "Topic-wise Performance Analysis",
        "Design Approach Evaluation",
        "Scalability & Trade-off Analysis",
        "Personalized Improvement Suggestions",
        "Detailed Performance Report",
      ]
    : [
        "Overall Score out of 100",
        "Topic-wise Performance Analysis",
        "Identification of Weak Areas",
        "Personalized Improvement Suggestions",
        "Detailed Performance Report",
      ];
  const infoItems = [
    { icon: "info" as const, title: "Interview Information", body: "" },
    { icon: "doc" as const, title: "10 Questions", body: questionBody },
    { icon: "topic" as const, title: "Question Topics", body: topicBody },
    { icon: "shield" as const, title: "AI-Proctored Interview", body: "This interview will be proctored using AI to ensure a fair process." },
    { icon: "resume" as const, title: "Resume Based", body: "Some questions may be personalized based on your resume." },
  ];
  const rules = [
    { icon: "camera" as const, title: "Camera Access is Mandatory", body: "You must allow access to your camera throughout the interview." },
    { icon: "window" as const, title: "Tab Switching is a Violation", body: "Switching tabs or opening new windows during the interview is considered a violation." },
    { icon: "user" as const, title: "Unauthorized Assistance is a Violation", body: "Getting help from any person or external source is strictly prohibited." },
    { icon: "user" as const, title: "No Additional Person Allowed", body: "Having any other person in the room or in camera view is considered a violation." },
    { icon: "phone" as const, title: "No Unauthorized Objects", body: "Using phones, tablets, books, notes, or any external devices/materials is not allowed." },
  ];
  return (
    <section className={`technical-terms-page${isAi ? " ai-terms-page" : ""}${isSd ? " sd-terms-page" : ""} fade-in`}>
      <div className="technical-terms-header">
        <h1>{screenTitle} - Terms &amp; Conditions</h1>
        <p>Please read all the rules and guidelines carefully before starting your interview.</p>
        <span />
      </div>

      <div className="technical-terms-card technical-info-card">
        <div className="technical-info-grid">
          {infoItems.map((item) => (
            <div key={item.title} className="technical-info-item">
              <IconBadge type={item.icon} />
              <div>
                <h3>{item.title}</h3>
                {item.body && <p>{item.body}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="technical-terms-card technical-rules-card">
        <div className="technical-card-title">
          <IconBadge type="shield" />
          <div>
            <h2>Proctoring Rules</h2>
            <p>To ensure fairness and integrity, please follow these rules strictly.</p>
          </div>
        </div>
        <div className="technical-rule-list">
          {rules.map((rule) => (
            <div key={rule.title} className="technical-rule-row">
              <IconBadge type={rule.icon} />
              <div>
                <h3>{rule.title}</h3>
                <p>{rule.body}</p>
              </div>
            </div>
          ))}
          <div className="technical-rule-row technical-rule-danger">
            <IconBadge type="alert" danger />
            <div>
              <h3>More than 2 violations will lead to immediate termination of the interview.</h3>
              <p>The interview will be ended immediately and you will not be able to continue.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="technical-terms-lower-grid">
        <div className="technical-terms-card technical-post-card">
          <div className="technical-card-title">
            <IconBadge type="chart" />
            <div>
              <h2>Post Interview</h2>
              <p>After the interview is completed, you will receive:</p>
            </div>
          </div>
          <ul className="technical-report-list">
            {reportItems.map((item) => (
              <li key={item}><IconBadge type="check" /> {item}</li>
            ))}
          </ul>
        </div>

        <div className="technical-terms-card technical-upload-card">
          <div className="technical-card-title">
            <IconBadge type="doc" />
            <div>
              <h2>Upload Resume (Required)</h2>
              <p>Upload your resume to continue with the interview.</p>
            </div>
          </div>
          <input type="file" accept=".pdf,application/pdf" id="technical-terms-resume" className="technical-upload-input" onChange={onFileChange} disabled={uploading} />
          <label htmlFor="technical-terms-resume" className="technical-upload-drop">
            <span className="technical-upload-cloud"><IconBadge type="upload" /></span>
            <strong>{uploading ? "Parsing PDF..." : "Drag & Drop your PDF Resume here"}</strong>
            <span>or</span>
            <span className="technical-upload-button">{fileName ? "Change File" : "Choose File"}</span>
            <small>{fileName || "PDF only, up to 5MB. Resume required."}</small>
          </label>
          {fileName && !uploading && (
            <button type="button" className="technical-clear-upload" onClick={onClear}>Remove uploaded resume</button>
          )}
          {error && <p className="technical-upload-error">{error}</p>}
        </div>
      </div>

      <label className="technical-agree-card">
        <input type="checkbox" checked={agreed} onChange={(event) => onAgreedChange(event.target.checked)} />
        <span>
          <strong>I have read and agree to all the interview rules and guidelines.</strong>
          <small>By checking this box, you confirm that you understand and agree to abide by the above terms.</small>
        </span>
      </label>

      <button type="button" className="technical-start-button" onClick={onProceed} disabled={!agreed || !resumeReady || uploading || starting}>
        {starting ? "Starting..." : "Start Interview"}
        <svg width="24" height="18" viewBox="0 0 24 18" fill="none" aria-hidden="true">
          <path d="M1 9h20M14 2l7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </section>
  );
}

function HRTermsScreen({
  fileName,
  resumeReady,
  uploading,
  error,
  agreed,
  onFileChange,
  onClear,
  onAgreedChange,
  onBack,
  onStart,
  starting,
}: {
  fileName: string;
  resumeReady: boolean;
  uploading: boolean;
  error: string;
  agreed: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onAgreedChange: (agreed: boolean) => void;
  onBack: () => void;
  onStart: () => void;
  starting: boolean;
}) {
  const parameters = ["Relevance", "Clarity", "Honesty", "Positive Attitude", "Confidence"];
  const overviewItems = [
    "This is an HR Round Mock Interview.",
    "You will be asked 7 HR-related questions.",
    "Total marks for this round are 100.",
    "Each answer will be evaluated based on the following parameters:",
    "Ensure your answers are genuine, professional and to the point.",
  ];
  const rules = [
    { icon: "camera" as const, title: "Webcam Requirement", body: "Webcam must be ON throughout the interview. Your face should be clearly visible." },
    { icon: "window" as const, title: "No Tab Switching", body: "Do not switch tabs or windows during the interview. Doing so may lead to disqualification." },
    { icon: "user" as const, title: "No Additional Help", body: "Do not seek help from any other person or external resources. This is a fair evaluation of your abilities." },
    { icon: "alert" as const, title: "Clean Environment", body: "Ensure a quiet and distraction-free environment for the best interview experience." },
  ];

  return (
    <section className="hr-terms-page fade-in">
      <header className="hr-terms-hero">
        <div>
          <span className="hr-terms-pill">HR Round</span>
          <h1>HR Round: Terms &amp; Conditions</h1>
          <p>Please read all the instructions and guidelines carefully before you begin.</p>
        </div>
        <div className="hr-terms-illustration" aria-hidden="true">
          <div className="hr-terms-dots left" />
          <div className="hr-terms-plant">
            <span />
            <i />
          </div>
          <div className="hr-terms-document">
            <div className="hr-doc-clip" />
            <div className="hr-doc-avatar" />
            <div className="hr-doc-lines">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="hr-terms-shield">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 12 4 4 8-8" />
            </svg>
          </div>
          <div className="hr-terms-dots right" />
        </div>
      </header>

      <div className="hr-terms-stats">
        <div className="hr-stat-card">
          <span className="hr-stat-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="m12 2 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 16.9 6.1 20l1.2-6.5-4.8-4.6 6.6-.9L12 2Z" />
            </svg>
          </span>
          <div>
            <h3>Total Marks</h3>
            <strong>100</strong>
            <p>Overall</p>
          </div>
        </div>
        <div className="hr-stat-card">
          <span className="hr-stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2.4-3 4" />
              <path d="M12 18h.01" />
            </svg>
          </span>
          <div>
            <h3>Total Questions</h3>
            <strong>7</strong>
            <p>HR Questions</p>
          </div>
        </div>
        <div className="hr-stat-card">
          <span className="hr-stat-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="4" y="13" width="4" height="7" rx="1" />
              <rect x="10" y="9" width="4" height="11" rx="1" />
              <rect x="16" y="4" width="4" height="16" rx="1" />
            </svg>
          </span>
          <div>
            <h3>Evaluation Based On</h3>
            <p className="hr-stat-eval">Relevance, Clarity, Honesty, Positive Attitude, Confidence</p>
          </div>
        </div>
      </div>

      <div className="hr-terms-upload-panel">
        <div className="hr-section-title">
          <IconBadge type="upload" />
          <div>
            <h2>Resume Upload <span>(Required)</span></h2>
            <p>Please upload your latest resume. This will help the interviewer understand your background better.</p>
          </div>
        </div>
        <input type="file" accept=".pdf,application/pdf" id="hr-terms-resume" className="technical-upload-input" onChange={onFileChange} disabled={uploading} />
        <label htmlFor="hr-terms-resume" className="hr-upload-drop">
          <span className="hr-upload-cloud"><IconBadge type="upload" /></span>
          <strong>{uploading ? "Parsing resume..." : "Drag & drop your resume here"}</strong>
          <span>or</span>
          <span className="hr-upload-button">{fileName ? "Change File" : "Choose File"}</span>
          <small>{fileName || "PDF only (Max. 5MB)"}</small>
        </label>
        {fileName && !uploading && (
          <button type="button" className="hr-clear-upload" onClick={onClear}>Remove uploaded resume</button>
        )}
        {error && <p className="technical-upload-error">{error}</p>}
      </div>

      <div className="hr-terms-grid">
        <article className="hr-terms-card">
          <div className="hr-section-title compact">
            <IconBadge type="doc" />
            <h2>Test Overview</h2>
          </div>
          <ul className="hr-overview-list">
            {overviewItems.map((item, index) => (
              <li key={item}>
                <IconBadge type="check" />
                <span>{item}</span>
                {index === 3 && (
                  <div className="hr-evaluation-tags">
                    {parameters.map((parameter) => <strong key={parameter}>{parameter}</strong>)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </article>

        <article className="hr-terms-card">
          <div className="hr-section-title compact">
            <IconBadge type="shield" />
            <h2>Proctoring &amp; Integrity Rules</h2>
          </div>
          <div className="hr-rule-list">
            {rules.map((rule) => (
              <div key={rule.title} className="hr-rule-row">
                <IconBadge type={rule.icon} />
                <div>
                  <h3>{rule.title}</h3>
                  <p>{rule.body}</p>
                </div>
              </div>
            ))}
            <div className="hr-rule-warning">
              Any violation of the above rules may result in disqualification from the interview process.
            </div>
          </div>
        </article>
      </div>

      <label className="hr-agree-card">
        <input type="checkbox" checked={agreed} onChange={(event) => onAgreedChange(event.target.checked)} />
        <span>
          I have read and understood all the terms and conditions.
          <small>I agree to follow the rules and guidelines.</small>
        </span>
      </label>

      <div className="hr-terms-actions">
        <button type="button" className="hr-back-button" onClick={onBack} disabled={starting}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          Back
        </button>
        <button type="button" className="hr-start-button" onClick={onStart} disabled={!agreed || !resumeReady || uploading || starting}>
          {starting ? "Starting..." : "I'm Ready to Start the HR Round"}
          <svg width="22" height="18" viewBox="0 0 24 18" fill="none" aria-hidden="true">
            <path d="M1 9h20M14 2l7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <p className="hr-terms-footnote">By proceeding, you agree to abide by all the terms and conditions mentioned above.</p>
    </section>
  );
}

type DSAIconType = "code" | "clipboard" | "shield" | "camera" | "window" | "user" | "alert" | "check";

function DSABlueIcon({ type }: { type: DSAIconType }) {
  if (type === "code") {
    return <path d="m9 18-6-6 6-6M15 6l6 6-6 6M13 4l-2 16" />;
  }
  if (type === "clipboard") {
    return <TermsIcon type="doc" />;
  }
  return <TermsIcon type={type} />;
}

function DSABlueIconBadge({ type }: { type: DSAIconType }) {
  return (
    <span className="dsa-terms-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <DSABlueIcon type={type} />
      </svg>
    </span>
  );
}

function DSATermsScreen({
  agreed,
  onAgreedChange,
  onBack,
  onStart,
  starting,
}: {
  agreed: boolean;
  onAgreedChange: (agreed: boolean) => void;
  onBack: () => void;
  onStart: () => void;
  starting: boolean;
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
    <section className="dsa-terms-page fade-in">
      <header className="dsa-terms-header">
        <span className="dsa-terms-pill">DSA Round</span>
        <h1>DSA Round: Terms &amp; Conditions</h1>
        <p>Please read all the instructions and guidelines carefully before you begin.</p>
      </header>

      <article className="dsa-terms-card dsa-how-card">
        <div className="dsa-card-heading">
          <DSABlueIconBadge type="code" />
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
            <DSABlueIconBadge type="clipboard" />
            <h2>Test Overview</h2>
          </div>
          <ul className="dsa-overview-list">
            {overviewItems.map((item, index) => (
              <li key={index}>
                <span className="dsa-mini-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <DSABlueIcon type="check" />
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
            <DSABlueIconBadge type="shield" />
            <h2>Proctoring &amp; Integrity Rules</h2>
          </div>
          <div className="dsa-rules-list">
            {rules.map((rule) => (
              <div key={rule.title} className="dsa-rule-row">
                <DSABlueIconBadge type={rule.icon} />
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
        <input type="checkbox" checked={agreed} onChange={(event) => onAgreedChange(event.target.checked)} disabled={starting} />
        <span>
          I have read and understood all the terms and conditions.
          <small>I agree to follow the rules and guidelines.</small>
        </span>
      </label>

      <div className="dsa-terms-actions">
        <button type="button" className="dsa-back-button" onClick={onBack} disabled={starting}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          Back
        </button>
        <button type="button" className="dsa-start-button" onClick={onStart} disabled={!agreed || starting}>
          {starting ? "Starting..." : "I'm Ready to Start the DSA Round"}
          <svg viewBox="0 0 24 18" fill="none" aria-hidden="true">
            <path d="M1 9h20M14 2l7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <p className="dsa-terms-footnote">
        <DSABlueIconBadge type="shield" />
        By proceeding, you agree to abide by all the terms and conditions mentioned above.
      </p>
    </section>
  );
}

function stopTechnicalCameraStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function frameLooksUsable(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
  const width = 160;
  const height = 90;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context || video.videoWidth === 0 || video.videoHeight === 0) return false;

  canvas.width = width;
  canvas.height = height;
  context.drawImage(video, 0, 0, width, height);

  const frame = context.getImageData(0, 0, width, height);
  let total = 0;
  let totalSquared = 0;
  const stride = 4;
  let sampled = 0;

  for (let index = 0; index < frame.data.length; index += 4 * stride) {
    const luminance = frame.data[index] * 0.299 + frame.data[index + 1] * 0.587 + frame.data[index + 2] * 0.114;
    total += luminance;
    totalSquared += luminance * luminance;
    sampled += 1;
  }

  if (sampled === 0) return false;
  const mean = total / sampled;
  const variance = Math.max(totalSquared / sampled - mean * mean, 0);
  const contrast = Math.sqrt(variance);
  return mean > 8 || contrast > 3;
}

function waitForCameraFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement, timeoutMs = 550) {
  const startedAt = performance.now();

  return new Promise<boolean>((resolve) => {
    const check = () => {
      if (frameLooksUsable(video, canvas)) {
        resolve(true);
        return;
      }

      if (performance.now() - startedAt >= timeoutMs) {
        resolve(false);
        return;
      }

      window.setTimeout(check, 70);
    };

    requestAnimationFrame(check);
  });
}

function TechnicalCameraVerification({
  variant = "swe",
  starting,
  onBack,
  onStart,
}: {
  variant?: "swe" | "ai" | "sd";
  starting: boolean;
  onBack: () => void;
  onStart: () => void;
}) {
  const isAi = variant === "ai";
  const isSd = variant === "sd";
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<"requesting" | "checking" | "passed" | "failed" | "unsupported">("requesting");
  const [message, setMessage] = useState("Requesting camera permission...");

  useEffect(() => {
    let cancelled = false;

    async function verifyCamera() {
      stopTechnicalCameraStream(streamRef.current);
      streamRef.current = null;
      setPhase("requesting");
      setMessage("Requesting camera permission...");

      if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setPhase("unsupported");
        setMessage("This browser cannot access the webcam. Please use a browser with camera support.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (cancelled) {
          stopTechnicalCameraStream(stream);
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => undefined);

        setPhase("checking");
        setMessage("Camera detected. Verifying that the feed is live and clear.");
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (canvas && (await waitForCameraFrame(video, canvas))) {
          setPhase("passed");
          setMessage("Camera verification passed. You can start the interview now.");
          return;
        }

        setPhase("failed");
        setMessage("Camera feed is too dark or blocked. Adjust your lighting, keep your face visible, and retry.");
      } catch {
        if (cancelled) return;
        setPhase("failed");
        setMessage("Camera access is required before starting the interview. Allow webcam permission and retry.");
      }
    }

    void verifyCamera();
    return () => {
      cancelled = true;
      stopTechnicalCameraStream(streamRef.current);
      streamRef.current = null;
    };
  }, [attempt]);

  const title = isAi ? "AI Round Camera Verification" : isSd ? "System Design Camera Verification" : "Technical Round Camera Verification";
  const statusLabel =
    phase === "passed"
      ? "Verified"
      : phase === "checking"
      ? "Checking"
      : phase === "requesting"
      ? "Requesting"
      : "Action needed";

  return (
    <section className={`technical-terms-page${isAi ? " ai-terms-page" : ""}${isSd ? " sd-terms-page" : ""} fade-in`}>
      <div className="technical-terms-header">
        <h1>{title}</h1>
        <p>Complete this camera check before the interview can begin.</p>
        <span />
      </div>

      <div className="technical-terms-card technical-camera-card">
        <div className="technical-card-title">
          <IconBadge type={phase === "passed" ? "check" : "camera"} />
          <div>
            <h2>{statusLabel}</h2>
            <p>{message}</p>
          </div>
        </div>

        <div className="technical-camera-preview">
          <video ref={videoRef} className={phase === "requesting" ? "technical-camera-video-waiting" : undefined} muted playsInline />
          {phase === "requesting" && (
            <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
          )}
        </div>
        <canvas ref={canvasRef} className="technical-camera-canvas" />

        <div className="technical-camera-actions">
          <button type="button" className="btn btn-ghost" onClick={onBack} disabled={starting}>
            Back to Terms
          </button>
          {(phase === "failed" || phase === "unsupported") && (
            <button type="button" className="btn btn-secondary" onClick={() => setAttempt((current) => current + 1)} disabled={starting}>
              Retry Camera Check
            </button>
          )}
          <button type="button" className="technical-start-button" onClick={onStart} disabled={phase !== "passed" || starting}>
            {starting ? "Starting..." : "Start Interview"}
            <svg width="24" height="18" viewBox="0 0 24 18" fill="none" aria-hidden="true">
              <path d="M1 9h20M14 2l7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

function ResumeUpload({
  fileName, uploading, error, onChange, onClear,
}: {
  fileName: string; uploading: boolean; error: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  return (
    <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
      <label className="form-label" style={{ fontSize: "0.78rem", marginBottom: 8, display: "block" }}>
        💼 Upload Resume{" "}
        <span style={{ color: "var(--rose)", fontWeight: 600 }}>(PDF, REQUIRED * — tailors questions to your experience)</span>
      </label>
      <input type="file" accept=".pdf,application/pdf" id="mock-resume-file" style={{ display: "none" }} onChange={onChange} disabled={uploading} />
      <div className="flex gap-2" style={{ alignItems: "center" }}>
        <label
          htmlFor="mock-resume-file"
          className="btn btn-secondary btn-sm"
          style={{ cursor: uploading ? "not-allowed" : "pointer", flex: 1, opacity: uploading ? 0.7 : 1, justifyContent: "center" }}
        >
          {uploading ? (
            <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Parsing PDF…</>
          ) : fileName ? (
            <>📎 {fileName.length > 20 ? fileName.slice(0, 20) + "…" : fileName}</>
          ) : (
            <>📄 Choose PDF Resume</>
          )}
        </label>
        {fileName && !uploading && (
          <button type="button" onClick={onClear} className="btn btn-ghost btn-sm" style={{ color: "var(--rose)", padding: "4px 8px" }}>✕</button>
        )}
      </div>
      {fileName && !uploading && (
        <p style={{ fontSize: "0.72rem", color: "var(--emerald)", marginTop: 6 }}>✅ Resume parsed — AI will tailor questions to your profile</p>
      )}
      {error && <p style={{ fontSize: "0.72rem", color: "var(--rose)", marginTop: 6 }}>⚠️ {error}</p>}
    </div>
  );
}

/* ── Aptitude Terms Screen ──────────────────────────────────── */
function AptitudeTermsScreen({
  agreed,
  onAgreedChange,
  onCancel,
  onStartTest,
}: {
  agreed: boolean;
  onAgreedChange: (v: boolean) => void;
  onCancel: () => void;
  onStartTest: () => void;
}) {
  const overviewStats = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01M12 9h.01M12 15h.01" />
        </svg>
      ),
      value: "20",
      label: "Total Questions",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      value: "15 Minutes",
      label: "Total Duration",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      ),
      value: "Multiple Choice",
      label: "Question Type",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      value: "Performance",
      label: "Based Report",
    },
  ];

  const instructions = [
    "You will have 15 minutes to complete the test.",
    "The test consists of 20 multiple-choice questions.",
    "You can navigate between questions, but cannot revisit once the test is submitted.",
    "Each question carries equal marks. There is no negative marking.",
    "Ensure you have a stable internet connection and a quiet environment.",
    "The test will auto-submit when the timer reaches zero.",
  ];

  const violationRules = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }}>
          <path d="M4 5h16v14H4V5Zm0 4h16M8 7h.01M11 7h.01" />
        </svg>
      ),
      text: "Do not switch tabs or open other windows or applications.",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }}>
          <rect x="9" y="2" width="6" height="20" rx="2" />
          <path d="M9 7H5m0 5H4m5 5H5" />
        </svg>
      ),
      text: "Do not copy, paste, or use any external resources.",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
      ),
      text: "Do not take help from anyone during the test.",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }}>
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      ),
      text: "Do not use mobile phones or additional devices.",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }}>
          <path d="M23 7l-7 5 7 5V7z" />
          <rect x="1" y="5" width="15" height="14" rx="2" />
        </svg>
      ),
      text: "Ensure your face is visible in the webcam throughout the test.",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }}>
          <path d="m10.29 3.86-8.6 14.9A2 2 0 0 0 3.41 22h17.18a2 2 0 0 0 1.72-3.14l-8.6-14.9a2 2 0 0 0-3.42 0Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      text: "Any suspicious activity may lead to immediate disqualification.",
    },
  ];

  return (
    <div className="aptitude-terms-overlay fade-in">
      <div className="aptitude-terms-modal">
        {/* Header */}
        <div className="aptitude-terms-header">
          <div className="aptitude-terms-header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <line x1="8" y1="10" x2="16" y2="10" />
              <line x1="8" y1="14" x2="12" y2="14" />
              <line x1="16" y1="18" x2="16" y2="14" />
              <line x1="14" y1="16" x2="18" y2="16" />
            </svg>
          </div>
          <div>
            <h1 className="aptitude-terms-title">Aptitude Round</h1>
            <p className="aptitude-terms-subtitle">Mock Aptitude Test</p>
          </div>
        </div>
        <p className="aptitude-terms-intro">Please read the instructions and terms carefully before you begin the test.</p>

        {/* Two-column layout */}
        <div className="aptitude-terms-body">
          {/* Left column */}
          <div className="aptitude-terms-left">
            {/* Test Overview */}
            <div className="aptitude-section-card">
              <div className="aptitude-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
                <span>Test Overview</span>
              </div>
              <div className="aptitude-stats-grid">
                {overviewStats.map((stat) => (
                  <div key={stat.label} className="aptitude-stat-item">
                    <div className="aptitude-stat-icon">{stat.icon}</div>
                    <div className="aptitude-stat-value">{stat.value}</div>
                    <div className="aptitude-stat-label">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Important Instructions */}
            <div className="aptitude-section-card aptitude-instructions-card">
              <div className="aptitude-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                  <path d="M12 3 5 6v5c0 4.6 2.9 8.4 7 10 4.1-1.6 7-5.4 7-10V6l-7-3Z" />
                </svg>
                <span>Important Instructions</span>
              </div>
              <ul className="aptitude-instructions-list">
                {instructions.map((item) => (
                  <li key={item}>
                    <span className="aptitude-bullet" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right column — Violation Rules */}
          <div className="aptitude-terms-right">
            <div className="aptitude-violations-panel">
              <div className="aptitude-violations-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, flexShrink: 0 }}>
                  <path d="M12 3 5 6v5c0 4.6 2.9 8.4 7 10 4.1-1.6 7-5.4 7-10V6l-7-3Z" />
                </svg>
                <strong>Violation Rules</strong>
              </div>
              <p className="aptitude-violations-intro">
                We monitor the test environment to ensure fairness. Any violation may result in test termination and disqualification.
              </p>
              <ul className="aptitude-violations-list">
                {violationRules.map((rule, i) => (
                  <li key={i} className="aptitude-violation-item">
                    <span className="aptitude-violation-icon">{rule.icon}</span>
                    <span>{rule.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="aptitude-terms-footer">
          <label className="aptitude-agree-label">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => onAgreedChange(e.target.checked)}
              className="aptitude-agree-checkbox"
            />
            <span>
              I have read and understood all the instructions and violation rules. I agree to abide by them and understand that any violation may result in disqualification.
            </span>
          </label>
          <div className="aptitude-footer-actions">
            <button type="button" className="aptitude-cancel-btn" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className="aptitude-start-btn"
              onClick={onStartTest}
              disabled={!agreed}
            >
              Start Test
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Aptitude Camera Verification ───────────────────────────── */
function AptitudeCameraVerification({
  starting,
  onBack,
  onStart,
}: {
  starting: boolean;
  onBack: () => void;
  onStart: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<"requesting" | "checking" | "passed" | "failed" | "unsupported">("requesting");
  const [message, setMessage] = useState("Requesting camera permission...");

  useEffect(() => {
    let cancelled = false;

    async function verifyCamera() {
      stopTechnicalCameraStream(streamRef.current);
      streamRef.current = null;
      setPhase("requesting");
      setMessage("Requesting camera permission...");

      if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setPhase("unsupported");
        setMessage("This browser cannot access the webcam. Please use a browser with camera support.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) { stopTechnicalCameraStream(stream); return; }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => undefined);

        setPhase("checking");
        setMessage("Camera detected. Verifying that the feed is live and clear.");
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (canvas && (await waitForCameraFrame(video, canvas))) {
          setPhase("passed");
          setMessage("Camera verification passed. You can start the test now.");
          return;
        }
        setPhase("failed");
        setMessage("Camera feed is too dark or blocked. Adjust your lighting, keep your face visible, and retry.");
      } catch {
        if (cancelled) return;
        setPhase("failed");
        setMessage("Camera access is required before starting the test. Allow webcam permission and retry.");
      }
    }

    void verifyCamera();
    return () => {
      cancelled = true;
      stopTechnicalCameraStream(streamRef.current);
      streamRef.current = null;
    };
  }, [attempt]);

  const statusLabel =
    phase === "passed" ? "Verified" :
    phase === "checking" ? "Checking" :
    phase === "requesting" ? "Requesting" : "Action needed";

  return (
    <section className="technical-terms-page aptitude-camera-page fade-in">
      <div className="technical-terms-header">
        <h1>Aptitude Round — Camera Verification</h1>
        <p>Complete this camera check before the test can begin.</p>
        <span />
      </div>

      <div className="technical-terms-card technical-camera-card">
        <div className="technical-card-title">
          <IconBadge type={phase === "passed" ? "check" : "camera"} />
          <div>
            <h2>{statusLabel}</h2>
            <p>{message}</p>
          </div>
        </div>

        <div className="technical-camera-preview">
          <video ref={videoRef} className={phase === "requesting" ? "technical-camera-video-waiting" : undefined} muted playsInline />
          {phase === "requesting" && (
            <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
          )}
        </div>
        <canvas ref={canvasRef} className="technical-camera-canvas" />

        <div className="technical-camera-actions">
          <button type="button" className="btn btn-ghost" onClick={onBack} disabled={starting}>
            Back to Instructions
          </button>
          {(phase === "failed" || phase === "unsupported") && (
            <button type="button" className="btn btn-secondary" onClick={() => setAttempt((c) => c + 1)} disabled={starting}>
              Retry Camera Check
            </button>
          )}
          <button type="button" className="technical-start-button" onClick={onStart} disabled={phase !== "passed" || starting}>
            {starting ? "Starting..." : "Start Test"}
            <svg width="24" height="18" viewBox="0 0 24 18" fill="none" aria-hidden="true">
              <path d="M1 9h20M14 2l7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── Main Dashboard ─────────────────────────────────────────── */
export default function CandidateDashboardClient({
  user,
  initialReports = [],
  initialRole,
  initialView,
}: {
  user: CandidateUser;
  initialReports?: Report[];
  initialRole?: string;
  initialView?: string;
}) {
  const router = useRouter();
  const safeInitialRole = initialRole && ROLE_VISUAL[initialRole] ? initialRole : "";
  const showingResultsDashboard = initialView === "results";
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>(safeInitialRole);
  const [selectedRound, setSelectedRound] = useState<string>(safeInitialRole === "online-assessment" ? "aptitude" : "");
  const [startingInterview, setStartingInterview] = useState(false);
  const [mockResumeText, setMockResumeText] = useState("");
  const [mockResumeFileName, setMockResumeFileName] = useState("");
  const [uploadingMockResume, setUploadingMockResume] = useState(false);
  const [mockResumeError, setMockResumeError] = useState("");
  const [technicalTermsAgreed, setTechnicalTermsAgreed] = useState(false);
  const [technicalPreStartStep, setTechnicalPreStartStep] = useState<"terms" | "camera">("terms");
  const [aptitudePreStartStep, setAptitudePreStartStep] = useState<"terms" | "camera">("terms");
  const [aptitudeTermsAgreed, setAptitudeTermsAgreed] = useState(false);
  const [hrTermsAgreed, setHrTermsAgreed] = useState(false);
  const [dsaTermsAgreed, setDsaTermsAgreed] = useState(false);

  const firstName = user.name?.split(" ")[0] || user.name;
  const showingSweTechnicalTerms = selectedRole === "software-engineer" && selectedRound === "technical";
  const showingAiTechnicalTerms = selectedRole === "ai-ml-engineer" && selectedRound === "technical";
  const showingSdTechnicalTerms = selectedRole === "system-design-architect" && selectedRound === "technical";
  const showingTermsScreen = showingSweTechnicalTerms || showingAiTechnicalTerms || showingSdTechnicalTerms;
  const showingAptitudeTerms = selectedRole === "online-assessment" && selectedRound === "aptitude";
  const showingHrTerms = selectedRole !== "online-assessment" && selectedRound === "hr";
  const showingDsaTerms = selectedRole !== "online-assessment" && selectedRound === "dsa";

  function getRoundLabel(round?: string | null): string {
    if (round === "aptitude") return "Aptitude";
    if (round === "hr")       return "HR";
    if (round === "dsa")      return "DSA";
    return "Technical";
  }

  function isResumeRequired(round: string) {
    return round !== "aptitude" && round !== "dsa";
  }

  async function deleteReport(attemptId: string) {
    if (deletingReportId) return;
    if (!window.confirm("Delete this report permanently?")) return;
    setDeletingReportId(attemptId);
    setDeleteError("");
    try {
      const res = await fetch(`/api/reports?attemptId=${encodeURIComponent(attemptId)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setDeleteError(data.error || "Failed to delete report"); return; }
      setReports((prev) => prev.filter((r) => r.id !== attemptId));
    } catch { setDeleteError("Failed to delete report"); }
    finally { setDeletingReportId(null); }
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!file.name.endsWith(".pdf") && file.type !== "application/pdf") {
      setMockResumeError("Please upload a PDF file."); return;
    }
    setUploadingMockResume(true);
    setMockResumeError("");
    setMockResumeFileName(file.name);
    setTechnicalPreStartStep("terms");
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const res = await fetch("/api/upload-resume", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setMockResumeText(data.text || "");
    } catch (err: unknown) {
      setMockResumeError(err instanceof Error ? err.message : "Failed to parse PDF");
      setMockResumeFileName("");
    } finally { setUploadingMockResume(false); }
  }

  async function startMockInterview() {
    setStartingInterview(true);
    setMockResumeError("");
    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole, isMock: true, resumeText: mockResumeText.trim() || undefined, round: selectedRound }),
      });
      const data = await res.json();
      if (res.ok && data.attemptId) {
        if (selectedRound === "dsa") {
          window.sessionStorage.setItem(`dsaTermsAccepted:${data.attemptId}`, "true");
        }
        router.push(`/interview/${data.attemptId}`);
      } else {
        setMockResumeError(data.error || "Failed to start interview. Please try again.");
      }
    } catch { setMockResumeError("An error occurred. Please try again."); }
    finally { setStartingInterview(false); }
  }

  /* ── ordered role list for cards ── */
  if (!showingResultsDashboard && !selectedRole) {
    return (
      <main className="theme-home-page">
        <div className="theme-home-shell">
          <HomeTopBar name={user.name} signedIn />

          <RolePickerPanel>
            <RoleCardGrid>
              {ROLE_VISUALS.map((role) => (
                <ThemedRoleCard
                  key={role.id}
                  role={role}
                  onStart={() => {
                    setSelectedRole(role.id);
                    if (role.id === "online-assessment") setSelectedRound("aptitude");
                    else setSelectedRound("");
                    setTechnicalPreStartStep("terms");
                    setHrTermsAgreed(false);
                    setDsaTermsAgreed(false);
                  }}
                />
              ))}
            </RoleCardGrid>
          </RolePickerPanel>

          <FeatureShowcase />
        </div>
      </main>
    );
  }

  return (
    <div className="page-wrapper" style={{ background: "var(--bg-primary)" }}>
      <Navbar userName={user.name} />

      <div className="container" style={{ paddingTop: 36, paddingBottom: 60 }}>
        {!showingResultsDashboard && (
          <>
            {(selectedRole === "software-engineer" || selectedRole === "ai-ml-engineer" || selectedRole === "system-design-architect") && !selectedRound ? (
              <SoftwareEngineerRoundSelection
                onSelectRound={(round) => {
                  setSelectedRound(round);
                  setTechnicalPreStartStep("terms");
                  setHrTermsAgreed(false);
                  setDsaTermsAgreed(false);
                }}
                variant={selectedRole === "ai-ml-engineer" ? "ai" : selectedRole === "system-design-architect" ? "sd" : "swe"}
              />
            ) : (
              <>

        {/* ── Welcome ─────────────────────────────────────────── */}
        <div className="fade-in" style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
            Welcome back, {firstName}! 👋
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>Ready to level up your skills today?</p>
        </div>

        {/* ── Role Selection Card ──────────────────────────────── */}
        <RolePickerPanel
          title={showingAptitudeTerms ? null : (showingAiTechnicalTerms ? "Choose Your AI Interview Role" : undefined)}
          subtitle={showingAptitudeTerms ? null : (showingAiTechnicalTerms ? "Select a role and start your AI mock interview" : undefined)}
        >
          {/* Step 1 — role cards */}
          {!selectedRole && (
            <div
              className="home-role-grid"
              style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}
            >
              {ORDERED_ROLE_IDS.map((roleId) => {
                const visual = ROLE_VISUAL[roleId];
                if (!visual) return null;
                return (
                  <div
                    key={roleId}
                    style={{
                      background: "white",
                      border: "1.5px solid var(--border)",
                      borderRadius: "var(--radius-lg)",
                      padding: "22px 16px 18px",
                      textAlign: "center",
                      position: "relative",
                      overflow: "hidden",
                      boxShadow: "var(--shadow-sm)",
                      transition: "all var(--transition)",
                      cursor: "default",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)";
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                      (e.currentTarget as HTMLDivElement).style.borderColor = `${visual.color}40`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-sm)";
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                      (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
                    }}
                  >
                    <CardDecorations color={visual.color} />

                    {/* Icon circle */}
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: visual.bgColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 14px",
                        color: visual.color,
                      }}
                    >
                      <visual.Icon />
                    </div>

                    {/* Title */}
                    <p style={{ fontWeight: 800, fontSize: "1.15rem", color: "var(--text-primary)", marginBottom: 2 }}>
                      {visual.abbr}
                    </p>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 10 }}>
                      {visual.fullName}
                    </p>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 18, lineHeight: 1.5 }}>
                      {visual.topics}
                    </p>

                    {/* Start button */}
                    <button
                      onClick={() => {
                        setSelectedRole(roleId);
                        if (roleId === "online-assessment") setSelectedRound("aptitude");
                        else setSelectedRound("");
                        setTechnicalPreStartStep("terms");
                        setHrTermsAgreed(false);
                        setDsaTermsAgreed(false);
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        width: "100%",
                        padding: "9px 16px",
                        borderRadius: "var(--radius-md)",
                        border: `1.5px solid ${visual.btnColor}40`,
                        background: `${visual.btnColor}0d`,
                        color: visual.btnColor,
                        fontWeight: 600,
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        transition: "all var(--transition)",
                        fontFamily: "Inter, sans-serif",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = `${visual.btnColor}18`;
                        (e.currentTarget as HTMLButtonElement).style.borderColor = `${visual.btnColor}80`;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = `${visual.btnColor}0d`;
                        (e.currentTarget as HTMLButtonElement).style.borderColor = `${visual.btnColor}40`;
                      }}
                    >
                      Start Interview
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 2 — round selection (not for aptitude, already set) */}
          {selectedRole && !selectedRound && (
            <div className="fade-in">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <button
                  type="button"
                  onClick={() => { setSelectedRole(""); setSelectedRound(""); setTechnicalPreStartStep("terms"); }}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                >
                  ← Back
                </button>
                {(() => {
                  const visual = ROLE_VISUAL[selectedRole];
                  if (!visual) return null;
                  return (
                    <>
                      <span style={{ fontSize: "1.1rem", display: "inline-flex", alignItems: "center" }}>
                        {visual.Icon && (
                          <span style={{ color: visual.color, display: "inline-flex", alignItems: "center" }}>
                            <visual.Icon />
                          </span>
                        )}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                        {visual.fullName}
                      </span>
                    </>
                  );
                })()}
              </div>
              <div className="round-section-header">
                <span className="round-section-label">🏁 Select Round</span>
                <div className="round-section-line" />
              </div>
              <div className="rounds-grid">
                {ROUNDS.map((round) => (
                  <div
                    key={round.id}
                    onClick={() => {
                      if (round.available) {
                        setSelectedRound(round.id);
                        setTechnicalPreStartStep("terms");
                        setHrTermsAgreed(false);
                        setDsaTermsAgreed(false);
                      }
                    }}
                    className={`round-card ${round.available ? "clickable" : "disabled"}`}
                  >
                    <span className="round-card-icon">{round.icon}</span>
                    <div className="round-card-name">{round.label}</div>
                    <div className={`round-card-badge ${round.available ? "round-badge-active" : "round-badge-soon"}`}>
                      {round.available ? "Available" : "Coming Soon"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — resume + start */}
          {selectedRole && selectedRound && (
            showingAptitudeTerms ? (
              aptitudePreStartStep === "terms" ? (
                <AptitudeTermsScreen
                  agreed={aptitudeTermsAgreed}
                  onAgreedChange={setAptitudeTermsAgreed}
                  onCancel={() => { setSelectedRole(""); setSelectedRound(""); setAptitudeTermsAgreed(false); setAptitudePreStartStep("terms"); }}
                  onStartTest={() => setAptitudePreStartStep("camera")}
                />
              ) : (
                <AptitudeCameraVerification
                  starting={startingInterview}
                  onBack={() => setAptitudePreStartStep("terms")}
                  onStart={startMockInterview}
                />
              )
            ) : showingTermsScreen ? (
              <TechnicalTermsScreen
                variant={showingAiTechnicalTerms ? "ai" : showingSdTechnicalTerms ? "sd" : "swe"}
                fileName={mockResumeFileName}
                resumeReady={Boolean(mockResumeText.trim())}
                uploading={uploadingMockResume}
                error={mockResumeError}
                agreed={technicalTermsAgreed}
                starting={startingInterview}
                onFileChange={handlePdfUpload}
                onClear={() => {
                  setMockResumeText("");
                  setMockResumeFileName("");
                  setMockResumeError("");
                  setTechnicalPreStartStep("terms");
                }}
                onAgreedChange={setTechnicalTermsAgreed}
                onProceed={startMockInterview}
              />
            ) : showingHrTerms ? (
              <HRTermsScreen
                fileName={mockResumeFileName}
                resumeReady={Boolean(mockResumeText.trim())}
                uploading={uploadingMockResume}
                error={mockResumeError}
                agreed={hrTermsAgreed}
                onFileChange={handlePdfUpload}
                onClear={() => {
                  setMockResumeText("");
                  setMockResumeFileName("");
                  setMockResumeError("");
                }}
                onAgreedChange={setHrTermsAgreed}
                onBack={() => {
                  setSelectedRound("");
                  setMockResumeText("");
                  setMockResumeFileName("");
                  setMockResumeError("");
                  setHrTermsAgreed(false);
                }}
                onStart={startMockInterview}
                starting={startingInterview}
              />
            ) : showingDsaTerms ? (
              <DSATermsScreen
                agreed={dsaTermsAgreed}
                onAgreedChange={setDsaTermsAgreed}
                onBack={() => {
                  setSelectedRound("");
                  setDsaTermsAgreed(false);
                }}
                onStart={startMockInterview}
                starting={startingInterview}
              />
            ) : (
              <div className="fade-in">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedRole === "online-assessment") { setSelectedRole(""); setSelectedRound(""); }
                    else setSelectedRound("");
                    setMockResumeText(""); setMockResumeFileName(""); setMockResumeError(""); setTechnicalTermsAgreed(false); setHrTermsAgreed(false); setDsaTermsAgreed(false);
                    setTechnicalPreStartStep("terms");
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                >
                  ← Back
                </button>
                <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                  {ROLE_VISUAL[selectedRole]?.fullName}
                </span>
                {selectedRole !== "online-assessment" && (
                  <>
                    <span style={{ color: "var(--text-muted)" }}>/</span>
                    <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--indigo)" }}>
                      {ROUNDS.find((r) => r.id === selectedRound)?.label ?? "Aptitude Round"}
                    </span>
                  </>
                )}
              </div>

              {isResumeRequired(selectedRound) && (
                <ResumeUpload
                  fileName={mockResumeFileName}
                  uploading={uploadingMockResume}
                  error={mockResumeError}
                  onChange={handlePdfUpload}
                  onClear={() => { setMockResumeText(""); setMockResumeFileName(""); setMockResumeError(""); }}
                />
              )}

              <button
                onClick={startMockInterview}
                disabled={startingInterview || uploadingMockResume || (isResumeRequired(selectedRound) && !mockResumeText.trim())}
                className="btn btn-primary btn-full"
                style={{ marginTop: 20 }}
              >
                {startingInterview ? (
                  <><span className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} /> Starting…</>
                ) : (
                  "🎯 Start Mock Interview"
                )}
              </button>
              </div>
            )
          )}
        </RolePickerPanel>

        {/* ── Features Section ─────────────────────────────────── */}
        {!showingTermsScreen && !showingAptitudeTerms && !showingHrTerms && !showingDsaTerms && (
          <div style={{ marginBottom: 48 }}>
            <FeatureShowcase />
          </div>
        )}
              </>
            )}
          </>
        )}

        {/* ── Completed Interviews ─────────────────────────────── */}
        {showingResultsDashboard && (
        <div
          style={{
            background: "white",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-sm)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontWeight: 700, color: "var(--text-primary)" }}>📋 Your Completed Interviews</h3>
          </div>

          {deleteError && <div className="alert alert-error" style={{ margin: "12px 28px" }}>⚠️ {deleteError}</div>}

          {reports.length === 0 ? (
            <div style={{ textAlign: "center", padding: "56px 24px" }}>
              <div style={{ fontSize: "3rem", marginBottom: 12 }}>📄</div>
              <p style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>No interviews yet</p>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                Start a mock interview above to begin your practice journey!
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Role</th>
                    <th>Round</th>
                    <th>Score</th>
                    <th>Date</th>
                    <th style={{ textAlign: "right", paddingRight: 28 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => {
                    const roleData = INTERVIEW_ROLES.find((ro) => ro.id === r.role);
                    const isAptitude = r.round === "aptitude";
                    const displayRole = isAptitude ? "General Aptitude" : roleData?.label || r.role;
                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600, paddingLeft: 28 }}>
                          {r.session_title || `${displayRole} Practice`}
                        </td>
                        <td>
                          <span className="badge badge-indigo">{displayRole}</span>
                        </td>
                        <td>
                          <span className="badge badge-cyan">{getRoundLabel(r.round)}</span>
                        </td>
                        <td>
                          <span style={{
                            fontWeight: 700,
                            color: r.score >= 70 ? "var(--emerald)" : r.score >= 50 ? "#b45309" : "var(--rose)",
                          }}>
                            {r.score}/100
                          </span>
                        </td>
                        <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          {new Date(r.completed_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td style={{ textAlign: "right", paddingRight: 28 }}>
                          <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
                            <a
                              href={`/report/${r.id}`}
                              className="btn btn-secondary btn-sm"
                              style={{ textDecoration: "none" }}
                            >
                              View
                            </a>
                            <button
                              type="button"
                              onClick={() => deleteReport(r.id)}
                              className="btn btn-danger btn-sm"
                              disabled={deletingReportId === r.id}
                            >
                              {deletingReportId === r.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
