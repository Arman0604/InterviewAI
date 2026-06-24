"use client";

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PROCTORING_ALLOWED_VIOLATIONS,
  PROCTORING_EVENT_MESSAGES,
  PROCTORING_EVENT_LABELS,
  ProctoringCameraStatus,
  ProctoringViolationType,
} from "@/lib/proctoring";

type GatePhase = "requesting" | "checking" | "ready" | "denied" | "unsupported" | "lost";
type DetectorMode = "native" | "fallback";

interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BrowserDetectedFace {
  boundingBox?: {
    x?: number;
    y?: number;
    left?: number;
    top?: number;
    width: number;
    height: number;
  };
}

interface BrowserFaceDetector {
  detect(source: CanvasImageSource): Promise<BrowserDetectedFace[]>;
}

type BrowserFaceDetectorConstructor = new (options?: {
  fastMode?: boolean;
  maxDetectedFaces?: number;
}) => BrowserFaceDetector;

type WindowWithFaceDetector = Window &
  typeof globalThis & {
    FaceDetector?: BrowserFaceDetectorConstructor;
  };

export interface ProctoringPolicyAction {
  reason: ProctoringViolationType;
  violationCount: number;
}

export interface VideoProctoringState {
  ready: boolean;
  cameraStatus: ProctoringCameraStatus;
  violationCount: number;
  latestWarning: {
    type: ProctoringViolationType;
    message: string;
    count: number;
  } | null;
}

interface VideoProctoringProps {
  attemptId: string;
  active?: boolean;
  previewPlacement?: "bottom-right" | "top-right";
  onReadyChange?: (ready: boolean) => void;
  onViolationCountChange?: (count: number) => void;
  onPolicyAction?: (action: ProctoringPolicyAction) => void;
  children: (state: VideoProctoringState) => ReactNode;
}

const FRAME_WIDTH = 320;
const FRAME_HEIGHT = 240;
const CHECK_INTERVAL_MS = 360;
const EVENT_COOLDOWN_MS = 9000;
const GATE_GOOD_FRAMES_REQUIRED = 2;
const CAMERA_START_DELAY_MS = 100;
const FALLBACK_CANDIDATE_ROI: FaceBox = { x: 68, y: 30, width: 184, height: 182 };
const OBSTRUCTION_FRAMES_REQUIRED = 3;
const STRONG_OBSTRUCTION_FRAMES_REQUIRED = 2;
const BASELINE_SETTLE_FRAMES = 4;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampBox(box: FaceBox): FaceBox {
  const x = clamp(Math.round(box.x), 0, FRAME_WIDTH - 1);
  const y = clamp(Math.round(box.y), 0, FRAME_HEIGHT - 1);
  const width = clamp(Math.round(box.width), 1, FRAME_WIDTH - x);
  const height = clamp(Math.round(box.height), 1, FRAME_HEIGHT - y);
  return { x, y, width, height };
}

function scaleFace(face: BrowserDetectedFace, scaleX: number, scaleY: number): FaceBox | null {
  const box = face.boundingBox;
  if (!box || !Number.isFinite(box.width) || !Number.isFinite(box.height)) return null;

  const x = (box.x ?? box.left ?? 0) * scaleX;
  const y = (box.y ?? box.top ?? 0) * scaleY;
  const width = box.width * scaleX;
  const height = box.height * scaleY;

  if (width < 20 || height < 20) return null;
  return clampBox({ x, y, width, height });
}

function expandCandidateRoi(face: FaceBox): FaceBox {
  return clampBox({
    x: face.x - face.width * 0.85,
    y: face.y - face.height * 0.55,
    width: face.width * 2.7,
    height: face.height * 3.45,
  });
}

function expandFaceRoi(face: FaceBox): FaceBox {
  return clampBox({
    x: face.x - face.width * 0.28,
    y: face.y - face.height * 0.28,
    width: face.width * 1.56,
    height: face.height * 1.7,
  });
}

function diffMetrics(current: ImageData, baseline: ImageData, roi: FaceBox, threshold: number) {
  const box = clampBox(roi);
  const columns = 4;
  const rows = 4;
  const tileChanged = Array(columns * rows).fill(0) as number[];
  const tileSampled = Array(columns * rows).fill(0) as number[];
  const center = {
    x1: box.x + box.width * 0.18,
    x2: box.x + box.width * 0.82,
    y1: box.y + box.height * 0.12,
    y2: box.y + box.height * 0.82,
  };
  let changed = 0;
  let sampled = 0;
  let centerChanged = 0;
  let centerSampled = 0;
  const stride = 3;

  for (let y = box.y; y < box.y + box.height; y += stride) {
    for (let x = box.x; x < box.x + box.width; x += stride) {
      const i = (y * FRAME_WIDTH + x) * 4;
      const diff =
        Math.abs(current.data[i] - baseline.data[i]) +
        Math.abs(current.data[i + 1] - baseline.data[i + 1]) +
        Math.abs(current.data[i + 2] - baseline.data[i + 2]);
      const isChanged = diff / 3 > threshold;
      const column = clamp(Math.floor(((x - box.x) / box.width) * columns), 0, columns - 1);
      const row = clamp(Math.floor(((y - box.y) / box.height) * rows), 0, rows - 1);
      const tile = row * columns + column;

      sampled += 1;
      tileSampled[tile] += 1;
      if (isChanged) {
        changed += 1;
        tileChanged[tile] += 1;
      }

      if (x >= center.x1 && x <= center.x2 && y >= center.y1 && y <= center.y2) {
        centerSampled += 1;
        if (isChanged) centerChanged += 1;
      }
    }
  }

  const maxTileRatio = tileChanged.reduce((max, tileCount, index) => {
    const tileTotal = tileSampled[index];
    return Math.max(max, tileTotal === 0 ? 0 : tileCount / tileTotal);
  }, 0);

  return {
    changedRatio: sampled === 0 ? 0 : changed / sampled,
    centerRatio: centerSampled === 0 ? 0 : centerChanged / centerSampled,
    maxTileRatio,
  };
}

function frameStats(frame: ImageData, roi: FaceBox) {
  let total = 0;
  let totalSquared = 0;
  let sampled = 0;
  const stride = 4;

  for (let y = roi.y; y < roi.y + roi.height; y += stride) {
    for (let x = roi.x; x < roi.x + roi.width; x += stride) {
      const i = (y * FRAME_WIDTH + x) * 4;
      const luminance = frame.data[i] * 0.299 + frame.data[i + 1] * 0.587 + frame.data[i + 2] * 0.114;
      total += luminance;
      totalSquared += luminance * luminance;
      sampled += 1;
    }
  }

  if (sampled === 0) return { mean: 0, contrast: 0 };
  const mean = total / sampled;
  const variance = Math.max(totalSquared / sampled - mean * mean, 0);
  return { mean, contrast: Math.sqrt(variance) };
}

function frameLooksUsable(frame: ImageData) {
  const stats = frameStats(frame, FALLBACK_CANDIDATE_ROI);
  return stats.mean > 6 || stats.contrast > 2;
}

function dominantFace(faces: FaceBox[]) {
  return faces.reduce<FaceBox | null>((largest, face) => {
    if (!largest) return face;
    return face.width * face.height > largest.width * largest.height ? face : largest;
  }, null);
}

export default function VideoProctoring({
  attemptId,
  active = true,
  previewPlacement = "bottom-right",
  onReadyChange,
  onViolationCountChange,
  onPolicyAction,
  children,
}: VideoProctoringProps) {
  const processingVideoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<BrowserFaceDetector | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const baselineRef = useRef<ImageData | null>(null);
  const lastStableFaceRef = useRef<FaceBox | null>(null);
  const cameraSessionRef = useRef(0);
  const phaseRef = useRef<GatePhase>("requesting");
  const lastEventAtRef = useRef<Partial<Record<ProctoringViolationType, number>>>({});
  const violationCountRef = useRef(0);
  const policyTriggeredRef = useRef(false);
  const gateGoodFramesRef = useRef(0);
  const noFaceFramesRef = useRef(0);
  const multipleFaceFramesRef = useRef(0);
  const obstructionFramesRef = useRef(0);
  const feedIssueFramesRef = useRef(0);
  const readyFramesRef = useRef(0);
  const lastObstructionAtRef = useRef(0);
  const baselineRefreshFramesRef = useRef(0);
  const cameraStatusRef = useRef<ProctoringCameraStatus>("unknown");
  const onPolicyActionRef = useRef(onPolicyAction);

  const [phase, setPhase] = useState<GatePhase>("requesting");
  const [cameraStatus, setCameraStatus] = useState<ProctoringCameraStatus>("unknown");
  const [gateMessage, setGateMessage] = useState("Requesting camera permission...");
  const [detectorMode, setDetectorMode] = useState<DetectorMode>("native");
  const [violationCount, setViolationCount] = useState(0);
  const [latestWarning, setLatestWarning] = useState<VideoProctoringState["latestWarning"]>(null);
  const [endingForPolicy, setEndingForPolicy] = useState(false);

  const hiddenVideoStyle = useMemo<React.CSSProperties>(
    () => ({
      position: "fixed",
      width: 1,
      height: 1,
      opacity: 0,
      pointerEvents: "none",
      left: -10,
      top: -10,
    }),
    []
  );

  useEffect(() => {
    phaseRef.current = phase;
    onReadyChange?.(phase === "ready");
  }, [onReadyChange, phase]);

  useEffect(() => {
    cameraStatusRef.current = cameraStatus;
  }, [cameraStatus]);

  useEffect(() => {
    onPolicyActionRef.current = onPolicyAction;
  }, [onPolicyAction]);

  useEffect(() => {
    onViolationCountChange?.(violationCount);
  }, [onViolationCountChange, violationCount]);

  const attachProcessingStream = useCallback(() => {
    if (processingVideoRef.current && streamRef.current) {
      processingVideoRef.current.srcObject = streamRef.current;
      processingVideoRef.current.muted = true;
      processingVideoRef.current.playsInline = true;
      void processingVideoRef.current.play().catch(() => undefined);
    }
  }, []);

  const attachPreviewStream = useCallback(() => {
    if (previewVideoRef.current && streamRef.current) {
      previewVideoRef.current.srcObject = streamRef.current;
      void previewVideoRef.current.play().catch(() => undefined);
    }
  }, []);

  const stopCamera = useCallback(() => {
    cameraSessionRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    baselineRef.current = null;
    detectorRef.current = null;
    if (processingVideoRef.current) processingVideoRef.current.srcObject = null;
    if (previewVideoRef.current) previewVideoRef.current.srcObject = null;
  }, []);

  const syncStatus = useCallback(
    async (status: ProctoringCameraStatus) => {
      cameraStatusRef.current = status;
      setCameraStatus(status);
      try {
        await fetch("/api/interview/proctor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId,
            cameraStatus: status,
            proctored: true,
          }),
        });
      } catch {
        // The client keeps enforcing proctoring even if a status heartbeat fails.
      }
    },
    [attemptId]
  );

  const reportViolation = useCallback(
    async (type: ProctoringViolationType, metadata: Record<string, unknown> = {}) => {
      const now = Date.now();
      const previous = lastEventAtRef.current[type] ?? 0;
      const cooldownMs = type === "tab_switch_detected" ? 1500 : EVENT_COOLDOWN_MS;
      if (now - previous < cooldownMs) return;

      lastEventAtRef.current[type] = now;
      const message = PROCTORING_EVENT_MESSAGES[type];
      const nextCount = violationCountRef.current + 1;
      violationCountRef.current = nextCount;
      setViolationCount(nextCount);
      setLatestWarning({ type, message, count: nextCount });

      if (type === "camera_permission_denied") {
        cameraStatusRef.current = "denied";
        setCameraStatus("denied");
      }
      if (type === "camera_feed_lost") {
        cameraStatusRef.current = "lost";
        setCameraStatus("lost");
      }

      try {
        const res = await fetch("/api/interview/proctor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId,
            eventType: type,
            message,
            metadata,
            cameraStatus:
              type === "camera_permission_denied"
                ? "denied"
                : type === "camera_feed_lost"
                  ? "lost"
                  : cameraStatusRef.current,
            proctored: true,
          }),
        });
        const data = await res.json().catch(() => null);
        const serverCount = typeof data?.violationCount === "number" ? data.violationCount : null;
        if (serverCount !== null && serverCount !== nextCount) {
          violationCountRef.current = serverCount;
          setViolationCount(serverCount);
          setLatestWarning({ type, message, count: serverCount });
        }
        if (data?.policyAction === "end_round" && !policyTriggeredRef.current) {
          policyTriggeredRef.current = true;
          setEndingForPolicy(true);
          onPolicyActionRef.current?.({ reason: type, violationCount: serverCount ?? nextCount });
          return;
        }
      } catch {
        // Keep local enforcement active. The next event/status sync will retry the server path.
      }

      if (nextCount > PROCTORING_ALLOWED_VIOLATIONS && !policyTriggeredRef.current) {
        policyTriggeredRef.current = true;
        setEndingForPolicy(true);
        onPolicyActionRef.current?.({ reason: type, violationCount: nextCount });
      }
    },
    [attemptId]
  );

  useEffect(() => {
    if (!active || phase !== "ready") return;

    const reportTabSwitch = (source: string) => {
      void reportViolation("tab_switch_detected", {
        source,
        visibilityState: document.visibilityState,
        hasFocus: document.hasFocus(),
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        reportTabSwitch("visibilitychange");
      }
    };

    const handleWindowBlur = () => {
      window.setTimeout(() => {
        if (!active || phaseRef.current !== "ready") return;
        if (document.visibilityState === "hidden" || !document.hasFocus()) {
          reportTabSwitch("window_blur");
        }
      }, 600);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [active, phase, reportViolation]);

  const startCamera = useCallback(async () => {
    stopCamera();
    const sessionId = cameraSessionRef.current + 1;
    cameraSessionRef.current = sessionId;
    gateGoodFramesRef.current = 0;
    noFaceFramesRef.current = 0;
    multipleFaceFramesRef.current = 0;
    obstructionFramesRef.current = 0;
    feedIssueFramesRef.current = 0;
    readyFramesRef.current = 0;
    baselineRefreshFramesRef.current = 0;
    policyTriggeredRef.current = false;
    setEndingForPolicy(false);
    setLatestWarning(null);
    setPhase("requesting");
    setGateMessage("Requesting camera permission...");

    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPhase("unsupported");
      setGateMessage("This browser cannot access the webcam. Please use a modern browser with camera support.");
      return;
    }

    const DetectorCtor = (window as WindowWithFaceDetector).FaceDetector;
    setDetectorMode(DetectorCtor ? "native" : "fallback");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 960 },
          height: { ideal: 540 },
        },
        audio: false,
      });

      streamRef.current = stream;
      detectorRef.current = DetectorCtor
        ? new DetectorCtor({ fastMode: true, maxDetectedFaces: 4 })
        : null;

      const processingVideo = processingVideoRef.current;
      if (!processingVideo) throw new Error("Camera processor unavailable");
      processingVideo.srcObject = stream;
      processingVideo.muted = true;
      processingVideo.playsInline = true;
      await processingVideo.play();

      const [track] = stream.getVideoTracks();
      if (!track || track.readyState !== "live") throw new Error("Camera track is not live");

      track.addEventListener("ended", () => {
        if (cameraSessionRef.current !== sessionId) return;
        setGateMessage(PROCTORING_EVENT_MESSAGES.camera_feed_lost);
        setPhase("lost");
        void reportViolation("camera_feed_lost", { reason: "track_ended" });
      });

      attachProcessingStream();
      attachPreviewStream();
      setPhase("checking");
      setGateMessage(
        DetectorCtor
          ? "Hold still while we verify that exactly one face is visible."
          : "Camera feed detected. Verifying that the webcam image is live and clear."
      );
      await syncStatus("granted");
    } catch {
      setPhase("denied");
      setGateMessage(PROCTORING_EVENT_MESSAGES.camera_permission_denied);
      await reportViolation("camera_permission_denied", { source: "getUserMedia" });
    }
  }, [attachPreviewStream, attachProcessingStream, reportViolation, stopCamera, syncStatus]);

  useEffect(() => {
    if (!active) return;

    const id = window.setTimeout(() => {
      void startCamera();
    }, CAMERA_START_DELAY_MS);

    return () => {
      window.clearTimeout(id);
      stopCamera();
    };
  }, [active, startCamera, stopCamera]);

  useEffect(() => {
    attachProcessingStream();
    attachPreviewStream();
  }, [attachPreviewStream, attachProcessingStream, phase]);

  useEffect(() => {
    if (!active && phase === "ready") stopCamera();
  }, [active, phase, stopCamera]);

  const inspectFrame = useCallback(async () => {
    const video = processingVideoRef.current;
    const canvas = canvasRef.current;
    const stream = streamRef.current;

    if (!video || !canvas || !stream) return;

    const [track] = stream.getVideoTracks();
    const currentPhase = phaseRef.current;

    if (!track || track.readyState !== "live") {
      setGateMessage(PROCTORING_EVENT_MESSAGES.camera_feed_lost);
      setPhase("lost");
      await reportViolation("camera_feed_lost", {
        trackState: track?.readyState ?? "missing",
      });
      return;
    }

    const videoHasFrame =
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      video.videoWidth > 0 &&
      video.videoHeight > 0;

    if (!videoHasFrame) {
      feedIssueFramesRef.current += 1;
      if (currentPhase === "checking") {
        setGateMessage("Camera feed detected. Waiting for a clear video frame...");
        return;
      }

      if (feedIssueFramesRef.current >= 3) {
        setGateMessage(PROCTORING_EVENT_MESSAGES.camera_feed_lost);
        setPhase("lost");
        await reportViolation("camera_feed_lost", {
          trackState: track.readyState,
          videoReadyState: video.readyState,
          consecutiveFrames: feedIssueFramesRef.current,
        });
      }
      return;
    }

    feedIssueFramesRef.current = 0;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);

    const scaleX = FRAME_WIDTH / video.videoWidth;
    const scaleY = FRAME_HEIGHT / video.videoHeight;
    const rawFaces = detectorRef.current ? await detectorRef.current.detect(canvas) : [];
    const faces = rawFaces
      .map((face) => scaleFace(face, scaleX, scaleY))
      .filter((face): face is FaceBox => Boolean(face));

    const currentFrame = ctx.getImageData(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
    const primaryFace = dominantFace(faces);

    if (currentPhase === "checking") {
      if (!detectorRef.current) {
        if (frameLooksUsable(currentFrame)) {
          gateGoodFramesRef.current += 1;
          setGateMessage(
            gateGoodFramesRef.current >= GATE_GOOD_FRAMES_REQUIRED - 1
              ? "Camera check passed. Preparing the round..."
              : "Camera feed is live. Keep your face centered."
          );

          if (gateGoodFramesRef.current >= GATE_GOOD_FRAMES_REQUIRED) {
            baselineRef.current = currentFrame;
            setPhase("ready");
            cameraStatusRef.current = "active";
            setCameraStatus("active");
            await syncStatus("active");
          }
        } else {
          gateGoodFramesRef.current = 0;
          setGateMessage("Camera feed is active but too dark or blocked. Make sure the webcam view is clear.");
        }
        return;
      }

      if (faces.length === 1 && primaryFace) {
        gateGoodFramesRef.current += 1;
        lastStableFaceRef.current = primaryFace;
        setGateMessage(
          gateGoodFramesRef.current >= GATE_GOOD_FRAMES_REQUIRED - 1
            ? "Camera check passed. Preparing the round..."
            : "Face check in progress. Keep your face centered."
        );

        if (gateGoodFramesRef.current >= GATE_GOOD_FRAMES_REQUIRED) {
          baselineRef.current = currentFrame;
          setPhase("ready");
          cameraStatusRef.current = "active";
          setCameraStatus("active");
          await syncStatus("active");
        }
      } else {
        gateGoodFramesRef.current = 0;
        if (faces.length > 1) {
          setGateMessage(PROCTORING_EVENT_MESSAGES.multiple_faces_detected);
        } else {
          setGateMessage("Keep your face visible and centered before the round begins.");
        }
      }
      return;
    }

    if (currentPhase !== "ready" || !active) return;
    readyFramesRef.current += 1;

    if (readyFramesRef.current <= BASELINE_SETTLE_FRAMES) {
      baselineRef.current = currentFrame;
      obstructionFramesRef.current = 0;
      return;
    }

    if (!detectorRef.current) {
      if (baselineRef.current) {
        const bodyMetrics = diffMetrics(currentFrame, baselineRef.current, FALLBACK_CANDIDATE_ROI, 50);
        const stats = frameStats(currentFrame, FALLBACK_CANDIDATE_ROI);
        const cameraCovered = stats.mean < 6 && stats.contrast < 2;
        const strongObstruction =
          cameraCovered ||
          bodyMetrics.centerRatio > 0.5 ||
          (bodyMetrics.changedRatio > 0.4 && bodyMetrics.centerRatio > 0.32) ||
          (bodyMetrics.maxTileRatio > 0.76 && bodyMetrics.centerRatio > 0.24 && bodyMetrics.changedRatio > 0.14);
        const obstructionDetected =
          strongObstruction ||
          (bodyMetrics.changedRatio > 0.28 && bodyMetrics.centerRatio > 0.24) ||
          (bodyMetrics.centerRatio > 0.34 && bodyMetrics.maxTileRatio > 0.48) ||
          (bodyMetrics.maxTileRatio > 0.68 && bodyMetrics.changedRatio > 0.18 && bodyMetrics.centerRatio > 0.2);

        if (obstructionDetected) {
          obstructionFramesRef.current += 1;
        } else {
          obstructionFramesRef.current = 0;
          baselineRefreshFramesRef.current += 1;
          if (baselineRefreshFramesRef.current >= 10) {
            baselineRef.current = currentFrame;
            baselineRefreshFramesRef.current = 0;
          }
        }

        const framesRequired = cameraCovered ? 1 : strongObstruction ? STRONG_OBSTRUCTION_FRAMES_REQUIRED : OBSTRUCTION_FRAMES_REQUIRED;
        if (obstructionFramesRef.current >= framesRequired) {
          lastObstructionAtRef.current = Date.now();
          await reportViolation("foreground_obstruction_detected", {
            mode: "fallback_camera_roi",
            bodyDiff: Number(bodyMetrics.changedRatio.toFixed(3)),
            centerDiff: Number(bodyMetrics.centerRatio.toFixed(3)),
            maxTileDiff: Number(bodyMetrics.maxTileRatio.toFixed(3)),
            mean: Number(stats.mean.toFixed(1)),
            contrast: Number(stats.contrast.toFixed(1)),
          });
          obstructionFramesRef.current = 0;
        }
      }
      return;
    }

    const stableFace = primaryFace ?? lastStableFaceRef.current;
    let obstructionDetected = false;
    let bodyMetrics = { changedRatio: 0, centerRatio: 0, maxTileRatio: 0 };
    let faceMetrics = { changedRatio: 0, centerRatio: 0, maxTileRatio: 0 };

    if (baselineRef.current && stableFace) {
      const bodyRoi = expandCandidateRoi(stableFace);
      const faceRoi = expandFaceRoi(stableFace);
      bodyMetrics = diffMetrics(currentFrame, baselineRef.current, bodyRoi, 50);
      faceMetrics = diffMetrics(currentFrame, baselineRef.current, faceRoi, 48);

      const strongObstruction =
        (faces.length === 0 && bodyMetrics.changedRatio > 0.32 && bodyMetrics.centerRatio > 0.26) ||
        faceMetrics.centerRatio > 0.5 ||
        faceMetrics.changedRatio > 0.42 ||
        (faceMetrics.maxTileRatio > 0.76 && faceMetrics.centerRatio > 0.24) ||
        (bodyMetrics.maxTileRatio > 0.78 && bodyMetrics.centerRatio > 0.28 && bodyMetrics.changedRatio > 0.16);

      obstructionDetected =
        strongObstruction ||
        (faces.length === 0 &&
          ((bodyMetrics.changedRatio > 0.22 && bodyMetrics.centerRatio > 0.22) ||
            (bodyMetrics.maxTileRatio > 0.66 && bodyMetrics.changedRatio > 0.14 && bodyMetrics.centerRatio > 0.16))) ||
        (faces.length === 1 &&
          ((faceMetrics.changedRatio > 0.28 && faceMetrics.centerRatio > 0.22) ||
            faceMetrics.centerRatio > 0.36 ||
            (bodyMetrics.changedRatio > 0.3 && bodyMetrics.centerRatio > 0.24) ||
            (bodyMetrics.maxTileRatio > 0.7 && bodyMetrics.changedRatio > 0.18 && bodyMetrics.centerRatio > 0.18)));

      if (obstructionDetected) {
        obstructionFramesRef.current += 1;
      } else {
        obstructionFramesRef.current = 0;
      }

      if (obstructionFramesRef.current >= (strongObstruction ? STRONG_OBSTRUCTION_FRAMES_REQUIRED : OBSTRUCTION_FRAMES_REQUIRED)) {
        lastObstructionAtRef.current = Date.now();
        await reportViolation("foreground_obstruction_detected", {
          bodyDiff: Number(bodyMetrics.changedRatio.toFixed(3)),
          bodyCenterDiff: Number(bodyMetrics.centerRatio.toFixed(3)),
          bodyMaxTileDiff: Number(bodyMetrics.maxTileRatio.toFixed(3)),
          faceDiff: Number(faceMetrics.changedRatio.toFixed(3)),
          faceCenterDiff: Number(faceMetrics.centerRatio.toFixed(3)),
          faceMaxTileDiff: Number(faceMetrics.maxTileRatio.toFixed(3)),
          faces: faces.length,
        });
        obstructionFramesRef.current = 0;
      }
    }

    if (faces.length === 1 && primaryFace) {
      lastStableFaceRef.current = primaryFace;
      noFaceFramesRef.current = 0;
      multipleFaceFramesRef.current = 0;

      baselineRefreshFramesRef.current += 1;
      if (!obstructionDetected && baselineRefreshFramesRef.current >= 10) {
        baselineRef.current = currentFrame;
        baselineRefreshFramesRef.current = 0;
      }
    } else if (faces.length > 1) {
      multipleFaceFramesRef.current += 1;
      noFaceFramesRef.current = 0;
      if (multipleFaceFramesRef.current >= 2) {
        await reportViolation("multiple_faces_detected", { faces: faces.length });
        multipleFaceFramesRef.current = 0;
      }
    } else {
      noFaceFramesRef.current += 1;
      multipleFaceFramesRef.current = 0;
      const recentlyObstructed = Date.now() - lastObstructionAtRef.current < 6000;
      if (noFaceFramesRef.current >= 3 && !recentlyObstructed) {
        await reportViolation("no_face_detected", { consecutiveFrames: noFaceFramesRef.current });
        noFaceFramesRef.current = 0;
      }
    }
  }, [active, reportViolation, syncStatus]);

  useEffect(() => {
    if (phase !== "checking" && phase !== "ready") return;
    void inspectFrame();
    const id = window.setInterval(() => {
      void inspectFrame();
    }, CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [inspectFrame, phase]);

  const state: VideoProctoringState = {
    ready: phase === "ready",
    cameraStatus,
    violationCount,
    latestWarning,
  };

  const gateTitle =
    phase === "denied"
      ? "Camera access required"
      : phase === "unsupported"
        ? "Camera check unavailable"
        : phase === "lost"
          ? "Webcam feed lost"
          : "Camera check";

  const gateTone = phase === "denied" || phase === "unsupported" || phase === "lost" ? "var(--rose)" : "var(--indigo-light)";
  const previewPositionStyle =
    previewPlacement === "top-right"
      ? { top: 72, right: 18 }
      : { right: 18, bottom: 18 };

  if (phase !== "ready") {
    return (
      <div className="page-wrapper" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <video ref={processingVideoRef} style={hiddenVideoStyle} muted playsInline />
        <canvas ref={canvasRef} width={FRAME_WIDTH} height={FRAME_HEIGHT} style={{ display: "none" }} />

        <div className="card" style={{ width: "100%", maxWidth: 680, border: `1px solid ${gateTone}`, boxShadow: "0 18px 70px rgba(0,0,0,0.35)" }}>
          <div className="text-center" style={{ marginBottom: 18 }}>
            <div className="badge badge-indigo" style={{ marginBottom: 12 }}>Mandatory webcam verification</div>
            <h2 style={{ fontSize: "1.45rem", color: gateTone }}>{gateTitle}</h2>
            <p className="text-sm text-secondary mt-2" style={{ lineHeight: 1.65 }}>
              {gateMessage}
            </p>
          </div>

          <div
            style={{
              width: "100%",
              aspectRatio: "16 / 9",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18,
            }}
          >
            {phase === "requesting" || phase === "unsupported" || phase === "denied" ? (
              <div className="text-center text-muted">
                {phase === "requesting" ? (
                  <span className="spinner" style={{ width: 32, height: 32, borderColor: "var(--indigo)" }} />
                ) : (
                  <div style={{ fontSize: "0.95rem" }}>Camera preview unavailable</div>
                )}
              </div>
            ) : (
              <video
                ref={previewVideoRef}
                muted
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: "scaleX(-1)",
                }}
              />
            )}
          </div>

          <div className="flex justify-between items-center" style={{ gap: 12, flexWrap: "wrap" }}>
            <div className="text-xs text-muted" style={{ lineHeight: 1.5 }}>
              {detectorMode === "native"
                ? "Background items are ignored. Only extra faces, camera loss, and foreground blocking are enforced."
                : "Native face detection is unavailable here, so this device uses live camera and foreground blocking checks."}
            </div>
            {(phase === "denied" || phase === "unsupported" || phase === "lost") && (
              <button type="button" className="btn btn-primary" onClick={() => void startCamera()}>
                Retry Camera Check
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <video ref={processingVideoRef} style={hiddenVideoStyle} muted playsInline />
      <canvas ref={canvasRef} width={FRAME_WIDTH} height={FRAME_HEIGHT} style={{ display: "none" }} />
      {children(state)}

      <div
        style={{
          position: "fixed",
          ...previewPositionStyle,
          zIndex: 80,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 10px",
          borderRadius: "var(--radius-md)",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-md)",
          maxWidth: "calc(100vw - 36px)",
        }}
      >
        <video
          ref={previewVideoRef}
          muted
          playsInline
          style={{
            width: 76,
            height: 52,
            objectFit: "cover",
            borderRadius: 6,
            border: "1px solid var(--border)",
            transform: "scaleX(-1)",
            background: "var(--bg-secondary)",
            flexShrink: 0,
          }}
        />
        <div style={{ minWidth: 125 }}>
          <div className={`badge ${violationCount === 0 ? "badge-emerald" : violationCount <= PROCTORING_ALLOWED_VIOLATIONS ? "badge-amber" : "badge-rose"}`} style={{ fontSize: "0.68rem" }}>
            {violationCount === 0 ? "Proctoring active" : `${violationCount} warning${violationCount === 1 ? "" : "s"}`}
          </div>
          <div className="text-xs text-muted mt-1">
            Camera {cameraStatus === "active" ? "live" : cameraStatus}
          </div>
        </div>
      </div>

      {latestWarning && !endingForPolicy && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            top: 18,
            transform: "translateX(-50%)",
            zIndex: 10000,
            width: "min(560px, calc(100vw - 32px))",
            background: "var(--bg-card)",
            border: "1.5px solid var(--rose)",
            borderRadius: "var(--radius-md)",
            padding: "14px 16px",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div className="flex justify-between items-center" style={{ gap: 12 }}>
            <div>
              <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--rose)" }}>
                {PROCTORING_EVENT_LABELS[latestWarning.type]}
              </div>
              <div className="text-sm text-secondary mt-1">{latestWarning.message}</div>
              <div className="text-xs text-muted mt-1">
                {latestWarning.count === 1
                  ? "First violation: warning."
                  : latestWarning.count === 2
                    ? "Second violation: warning recorded."
                    : "Violation threshold exceeded."}
              </div>
            </div>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setLatestWarning(null)}>
              OK
            </button>
          </div>
        </div>
      )}

      {endingForPolicy && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10001, background: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div className="card text-center" style={{ maxWidth: 480, border: "1px solid var(--rose)" }}>
            <h3 style={{ color: "var(--rose)", marginBottom: 8 }}>Proctoring limit exceeded</h3>
            <p className="text-sm text-secondary" style={{ lineHeight: 1.65 }}>
              This round is ending without report or score generation because the allowed violation threshold was exceeded.
            </p>
            <span className="spinner mt-4" style={{ width: 28, height: 28, borderColor: "var(--rose)" }} />
          </div>
        </div>
      )}
    </>
  );
}
