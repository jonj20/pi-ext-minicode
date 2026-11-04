import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type WindowsShellKind = "pwsh" | "powershell" | "cmd" | "git-bash" | "wsl";
const shellKinds = ["pwsh", "powershell", "cmd", "git-bash", "wsl"] as const;
export const isWindowsShellKind = (value: string | undefined): value is WindowsShellKind => !!value && shellKinds.includes(value as WindowsShellKind);

export interface ShellInfo {
  kind: WindowsShellKind;
  displayName: string;
  executable: string;
  available: boolean;
  version?: string;
}

export interface ShellInfo {
  kind: WindowsShellKind;
  displayName: string;
  executable: string;
  available: boolean;
  version?: string;
  error?: string;
}

const systemExe = (name: string) => join(process.env.SystemRoot || "C:\\Windows", "System32", name);

type WhereResult = { path: string | null; error: string | null };

function where(cmd: string): WhereResult {
  try {
    const out = execFileSync(systemExe("where.exe"), [cmd], { cwd: homedir(), encoding: "utf8", timeout: 3000 })
      .split(/\r?\n/)[0]?.trim();
    return { path: out || null, error: null };
  } catch (err: any) {
    return { path: null, error: err?.message || String(err) };
  }
}

type VersionResult = { version: string | undefined; error: string | null };

function getVersion(cmd: string, args: string[]): VersionResult {
  try {
    return { version: execFileSync(cmd, args, { encoding: "utf8", timeout: 3000 }).split(/\r?\n/)[0]?.trim(), error: null };
  } catch (err: any) {
    return { version: undefined, error: err?.message || String(err) };
  }
}

// ponytail: detection spawns where.exe + a version probe per kind — memoized at
// module level so repeated getDefaultShell() calls (every exec/quote) cost zero
// spawns. resetShellDetectionCache() forces re-detection (/shell command, tests).
const detectionCache = new Map<WindowsShellKind, ShellInfo>();

export function resetShellDetectionCache(): void {
  detectionCache.clear();
}

function detectShellUncached(kind: WindowsShellKind): ShellInfo {
  switch (kind) {
    case "pwsh": {
      const whereResult = where("pwsh");
      const ver = whereResult.path ? getVersion(whereResult.path, ["--version"]) : { version: undefined, error: null };
      return {
        kind, displayName: "PowerShell 7+", executable: whereResult.path || "pwsh.exe",
        available: !!whereResult.path, version: ver.version,
        error: whereResult.error || ver.error || undefined,
      };
    }
    case "powershell": {
      const whereResult = where("powershell");
      const ver = whereResult.path ? getVersion(whereResult.path, ["-Command", "$PSVersionTable.PSVersion.ToString()"]) : { version: undefined, error: null };
      return {
        kind, displayName: "Windows PowerShell", executable: whereResult.path || "powershell.exe",
        available: !!whereResult.path, version: ver.version,
        error: whereResult.error || ver.error || undefined,
      };
    }
    case "cmd": {
      const comspec = process.env.ComSpec || "cmd.exe";
      const exe = existsSync(comspec) ? comspec : where("cmd").path;
      return { kind, displayName: "Command Prompt", executable: exe || "cmd.exe", available: !!exe || process.platform === "win32" };
    }
    case "git-bash": {
      const candidates = [process.env.PI_GIT_BASH_PATH || "", "C:\\Program Files\\Git\\bin\\bash.exe", "C:\\Program Files (x86)\\Git\\bin\\bash.exe"].filter(Boolean);
      const whereResult = where("bash");
      const exe = candidates.find(c => existsSync(c)) || (whereResult.path ? whereResult.path : null);
      const configured = process.env.PI_GIT_BASH_PATH;
      const isGitBash = exe && (exe === configured || /(?:^|[\\/])git(?:[\\/]|$)/i.test(exe));
      const ver = exe ? getVersion(exe, ["--version"]) : { version: undefined, error: null };
      return {
        kind, displayName: "Git Bash", executable: exe || "bash.exe",
        available: !!exe && !!isGitBash, version: ver.version,
        error: whereResult.error || ver.error || undefined,
      };
    }
    case "wsl": {
      const whereResult = where("wsl");
      const ver = whereResult.path ? getVersion(whereResult.path, ["--status"]) : { version: undefined, error: null };
      return {
        kind, displayName: "WSL", executable: whereResult.path || systemExe("wsl.exe"),
        available: !!whereResult.path, version: ver.version,
        error: whereResult.error || ver.error || undefined,
      };
    }
  }
}

export function detectShell(kind: WindowsShellKind): ShellInfo {
  const hit = detectionCache.get(kind);
  if (hit) return { ...hit };
  const info = detectShellUncached(kind);
  detectionCache.set(kind, info);
  return { ...info };
}

export function detectAllShells(): ShellInfo[] {
  return (["pwsh", "powershell", "cmd", "git-bash", "wsl"] as WindowsShellKind[]).map(detectShell);
}

export function getDefaultShell(): ShellInfo {
  const envShell = process.env.PI_WINDOWS_SHELL;
  if (isWindowsShellKind(envShell)) {
    const info = detectShell(envShell);
    if (info.available) return info;
  }
  for (const kind of ["pwsh", "powershell", "git-bash", "cmd", "wsl"] as WindowsShellKind[]) {
    const info = detectShell(kind);
    if (info.available) return info;
  }
  return detectShell("cmd");
}
