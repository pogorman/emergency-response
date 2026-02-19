/**
 * Structured logging with [STEP] [LEVEL] [timestamp] format.
 * All deployment scripts use this logger for consistent output.
 */

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LOG_COLORS: Record<LogLevel, string> = {
  DEBUG: "\x1b[90m",
  INFO: "\x1b[36m",
  WARN: "\x1b[33m",
  ERROR: "\x1b[31m",
};
const RESET = "\x1b[0m";

let currentStep = "INIT";
let verboseMode = false;

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function formatMessage(level: LogLevel, message: string): string {
  const color = LOG_COLORS[level];
  return `${color}[${currentStep}] [${level}] [${timestamp()}]${RESET} ${message}`;
}

export function setStep(step: string): void {
  currentStep = step;
}

export function setVerbose(verbose: boolean): void {
  verboseMode = verbose;
}

export function debug(message: string): void {
  if (verboseMode) {
    console.log(formatMessage("DEBUG", message));
  }
}

export function info(message: string): void {
  console.log(formatMessage("INFO", message));
}

export function warn(message: string): void {
  console.warn(formatMessage("WARN", message));
}

export function error(message: string): void {
  console.error(formatMessage("ERROR", message));
}

export function success(message: string): void {
  console.log(`\x1b[32m[${currentStep}] [OK] [${timestamp()}]${RESET} ${message}`);
}

export function divider(): void {
  console.log("\x1b[90m" + "─".repeat(70) + RESET);
}

export function header(title: string): void {
  divider();
  console.log(`\x1b[1m\x1b[36m  ${title}${RESET}`);
  divider();
}

export function dryRun(message: string): void {
  console.log(`\x1b[35m[${currentStep}] [DRY-RUN] [${timestamp()}]${RESET} ${message}`);
}

export function stepSummary(
  step: string,
  status: "completed" | "failed" | "skipped",
  durationMs?: number
): void {
  const icon = status === "completed" ? "\x1b[32m✓" : status === "failed" ? "\x1b[31m✗" : "\x1b[33m⊘";
  const duration = durationMs !== undefined ? ` (${(durationMs / 1000).toFixed(1)}s)` : "";
  console.log(`${icon} ${step}${duration}${RESET}`);
}
