export type Mode = "plan" | "ask" | "exec";

export type ModelTier = "light" | "standard" | "reasoning";

export interface ModelInfo {
  id?: string;
  tier: ModelTier;
}

export interface RuleContext {
  mode: Mode;
  prompt: string;
  model: ModelInfo;
}

export interface NormalizedInput {
  prompt: string;
}

export interface PromptFeatures {
  execIntentScore: number;
  loadSignals: string[];
  authoritySignals: string[];
  noiseSignals: string[];
}

export interface RuleResult {
  ruleId: string;
  confidence: number;
  message: string;
}

export type RuleEvaluator = (
  context: RuleContext,
  normalized: NormalizedInput,
  features: PromptFeatures
) => RuleResult | null;

export interface RuleDefinition {
  id: string;
  evaluate: RuleEvaluator;
}

export interface RuleThresholds {
  [ruleId: string]: number;
}

export interface ThrottleConfig {
  defaultMode: Mode;
  reasoningTiers: ModelTier[];
  reasoningModelAllowlist: string[];
  ruleThresholds: RuleThresholds;
  governanceKeywords: {
    load: string[];
    authority: string[];
    noise: string[];
  };
}
