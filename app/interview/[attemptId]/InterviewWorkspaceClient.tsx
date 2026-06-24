"use client";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Message } from "@/lib/interview-engine";
import { INTERVIEW_ROLES } from "@/lib/roles";
import VideoProctoring, { ProctoringPolicyAction } from "@/components/VideoProctoring";

interface AptitudeQuestion {
  id: string;
  topic: string;
  question: string;
  options: [string, string, string, string];
  answer: "A" | "B" | "C" | "D";
}

interface Props {
  attemptId: string;
  candidateName: string;
  initialAttempt: {
    id: string;
    role: string;
    conversation: string;
    status: string;
    round?: string;
  };
  aptitudeQuestions?: AptitudeQuestion[];
}

const FEMALE_VOICE_KEYWORDS = [
  "female",
  "woman",
  "zira",
  "jenny",
  "aria",
  "ava",
  "hazel",
  "susan",
  "sara",
  "sarah",
  "anna",
  "ana",
  "amy",
  "alice",
  "alisa",
  "alina",
  "sofia",
  "sophia",
  "alicia",
  "linda",
  "helen",
  "catherine",
  "katya",
  "elsa",
  "monica",
  "nancy",
  "emma",
  "samantha",
  "victoria",
  "karen",
  "moira",
  "tessa",
  "fiona",
  "susan",
  "allison",
  "joanna",
  "kendra",
  "kimberly",
  "salli",
  "ivy",
  "nicole",
  "olivia",
  "serena",
  "sonia",
  "libby",
  "natasha",
  "heera",
  "neerja",
  "priya",
];

const MALE_VOICE_KEYWORDS = [
  "male",
  "man",
  "david",
  "mark",
  "guy",
  "george",
  "daniel",
  "james",
  "fred",
  "alex",
  "tom",
  "ryan",
  "ravi",
];

const FEMALE_VOICE_UNAVAILABLE_ERROR =
  "Female voice is not available in this browser. Please install or enable an English female system voice.";
const SPEECH_CANCEL_SETTLE_MS = 180;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isMaleVoice(voice: SpeechSynthesisVoice) {
  const name = voice.name.toLowerCase();
  return MALE_VOICE_KEYWORDS.some((keyword) => name.includes(keyword));
}

function findFemaleVoice(voices: SpeechSynthesisVoice[]) {
  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  const usableVoices = englishVoices.filter((voice) => !isMaleVoice(voice));

  return (
    usableVoices.find((voice) => voice.name.toLowerCase().includes("zira")) ||
    usableVoices.find((voice) => voice.name.toLowerCase().includes("jenny")) ||
    usableVoices.find((voice) => voice.name.toLowerCase().includes("aria")) ||
    usableVoices.find((voice) => voice.name.toLowerCase().includes("google uk english female")) ||
    usableVoices.find((voice) =>
      FEMALE_VOICE_KEYWORDS.some((keyword) => voice.name.toLowerCase().includes(keyword))
    ) ||
    usableVoices.find((voice) => voice.default) ||
    usableVoices.find((voice) => voice.name.toLowerCase().includes("google us english")) ||
    usableVoices[0] ||
    null
  );
}

function loadSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !window.speechSynthesis) return Promise.resolve([]);

  const synthesis = window.speechSynthesis;
  const voices = synthesis.getVoices();
  if (voices.length > 0) return Promise.resolve(voices);

  return new Promise((resolve) => {
    let settled = false;

    const finish = (nextVoices: SpeechSynthesisVoice[]) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      window.clearInterval(poll);
      synthesis.onvoiceschanged = null;
      resolve(nextVoices);
    };

    const poll = window.setInterval(() => {
      const nextVoices = synthesis.getVoices();
      if (nextVoices.length > 0) finish(nextVoices);
    }, 150);

    const timeout = window.setTimeout(() => {
      finish(synthesis.getVoices());
    }, 2500);

    synthesis.onvoiceschanged = () => {
      finish(synthesis.getVoices());
    };
  });
}

function normalizeSpeechText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function removeWavingHands(value: string) {
  return value
    .replace(/[ \t]*(?:\u{1F44B}[\u{1F3FB}-\u{1F3FF}]?|ðŸ‘‹)[ \t]*/gu, " ")
    .replace(/! +I'm/g, "! I'm")
    .replace(/! +I am/g, "! I am");
}

function microphoneAccessErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";

  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Microphone access is blocked. Allow microphone permission for this site in the browser address-bar settings, then try again. If Google Search mic also fails, check Windows microphone privacy/input settings.";
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No microphone was found. Connect or enable a microphone, then try again.";
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return "The microphone is already in use or unavailable. Close other apps using the mic and try again.";
  }

  return "Could not start the microphone. Check browser permission and your system input device, then try again.";
}

function speechRecognitionErrorMessage(errorCode: string) {
  if (errorCode === "not-allowed" || errorCode === "service-not-allowed") {
    return "Speech recognition is blocked. Allow microphone permission for this site and enable browser speech services.";
  }

  if (errorCode === "audio-capture") {
    return "The browser cannot capture audio from your microphone. Check the selected input device and system microphone permissions.";
  }

  if (errorCode === "no-speech") {
    return "No speech was detected. Please keep the mic on, speak clearly, and try again.";
  }

  if (errorCode === "network") {
    return "";
  }

  return "Speech recognition stopped unexpectedly. Please try again or type your answer manually.";
}

export default function InterviewWorkspaceClient({ attemptId, candidateName, initialAttempt, aptitudeQuestions = [] }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [answer, setAnswer] = useState("");
  const [sending, setSending] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [error, setError] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Advanced: Voice States
  const [voiceEnabled, setVoiceEnabled] = useState(
    initialAttempt.role === "software-engineer" ||
      initialAttempt.role === "ai-ml-engineer" ||
      initialAttempt.role === "system-design-architect"
  );
  const [speechInputAvailable, setSpeechInputAvailable] = useState(true);
  const [isListening, setIsListening] = useState(false);

  // Webcam proctoring gates the round before any candidate interaction starts.
  const [proctoringReady, setProctoringReady] = useState(false);
  const [proctoringViolations, setProctoringViolations] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const recognitionBaseAnswerRef = useRef("");
  const recognitionFinalRef = useRef("");
  const recognitionInterimRef = useRef("");
  const listeningIntentRef = useRef(false);
  const aptitudeSubmittedRef = useRef(false);
  const aptitudeAnswersRef = useRef<Record<string, string>>({});
  const proctoringPolicyTriggeredRef = useRef(false);
  const speechRequestRef = useRef(0);
  const autoSubmitAptitudeRef = useRef<(isAutoSubmit?: boolean) => void>(() => undefined);
  const roleData = INTERVIEW_ROLES.find((r) => r.id === initialAttempt.role);
  const isAptitude = initialAttempt.round === "aptitude";
  const isSweInterview = initialAttempt.role === "software-engineer";
  const isAiMlInterview = initialAttempt.role === "ai-ml-engineer";
  const isSdInterview = initialAttempt.role === "system-design-architect";
  const [aptitudeAnswers, setAptitudeAnswers] = useState<Record<string, string>>({});
  const [currentAptitudeIndex, setCurrentAptitudeIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  useEffect(() => {
    aptitudeAnswersRef.current = aptitudeAnswers;
  }, [aptitudeAnswers]);

  // Load chat history
  useEffect(() => {
    if (initialAttempt.conversation) {
      try {
        setMessages(JSON.parse(initialAttempt.conversation));
      } catch (err) {
        console.error(err);
      }
    }
  }, [initialAttempt]);

  function getSpeechDraft() {
    return normalizeSpeechText(
      [
        recognitionBaseAnswerRef.current,
        recognitionFinalRef.current,
        recognitionInterimRef.current,
      ]
        .filter(Boolean)
        .join(" ")
    );
  }

  function syncSpeechDraftToAnswer() {
    setAnswer(getSpeechDraft());
  }

  function commitInterimSpeech() {
    const interim = normalizeSpeechText(recognitionInterimRef.current);
    if (interim) {
      recognitionFinalRef.current = normalizeSpeechText(
        [recognitionFinalRef.current, interim].filter(Boolean).join(" ")
      );
      recognitionInterimRef.current = "";
      syncSpeechDraftToAnswer();
    }
  }

  function stopListening() {
    listeningIntentRef.current = false;
    commitInterimSpeech();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // SpeechRecognition can throw if it already stopped.
      }
    }
    setIsListening(false);
  }

  async function ensureMicrophoneAccess() {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new DOMException("Microphone capture is not supported", "NotFoundError");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
  }

  // Handle Speech Recognition Setup
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = navigator.language?.startsWith("en") ? navigator.language : "en-US";

        rec.onstart = () => {
          setIsListening(true);
        };

        rec.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += ` ${transcript}`;
            } else {
              interimTranscript += ` ${transcript}`;
            }
          }

          if (finalTranscript) {
            recognitionFinalRef.current = normalizeSpeechText(
              [recognitionFinalRef.current, finalTranscript].filter(Boolean).join(" ")
            );
          }
          recognitionInterimRef.current = normalizeSpeechText(interimTranscript);
          syncSpeechDraftToAnswer();
        };

        rec.onerror = (err: any) => {
          console.error("Speech recognition error", err);
          listeningIntentRef.current = false;
          commitInterimSpeech();
          const errorCode = err?.error ?? "";
          if (errorCode === "network") {
            setSpeechInputAvailable(false);
            setError("");
          } else if (errorCode !== "aborted" && errorCode !== "no-speech") {
            setError(speechRecognitionErrorMessage(err?.error ?? ""));
          }
          setIsListening(false);
        };

        rec.onend = () => {
          commitInterimSpeech();
          listeningIntentRef.current = false;
          setIsListening(false);
        };

        recognitionRef.current = rec;
      } else {
        setSpeechInputAvailable(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isAptitude || isComplete || finishing || !proctoringReady) return;

    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          autoSubmitAptitudeRef.current(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isAptitude, isComplete, finishing, proctoringReady]);

  // Voice output generation
  async function speakText(text: string) {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const requestId = speechRequestRef.current + 1;
      speechRequestRef.current = requestId;
      window.speechSynthesis.cancel(); // Stop talking
      const cleanText = text.replace(/INTERVIEW_COMPLETE/gi, "").trim();
      if (!cleanText) return;

      await wait(SPEECH_CANCEL_SETTLE_MS);
      if (requestId !== speechRequestRef.current || !voiceEnabled) return;

      const voices = await loadSpeechVoices();
      if (requestId !== speechRequestRef.current || !voiceEnabled) return;

      const preferred = findFemaleVoice(voices);
      if (!preferred) {
        setVoiceEnabled(false);
        setError((current) =>
          current === FEMALE_VOICE_UNAVAILABLE_ERROR ? "" : current
        );
        return;
      }

      setError((current) =>
        current === FEMALE_VOICE_UNAVAILABLE_ERROR ? "" : current
      );

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05;
      utterance.pitch = 1.08;
      utterance.lang = preferred.lang || "en-US";
      utterance.voice = preferred;

      window.speechSynthesis.speak(utterance);
    }
  }

  // Speak last interviewer bubble if Voice Mode gets toggled on
  useEffect(() => {
    if (voiceEnabled && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "interviewer") {
        void speakText(displayMessageContent(lastMsg));
      }
    } else if (!voiceEnabled) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        speechRequestRef.current += 1;
        window.speechSynthesis.cancel();
      }
    }
  }, [voiceEnabled, messages]);

  // Cleanup synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        speechRequestRef.current += 1;
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiTyping]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function toggleListening() {
    if (!speechInputAvailable) return;

    if (!recognitionRef.current) {
      setSpeechInputAvailable(false);
      setError("");
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    try {
      await ensureMicrophoneAccess();
    } catch (err) {
      setError(microphoneAccessErrorMessage(err));
      setIsListening(false);
      return;
    }

    try {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        speechRequestRef.current += 1;
        window.speechSynthesis.cancel();
      }

      recognitionBaseAnswerRef.current = normalizeSpeechText(answer);
      recognitionFinalRef.current = "";
      recognitionInterimRef.current = "";
      listeningIntentRef.current = true;
      setError("");
      setIsListening(true);
      recognitionRef.current.start();
    } catch (err) {
      console.error("Start speech failed", err);
      listeningIntentRef.current = false;
      setSpeechInputAvailable(false);
      setError("");
      setIsListening(false);
    }
  }

  async function handleProctorPolicyAction(action: ProctoringPolicyAction) {
    if (proctoringPolicyTriggeredRef.current) return;
    proctoringPolicyTriggeredRef.current = true;
    setLeaving(true);
    setFinishing(false);
    setIsComplete(true);
    setIsAiTyping(false);
    setError(
      `Proctoring policy limit exceeded after ${action.violationCount} total violations. This round will end without a report or score.`
    );

    if (typeof window !== "undefined" && window.speechSynthesis) {
      speechRequestRef.current += 1;
      window.speechSynthesis.cancel();
    }
    if (isListening) stopListening();

    try {
      await fetch("/api/interview/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
    } finally {
      router.push("/candidate/dashboard");
    }
  }

  async function handleLeaveInterview() {
    if (leaving) return;

    if (typeof window !== "undefined" && window.speechSynthesis) {
      speechRequestRef.current += 1;
      window.speechSynthesis.cancel();
    }
    if (isListening) stopListening();

    setLeaving(true);
    setError("");
    try {
      const res = await fetch("/api/interview/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to leave interview.");
        setLeaving(false);
        return;
      }
      router.push("/candidate/dashboard");
    } catch (err) {
      setError("Connection lost. Could not leave the interview.");
      setLeaving(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const candidateText = normalizeSpeechText(isListening ? getSpeechDraft() : answer);
    if (!candidateText || sending || isAiTyping || isComplete) return;

    // Stop listening before submitting
    if (isListening) stopListening();
    setAnswer("");
    setError("");

    // optimistic candidate message
    const newMsg: Message = {
      role: "candidate",
      content: candidateText,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);

    setSending(true);
    setIsAiTyping(true);

    try {
      const res = await fetch("/api/interview/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, answer: candidateText }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to deliver message");
        setIsAiTyping(false);
        setSending(false);
        return;
      }

      if (data.question) {
        const nextQ = data.question;
        setMessages((prev) => [
          ...prev,
          {
            role: "interviewer",
            content: nextQ,
            timestamp: new Date().toISOString(),
          },
        ]);
      }

      if (data.isComplete) {
        setIsComplete(true);
        setTimeout(() => {
          handleEndInterview();
        }, 1200);
      }
    } catch (err) {
      setError("Connection lost. Message delivery failed.");
    } finally {
      setIsAiTyping(false);
      setSending(false);
    }
  }

  async function handleEndInterview() {
    // Stop synthesis
    if (typeof window !== "undefined" && window.speechSynthesis) {
      speechRequestRef.current += 1;
      window.speechSynthesis.cancel();
    }
    setFinishing(true);
    setIsAiTyping(true);
    try {
      const res = await fetch("/api/interview/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      if (res.ok) {
        router.push(`/report/${attemptId}`);
      } else {
        setError("Failed to generate your evaluation report.");
      }
    } catch (err) {
      setError("An error occurred generating your report.");
    } finally {
      setFinishing(false);
      setIsAiTyping(false);
    }
  }

  async function handleSubmitAptitude(isAutoSubmit = false) {
    if (aptitudeSubmittedRef.current || finishing) return;

    aptitudeSubmittedRef.current = true;
    setFinishing(true);
    setIsComplete(true);
    setError("");

    try {
      const res = await fetch("/api/interview/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, aptitudeAnswers: aptitudeAnswersRef.current }),
      });

      if (res.ok) {
        router.push(`/report/${attemptId}`);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || (isAutoSubmit ? "Time is up, but auto-submit failed." : "Failed to submit aptitude round."));
        aptitudeSubmittedRef.current = false;
        setIsComplete(false);
      }
    } catch {
      setError(isAutoSubmit ? "Time is up, but auto-submit failed." : "Connection lost. Could not submit aptitude round.");
      aptitudeSubmittedRef.current = false;
      setIsComplete(false);
    } finally {
      setFinishing(false);
    }
  }

  useEffect(() => {
    autoSubmitAptitudeRef.current = handleSubmitAptitude;
  });

  function isIntroMessage(content: string): boolean {
    const normalized = content.toLowerCase();
    return (
      normalized.includes("brief introduction") ||
      normalized.includes("about yourself") ||
      normalized.includes("before we dive into the technical questions")
    );
  }

  function isOutroMessage(content: string): boolean {
    const OUTRO_MESSAGES = [
      "That brings us to the end of today's interview",
      "We've reached the end of the interview"
    ];
    return OUTRO_MESSAGES.some((msg) => content.includes(msg));
  }

  function isChallengeMessage(content: string): boolean {
    return /^(Are you sure\?|Interesting\. Can you walk me through your reasoning\?|Okay\. Can you think of a more precise answer\?)/i.test(
      content.trim()
    );
  }

  function isIrrelevantPrompt(content: string): boolean {
    return /^(I don't see how that relates|Could you answer in the context of (?:the [\w-]+ )?question\?)/i.test(
      content.trim()
    );
  }

  function isFollowUpMessage(content: string): boolean {
    return /\b(?:quick|brief)\s+follow-up\b|\bone\s+follow-up\b/i.test(content);
  }

  const isHR = initialAttempt.round === "hr";
  const totalQuestionsLimit = isHR ? 7 : 10;

  function getQuestionProgressCount(): number {
    if (isHR) {
      return messages.filter((m) => {
        if (m.role !== "interviewer") return false;
        if (isIntroMessage(m.content)) return false;
        if (isOutroMessage(m.content)) return false;
        return true;
      }).length;
    }

    let technicalQuestionIndex = 0;
    let phase = "introduction";
    let isFirstInterviewerMessage = true;
    let hasTechnicalQuestionStarted = false;

    const hasExpAskedInHistory = messages.some(
      (m) =>
        m.role === "interviewer" &&
        (m.content.toLowerCase().includes("work experience") ||
          m.content.toLowerCase().includes("responsibilities") ||
          m.content.toLowerCase().includes("day-to-day responsibilities") ||
          m.content.toLowerCase().includes("time at"))
    );

    for (const message of messages) {
      if (message.role !== "interviewer") continue;

      if (isOutroMessage(message.content)) {
        phase = "outro";
      } else if (isIrrelevantPrompt(message.content)) {
        // no-op
      } else if (isChallengeMessage(message.content)) {
        // no-op
      } else if (isFollowUpMessage(message.content)) {
        // no-op
      } else {
        // Main question
        if (isFirstInterviewerMessage) {
          isFirstInterviewerMessage = false;
          phase = "introduction";
        } else {
          if (phase === "introduction") {
            phase = "project";
          } else if (phase === "project") {
            if (hasExpAskedInHistory) {
              phase = "experience";
            } else {
              phase = "technical";
              technicalQuestionIndex = 0;
              hasTechnicalQuestionStarted = true;
            }
          } else if (phase === "experience") {
            phase = "technical";
            technicalQuestionIndex = 0;
            hasTechnicalQuestionStarted = true;
          } else if (phase === "technical") {
            technicalQuestionIndex++;
          }
        }
      }
    }

    if (phase === "outro") {
      return 10;
    }
    if (hasTechnicalQuestionStarted) {
      return Math.min(technicalQuestionIndex + 1, 10);
    }
    return 0;
  }

  const askedCount = getQuestionProgressCount();
  const progressPercent = Math.min((askedCount / totalQuestionsLimit) * 100, 100);
  const currentAptitudeQuestion = aptitudeQuestions[currentAptitudeIndex];
  const firstInterviewerMessage = messages.find((message) => message.role === "interviewer")?.content || "";
  const candidateGreetingName =
    firstInterviewerMessage.match(/hello\s+([^!.,\n]+)/i)?.[1]?.trim() || "there";
  const speechPromptLabel = isListening ? "Listening..." : speechInputAvailable ? "Tap here to speak" : "Type your response";
  const responsePlaceholder = isListening
    ? "Listening... speak clearly"
    : speechInputAvailable
      ? `Hello ${candidateGreetingName}! Share your response here or use the microphone.`
      : `Hello ${candidateGreetingName}! Share your response here.`;
  const aptitudeProgressPercent =
    aptitudeQuestions.length > 0
      ? ((currentAptitudeIndex + 1) / aptitudeQuestions.length) * 100
      : 0;

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  function getCandidateInitials(name: string) {
    return name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "C";
  }

  function displayMessageContent(message: Message) {
    if (message.role !== "interviewer") return message.content;
    const content = removeWavingHands(message.content);
    if (isAiMlInterview) {
      return content
        .replace(/\bI'm Maria\b/g, "I'm Sofia")
        .replace(/\bI am Maria\b/g, "I am Sofia")
        .replace(/\bMaria\b/g, "Sofia")
        .replace(/\bAI\/ML Engineer\b/g, "Artificial Intelligence Engineer")
        .replace(/\bAI\/ML position\b/g, "AI Engineering position");
    }
    if (isSdInterview) {
      return content
        .replace(/\bI'm (?:Maria|Sofia)\b/g, "I'm Alisa")
        .replace(/\bI am (?:Maria|Sofia)\b/g, "I am Alisa")
        .replace(/\b(?:Maria|Sofia)\b/g, "Alisa")
        .replace(/\bSystem Design Architect\b/g, "System Design")
        .replace(/\bSystem Design position\b/g, "System Design round");
    }
    return content;
  }

  if (isAptitude) {
    const candidateInitials = getCandidateInitials(candidateName);
    return (
      <VideoProctoring
        attemptId={attemptId}
        active={!isComplete && !finishing && !leaving}
        onReadyChange={setProctoringReady}
        onViolationCountChange={setProctoringViolations}
        onPolicyAction={handleProctorPolicyAction}
      >
        {() => (
          <div className="aptitude-live-shell">
            <header className="ai-live-topbar">
              <div className="ai-live-brand">
                <div className="ai-live-brand-icon aptitude-live-brand-icon" style={{ background: "linear-gradient(135deg, #0d6bff 0%, #0057e0 100%)", boxShadow: "0 12px 24px rgba(13, 107, 255, 0.22)" }} aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="8" width="14" height="11" rx="3" />
                    <path d="M12 4v4" />
                    <path d="M9 13h.01" />
                    <path d="M15 13h.01" />
                  </svg>
                </div>
                <span>InterviewAI</span>
              </div>
              <div className="ai-live-user">
                <div className="ai-live-user-avatar" style={{ background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", boxShadow: "0 12px 24px rgba(79, 70, 229, 0.22)" }}>
                  {candidateInitials}
                </div>
                <span>{candidateName}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </header>

            <main className="aptitude-live-main">
              {/* Header metrics card */}
              <div className="aptitude-header-card">
                <div className="aptitude-header-info">
                  <div className="aptitude-header-icon-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  </div>
                  <div className="aptitude-header-titles">
                    <h1>General Aptitude Test</h1>
                    <h2>Aptitude Round</h2>
                  </div>
                </div>

                <div className="aptitude-header-metric">
                  <div className="aptitude-metric-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
                      <circle cx="12" cy="13" r="8" />
                      <path d="M12 9v4l2 2" />
                      <path d="M5 3 2 6" />
                      <path d="M19 3 22 6" />
                    </svg>
                  </div>
                  <div>
                    <div className="aptitude-metric-value">{formatTime(timeLeft)}</div>
                    <div className="aptitude-metric-label">Time Left</div>
                  </div>
                </div>

                <div className="aptitude-header-metric border-left">
                  <div className="aptitude-metric-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      {proctoringViolations === 0 ? (
                        <path d="m9 11 2 2 4-4" />
                      ) : (
                        <line x1="12" y1="8" x2="12" y2="16" />
                      )}
                    </svg>
                  </div>
                  <div>
                    <div className="aptitude-metric-value text-sm">Proctoring</div>
                    <div className={`aptitude-metric-label font-bold ${proctoringViolations === 0 ? "text-emerald" : "text-rose"}`}>
                      Violations: {proctoringViolations}
                    </div>
                  </div>
                </div>

                <div className="aptitude-header-metric border-left progress-metric">
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "baseline" }}>
                    <span className="aptitude-metric-value">
                      {Math.min(currentAptitudeIndex + 1, aptitudeQuestions.length)} / {aptitudeQuestions.length}
                    </span>
                    <span className="aptitude-metric-label" style={{ fontSize: "0.72rem" }}>Questions</span>
                  </div>
                  <div className="aptitude-progress-bar-container">
                    <div className="aptitude-progress-bar-fill" style={{ width: `${aptitudeProgressPercent}%` }} />
                  </div>
                </div>
              </div>

              {/* Main Question Card */}
              <div className="aptitude-question-card">
                {error && <div className="alert alert-error mb-4" style={{ borderRadius: "10px" }}>{error}</div>}

                {finishing ? (
                  <div className="text-center" style={{ padding: "60px 20px" }}>
                    <span className="spinner" style={{ width: "36px", height: "36px", borderColor: "#0d6bff" }} />
                    <h3 className="mt-4 font-bold" style={{ color: "#0f172a" }}>Submitting Aptitude Round</h3>
                    <p className="text-sm text-secondary mt-2">Generating your scorecard...</p>
                  </div>
                ) : currentAptitudeQuestion ? (
                  <>
                    <div className="aptitude-badges-row">
                      <span className="aptitude-badge-blue">
                        Question {currentAptitudeIndex + 1} of {aptitudeQuestions.length}
                      </span>
                      <span className="aptitude-badge-gray">
                        Marks: +1
                      </span>
                    </div>

                    <h2 className="aptitude-question-text">
                      Q{currentAptitudeIndex + 1}. {currentAptitudeQuestion.question}
                    </h2>

                    <div className="aptitude-options-list">
                      {currentAptitudeQuestion.options.map((option, index) => {
                        const optionLetter = ["A", "B", "C", "D"][index];
                        const checked = aptitudeAnswers[currentAptitudeQuestion.id] === optionLetter;
                        return (
                          <button
                            type="button"
                            key={optionLetter}
                            className={`aptitude-option-item ${checked ? "selected" : ""}`}
                            onClick={() =>
                              setAptitudeAnswers((prev) => ({
                                ...prev,
                                [currentAptitudeQuestion.id]: optionLetter,
                              }))
                            }
                          >
                            <div className="aptitude-option-radio">
                              <div className="aptitude-option-radio-inner" />
                            </div>
                            <span className="aptitude-option-letter">{optionLetter}.</span>
                            <span className="aptitude-option-content">{option}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="alert alert-error">No aptitude questions were found for this attempt.</div>
                )}

                {/* Footer Actions */}
                {!finishing && currentAptitudeQuestion && (
                  <div className="aptitude-footer-actions-row">
                    <button
                      type="button"
                      className="aptitude-action-btn-secondary"
                      disabled={currentAptitudeIndex === 0}
                      onClick={() => setCurrentAptitudeIndex((prev) => Math.max(prev - 1, 0))}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                      </svg>
                      Previous
                    </button>

                    <button
                      type="button"
                      className="aptitude-action-btn-secondary"
                      disabled={!aptitudeAnswers[currentAptitudeQuestion.id]}
                      onClick={() =>
                        setAptitudeAnswers((prev) => {
                          const copy = { ...prev };
                          delete copy[currentAptitudeQuestion.id];
                          return copy;
                        })
                      }
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.4 5.4c1 1 1 2.5 0 3.4L13 21Z" />
                        <path d="M22 21H7" />
                        <path d="m5 11 9 9" />
                      </svg>
                      Clear Response
                    </button>

                    {currentAptitudeIndex < aptitudeQuestions.length - 1 ? (
                      <button
                        type="button"
                        className="aptitude-action-btn-primary"
                        disabled={aptitudeQuestions.length === 0}
                        onClick={() =>
                          setCurrentAptitudeIndex((prev) => Math.min(prev + 1, aptitudeQuestions.length - 1))
                        }
                      >
                        Next
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="aptitude-action-btn-success"
                        disabled={aptitudeQuestions.length === 0}
                        onClick={() => handleSubmitAptitude(false)}
                      >
                        Submit Test
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14" />
                          <path d="m12 5 7 7-7 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </main>
          </div>
        )}
      </VideoProctoring>
    );
  }

  if (isSdInterview) {
    const candidateInitials = getCandidateInitials(candidateName);

    return (
      <VideoProctoring
        attemptId={attemptId}
        active={!isComplete && !finishing && !leaving}
        onReadyChange={setProctoringReady}
        onViolationCountChange={setProctoringViolations}
        onPolicyAction={handleProctorPolicyAction}
      >
        {() => (
          <div className="sd-live-shell">
            <header className="ai-live-topbar">
              <div className="ai-live-brand">
                <div className="ai-live-brand-icon sd-live-brand-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="7" r="3" />
                    <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
                    <path d="M4 11h4" />
                    <path d="M16 11h4" />
                  </svg>
                </div>
                <span>InterviewAI</span>
              </div>
              <div className="ai-live-user">
                <div className="ai-live-user-avatar">{candidateInitials}</div>
                <span>{candidateName}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </header>

            <main className="swe-live-page sd-live-page">
              {showLeaveWarning && (
                <div style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(15, 23, 42, 0.55)",
                  zIndex: 9999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "24px",
                  backdropFilter: "blur(8px)"
                }}>
                  <div className="card text-center" style={{ maxWidth: "520px", border: "1px solid var(--amber)", boxShadow: "0 0 50px rgba(245,158,11,0.22)" }}>
                    <span style={{ fontSize: "3rem" }}>!</span>
                    <h3 style={{ color: "var(--amber)", marginTop: "16px", marginBottom: "8px" }}>Leave interview?</h3>
                    <p className="text-sm text-secondary" style={{ lineHeight: 1.65 }}>
                      If you leave before the interview ends, your performance report will not be generated for this attempt.
                    </p>
                    <div className="flex gap-3 mt-6" style={{ justifyContent: "center", flexWrap: "wrap" }}>
                      <button
                        onClick={() => setShowLeaveWarning(false)}
                        className="btn btn-secondary"
                        disabled={leaving}
                      >
                        Continue Interview
                      </button>
                      <button
                        onClick={handleLeaveInterview}
                        className="btn btn-danger"
                        disabled={leaving}
                      >
                        {leaving ? "Leaving..." : "Leave Without Report"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <header className="swe-live-header">
                <div className="swe-live-heading">
                  <div className="swe-live-code-badge" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="7" height="6" rx="2" />
                      <rect x="14" y="4" width="7" height="6" rx="2" />
                      <rect x="8" y="14" width="8" height="6" rx="2" />
                      <path d="M7 10v2h10v-2" />
                      <path d="M12 12v2" />
                    </svg>
                  </div>
                  <div>
                    <h1>System Design Interview</h1>
                    <div className="swe-live-status">
                      <span className="swe-live-status-dot" aria-hidden="true" />
                      <span>System Design Round</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLeaveWarning(true)}
                  className="swe-live-leave"
                  disabled={sending || isAiTyping || isComplete || finishing || leaving}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <path d="M10 17l5-5-5-5" />
                    <path d="M15 12H3" />
                  </svg>
                  Leave Interview
                </button>
              </header>

              <section className="swe-live-stage">
                <span className="swe-live-star swe-live-star-left" aria-hidden="true" />
                <span className="swe-live-star swe-live-star-mid" aria-hidden="true" />
                <span className="swe-live-star swe-live-star-right" aria-hidden="true" />
                <span className="swe-live-dots swe-live-dots-top" aria-hidden="true" />
                <span className="swe-live-dots swe-live-dots-bottom" aria-hidden="true" />

                <div className="swe-live-conversation">
                  {messages.map((m, idx) => (
                    <div key={idx} className={`swe-live-turn ${m.role === "candidate" ? "candidate" : "interviewer"}`}>
                      <div className={`swe-live-avatar ${m.role === "candidate" ? "candidate" : "interviewer"}`}>
                        {m.role === "candidate" ? (
                          <svg viewBox="0 0 96 96" aria-hidden="true">
                            <circle cx="48" cy="34" r="18" fill="currentColor" />
                            <path d="M20 82c4-17 17-26 28-26s24 9 28 26" fill="currentColor" />
                          </svg>
                        ) : (
                          <Image
                            src="/system-design-interviewer.webp"
                            alt="Alisa"
                            width={170}
                            height={170}
                            sizes="170px"
                            priority
                          />
                        )}
                      </div>
                      <div className="swe-live-bubble">
                        <div className="swe-live-message">{displayMessageContent(m)}</div>
                      </div>
                    </div>
                  ))}

                  {isAiTyping && (
                    <div className="swe-live-turn interviewer">
                      <div className="swe-live-avatar interviewer">
                        <Image
                          src="/system-design-interviewer.webp"
                          alt="Alisa"
                          width={170}
                          height={170}
                          sizes="170px"
                        />
                      </div>
                      <div className="swe-live-bubble">
                        <div className="typing-dots swe-live-typing-dots">
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                <div className="swe-live-footer">
                  {error && <div className="alert alert-error mb-4">{error}</div>}
                  {isComplete && !finishing && (
                    <div className="alert alert-success mb-4 flex items-center justify-between">
                      <span>All questions complete. The interview is wrapping up.</span>
                      <button onClick={handleEndInterview} className="btn btn-success btn-sm">
                        Generate Report Now
                      </button>
                    </div>
                  )}

                  {finishing && (
                    <div className="card text-center" style={{ padding: "20px", marginBottom: "16px" }}>
                      <span className="spinner" style={{ width: "30px", height: "30px", borderColor: "var(--amber)" }} />
                      <h4 className="mt-2 gradient-text">Generating AI Scoring and Per-Question Feedback...</h4>
                      <p className="text-xs text-muted mt-1">This will take 10-15 seconds. Please do not close this window.</p>
                    </div>
                  )}

                  {!isComplete && !finishing && (
                    <>
                      <div className="swe-live-voice-row">
                        <div className="swe-live-wave" aria-hidden="true" />
                        <button
                          type="button"
                          onClick={toggleListening}
                          className={`swe-live-mic ${isListening ? "is-listening" : ""}`}
                          disabled={!speechInputAvailable}
                          title={speechInputAvailable ? "Tap here to speak" : "Speech input unavailable"}
                        >
                          <span className="swe-live-mic-ring" />
                          <span className="swe-live-mic-core">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 1 1-6 0V6a3 3 0 0 1 3-3Z" />
                              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                              <path d="M12 19v3" />
                            </svg>
                          </span>
                        </button>
                        <div className="swe-live-wave swe-live-wave-right" aria-hidden="true" />
                      </div>
                      <div className="swe-live-tap-label">{speechPromptLabel}</div>

                      <form onSubmit={handleSend} className="swe-live-compose">
                        <textarea
                          className="swe-live-input"
                          rows={3}
                          placeholder={responsePlaceholder}
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSend(e);
                            }
                          }}
                          disabled={false}
                        />
                        <div className="swe-live-compose-actions">
                          <button
                            type="button"
                            onClick={() => setVoiceEnabled(!voiceEnabled)}
                            className={`btn btn-sm ${voiceEnabled ? "btn-success" : "btn-secondary"}`}
                          >
                            {voiceEnabled ? "Voice On" : "Voice Off"}
                          </button>
                          <button
                            id="send-msg-btn"
                            type="submit"
                            className="btn btn-primary"
                            disabled={sending || isAiTyping || !answer.trim()}
                          >
                            {sending ? "Sending..." : "Send Response"}
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                </div>
              </section>
            </main>
          </div>
        )}
      </VideoProctoring>
    );
  }

  if (isAiMlInterview) {
    const candidateInitials = getCandidateInitials(candidateName);

    return (
      <VideoProctoring
        attemptId={attemptId}
        active={!isComplete && !finishing && !leaving}
        onReadyChange={setProctoringReady}
        onViolationCountChange={setProctoringViolations}
        onPolicyAction={handleProctorPolicyAction}
      >
        {() => (
          <div className="ai-live-shell">
            <header className="ai-live-topbar">
              <div className="ai-live-brand">
                <div className="ai-live-brand-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="8" width="14" height="11" rx="3" />
                    <path d="M12 4v4" />
                    <path d="M9 13h.01" />
                    <path d="M15 13h.01" />
                  </svg>
                </div>
                <span>InterviewAI</span>
              </div>
              <div className="ai-live-user">
                <div className="ai-live-user-avatar">{candidateInitials}</div>
                <span>{candidateName}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </header>

            <main className="swe-live-page ai-live-page">
              {showLeaveWarning && (
                <div style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(15, 23, 42, 0.55)",
                  zIndex: 9999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "24px",
                  backdropFilter: "blur(8px)"
                }}>
                  <div className="card text-center" style={{ maxWidth: "520px", border: "1px solid var(--amber)", boxShadow: "0 0 50px rgba(245,158,11,0.22)" }}>
                    <span style={{ fontSize: "3rem" }}>!</span>
                    <h3 style={{ color: "var(--amber)", marginTop: "16px", marginBottom: "8px" }}>Leave interview?</h3>
                    <p className="text-sm text-secondary" style={{ lineHeight: 1.65 }}>
                      If you leave before the interview ends, your performance report will not be generated for this attempt.
                    </p>
                    <div className="flex gap-3 mt-6" style={{ justifyContent: "center", flexWrap: "wrap" }}>
                      <button
                        onClick={() => setShowLeaveWarning(false)}
                        className="btn btn-secondary"
                        disabled={leaving}
                      >
                        Continue Interview
                      </button>
                      <button
                        onClick={handleLeaveInterview}
                        className="btn btn-danger"
                        disabled={leaving}
                      >
                        {leaving ? "Leaving..." : "Leave Without Report"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <header className="swe-live-header">
                <div className="swe-live-heading">
                  <div className="swe-live-code-badge" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                  </div>
                  <div>
                    <h1>{"AI Interview \u2013 Artificial Intelligence Engineer"}</h1>
                    <div className="swe-live-status">
                      <span className="swe-live-status-dot" aria-hidden="true" />
                      <span>Interview in progress</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLeaveWarning(true)}
                  className="swe-live-leave"
                  disabled={sending || isAiTyping || isComplete || finishing || leaving}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <path d="M10 17l5-5-5-5" />
                    <path d="M15 12H3" />
                  </svg>
                  Leave Interview
                </button>
              </header>

              <section className="swe-live-stage">
                <span className="swe-live-star swe-live-star-left" aria-hidden="true" />
                <span className="swe-live-star swe-live-star-mid" aria-hidden="true" />
                <span className="swe-live-star swe-live-star-right" aria-hidden="true" />
                <span className="swe-live-dots swe-live-dots-top" aria-hidden="true" />
                <span className="swe-live-dots swe-live-dots-bottom" aria-hidden="true" />

                <div className="swe-live-conversation">
                  {messages.map((m, idx) => (
                    <div key={idx} className={`swe-live-turn ${m.role === "candidate" ? "candidate" : "interviewer"}`}>
                      <div className={`swe-live-avatar ${m.role === "candidate" ? "candidate" : "interviewer"}`}>
                        {m.role === "candidate" ? (
                          <svg viewBox="0 0 96 96" aria-hidden="true">
                            <circle cx="48" cy="34" r="18" fill="currentColor" />
                            <path d="M20 82c4-17 17-26 28-26s24 9 28 26" fill="currentColor" />
                          </svg>
                        ) : (
                          <Image
                            src="/sofia-interviewer.webp"
                            alt="Sofia"
                            width={170}
                            height={170}
                            sizes="170px"
                            priority
                          />
                        )}
                      </div>
                      <div className="swe-live-bubble">
                        <div className="swe-live-message">{displayMessageContent(m)}</div>
                      </div>
                    </div>
                  ))}

                  {isAiTyping && (
                    <div className="swe-live-turn interviewer">
                      <div className="swe-live-avatar interviewer">
                        <Image
                          src="/sofia-interviewer.webp"
                          alt="Sofia"
                          width={170}
                          height={170}
                          sizes="170px"
                        />
                      </div>
                      <div className="swe-live-bubble">
                        <div className="typing-dots swe-live-typing-dots">
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                <div className="swe-live-footer">
                  {error && <div className="alert alert-error mb-4">{error}</div>}
                  {isComplete && !finishing && (
                    <div className="alert alert-success mb-4 flex items-center justify-between">
                      <span>All questions complete. The interview is wrapping up.</span>
                      <button onClick={handleEndInterview} className="btn btn-success btn-sm">
                        Generate Report Now
                      </button>
                    </div>
                  )}

                  {finishing && (
                    <div className="card text-center" style={{ padding: "20px", marginBottom: "16px" }}>
                      <span className="spinner" style={{ width: "30px", height: "30px", borderColor: "var(--emerald)" }} />
                      <h4 className="mt-2 gradient-text">Generating AI Scoring and Per-Question Feedback...</h4>
                      <p className="text-xs text-muted mt-1">This will take 10-15 seconds. Please do not close this window.</p>
                    </div>
                  )}

                  {!isComplete && !finishing && (
                    <>
                      <div className="swe-live-voice-row">
                        <div className="swe-live-wave" aria-hidden="true" />
                        <button
                          type="button"
                          onClick={toggleListening}
                          className={`swe-live-mic ${isListening ? "is-listening" : ""}`}
                          disabled={!speechInputAvailable}
                          title={speechInputAvailable ? "Tap here to speak" : "Speech input unavailable"}
                        >
                          <span className="swe-live-mic-ring" />
                          <span className="swe-live-mic-core">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 1 1-6 0V6a3 3 0 0 1 3-3Z" />
                              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                              <path d="M12 19v3" />
                            </svg>
                          </span>
                        </button>
                        <div className="swe-live-wave swe-live-wave-right" aria-hidden="true" />
                      </div>
                      <div className="swe-live-tap-label">{speechPromptLabel}</div>

                      <form onSubmit={handleSend} className="swe-live-compose">
                        <textarea
                          className="swe-live-input"
                          rows={3}
                          placeholder={responsePlaceholder}
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSend(e);
                            }
                          }}
                          disabled={false}
                        />
                        <div className="swe-live-compose-actions">
                          <button
                            type="button"
                            onClick={() => setVoiceEnabled(!voiceEnabled)}
                            className={`btn btn-sm ${voiceEnabled ? "btn-success" : "btn-secondary"}`}
                          >
                            {voiceEnabled ? "Voice On" : "Voice Off"}
                          </button>
                          <button
                            id="send-msg-btn"
                            type="submit"
                            className="btn btn-primary"
                            disabled={sending || isAiTyping || !answer.trim()}
                          >
                            {sending ? "Sending..." : "Send Response"}
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                </div>
              </section>
            </main>
          </div>
        )}
      </VideoProctoring>
    );
  }

  if (isSweInterview) {
    return (
      <VideoProctoring
        attemptId={attemptId}
        active={!isComplete && !finishing && !leaving}
        onReadyChange={setProctoringReady}
        onViolationCountChange={setProctoringViolations}
        onPolicyAction={handleProctorPolicyAction}
      >
        {() => (
          <div className="swe-live-page">
            {showLeaveWarning && (
              <div style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.55)",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                backdropFilter: "blur(8px)"
              }}>
                <div className="card text-center" style={{ maxWidth: "520px", border: "1px solid var(--amber)", boxShadow: "0 0 50px rgba(245,158,11,0.22)" }}>
                  <span style={{ fontSize: "3rem" }}>!</span>
                  <h3 style={{ color: "var(--amber)", marginTop: "16px", marginBottom: "8px" }}>Leave interview?</h3>
                  <p className="text-sm text-secondary" style={{ lineHeight: 1.65 }}>
                    If you leave before the interview ends, your performance report will not be generated for this attempt.
                  </p>
                  <div className="flex gap-3 mt-6" style={{ justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      onClick={() => setShowLeaveWarning(false)}
                      className="btn btn-secondary"
                      disabled={leaving}
                    >
                      Continue Interview
                    </button>
                    <button
                      onClick={handleLeaveInterview}
                      className="btn btn-danger"
                      disabled={leaving}
                    >
                      {leaving ? "Leaving..." : "Leave Without Report"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <header className="swe-live-header">
              <div className="swe-live-heading">
                <div className="swe-live-code-badge" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                </div>
                <div>
                  <h1>Software Engineer AI Interview</h1>
                  <div className="swe-live-status">
                    <span className="swe-live-status-dot" aria-hidden="true" />
                    <span>Interview in progress</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLeaveWarning(true)}
                className="swe-live-leave"
                disabled={sending || isAiTyping || isComplete || finishing || leaving}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <path d="M10 17l5-5-5-5" />
                  <path d="M15 12H3" />
                </svg>
                Leave Interview
              </button>
            </header>

            <section className="swe-live-stage">
              <span className="swe-live-star swe-live-star-left" aria-hidden="true" />
              <span className="swe-live-star swe-live-star-mid" aria-hidden="true" />
              <span className="swe-live-star swe-live-star-right" aria-hidden="true" />
              <span className="swe-live-dots swe-live-dots-top" aria-hidden="true" />
              <span className="swe-live-dots swe-live-dots-bottom" aria-hidden="true" />

              <div className="swe-live-conversation">
                {messages.map((m, idx) => (
                  <div key={idx} className={`swe-live-turn ${m.role === "candidate" ? "candidate" : "interviewer"}`}>
                    <div className={`swe-live-avatar ${m.role === "candidate" ? "candidate" : "interviewer"}`}>
                      {m.role === "candidate" ? (
                        <svg viewBox="0 0 96 96" aria-hidden="true">
                          <circle cx="48" cy="34" r="18" fill="currentColor" />
                          <path d="M20 82c4-17 17-26 28-26s24 9 28 26" fill="currentColor" />
                        </svg>
                      ) : (
                        <Image
                          src="/maria-interviewer.webp"
                          alt="Maria"
                          width={160}
                          height={160}
                          sizes="160px"
                          priority
                        />
                      )}
                    </div>
                    <div className="swe-live-bubble">
                      <div className="swe-live-message">{displayMessageContent(m)}</div>
                    </div>
                  </div>
                ))}

                {isAiTyping && (
                  <div className="swe-live-turn interviewer">
                    <div className="swe-live-avatar interviewer">
                      <Image
                        src="/maria-interviewer.webp"
                        alt="Maria"
                        width={160}
                        height={160}
                        sizes="160px"
                      />
                    </div>
                    <div className="swe-live-bubble">
                      <div className="typing-dots swe-live-typing-dots">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <div className="swe-live-footer">
                {error && <div className="alert alert-error mb-4">{error}</div>}
                {isComplete && !finishing && (
                  <div className="alert alert-success mb-4 flex items-center justify-between">
                    <span>All questions complete. The interview is wrapping up.</span>
                    <button onClick={handleEndInterview} className="btn btn-success btn-sm">
                      Generate Report Now
                    </button>
                  </div>
                )}

                {finishing && (
                  <div className="card text-center" style={{ padding: "20px", marginBottom: "16px" }}>
                    <span className="spinner" style={{ width: "30px", height: "30px", borderColor: "var(--indigo)" }} />
                    <h4 className="mt-2 gradient-text">Generating AI Scoring and Per-Question Feedback...</h4>
                    <p className="text-xs text-muted mt-1">This will take 10-15 seconds. Please do not close this window.</p>
                  </div>
                )}

                {!isComplete && !finishing && (
                  <>
                    <div className="swe-live-voice-row">
                      <div className="swe-live-wave" aria-hidden="true" />
                      <button
                        type="button"
                        onClick={toggleListening}
                        className={`swe-live-mic ${isListening ? "is-listening" : ""}`}
                        disabled={!speechInputAvailable}
                        title={speechInputAvailable ? "Tap here to speak" : "Speech input unavailable"}
                      >
                        <span className="swe-live-mic-ring" />
                        <span className="swe-live-mic-core">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 1 1-6 0V6a3 3 0 0 1 3-3Z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <path d="M12 19v3" />
                          </svg>
                        </span>
                      </button>
                      <div className="swe-live-wave swe-live-wave-right" aria-hidden="true" />
                    </div>
                    <div className="swe-live-tap-label">{speechPromptLabel}</div>

                    <form onSubmit={handleSend} className="swe-live-compose">
                      <textarea
                        className="swe-live-input"
                        rows={3}
                        placeholder={responsePlaceholder}
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend(e);
                          }
                        }}
                        disabled={false}
                      />
                      <div className="swe-live-compose-actions">
                        <button
                          type="button"
                          onClick={() => setVoiceEnabled(!voiceEnabled)}
                          className={`btn btn-sm ${voiceEnabled ? "btn-success" : "btn-secondary"}`}
                        >
                          {voiceEnabled ? "Voice On" : "Voice Off"}
                        </button>
                        <button
                          id="send-msg-btn"
                          type="submit"
                          className="btn btn-primary"
                          disabled={sending || isAiTyping || !answer.trim()}
                        >
                          {sending ? "Sending..." : "Send Response"}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </section>
          </div>
        )}
      </VideoProctoring>
    );
  }

  return (
    <VideoProctoring
      attemptId={attemptId}
      active={!isComplete && !finishing && !leaving}
      onReadyChange={setProctoringReady}
      onViolationCountChange={setProctoringViolations}
      onPolicyAction={handleProctorPolicyAction}
    >
      {() => (
    <div className="chat-wrapper">
      {showLeaveWarning && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.55)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          backdropFilter: "blur(8px)"
        }}>
          <div className="card text-center" style={{ maxWidth: "520px", border: "1px solid var(--amber)", boxShadow: "0 0 50px rgba(245,158,11,0.22)" }}>
            <span style={{ fontSize: "3rem" }}>âš ï¸</span>
            <h3 style={{ color: "var(--amber)", marginTop: "16px", marginBottom: "8px" }}>Leave interview?</h3>
            <p className="text-sm text-secondary" style={{ lineHeight: 1.65 }}>
              If you leave before the interview ends, your performance report will not be generated for this attempt.
            </p>
            <div className="flex gap-3 mt-6" style={{ justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => setShowLeaveWarning(false)}
                className="btn btn-secondary"
                disabled={leaving}
              >
                Continue Interview
              </button>
              <button
                onClick={handleLeaveInterview}
                className="btn btn-danger"
                disabled={leaving}
              >
                {leaving ? "Leaving..." : "Leave Without Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="chat-header">
        <div className="flex items-center gap-3">
          <span style={{ fontSize: "1.5rem" }}>{roleData?.icon}</span>
          <div>
            <h3 style={{ margin: 0 }}>{initialAttempt.round === "hr" ? "HR" : roleData?.label} AI Interview</h3>
            <div className="text-xs text-muted">Interview workspace is fully proctored</div>
          </div>
        </div>
        
        {/* Controls Section: Voice enable and Proctor count */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2" style={{ background: "var(--bg-elevated)", padding: "4px 10px", borderRadius: "20px", border: "1px solid var(--border)" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 500, color: "var(--text-secondary)" }}>🎙️ Audio Mode:</span>
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`btn btn-sm ${voiceEnabled ? "btn-success" : "btn-secondary"}`}
              style={{ padding: "3px 8px", borderRadius: "12px", fontSize: "0.7rem" }}
            >
              {voiceEnabled ? "Enabled Speak" : "Disabled"}
            </button>
          </div>

          <div className={`badge ${proctoringViolations === 0 ? "badge-emerald" : proctoringViolations <= 2 ? "badge-amber" : "badge-rose"}`} style={{ fontSize: "0.72rem" }}>
            Proctoring violations: {proctoringViolations}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted font-mono">{askedCount}/{totalQuestionsLimit} Questions</span>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowLeaveWarning(true)}
            className="btn btn-danger btn-sm"
            disabled={sending || isAiTyping || isComplete || finishing || leaving}
          >
            Leave
          </button>
        </div>
      </header>

      <div className="chat-messages">
        {messages.map((m, idx) => (
          <div key={idx} className={`message ${m.role === "candidate" ? "candidate" : "interviewer"}`}>
            <div className={`message-avatar ${m.role === "candidate" ? "user" : "ai"}`}>
              {m.role === "candidate" ? "👤" : "🎙️"}
            </div>
            <div className="message-bubble-wrapper">
              <div className="message-bubble">{displayMessageContent(m)}</div>
              <div className="message-time">
                {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}

        {isAiTyping && (
          <div className="typing-indicator">
            <div className="message-avatar ai">🎙️</div>
            <div className="typing-dots">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        {error && <div className="alert alert-error mb-4">⚠️ {error}</div>}
        {isComplete && !finishing && (
          <div className="alert alert-success mb-4 flex items-center justify-between">
            <span>🎉 All questions complete! The AI is wrapping up the evaluation.</span>
            <button onClick={handleEndInterview} className="btn btn-success btn-sm">
              Generate Report Now
            </button>
          </div>
        )}

        {finishing && (
          <div className="card text-center" style={{ padding: "20px", marginBottom: "16px" }}>
            <span className="spinner" style={{ width: "30px", height: "30px", borderColor: "var(--indigo)" }} />
            <h4 className="mt-2 gradient-text">Generating AI Scoring & Per-Question Feedback...</h4>
            <p className="text-xs text-muted mt-1">This will take 10-15 seconds. Please do not close this window.</p>
          </div>
        )}

        {!isComplete && !finishing && (
          <form onSubmit={handleSend} className="chat-input-row" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            
            {/* Browser Microphone Dictation Control */}
            <button
              type="button"
              onClick={toggleListening}
              className={`btn ${isListening ? "btn-danger" : "btn-secondary"}`}
              style={{ width: "52px", height: "52px", borderRadius: "var(--radius-md)", padding: 0 }}
              disabled={!speechInputAvailable}
              title={speechInputAvailable ? "Dictate response (Speech to Text)" : "Speech input unavailable"}
            >
              {isListening ? "🛑" : "🎙️"}
            </button>

            <textarea
              className="chat-input"
              rows={1}
              placeholder={isListening ? "Listening... speak clearly" : "Type your response here... (Enter to send)"}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              disabled={false}
              style={{ borderLeft: isListening ? "2px dashed var(--rose)" : "1px solid var(--border)" }}
            />
            <button
              id="send-msg-btn"
              type="submit"
              className="btn btn-primary"
              style={{ height: "52px" }}
              disabled={sending || isAiTyping || !answer.trim()}
            >
              {sending ? "…" : "Send 📤"}
            </button>
          </form>
        )}
      </div>
    </div>
      )}
    </VideoProctoring>
  );
}
