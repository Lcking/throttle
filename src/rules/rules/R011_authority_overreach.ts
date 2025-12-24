import { RuleDefinition } from "../types";

export const R011_AUTHORITY_OVERREACH: RuleDefinition = {
  id: "R011_AUTHORITY_OVERREACH",
  evaluate: (_context, _normalized, features) => {
    if (features.authoritySignals.length === 0) {
      return null;
    }
    if (features.execIntentScore < 0.5) {
      return null;
    }

    const signalBoost = Math.min(0.3, features.authoritySignals.length * 0.1);
    const confidence = Math.min(0.85, 0.55 + signalBoost);

    return {
      ruleId: "R011_AUTHORITY_OVERREACH",
      confidence,
      message: "Possible authority overreach: high-permission tools requested.",
    };
  },
};
