/**
 * Judge0 Code Execution Helper
 *
 * Wraps the Judge0 CE REST API (via RapidAPI).
 * Requires env vars: JUDGE0_API_KEY, JUDGE0_API_HOST
 *
 * In development, if Judge0 env vars are missing, code is executed through
 * local runtimes where available. Production still expects Judge0.
 *
 * Judge0 Language IDs (most common subset):
 *   54  → C++ (GCC 9.2.0)
 *   50  → C   (GCC 9.2.0)
 *   62  → Java (OpenJDK 13.0.1)
 *   71  → Python 3 (3.8.1)
 *   63  → JavaScript (Node.js 12.14.0)
 *   74  → TypeScript (3.7.4)
 *   72  → Ruby (2.7.0)
 *   78  → Kotlin (1.3.70)
 *   73  → Rust (1.40.0)
 *   60  → Go   (1.13.5)
 *   51  → C# (Mono 6.6.0.161)
 */

import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { JUDGE0_LANGUAGES } from "./judge0-languages";

export { JUDGE0_LANGUAGES };

export interface Judge0Result {
  /** stdout from the program */
  stdout: string | null;
  /** stderr / compile errors */
  stderr: string | null;
  /** compilation output */
  compile_output: string | null;
  /** wall-clock time in seconds */
  time: string | null;
  /** memory in kilobytes */
  memory: number | null;
  status: {
    /** Judge0 status id (3 = Accepted, 6 = Compilation Error, etc.) */
    id: number;
    description: string;
  };
}

/** Map of human-readable language names → Judge0 language IDs */
const FALLBACK_RESULT: Judge0Result = {
  stdout: null,
  stderr: null,
  compile_output: null,
  time: null,
  memory: null,
  status: {
    id: 0,
    description: "Code execution unavailable — add JUDGE0_API_KEY to .env.local",
  },
};

const LOCAL_RUN_TIMEOUT_MS = 5000;

function shouldUseLocalFallback(): boolean {
  if (process.env.JUDGE0_LOCAL_FALLBACK === "false") return false;
  if (process.env.JUDGE0_LOCAL_FALLBACK === "true") return true;
  return process.env.NODE_ENV !== "production";
}

function isConfigured(): boolean {
  const key  = process.env.JUDGE0_API_KEY;
  const host = process.env.JUDGE0_API_HOST;
  return !!(
    key && key !== "your_rapidapi_key_here" &&
    host && host !== ""
  );
}

function getHeaders(): Record<string, string> {
  return {
    "Content-Type":       "application/json",
    "X-RapidAPI-Key":    process.env.JUDGE0_API_KEY!,
    "X-RapidAPI-Host":   process.env.JUDGE0_API_HOST!,
  };
}

function getBaseUrl(): string {
  return `https://${process.env.JUDGE0_API_HOST}`;
}

function languageNameFromId(languageId: number): string {
  return Object.entries(JUDGE0_LANGUAGES).find(([, id]) => id === languageId)?.[0] ?? "Unknown";
}

async function commandExists(command: string): Promise<boolean> {
  const checker = process.platform === "win32" ? "where" : "which";
  const result = await runProcess(checker, [command], "", 1500);
  return result.exitCode === 0;
}

async function runProcess(
  command: string,
  args: string[],
  stdin: string,
  timeoutMs: number
): Promise<{ stdout: string; stderr: string; exitCode: number | null; timedOut: boolean; time: string }> {
  const started = Date.now();

  return new Promise((resolve) => {
    const child = spawn(command, args, { shell: false, windowsHide: true });
    let stdout = "";
    let stderr = "";
    let finished = false;

    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      child.kill();
      resolve({
        stdout,
        stderr: stderr || "Time limit exceeded",
        exitCode: null,
        timedOut: true,
        time: ((Date.now() - started) / 1000).toFixed(3),
      });
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr?.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve({
        stdout,
        stderr: err.message,
        exitCode: -1,
        timedOut: false,
        time: ((Date.now() - started) / 1000).toFixed(3),
      });
    });
    child.on("close", (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve({
        stdout,
        stderr,
        exitCode: code,
        timedOut: false,
        time: ((Date.now() - started) / 1000).toFixed(3),
      });
    });

    child.stdin?.on("error", () => undefined);
    if (stdin) child.stdin?.write(stdin);
    child.stdin?.end();
  });
}

function resultFromRun(run: Awaited<ReturnType<typeof runProcess>>): Judge0Result {
  if (run.timedOut) {
    return {
      stdout: run.stdout || null,
      stderr: run.stderr || null,
      compile_output: null,
      time: run.time,
      memory: null,
      status: { id: 5, description: "Time Limit Exceeded" },
    };
  }

  if (run.exitCode !== 0) {
    return {
      stdout: run.stdout || null,
      stderr: run.stderr || null,
      compile_output: null,
      time: run.time,
      memory: null,
      status: { id: 11, description: "Runtime Error" },
    };
  }

  return {
    stdout: run.stdout || null,
    stderr: run.stderr || null,
    compile_output: null,
    time: run.time,
    memory: null,
    status: { id: 3, description: "Accepted" },
  };
}

async function runLocalCode(
  sourceCode: string,
  languageId: number,
  stdin: string
): Promise<Judge0Result> {
  const languageName = languageNameFromId(languageId);
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-interview-dsa-"));

  try {
    switch (languageId) {
      case JUDGE0_LANGUAGES["Python 3"]: {
        if (!(await commandExists("python"))) return localUnavailable(languageName, "python");
        const file = path.join(tmpDir, "solution.py");
        await fs.writeFile(file, sourceCode, "utf8");
        return resultFromRun(await runProcess("python", [file], stdin, LOCAL_RUN_TIMEOUT_MS));
      }

      case JUDGE0_LANGUAGES["JavaScript (Node)"]: {
        if (!(await commandExists("node"))) return localUnavailable(languageName, "node");
        const file = path.join(tmpDir, "solution.js");
        await fs.writeFile(file, sourceCode, "utf8");
        return resultFromRun(await runProcess("node", [file], stdin, LOCAL_RUN_TIMEOUT_MS));
      }

      case JUDGE0_LANGUAGES["C++ (GCC 9)"]: {
        if (!(await commandExists("g++"))) return localUnavailable(languageName, "g++");
        const source = path.join(tmpDir, "solution.cpp");
        const exe = path.join(tmpDir, process.platform === "win32" ? "solution.exe" : "solution");
        await fs.writeFile(source, sourceCode, "utf8");
        const compile = await runProcess("g++", [source, "-std=c++17", "-O2", "-o", exe], "", LOCAL_RUN_TIMEOUT_MS);
        if (compile.exitCode !== 0 || compile.timedOut) return compileError(compile);
        return resultFromRun(await runProcess(exe, [], stdin, LOCAL_RUN_TIMEOUT_MS));
      }

      case JUDGE0_LANGUAGES["C (GCC 9)"]: {
        if (!(await commandExists("gcc"))) return localUnavailable(languageName, "gcc");
        const source = path.join(tmpDir, "solution.c");
        const exe = path.join(tmpDir, process.platform === "win32" ? "solution.exe" : "solution");
        await fs.writeFile(source, sourceCode, "utf8");
        const compile = await runProcess("gcc", [source, "-O2", "-o", exe], "", LOCAL_RUN_TIMEOUT_MS);
        if (compile.exitCode !== 0 || compile.timedOut) return compileError(compile);
        return resultFromRun(await runProcess(exe, [], stdin, LOCAL_RUN_TIMEOUT_MS));
      }

      case JUDGE0_LANGUAGES["Java (OpenJDK 13)"]: {
        if (!(await commandExists("javac")) || !(await commandExists("java"))) {
          return localUnavailable(languageName, "javac/java");
        }
        const source = path.join(tmpDir, "Solution.java");
        await fs.writeFile(source, sourceCode, "utf8");
        const compile = await runProcess("javac", [source], "", LOCAL_RUN_TIMEOUT_MS);
        if (compile.exitCode !== 0 || compile.timedOut) return compileError(compile);
        return resultFromRun(await runProcess("java", ["-cp", tmpDir, "Solution"], stdin, LOCAL_RUN_TIMEOUT_MS));
      }

      default:
        return {
          ...FALLBACK_RESULT,
          stderr: `Local execution for ${languageName} is not configured. Configure Judge0 or select Python, JavaScript, C, C++, or Java.`,
          status: { id: 0, description: "Local runner unavailable" },
        };
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function compileError(run: Awaited<ReturnType<typeof runProcess>>): Judge0Result {
  return {
    stdout: run.stdout || null,
    stderr: null,
    compile_output: run.stderr || run.stdout || "Compilation failed",
    time: run.time,
    memory: null,
    status: { id: 6, description: run.timedOut ? "Compilation Timeout" : "Compilation Error" },
  };
}

function localUnavailable(languageName: string, command: string): Judge0Result {
  return {
    ...FALLBACK_RESULT,
    stderr: `Local ${languageName} runner is unavailable because "${command}" was not found. Configure Judge0 to run this language.`,
    status: { id: 0, description: "Local runner unavailable" },
  };
}

/**
 * Run a single code submission against one stdin input.
 * Uses the synchronous (wait=true) Judge0 endpoint for simplicity.
 */
export async function runCode(
  sourceCode: string,
  languageId: number,
  stdin: string
): Promise<Judge0Result> {
  if (!isConfigured()) {
    return shouldUseLocalFallback()
      ? runLocalCode(sourceCode, languageId, stdin)
      : FALLBACK_RESULT;
  }

  try {
    const res = await fetch(
      `${getBaseUrl()}/submissions?base64_encoded=false&wait=true&fields=stdout,stderr,compile_output,time,memory,status`,
      {
        method:  "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          source_code:  sourceCode,
          language_id:  languageId,
          stdin:        stdin,
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ...FALLBACK_RESULT,
        stderr: `Judge0 API error ${res.status}: ${text}`,
        status: { id: -1, description: `HTTP ${res.status}` },
      };
    }

    const data = await res.json();
    return {
      stdout:          data.stdout        ?? null,
      stderr:          data.stderr        ?? null,
      compile_output:  data.compile_output ?? null,
      time:            data.time          ?? null,
      memory:          data.memory        ?? null,
      status: {
        id:          data.status?.id          ?? 0,
        description: data.status?.description ?? "Unknown",
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error contacting Judge0";
    return {
      ...FALLBACK_RESULT,
      stderr: message,
      status: { id: -1, description: "Network error" },
    };
  }
}

/**
 * Run the same source code against multiple stdin inputs sequentially.
 * Returns one Judge0Result per input.
 */
export async function runBatch(
  sourceCode: string,
  languageId: number,
  inputs: string[]
): Promise<Judge0Result[]> {
  if (!isConfigured() && !shouldUseLocalFallback()) {
    return inputs.map(() => FALLBACK_RESULT);
  }

  // Sequential execution to respect free-tier rate limits.
  const results: Judge0Result[] = [];
  for (const stdin of inputs) {
    const result = await runCode(sourceCode, languageId, stdin);
    results.push(result);
  }
  return results;
}

/**
 * Normalise Judge0 stdout for comparison: trim, collapse whitespace.
 */
export function normaliseOutput(raw: string | null): string {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n");
}
