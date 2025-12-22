import * as vscode from "vscode";
import { defaultConfig, modeOptions } from "../config/defaultConfig";
import { Mode, ModelTier } from "../rules/types";

const MODE_STATE_KEY = "throttle.mode";
const MODEL_TIER_KEY = "throttle.modelTier";
const MODEL_TIERS: ModelTier[] = ["light", "standard", "reasoning"];

function getDefaultTier(mode: Mode): ModelTier {
  return mode === "plan" ? "standard" : "light";
}

export function getMode(context: vscode.ExtensionContext): Mode {
  const stored = context.globalState.get<Mode>(MODE_STATE_KEY);
  return stored ?? defaultConfig.defaultMode;
}

export function getStoredModelTier(
  context: vscode.ExtensionContext
): ModelTier | undefined {
  return context.globalState.get<ModelTier>(MODEL_TIER_KEY);
}

export function getModelTier(
  context: vscode.ExtensionContext,
  mode: Mode
): ModelTier {
  const stored = getStoredModelTier(context);
  return stored ?? getDefaultTier(mode);
}

export async function setMode(
  context: vscode.ExtensionContext,
  mode: Mode
): Promise<void> {
  await context.globalState.update(MODE_STATE_KEY, mode);
}

export async function setModelTier(
  context: vscode.ExtensionContext,
  tier: ModelTier
): Promise<void> {
  await context.globalState.update(MODEL_TIER_KEY, tier);
}

export async function setModeCommand(
  context: vscode.ExtensionContext
): Promise<void> {
  const current = getMode(context);
  const selection = await vscode.window.showQuickPick(modeOptions, {
    placeHolder: `Select mode for Throttle (Dev). Current: ${current}`,
    canPickMany: false,
  });
  if (!selection) {
    return;
  }
  const mode = selection as Mode;
  if (mode !== current) {
    await setMode(context, mode);
  }

  const currentTier = getModelTier(context, mode);
  const tierItems: vscode.QuickPickItem[] = [
    { label: `Keep tier: ${currentTier}`, detail: "No change" },
    ...MODEL_TIERS.map((tier) => ({ label: tier })),
  ];
  const tierSelection = await vscode.window.showQuickPick(tierItems, {
    placeHolder: `Select model tier (Dev). Current: ${currentTier}`,
    canPickMany: false,
  });

  let finalTier = currentTier;
  if (tierSelection) {
    const label = tierSelection.label as ModelTier | string;
    if (label === "light" || label === "standard" || label === "reasoning") {
      finalTier = label;
    }
  }
  if (finalTier !== currentTier) {
    await setModelTier(context, finalTier);
  }

  void vscode.window.showInformationMessage(
    `Throttle mode set to ${mode}. Model tier: ${finalTier}.`
  );
}
