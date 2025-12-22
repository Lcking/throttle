import * as vscode from "vscode";
import { defaultConfig, modeOptions } from "../config/defaultConfig";
import { Mode } from "../rules/types";

const MODE_STATE_KEY = "throttle.mode";

export function getMode(context: vscode.ExtensionContext): Mode {
  const stored = context.globalState.get<Mode>(MODE_STATE_KEY);
  return stored ?? defaultConfig.defaultMode;
}

export async function setMode(
  context: vscode.ExtensionContext,
  mode: Mode
): Promise<void> {
  await context.globalState.update(MODE_STATE_KEY, mode);
}

export async function setModeCommand(
  context: vscode.ExtensionContext
): Promise<void> {
  const current = getMode(context);
  const selection = await vscode.window.showQuickPick(modeOptions, {
    placeHolder: "Select mode for Throttle (Dev)",
    canPickMany: false,
  });
  if (!selection) {
    return;
  }
  const mode = selection as Mode;
  if (mode !== current) {
    await setMode(context, mode);
  }
  void vscode.window.showInformationMessage(
    `Throttle mode set to ${mode}.`
  );
}
