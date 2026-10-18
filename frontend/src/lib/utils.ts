import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`;
}

export function formatDate(dateString: string): string {
  try {
    return format(parseISO(dateString), "MMM d, yyyy");
  } catch {
    return dateString;
  }
}

export function formatRelativeTime(dateString: string): string {
  try {
    return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
  } catch {
    return dateString;
  }
}

export function scoreToGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "A-";
  if (score >= 75) return "B+";
  if (score >= 70) return "B";
  if (score >= 65) return "B-";
  if (score >= 60) return "C+";
  if (score >= 55) return "C";
  return "D";
}

export function scoreToColor(score: number): string {
  if (score >= 80) return "text-eva-green";
  if (score >= 60) return "text-eva-amber";
  return "text-eva-red";
}

export function scoreToBarColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Safe number helpers — guard against undefined/null/NaN from API ──────────

/** Return n as a safe integer, defaulting to 0 for undefined/null/NaN. */
export function safeInt(n: unknown, fallback = 0): number {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v) : fallback;
}

/** Return n as a safe float, defaulting to 0 for undefined/null/NaN. */
export function safeFloat(n: unknown, fallback = 0): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

/** Format speaking minutes safely — input is minutes, displayed as duration. */
export function formatSpeakingTime(minutes: unknown): string {
  const m = safeInt(minutes);
  if (m === 0) return "0m";
  return formatDuration(m * 60);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function interviewRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    software_engineer: "Software Engineer",
    frontend_developer: "Frontend Developer",
    backend_developer: "Backend Developer",
    fullstack_developer: "Full Stack Developer",
    data_scientist: "Data Scientist",
    hr: "HR Interview",
    behavioral: "Behavioral Interview",
  };
  return labels[role] || role;
}

export function practiceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    casual_conversation: "Casual Conversation",
    storytelling: "Storytelling",
    public_speaking: "Public Speaking",
    debate_practice: "Debate Practice",
    office_english: "Office English",
    travel_english: "Travel English",
    presentation_practice: "Presentation Practice",
    vocabulary_builder: "Vocabulary Builder",
    grammar_practice: "Grammar Practice",
  };
  return labels[type] || type;
}

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}

export function clampAudioLevel(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}
