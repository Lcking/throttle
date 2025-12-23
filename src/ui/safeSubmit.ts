import * as vscode from "vscode";
import { defaultConfig, modeOptions } from "../config/defaultConfig";
import { runRuleEngine } from "../rules/engine";
import { Mode, ModelInfo, ModelTier } from "../rules/types";
import {
  getMode,
  getModelTier,
  getStoredModelTier,
  setMode,
  setModelTier,
} from "./modeState";
import { isRuleMuted, muteRule } from "./ruleMuteState";
import { logHit } from "./logging";

function isThrottleEnabled(): boolean {
  const config = vscode.workspace.getConfiguration("throttle");
  return config.get<boolean>("enabled", true);
}

 

const ACTION_CONTINUE = "继续";
const ACTION_SWITCH_ASK = "切到 Ask";
const ACTION_SWITCH_LIGHT = "切到轻量模型";
const ACTION_MUTE_RULE = "静音此规则";
const ACTION_CHANGE_MODE = "切换模式...";

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

  const storedMode = getMode(context);
  const mode = overrides.mode ?? storedMode;
  if (overrides.mode && overrides.mode !== storedMode) {
    await setMode(context, overrides.mode);
  }

  const storedTier = getStoredModelTier(context);
  const tier = overrides.tier ?? getModelTier(context, mode);
  if (overrides.tier && overrides.tier !== storedTier) {
    await setModelTier(context, overrides.tier);
  }
  if (!storedTier && !overrides.tier) {
    await setModelTier(context, tier);
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
    return;
  }

  const [first] = visibleResults;
  const confidence = first?.confidence ?? 0;
  if (first) {
    logHit(
      context,
      output,
      `hit rule=${first.ruleId} confidence=${confidence.toFixed(2)} mode=${mode} tier=${tier}`,
      `summary lastHit=${first.ruleId} mode=${mode} tier=${tier}`
    );
    await setLastHit(context, first.ruleId);
    await markRuleSeen(context, first.ruleId);
  }
  void vscode.window.setStatusBarMessage(
    "Throttle：检测到 Plan + 高推理 + 执行意图",
    4000
  );
  const showDetail = first ? !hasSeenRule(context, first.ruleId) : true;
  const detailText = showDetail
    ? [
        "检测到：Plan + 高推理 + 执行意图",
        "建议：继续或切到 Ask / 轻量模型",
        `置信度：${confidence.toFixed(2)}`,
      ].join("\n")
    : "继续或切换模式/模型";
  type ActionItem = vscode.QuickPickItem & { action: string };
  const continueItem: ActionItem = showDetail
    ? {
        label: ACTION_CONTINUE,
        description: "继续本次操作",
        detail: detailText,
        action: ACTION_CONTINUE,
        picked: true,
      }
    : {
        label: ACTION_CONTINUE,
        description: "继续本次操作",
        action: ACTION_CONTINUE,
        picked: true,
      };
  const items: ActionItem[] = [
    continueItem,
    {
      label: ACTION_SWITCH_ASK,
      description: "建议先确认方案",
      action: ACTION_SWITCH_ASK,
    },
    {
      label: ACTION_SWITCH_LIGHT,
      description: "降低成本",
      action: ACTION_SWITCH_LIGHT,
    },
    {
      label: ACTION_MUTE_RULE,
      description: "不再提示此规则",
      action: ACTION_MUTE_RULE,
    },
    {
      label: ACTION_CHANGE_MODE,
      description: "手动选择模式",
      action: ACTION_CHANGE_MODE,
    },
  ];
  const selection = await vscode.window.showQuickPick<ActionItem>(items, {
    placeHolder: "可能过度加速（Plan 模式）",
    canPickMany: false,
    ignoreFocusOut: true,
  });
  if (!selection) {
    return;
  }

  switch (selection.action) {
    case ACTION_SWITCH_ASK: {
      await setMode(context, "ask");
      void vscode.window.showInformationMessage(
        "已切换到 Ask 模式（演示）。"
      );
      break;
    }
    case ACTION_SWITCH_LIGHT: {
      await setModelTier(context, "light");
      void vscode.window.showInformationMessage(
        "已切换到轻量模型档位（演示）。"
      );
      break;
    }
    case ACTION_MUTE_RULE: {
      if (first) {
        await muteRule(context, first.ruleId);
      }
      void vscode.window.showInformationMessage(
        "已静音此规则，可用“Throttle: Reset Muted Rules”恢复。"
      );
      break;
    }
    case ACTION_CHANGE_MODE: {
      const newMode = await vscode.window.showQuickPick(modeOptions, {
        placeHolder: "选择 Throttle 模式",
        canPickMany: false,
      });
      if (!newMode) {
        return;
      }
      await setMode(context, newMode as Mode);
      void vscode.window.showInformationMessage(
        `Throttle 模式已设置为 ${newMode}。`
      );
      break;
    }
    default:
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
