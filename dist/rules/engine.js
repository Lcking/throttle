"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRuleEngine = runRuleEngine;
const defaultConfig_1 = require("../config/defaultConfig");
const features_1 = require("./features");
const normalize_1 = require("./normalize");
const R001_plan_exec_reasoning_1 = require("./rules/R001_plan_exec_reasoning");
const RULES = [R001_plan_exec_reasoning_1.R001_PLAN_EXEC_REASONING];
function isReasoningModel(model, config) {
    if (model.id && config.reasoningModelAllowlist.includes(model.id)) {
        return true;
    }
    return config.reasoningTiers.includes(model.tier);
}
function runRuleEngine(context, config = defaultConfig_1.defaultConfig) {
    const normalized = (0, normalize_1.normalizePrompt)(context.prompt);
    const features = (0, features_1.extractPromptFeatures)(normalized.prompt);
    const reasoning = isReasoningModel(context.model, config);
    const effectiveContext = {
        ...context,
        model: {
            ...context.model,
            tier: reasoning ? "reasoning" : "light",
        },
    };
    const matches = [];
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
//# sourceMappingURL=engine.js.map