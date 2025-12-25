import * as vscode from "vscode";
import { defaultConfig, modeOptions } from "../config/defaultConfig";
import { runRuleEngine } from "../rules/engine";
import {
  MismatchAxis,
  Mode,
  ModelInfo,
  ModelTier,
} from "../rules/types";
import {
  getModelTier,
  getStoredMode,
  getStoredModelTier,
  setMode,
  setModelTier,
} from "./modeState";
import { isRuleMuted, muteRule } from "./ruleMuteState";
import { logHit } from "./logging";
import { recordBehaviorEvent } from "./behaviorStats";
import { runDocDriftSentinel } from "./docDriftSentinel";

function isThrottleEnabled(): boolean {
  const config = vscode.workspace.getConfiguration("throttle");
  return config.get<boolean>("enabled", true);
}

 

const ACTION_CONTINUE = "继续";
const ACTION_SWITCH_MODE = "切换模式";
const ACTION_SWITCH_TIER = "切换档位";
const ACTION_MUTE_RULE = "静音此规则";

const MODE_TAG_PATTERNS: RegExp[] = [
  /^\s*\[mode:(plan|ask|exec)\]\s*/i,
  /^\s*mode\s*[:=]\s*(plan|ask|exec)\s*/i,
  /^\s*模式\s*[:=]\s*(plan|ask|exec)\s*/i,
  /^\s*\/(plan|ask|exec)\b\s*/i,
];

const TIER_TAG_PATTERNS: RegExp[] = [
  /^\s*\[(?:tier|model):(light|standard|reasoning)\]\s*/i,
  /^\s*(?:tier|model)\s*[:=]\s*(light|standard|reasoning)\s*/i,
  /^\s*模型(?:档位|层级)?\s*[:=]\s*(light|standard|reasoning)\s*/i,
  /^\s*\/(light|standard|reasoning)\b\s*/i,
];

const MODEL_TIERS: ModelTier[] = ["light", "standard", "reasoning"];
const RULE_COOLDOWN_MINUTES = 10;
const MIN_NUDGE_CONFIDENCE = 0.75;
const RULE_COOLDOWN_KEY = "throttle.ruleCooldowns";
const LAST_ACTION_KEY = "throttle.lastNudgeAction";
const dedupeKeys = new Map<string, Set<string>>();
function extractOverrides(prompt: string): {
  prompt: string;
  mode?: Mode;
  tier?: ModelTier;
} {
  let remaining = prompt.trimStart();
  let mode: Mode | undefined;
  let tier: ModelTier | undefined;
  let matched = true;

  while (matched) {
    matched = false;
    for (const pattern of MODE_TAG_PATTERNS) {
      const match = remaining.match(pattern);
      if (match?.[1]) {
        const candidate = match[1].toLowerCase() as Mode;
        mode = mode ?? candidate;
        remaining = remaining.slice(match[0].length).trimStart();
        matched = true;
        break;
      }
    }
    if (matched) {
      continue;
    }
    for (const pattern of TIER_TAG_PATTERNS) {
      const match = remaining.match(pattern);
      if (match?.[1]) {
        const candidate = match[1].toLowerCase() as ModelTier;
        tier = tier ?? candidate;
        remaining = remaining.slice(match[0].length).trimStart();
        matched = true;
        break;
      }
    }
  }

  return {
    prompt: remaining,
    ...(mode ? { mode } : {}),
    ...(tier ? { tier } : {}),
  };
}

function getRuleCooldowns(
  context: vscode.ExtensionContext
): Record<string, number> {
  return context.workspaceState.get<Record<string, number>>(RULE_COOLDOWN_KEY) ?? {};
}

function isRuleOnCooldown(
  context: vscode.ExtensionContext,
  ruleId: string,
  now: number
): boolean {
  const cooldowns = getRuleCooldowns(context);
  const lastHit = cooldowns[ruleId];
  if (!lastHit) {
    return false;
  }
  const cooldownMs = RULE_COOLDOWN_MINUTES * 60 * 1000;
  return now - lastHit < cooldownMs;
}

async function setRuleCooldown(
  context: vscode.ExtensionContext,
  ruleId: string,
  now: number
): Promise<void> {
  const cooldowns = getRuleCooldowns(context);
  cooldowns[ruleId] = now;
  await context.workspaceState.update(RULE_COOLDOWN_KEY, cooldowns);
}

function getVisibleFileSetKey(): string {
  const files = vscode.window.visibleTextEditors
    .map((editor) => editor.document.uri)
    .filter((uri) => uri.scheme === "file")
    .map((uri) => vscode.workspace.asRelativePath(uri, false));
  if (files.length === 0) {
    return "no-files";
  }
  return files.sort().join("|");
}

function isDuplicateDedupe(ruleId: string, dedupeKey: string): boolean {
  return dedupeKeys.get(ruleId)?.has(dedupeKey) ?? false;
}

function setDedupeKey(ruleId: string, dedupeKey: string): void {
  const existing = dedupeKeys.get(ruleId) ?? new Set<string>();
  existing.add(dedupeKey);
  dedupeKeys.set(ruleId, existing);
}

function getSuggestedMode(ruleId: string): Mode | undefined {
  if (ruleId === "R001_PLAN_EXEC_REASONING") {
    return "ask";
  }
  return undefined;
}

function getSuggestedTier(ruleId: string): ModelTier | undefined {
  if (ruleId === "R001_PLAN_EXEC_REASONING") {
    return "light";
  }
  return undefined;
}

function getMismatchCopy(axis: MismatchAxis): string {
  switch (axis) {
    case "reasoning_vs_doing":
      return "这一步更像执行反馈任务（Doing），建议切换模式或降档位。";
    case "noise_pollution":
      return "输入噪声偏高，可能污染当前主线程。";
    case "mode_mismatch":
      return "当前模式可能不匹配此任务类型。";
    default:
      return "检测到可能的高代价错配。";
  }
}

async function promptForModeIfMissing(
  context: vscode.ExtensionContext,
  current: Mode | undefined
): Promise<Mode | undefined> {
  if (current) {
    return current;
  }
  const selection = await vscode.window.showQuickPick(modeOptions, {
    placeHolder: "首次使用：请选择 Throttle 模式",
    canPickMany: false,
  });
  if (!selection) {
    return undefined;
  }
  const mode = selection as Mode;
  await setMode(context, mode);
  return mode;
}

async function promptForTierIfMissing(
  context: vscode.ExtensionContext,
  current: ModelTier | undefined,
  mode: Mode
): Promise<ModelTier | undefined> {
  if (current) {
    return current;
  }
  const defaultTier = getModelTier(context, mode);
  const tierItems: vscode.QuickPickItem[] = MODEL_TIERS.map((tier) => ({
    label: tier,
    description: tier === defaultTier ? "默认" : "",
  }));
  const selection = await vscode.window.showQuickPick(tierItems, {
    placeHolder: "首次使用：请选择模型档位",
    canPickMany: false,
  });
  if (!selection) {
    return undefined;
  }
  const tier = selection.label as ModelTier;
  await setModelTier(context, tier);
  return tier;
}

type ActionItem = vscode.QuickPickItem & { action: string };

async function showNudgeQuickPick(
  items: ActionItem[],
  placeholder: string,
  primary: ActionItem
): Promise<ActionItem | undefined> {
  return await new Promise((resolve) => {
    const quickPick = vscode.window.createQuickPick<ActionItem>();
    quickPick.items = items;
    quickPick.placeholder = placeholder;
    quickPick.canSelectMany = false;
    quickPick.ignoreFocusOut = true;
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;
    quickPick.activeItems = [primary];
    quickPick.onDidAccept(() => {
      resolve(quickPick.selectedItems[0]);
      quickPick.hide();
    });
    quickPick.onDidHide(() => {
      resolve(undefined);
      quickPick.dispose();
    });
    quickPick.show();
  });
}

export async function safeSubmit(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel
): Promise<void> {
  const clipboard = await vscode.env.clipboard.readText();
  await runSafeSubmitWithPrompt(context, output, undefined, clipboard);
}

export async function safeSubmitFromClipboard(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel
): Promise<void> {
  const clipboard = await vscode.env.clipboard.readText();
  if (!clipboard.trim()) {
    await runSafeSubmitWithPrompt(context, output, "", clipboard);
    return;
  }
  await runSafeSubmitWithPrompt(context, output, clipboard, clipboard);
}

async function runSafeSubmitWithPrompt(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  providedPrompt?: string,
  defaultValue?: string
): Promise<void> {
  if (!isThrottleEnabled()) {
    void vscode.window.showInformationMessage("Throttle 已关闭，未进行检查。");
    return;
  }
  let prompt = providedPrompt;
  if (prompt === undefined) {
    const options: vscode.InputBoxOptions = {
      prompt: "请输入要安全提交的提示词",
      placeHolder: "描述你希望模型完成的任务",
    };
    if (defaultValue !== undefined) {
      options.value = defaultValue;
    }
    prompt = await vscode.window.showInputBox(options);
  } else if (!prompt) {
    const options: vscode.InputBoxOptions = {
      prompt: "剪贴板为空，请粘贴或输入提示词",
      placeHolder: "描述你希望模型完成的任务",
    };
    if (defaultValue !== undefined) {
      options.value = defaultValue;
    }
    prompt = await vscode.window.showInputBox(options);
  }
  if (!prompt) {
    return;
  }

  const overrides = extractOverrides(prompt);
  if (!overrides.prompt) {
    return;
  }

  const storedMode = getStoredMode(context);
  let mode = overrides.mode ?? storedMode;
  if (overrides.mode && overrides.mode !== storedMode) {
    await setMode(context, overrides.mode);
  }
  if (!mode) {
    mode = await promptForModeIfMissing(context, storedMode);
    if (!mode) {
      return;
    }
  }

  const storedTier = getStoredModelTier(context);
  let tier = overrides.tier ?? storedTier;
  if (overrides.tier && overrides.tier !== storedTier) {
    await setModelTier(context, overrides.tier);
  }
  if (!tier) {
    tier = await promptForTierIfMissing(context, storedTier, mode);
    if (!tier) {
      return;
    }
  }

  const model: ModelInfo = {
    tier,
  };
  const results = runRuleEngine(
    {
      mode,
      prompt: overrides.prompt,
      model,
    },
    defaultConfig
  );

  const visibleResults = results.filter(
    (result) => !isRuleMuted(context, result.ruleId)
  );

  if (visibleResults.length === 0) {
    await runDocDriftSentinel(overrides.prompt);
    return;
  }

  const [first] = visibleResults;
  if (!first) {
    return;
  }

  const confidence = first.confidence ?? 0;
  if (confidence < MIN_NUDGE_CONFIDENCE) {
    return;
  }

  const now = Date.now();
  if (isRuleOnCooldown(context, first.ruleId, now)) {
    return;
  }

  const dedupeKey = `${first.ruleId}:${getVisibleFileSetKey()}`;
  if (isDuplicateDedupe(first.ruleId, dedupeKey)) {
    return;
  }

  logHit(
    context,
    output,
    `hit rule=${first.ruleId} confidence=${confidence.toFixed(2)} mode=${mode} tier=${tier}`,
    `summary lastHit=${first.ruleId} mode=${mode} tier=${tier}`
  );
  await setLastHit(context, first.ruleId);
  await markRuleSeen(context, first.ruleId);
  recordBehaviorEvent(context, {
    ts: now,
    type: "hit",
    ruleId: first.ruleId,
  });
  if (first.ruleId === "R010_LOAD_OVERFLOW") {
    recordBehaviorEvent(context, { ts: now, type: "load" });
  }
  if (first.ruleId === "R011_AUTHORITY_OVERREACH") {
    recordBehaviorEvent(context, { ts: now, type: "authority" });
  }
  if (first.ruleId === "R012_NOISE_OVERLOAD") {
    recordBehaviorEvent(context, { ts: now, type: "noise" });
  }

  await setRuleCooldown(context, first.ruleId, now);
  setDedupeKey(first.ruleId, dedupeKey);

  void vscode.window.setStatusBarMessage(
    "Throttle：检测到潜在的高代价错配",
    4000
  );
  const showDetail = !hasSeenRule(context, first.ruleId);
  const detailText = showDetail
    ? [
        getMismatchCopy(first.mismatchAxis),
        first.message,
        "建议：继续，或切换模式/档位。",
        `置信度：${confidence.toFixed(2)}`,
      ].join("\n")
    : "继续或切换模式/档位";

  const suggestedMode = getSuggestedMode(first.ruleId);
  const suggestedTier = getSuggestedTier(first.ruleId);
  const continueItem: ActionItem = {
    label: ACTION_CONTINUE,
    description: "继续本次操作",
    detail: detailText,
    action: ACTION_CONTINUE,
  };
  const items: ActionItem[] = [
    continueItem,
    {
      label: ACTION_SWITCH_MODE,
      description: suggestedMode ? `建议切到 ${suggestedMode}` : "选择更合适的模式",
      detail: "Agent/Ask/Debug 等（可选）",
      action: ACTION_SWITCH_MODE,
    },
    {
      label: ACTION_SWITCH_TIER,
      description: suggestedTier ? `建议切到 ${suggestedTier}` : "调整模型档位",
      detail: "Light/Standard/Reasoning",
      action: ACTION_SWITCH_TIER,
    },
    {
      label: ACTION_MUTE_RULE,
      description: "不再提示此规则",
      action: ACTION_MUTE_RULE,
    },
  ];
  const selection = await showNudgeQuickPick(
    items,
    "可能存在模式/预算错配（Safe Submit）",
    continueItem
  );
  if (!selection) {
    return;
  }

  await context.workspaceState.update(LAST_ACTION_KEY, selection.action);

  switch (selection.action) {
    case ACTION_SWITCH_MODE: {
      if (suggestedMode) {
        await setMode(context, suggestedMode);
        recordBehaviorEvent(context, {
          ts: Date.now(),
          type: suggestedMode === "ask" ? "switch_ask" : "change_mode",
        });
        void vscode.window.showInformationMessage(
          `已切换到 ${suggestedMode} 模式（演示）。`
        );
        break;
      }
      const newMode = await vscode.window.showQuickPick(modeOptions, {
        placeHolder: "选择 Throttle 模式",
        canPickMany: false,
      });
      if (!newMode) {
        return;
      }
      await setMode(context, newMode as Mode);
      recordBehaviorEvent(context, { ts: Date.now(), type: "change_mode" });
      void vscode.window.showInformationMessage(
        `Throttle 模式已设置为 ${newMode}。`
      );
      break;
    }
    case ACTION_SWITCH_TIER: {
      if (suggestedTier) {
        await setModelTier(context, suggestedTier);
        if (suggestedTier === "light") {
          recordBehaviorEvent(context, { ts: Date.now(), type: "switch_light" });
        } else {
          recordBehaviorEvent(context, { ts: Date.now(), type: "change_mode" });
        }
        void vscode.window.showInformationMessage(
          `已切换到 ${suggestedTier} 档位（演示）。`
        );
        break;
      }
      const tierItems: vscode.QuickPickItem[] = MODEL_TIERS.map((value) => ({
        label: value,
      }));
      const nextTier = await vscode.window.showQuickPick(tierItems, {
        placeHolder: "选择模型档位",
        canPickMany: false,
      });
      if (!nextTier) {
        return;
      }
      const selectedTier = nextTier.label as ModelTier;
      await setModelTier(context, selectedTier);
      if (selectedTier === "light") {
        recordBehaviorEvent(context, { ts: Date.now(), type: "switch_light" });
      }
      void vscode.window.showInformationMessage(
        `Throttle 模型档位已设置为 ${selectedTier}。`
      );
      break;
    }
    case ACTION_MUTE_RULE: {
      await muteRule(context, first.ruleId);
      recordBehaviorEvent(context, {
        ts: Date.now(),
        type: "mute_rule",
        ruleId: first.ruleId,
      });
      void vscode.window.showInformationMessage(
        "已静音此规则，可用“Throttle: Reset Muted Rules”恢复。"
      );
      break;
    }
    default:
      recordBehaviorEvent(context, { ts: Date.now(), type: "continue" });
      break;
  }
}
const LAST_HIT_KEY = "throttle.lastHit";
const SEEN_RULES_KEY = "throttle.seenRules";

async function setLastHit(
  context: vscode.ExtensionContext,
  ruleId: string
): Promise<void> {
  await context.workspaceState.update(LAST_HIT_KEY, ruleId);
}

function hasSeenRule(
  context: vscode.ExtensionContext,
  ruleId: string
): boolean {
  const seen = context.workspaceState.get<string[]>(SEEN_RULES_KEY) ?? [];
  return seen.includes(ruleId);
}

async function markRuleSeen(
  context: vscode.ExtensionContext,
  ruleId: string
): Promise<void> {
  const seen = new Set(
    context.workspaceState.get<string[]>(SEEN_RULES_KEY) ?? []
  );
  seen.add(ruleId);
  await context.workspaceState.update(SEEN_RULES_KEY, Array.from(seen));
}

export async function clearLastHit(
  context: vscode.ExtensionContext
): Promise<void> {
  await context.workspaceState.update(LAST_HIT_KEY, undefined);
}
