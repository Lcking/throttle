import * as vscode from "vscode";
import * as path from "path";
import { promises as fs } from "fs";

type LoggingMode = "hit" | "summary" | "both";

function isLoggingEnabled(): boolean {
  const config = vscode.workspace.getConfiguration("throttle");
  return config.get<boolean>("logging.enabled", true);
}

function isDebugLoggingOnly(): boolean {
  const config = vscode.workspace.getConfiguration("throttle");
  return config.get<boolean>("logging.debugOnly", false);
}

function getLoggingMode(): LoggingMode {
  const config = vscode.workspace.getConfiguration("throttle");
  return config.get<LoggingMode>("logging.mode", "hit");
}

function isFileLoggingEnabled(): boolean {
  const config = vscode.workspace.getConfiguration("throttle");
  return config.get<boolean>("logging.fileEnabled", false);
}

function resolveLogFilePath(
  context: vscode.ExtensionContext,
  allowDisabled: boolean
): string | undefined {
  const config = vscode.workspace.getConfiguration("throttle");
  const configuredPath = config.get<string>("logging.filePath", "").trim();
  if (!allowDisabled && !isFileLoggingEnabled()) {
    return undefined;
  }
  if (configuredPath) {
    if (path.isAbsolute(configuredPath)) {
      return configuredPath;
    }
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    return workspaceFolder
      ? path.join(workspaceFolder, configuredPath)
      : path.join(context.globalStorageUri.fsPath, configuredPath);
  }
  return path.join(context.globalStorageUri.fsPath, "throttle.log");
}

export function getLogFilePath(
  context: vscode.ExtensionContext
): string | undefined {
  return resolveLogFilePath(context, true);
}

async function appendLogFile(
  context: vscode.ExtensionContext,
  line: string
): Promise<void> {
  const filePath = resolveLogFilePath(context, false);
  if (!filePath) {
    return;
  }
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.appendFile(filePath, `${line}\n`, "utf8");
  } catch {
    // Logging should never block normal flow.
  }
}

function logEvent(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  message: string
): void {
  if (!isLoggingEnabled()) {
    return;
  }
  if (
    isDebugLoggingOnly() &&
    context.extensionMode !== vscode.ExtensionMode.Development
  ) {
    return;
  }
  const ts = new Date().toISOString();
  const line = `[${ts}] ${message}`;
  output.appendLine(line);
  void appendLogFile(context, line);
}

export function logHit(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  hitMessage: string,
  summaryMessage: string
): void {
  const mode = getLoggingMode();
  if (mode === "summary") {
    logEvent(context, output, summaryMessage);
    return;
  }
  if (mode === "both") {
    logEvent(context, output, hitMessage);
    logEvent(context, output, summaryMessage);
    return;
  }
  logEvent(context, output, hitMessage);
}

export async function clearLogFile(
  context: vscode.ExtensionContext
): Promise<boolean> {
  const filePath = resolveLogFilePath(context, true);
  if (!filePath) {
    return false;
  }
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "", "utf8");
    return true;
  } catch {
    return false;
  }
}

export function isLoggingActive(
  context: vscode.ExtensionContext
): boolean {
  if (!isLoggingEnabled()) {
    return false;
  }
  if (
    isDebugLoggingOnly() &&
    context.extensionMode !== vscode.ExtensionMode.Development
  ) {
    return false;
  }
  return true;
}
