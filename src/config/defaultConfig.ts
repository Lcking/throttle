import { Mode, RuleThresholds, ThrottleConfig } from "../rules/types";

export const defaultRuleThresholds: RuleThresholds = {
  R001_PLAN_EXEC_REASONING: 0.7,
};

export const defaultConfig: ThrottleConfig = {
  defaultMode: "plan",
  reasoningTiers: ["reasoning"],
  reasoningModelAllowlist: ["o1", "o3-mini", "gpt-4.1-reasoning"],
  ruleThresholds: defaultRuleThresholds,
};

export const modeOptions: Mode[] = ["plan", "ask", "exec"];
