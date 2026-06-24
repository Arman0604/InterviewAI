export const PROCTORING_ALLOWED_VIOLATIONS = 2;

export const PROCTORING_VIOLATION_TYPES = [
  "camera_permission_denied",
  "camera_feed_lost",
  "no_face_detected",
  "multiple_faces_detected",
  "foreground_obstruction_detected",
  "tab_switch_detected",
] as const;

export type ProctoringViolationType = (typeof PROCTORING_VIOLATION_TYPES)[number];

export type ProctoringCameraStatus = "unknown" | "granted" | "denied" | "lost" | "active";

export const COUNTED_PROCTORING_VIOLATION_TYPES = [
  "camera_permission_denied",
  "camera_feed_lost",
  "no_face_detected",
  "multiple_faces_detected",
  "foreground_obstruction_detected",
  "tab_switch_detected",
] as const satisfies readonly ProctoringViolationType[];

export interface ProctoringEventRecord {
  id?: string;
  event_type: ProctoringViolationType;
  occurred_at: string;
  message?: string | null;
  metadata?: string | null;
}

export const PROCTORING_EVENT_LABELS: Record<ProctoringViolationType, string> = {
  camera_permission_denied: "Camera permission denied",
  camera_feed_lost: "Webcam feed lost",
  no_face_detected: "No face detected",
  multiple_faces_detected: "Multiple faces detected",
  foreground_obstruction_detected: "Foreground obstruction detected",
  tab_switch_detected: "Tab switch detected",
};

export const PROCTORING_EVENT_MESSAGES: Record<ProctoringViolationType, string> = {
  camera_permission_denied: "Camera access is required to begin the interview.",
  camera_feed_lost: "Webcam feed lost. Please restore access to continue.",
  no_face_detected: "Please keep your face visible to the camera.",
  multiple_faces_detected: "Please ensure only one face is visible.",
  foreground_obstruction_detected: "An object is blocking the camera view. Please remove it.",
  tab_switch_detected: "Switching tabs or leaving the interview window is not allowed.",
};

export function isProctoringViolationType(value: unknown): value is ProctoringViolationType {
  return (
    typeof value === "string" &&
    (PROCTORING_VIOLATION_TYPES as readonly string[]).includes(value)
  );
}

export function isCountedProctoringViolation(value: unknown): value is ProctoringViolationType {
  return (
    typeof value === "string" &&
    (COUNTED_PROCTORING_VIOLATION_TYPES as readonly string[]).includes(value)
  );
}
