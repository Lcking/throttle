import { defaultConfig } from "../config/defaultConfig";
import { extractPromptFeatures } from "./features";
import { normalizePrompt } from "./normalize";
import { R001_PLAN_EXEC_REASONING } from "./rules/R001_plan_exec_reasoning";
import {
  ModelInfo,
  RuleContext,
  RuleResult,
  ThrottleConfig,
} from "./types";

const RULES = [R001_PLAN_EXEC_REASONING];

function isReasoningModel(model: ModelInfo, config: ThrottleConfig): boolean {
  if (model.id && config.reasoningModelAllowlist.includes(model.id)) {
    return true;
  }
  return config.reasoningTiers.includes(model.tier);
}

export function runRuleEngine(
  context: RuleContext,
  config: ThrottleConfig = defaultConfig
): RuleResult[] {
  const normalized = normalizePrompt(context.prompt);
  const features = extractPromptFeatures(normalized.prompt);
  const reasoning = isReasoningModel(context.model, config);
  const effectiveContext: RuleContext = {
    ...context,
    model: {
      ...context.model,
      tier: reasoning ? "reasoning" : "light",
    },
  };

  const matches: RuleResult[] = [];
  for (const rule of RULES) {
    const result = rule.evaluate(effectiveContext, normalized, features);
    if (!result) {
      continue;
    }
    const threshold = config.ruleThresholds[rule.id] ?? 1;
    if (result.confidence >= threshold) {
      matches.push(result);
    }
  }

  return matches;
}
