"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  Brain,
  ChevronDown,
  Code2,
  Cuboid,
  NotebookTabs,
} from "lucide-react";
import { useState } from "react";
import type { ComponentType, ReactNode } from "react";

type RoleTone = "violet" | "green" | "orange" | "blue";

export type RoleVisual = {
  id: string;
  abbr: string;
  fullName: string;
  subtitle: string;
  description: string;
  topics: string;
  tone: RoleTone;
  accent: string;
  soft: string;
  art: string;
  Icon: ComponentType<{ size?: number; strokeWidth?: number }>;
};

export const ROLE_VISUALS: RoleVisual[] = [
  {
    id: "software-engineer",
    abbr: "SWE",
    fullName: "Software Engineer",
    subtitle: "Vector Coding Interview",
    description: "Behaves a detailed coding environment, codios, and complex environment.",
    topics: "DSA, System Design, Coding and more",
    tone: "violet",
    accent: "#4f46e5",
    soft: "#ece9ff",
    art: "/role-card-art-swe.webp",
    Icon: Code2,
  },
  {
    id: "ai-ml-engineer",
    abbr: "AI",
    fullName: "Artificial Intelligence",
    subtitle: "Evector Network Model",
    description: "Creates vector network model human brain, sand gowling introspected nodews.",
    topics: "ML, DL, NLP, Computer Vision and more",
    tone: "green",
    accent: "#12a36b",
    soft: "#dff8eb",
    art: "/role-card-art-ai.webp",
    Icon: Brain,
  },
  {
    id: "system-design-architect",
    abbr: "SD",
    fullName: "System Design",
    subtitle: "Vector Server Architecture",
    description: "Detailed vector cloud architecture, cinplex system and complex system diagrams.",
    topics: "High level design, Architecture and more",
    tone: "orange",
    accent: "#f97316",
    soft: "#fff0dc",
    art: "/role-card-art-sd.webp",
    Icon: Cuboid,
  },
  {
    id: "online-assessment",
    abbr: "Aptitude",
    fullName: "Aptitude & Reasoning",
    subtitle: "Puzzles and Logic Problems",
    description: "Complex vector puzzles and logic problems and meerie problems.",
    topics: "Quantitative, Logical, Verbal and more",
    tone: "blue",
    accent: "#0d6bff",
    soft: "#e8f0ff",
    art: "/role-card-art-aptitude.webp",
    Icon: NotebookTabs,
  },
];

export function getRoleVisual(roleId: string) {
  return ROLE_VISUALS.find((role) => role.id === roleId);
}

type RoleCardProps = {
  role: RoleVisual;
  href?: string;
  onStart?: () => void;
};

export function ThemedRoleCard({ role, href, onStart }: RoleCardProps) {
  const body = (
    <div className={`theme-role-card theme-role-card-${role.tone}`} style={{ ["--role-accent" as string]: role.accent, ["--role-soft" as string]: role.soft, ["--role-art" as string]: `url(${role.art})` }}>
      <h3>{role.abbr}</h3>
      <p className="theme-role-name">{role.subtitle}</p>
      <p className="theme-role-topics">{role.description}</p>
      <span className="theme-start-button">
        Explore now
        <ArrowRight size={18} strokeWidth={2.4} />
      </span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="theme-card-link" aria-label={`Explore ${role.fullName} interview`}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" className="theme-card-button" onClick={onStart} aria-label={`Explore ${role.fullName} interview`}>
      {body}
    </button>
  );
}

export function RolePickerPanel({
  title = "Choose Your Interview Role",
  subtitle = "Select a role and start your AI mock interview",
  children,
}: {
  title?: string | null;
  subtitle?: string | null;
  children: ReactNode;
}) {
  return (
    <section className="theme-panel theme-role-panel">
      {title && <h2>{title}</h2>}
      {subtitle && <p>{subtitle}</p>}
      {children}
    </section>
  );
}

export function RoleCardGrid({ children }: { children: ReactNode }) {
  return <div className="theme-role-grid">{children}</div>;
}

const FEATURE_CARDS = [
  {
    title: "AI Interviewer",
    desc: "Talk to an advanced AI interviewer that simulates real interview scenarios.",
    art: "/feature-card-ai-interviewer.svg",
    exactArt: true,
    accent: "#7d63ff",
  },
  {
    title: "Role-based Questions",
    desc: "Practice questions curated specifically for your selected role and level.",
    art: "/feature-card-role-questions.svg",
    exactArt: true,
    accent: "#6ea4ff",
  },
  {
    title: "Instant Feedback",
    desc: "Get real-time feedback on your answers with suggestions for improvement.",
    art: "/feature-card-instant-feedback.svg",
    exactArt: true,
    accent: "#46d6a4",
  },
  {
    title: "Smart Evaluation",
    desc: "AI evaluates your responses on multiple parameters with accuracy.",
    art: "/feature-card-smart-evaluation.svg",
    exactArt: true,
    accent: "#aa7bff",
  },
  {
    title: "Voice-based Interviews",
    desc: "Experience real interviews with voice-to-voice conversations.",
    art: "/feature-card-voice-interviews.svg",
    exactArt: true,
    accent: "#8d68ff",
  },
  {
    title: "Progress Tracking",
    desc: "Track your improvement over time and stay consistent.",
    art: "/feature-card-progress-tracking.svg",
    exactArt: true,
    accent: "#5a98ff",
  },
  {
    title: "Interview History",
    desc: "Review your past interviews, scores, feedback, and performance trends to track your growth over time.",
    art: "/feature-card-interview-history.svg",
    exactArt: true,
    accent: "#ff9b57",
  },
  {
    title: "Adaptive Difficulty",
    desc: "Questions adapt to your performance and challenge you better.",
    art: "/feature-card-adaptive-difficulty.svg",
    exactArt: true,
    accent: "#f1b637",
  },
];

export function FeatureShowcase({ withHero = true }: { withHero?: boolean }) {
  return (
    <section className="theme-panel theme-feature-panel">
      <div className="theme-feature-hero">
        <div>
          <h2>
            Everything you need to ace
            <br />
            your interviews
          </h2>
          <p>Powerful features built to help you practice, improve and succeed.</p>
        </div>
        {withHero && (
          <div className="theme-boy-wrap" aria-hidden="true">
            <Image
              src="/hero-boy.webp"
              alt=""
              width={760}
              height={390}
              sizes="(max-width: 1024px) 90vw, 760px"
              priority={withHero}
              className="theme-boy-image"
            />
          </div>
        )}
      </div>

      <h2 className="theme-feature-grid-title">Feature Highlights</h2>

      <div className="theme-feature-grid">
        {FEATURE_CARDS.map((feature) => (
          <article
            key={feature.title}
            className={`theme-feature-card${feature.exactArt ? " theme-feature-card-exact-art" : ""}`}
            style={{ ["--feature-accent" as string]: feature.accent }}
          >
            <div className="theme-feature-art">
              <Image
                src={feature.art}
                alt=""
                width={320}
                height={250}
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 44vw, 23vw"
                className="theme-feature-art-image"
              />
            </div>
            <div className="theme-feature-copy">
              <div className="theme-feature-title-row">
                <h3>{feature.title}</h3>
              </div>
              <p>{feature.desc}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HomeTopBar({
  name,
  signedIn = false,
}: {
  name: string;
  signedIn?: boolean;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "A";

  async function handleSignOut() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="theme-home-topbar">
      <div>
        <h1>
          Welcome back, {name}! <span aria-hidden="true">{"\uD83D\uDC4B"}</span>
        </h1>
        <p>Ready to level up your skills today?</p>
      </div>
      {signedIn ? (
        <div className="theme-user-menu-wrap">
          <button
            type="button"
            className="theme-user-menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="theme-avatar">{initial}</span>
            <span>{name}</span>
            <ChevronDown size={18} />
          </button>
          {menuOpen && (
            <div className="theme-user-dropdown" role="menu">
              <Link
                href="/candidate/dashboard?view=results"
                className="theme-user-dropdown-item theme-user-dashboard-link"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
              <button type="button" role="menuitem" onClick={handleSignOut} disabled={loggingOut}>
                {loggingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="theme-auth-actions">
          <Link href="/login" className="theme-light-action">Sign In</Link>
          <Link href="/register" className="theme-primary-action">Get Started</Link>
        </div>
      )}
    </header>
  );
}

export function BookmarkIcon() {
  return <Bookmark size={16} />;
}
