import * as vscode from "vscode";
import { safeSubmit } from "./ui/safeSubmit";
import { setModeCommand } from "./ui/modeState";
import { runSamplesCheck } from "./ui/samplesCheck";

export function activate(context: vscode.ExtensionContext): void {
  const safeSubmitDisposable = vscode.commands.registerCommand(
    "throttle.safeSubmit",
    () => safeSubmit(context)
  );
  const setModeDisposable = vscode.commands.registerCommand(
    "throttle.setMode",
    () => setModeCommand(context)
  );
  const samplesDisposable = vscode.commands.registerCommand(
    "throttle.runSamplesCheck",
    () => runSamplesCheck()
  );

  context.subscriptions.push(
    safeSubmitDisposable,
    setModeDisposable,
    samplesDisposable
  );
}

export function deactivate(): void {
  // No-op for MVP.
}
