import { RuleDefinition } from "../types";

export const R010_LOAD_OVERFLOW: RuleDefinition = {
  id: "R010_LOAD_OVERFLOW",
  evaluate: (context, normalized, features) => {
    if (features.loadSignals.length === 0) {
      return null;
    }
    if (normalized.prompt.length < 120) {
      return null;
    }
    if (context.model.tier !== "reasoning") {
      return null;
    }

    const signalBoost = Math.min(0.3, features.loadSignals.length * 0.1);
    const confidence = Math.min(0.9, 0.6 + signalBoost);

    return {
      ruleId: "R010_LOAD_OVERFLOW",
      confidence,
      message: "Possible load overflow: large context request before execution.",
    };
  },
};
