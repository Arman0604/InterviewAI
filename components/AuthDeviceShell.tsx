"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { Bot, Sparkles, TrendingUp } from "lucide-react";

type AuthDeviceShellProps = {
  ariaLabel: string;
  browserPath: string;
  children: ReactNode;
};

export default function AuthDeviceShell({
  ariaLabel,
  browserPath,
  children,
}: AuthDeviceShellProps) {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let frame = 0;

    const syncDeviceScale = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const stageWidth = stage.clientWidth;
        const stageHeight = stage.clientHeight;
        const widthScale = (stageWidth * 0.58) / 1120;
        const heightScale = (stageHeight * 0.86) / 752;
        const scale = Math.min(widthScale, heightScale);

        stage.style.setProperty("--mock-device-scale", scale.toString());
      });
    };

    const observer = new ResizeObserver(syncDeviceScale);

    syncDeviceScale();
    observer.observe(stage);
    window.addEventListener("resize", syncDeviceScale);
    window.visualViewport?.addEventListener("resize", syncDeviceScale);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", syncDeviceScale);
      window.visualViewport?.removeEventListener("resize", syncDeviceScale);
    };
  }, []);

  return (
    <main className="mock-login-scene">
      <div className="mock-login-stage" ref={stageRef}>
        <section className="mock-login-device" aria-label={ariaLabel}>
          <div className="mock-browser-bar">
            <div className="mock-window-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="mock-url-pill">{browserPath}</div>
            <div className="mock-user-chip" aria-hidden="true">A</div>
          </div>

          <div className="mock-login-shell">
            <aside className="mock-login-brand">
              <Link href="/login" className="mock-login-logo">
                <span>IA</span>
                InterviewAI
              </Link>

              <div className="mock-login-copy">
                <h1>
                  Ace Interviews.
                  <br />
                  Build Your <span>Future.</span>
                </h1>
                <p>
                  AI-powered mock interviews tailored to your role. Practice, improve,
                  and get interview ready.
                </p>
              </div>

              <div className="mock-feature-list">
                <div>
                  <span className="mock-feature-icon purple"><Bot size={16} /></span>
                  <div>
                    <strong>AI Interviewer</strong>
                    <small>Realistic AI interviews tailored to your role</small>
                  </div>
                </div>
                <div>
                  <span className="mock-feature-icon green"><TrendingUp size={16} /></span>
                  <div>
                    <strong>Smart Feedback</strong>
                    <small>Get actionable feedback to improve faster</small>
                  </div>
                </div>
                <div>
                  <span className="mock-feature-icon amber"><Sparkles size={16} /></span>
                  <div>
                    <strong>Track Progress</strong>
                    <small>Monitor your performance and boost confidence</small>
                  </div>
                </div>
              </div>

              <div className="mock-desk-art" aria-hidden="true">
                <div className="mock-plant">
                  <i />
                  <i />
                  <i />
                  <span />
                </div>
                <div className="mock-laptop">
                  <div className="mock-laptop-screen">
                    <div className="mock-avatar" />
                    <div className="mock-lines">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="mock-score">92%</div>
                  </div>
                  <div className="mock-laptop-base" />
                </div>
                <div className="mock-mug">IA</div>
              </div>
            </aside>

            <section className="mock-login-panel">
              <div className="mock-login-topnote">
                <strong>Welcome, Candidate!</strong>
              </div>

              {children}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
