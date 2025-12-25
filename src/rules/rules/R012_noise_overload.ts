import { RuleDefinition } from "../types";

export const R012_NOISE_OVERLOAD: RuleDefinition = {
  id: "R012_NOISE_OVERLOAD",
  evaluate: (_context, normalized, features) => {
    if (features.noiseSignals.length === 0) {
      return null;
    }
    if (normalized.prompt.length < 80) {
      return null;
    }

    const signalBoost = Math.min(0.3, features.noiseSignals.length * 0.1);
    const confidence = Math.min(0.85, 0.55 + signalBoost);

    return {
      ruleId: "R012_NOISE_OVERLOAD",
      confidence,
      message: "Possible noise overload: high-noise capture requested.",
      mismatchAxis: "noise_pollution",
    };
  },
};
