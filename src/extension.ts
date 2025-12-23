import * as vscode from "vscode";
import {
  clearLastHit,
  safeSubmit,
  safeSubmitFromClipboard,
} from "./ui/safeSubmit";
import {
  getMode,
  getModelTier,
  quickSwitchCommand,
  setModeCommand,
} from "./ui/modeState";
import { clearMutedRules } from "./ui/ruleMuteState";
import { getMutedRules } from "./ui/ruleMuteState";
import { clearLogFile, getLogFilePath, isLoggingActive } from "./ui/logging";

function getStatusBarSettings(): {
  showMode: boolean;
  showSubmit: boolean;
  showLastHit: boolean;
} {
  const config = vscode.workspace.getConfiguration("throttle");
  return {
    showMode: config.get<boolean>("statusBar.showMode", true),
    showSubmit: config.get<boolean>("statusBar.showSubmit", true),
    showLastHit: config.get<boolean>("statusBar.showLastHit", true),
  };
}

function updateStatusBar(
  context: vscode.ExtensionContext,
  item: vscode.StatusBarItem
): void {
  const settings = getStatusBarSettings();
  if (!settings.showMode) {
    item.hide();
    return;
  }
  const mode = getMode(context);
  const tier = getModelTier(context, mode);
  const mutedCount = getMutedRules(context).length;
  const mutedText = mutedCount > 0 ? ` 静音${mutedCount}` : "";
  const loggingText = isLoggingActive(context) ? " 日志" : "";
  const lastHit = context.workspaceState.get<string>("throttle.lastHit");
  const lastHitShort = lastHit ? lastHit.replace(/^R/, "") : "";
  const lastHitText =
    settings.showLastHit && lastHitShort ? ` 命中:${lastHitShort}` : "";
  item.text = `Throttle ${mode}/${tier}${mutedText}${loggingText}${lastHitText}`;
  item.tooltip = "点击快速切换。";
  item.show();
}

function updateSubmitItem(item: vscode.StatusBarItem): void {
  const settings = getStatusBarSettings();
  if (!settings.showSubmit) {
    item.hide();
    return;
  }
  item.show();
}

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("Throttle");
  output.appendLine("Throttle activated.");
  const statusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusItem.command = "throttle.quickSwitch";
  updateStatusBar(context, statusItem);
  const submitItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    99
  );
  submitItem.text = "Throttle: 提交";
  submitItem.tooltip = "用剪贴板内容安全提交（Cmd/Ctrl+Enter）。";
  submitItem.command = "throttle.safeSubmitClipboard";
  updateSubmitItem(submitItem);

  const safeSubmitDisposable = vscode.commands.registerCommand(
    "throttle.safeSubmit",
    async () => {
      output.appendLine("Command: throttle.safeSubmit");
      await safeSubmit(context, output);
      updateStatusBar(context, statusItem);
      updateSubmitItem(submitItem);
    }
  );
  const safeSubmitClipboardDisposable = vscode.commands.registerCommand(
    "throttle.safeSubmitClipboard",
    async () => {
      output.appendLine("Command: throttle.safeSubmitClipboard");
      await safeSubmitFromClipboard(context, output);
      updateStatusBar(context, statusItem);
      updateSubmitItem(submitItem);
    }
  );
  const setModeDisposable = vscode.commands.registerCommand(
    "throttle.setMode",
    async () => {
      output.appendLine("Command: throttle.setMode");
      await setModeCommand(context);
      updateStatusBar(context, statusItem);
      updateSubmitItem(submitItem);
    }
  );
  const quickSwitchDisposable = vscode.commands.registerCommand(
    "throttle.quickSwitch",
    async () => {
      output.appendLine("Command: throttle.quickSwitch");
      await quickSwitchCommand(context);
      updateStatusBar(context, statusItem);
      updateSubmitItem(submitItem);
    }
  );
  const resetMuteDisposable = vscode.commands.registerCommand(
    "throttle.resetMutedRules",
    async () => {
      output.appendLine("Command: throttle.resetMutedRules");
      await clearMutedRules(context);
      void vscode.window.showInformationMessage("已清除静音规则。");
      updateStatusBar(context, statusItem);
      updateSubmitItem(submitItem);
    }
  );
  const clearLogDisposable = vscode.commands.registerCommand(
    "throttle.clearLog",
    async () => {
      output.appendLine("Command: throttle.clearLog");
      const ok = await clearLogFile(context);
      if (ok) {
        const logPath = getLogFilePath(context);
        void vscode.window.showInformationMessage(
          logPath ? `已清空日志文件：${logPath}` : "已清空日志文件。"
        );
      } else {
        void vscode.window.showWarningMessage("未能清空日志文件。");
      }
    }
  );
  const clearLastHitDisposable = vscode.commands.registerCommand(
    "throttle.clearLastHit",
    async () => {
      output.appendLine("Command: throttle.clearLastHit");
      await clearLastHit(context);
      void vscode.window.showInformationMessage("已清空最近命中记录。");
      updateStatusBar(context, statusItem);
    }
  );
  const openLogDisposable = vscode.commands.registerCommand(
    "throttle.openLog",
    async () => {
      output.appendLine("Command: throttle.openLog");
      const logPath = getLogFilePath(context);
      if (!logPath) {
        void vscode.window.showWarningMessage("未找到日志文件路径。");
        return;
      }
      try {
        const doc = await vscode.workspace.openTextDocument(
          vscode.Uri.file(logPath)
        );
        await vscode.window.showTextDocument(doc, { preview: false });
      } catch {
        void vscode.window.showWarningMessage("无法打开日志文件。");
      }
    }
  );

  const configDisposable = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("throttle")) {
      updateStatusBar(context, statusItem);
      updateSubmitItem(submitItem);
    }
  });

  context.subscriptions.push(
    output,
    statusItem,
    submitItem,
    safeSubmitDisposable,
    safeSubmitClipboardDisposable,
    setModeDisposable,
    quickSwitchDisposable,
    resetMuteDisposable,
    clearLogDisposable,
    openLogDisposable,
    clearLastHitDisposable,
    configDisposable
  );
}

export function deactivate(): void {
  // No-op for MVP.
}
