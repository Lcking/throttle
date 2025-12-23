import * as vscode from "vscode";

const MUTED_RULES_KEY = "throttle.mutedRules";

export function getMutedRules(context: vscode.ExtensionContext): string[] {
  return context.globalState.get<string[]>(MUTED_RULES_KEY) ?? [];
}

export function isRuleMuted(
  context: vscode.ExtensionContext,
  ruleId: string
): boolean {
  return getMutedRules(context).includes(ruleId);
}

export async function muteRule(
  context: vscode.ExtensionContext,
  ruleId: string
): Promise<void> {
  const muted = new Set(getMutedRules(context));
  muted.add(ruleId);
  await context.globalState.update(MUTED_RULES_KEY, Array.from(muted));
}

export async function clearMutedRules(
  context: vscode.ExtensionContext
): Promise<void> {
  await context.globalState.update(MUTED_RULES_KEY, []);
}
