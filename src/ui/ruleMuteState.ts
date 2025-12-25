import * as vscode from "vscode";

const MUTED_RULES_GLOBAL_KEY = "throttle.mutedRules";
const MUTED_RULES_WORKSPACE_KEY = "throttle.workspaceMutedRules";

export function getMutedRulesGlobal(
  context: vscode.ExtensionContext
): string[] {
  return context.globalState.get<string[]>(MUTED_RULES_GLOBAL_KEY) ?? [];
}

export function getMutedRulesWorkspace(
  context: vscode.ExtensionContext
): string[] {
  return (
    context.workspaceState.get<string[]>(MUTED_RULES_WORKSPACE_KEY) ?? []
  );
}

export function getMutedRules(context: vscode.ExtensionContext): string[] {
  const merged = new Set([
    ...getMutedRulesGlobal(context),
    ...getMutedRulesWorkspace(context),
  ]);
  return Array.from(merged);
}

export function isRuleMuted(
  context: vscode.ExtensionContext,
  ruleId: string
): boolean {
  return getMutedRules(context).includes(ruleId);
}

export async function muteRule(
  context: vscode.ExtensionContext,
  ruleId: string,
  scope: "workspace" | "global" = "workspace"
): Promise<void> {
  if (scope === "global") {
    const muted = new Set(getMutedRulesGlobal(context));
    muted.add(ruleId);
    await context.globalState.update(MUTED_RULES_GLOBAL_KEY, Array.from(muted));
    return;
  }
  const muted = new Set(getMutedRulesWorkspace(context));
  muted.add(ruleId);
  await context.workspaceState.update(
    MUTED_RULES_WORKSPACE_KEY,
    Array.from(muted)
  );
}

export async function unmuteRule(
  context: vscode.ExtensionContext,
  ruleId: string,
  scope: "workspace" | "global"
): Promise<void> {
  if (scope === "global") {
    const muted = new Set(getMutedRulesGlobal(context));
    muted.delete(ruleId);
    await context.globalState.update(MUTED_RULES_GLOBAL_KEY, Array.from(muted));
    return;
  }
  const muted = new Set(getMutedRulesWorkspace(context));
  muted.delete(ruleId);
  await context.workspaceState.update(
    MUTED_RULES_WORKSPACE_KEY,
    Array.from(muted)
  );
}

export async function clearMutedRules(
  context: vscode.ExtensionContext
): Promise<void> {
  await context.globalState.update(MUTED_RULES_GLOBAL_KEY, []);
  await context.workspaceState.update(MUTED_RULES_WORKSPACE_KEY, []);
}

interface MutePickItem extends vscode.QuickPickItem {
  ruleId: string;
  scope: "workspace" | "global";
}

export async function manageMutesCommand(
  context: vscode.ExtensionContext
): Promise<void> {
  const workspaceRules = getMutedRulesWorkspace(context);
  const globalRules = getMutedRulesGlobal(context);
  if (workspaceRules.length === 0 && globalRules.length === 0) {
    void vscode.window.showInformationMessage("暂无静音规则。");
    return;
  }

  const items: MutePickItem[] = [
    ...workspaceRules.map((ruleId) => ({
      label: ruleId,
      description: "Workspace",
      detail: "当前工作区静音",
      ruleId,
      scope: "workspace" as const,
    })),
    ...globalRules.map((ruleId) => ({
      label: ruleId,
      description: "Global",
      detail: "所有工作区静音",
      ruleId,
      scope: "global" as const,
    })),
  ];

  const selection = await vscode.window.showQuickPick(items, {
    placeHolder: "选择要恢复的静音规则",
    canPickMany: false,
  });
  if (!selection) {
    return;
  }

  await unmuteRule(context, selection.ruleId, selection.scope);
  void vscode.window.showInformationMessage(
    `已恢复规则：${selection.ruleId}（${selection.description}）`
  );
}
