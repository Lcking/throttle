import * as vscode from "vscode";
import { getMode, getModelTier } from "./modeState";
import {
  getMutedRules,
  getMutedRulesGlobal,
  getMutedRulesWorkspace,
} from "./ruleMuteState";

const RULE_COOLDOWN_KEY = "throttle.ruleCooldowns";
const RULE_COOLDOWN_MINUTES = 10;

function getCooldowns(
  context: vscode.ExtensionContext
): Record<string, number> {
  return context.workspaceState.get<Record<string, number>>(RULE_COOLDOWN_KEY) ?? {};
}

function countActiveCooldowns(
  cooldowns: Record<string, number>,
  now: number
): number {
  const cooldownMs = RULE_COOLDOWN_MINUTES * 60 * 1000;
  return Object.values(cooldowns).filter((ts) => now - ts < cooldownMs).length;
}

export async function showPreflight(
  context: vscode.ExtensionContext
): Promise<void> {
  const mode = getMode(context);
  const tier = getModelTier(context, mode);
  const mutedWorkspace = getMutedRulesWorkspace(context);
  const mutedGlobal = getMutedRulesGlobal(context);
  const mutedAll = getMutedRules(context);
  const cooldowns = getCooldowns(context);
  const now = Date.now();
  const activeCooldowns = countActiveCooldowns(cooldowns, now);
  const docDriftEnabled = vscode.workspace
    .getConfiguration("throttle")
    .get<boolean>("docDrift.enabled", false);

  const items: vscode.QuickPickItem[] = [
    {
      label: `Mode/Tier: ${mode}/${tier}`,
      detail: "当前运行时模式与档位",
    },
    {
      label: `Muted Rules: ${mutedAll.length}`,
      detail: `Workspace ${mutedWorkspace.length}, Global ${mutedGlobal.length}`,
    },
    {
      label: `Cooldown Active: ${activeCooldowns}`,
      detail: `窗口 ${RULE_COOLDOWN_MINUTES} 分钟`,
    },
    {
      label: `Doc Drift Sentinel: ${docDriftEnabled ? "On" : "Off"}`,
      detail: "仅在实现/重构类提示词前触发",
    },
  ];

  const quickPick = vscode.window.createQuickPick();
  quickPick.items = items;
  quickPick.placeholder = "Throttle Preflight（手动检查，不会自动弹出）";
  quickPick.canSelectMany = false;
  quickPick.onDidHide(() => quickPick.dispose());
  quickPick.show();
}
