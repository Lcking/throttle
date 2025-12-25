import { RuleDefinition } from "../types";

export const R001_PLAN_EXEC_REASONING: RuleDefinition = {
  id: "R001_PLAN_EXEC_REASONING",
  evaluate: (context, _normalized, features) => {
    if (context.mode !== "plan") {
      return null;
    }
    if (context.model.tier !== "reasoning") {
      return null;
    }
    if (features.execIntentScore < 0.7) {
      return null;
    }

    return {
      ruleId: "R001_PLAN_EXEC_REASONING",
      confidence: features.execIntentScore,
      message:
        "This looks like doing/execution work while in Plan with a reasoning model.",
      mismatchAxis: "reasoning_vs_doing",
    };
  },
};
