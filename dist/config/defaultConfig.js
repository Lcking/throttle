"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modeOptions = exports.defaultConfig = exports.defaultRuleThresholds = void 0;
exports.defaultRuleThresholds = {
    R001_PLAN_EXEC_REASONING: 0.7,
};
exports.defaultConfig = {
    defaultMode: "plan",
    reasoningTiers: ["reasoning"],
    reasoningModelAllowlist: ["o1", "o3-mini", "gpt-4.1-reasoning"],
    ruleThresholds: exports.defaultRuleThresholds,
};
exports.modeOptions = ["plan", "ask", "exec"];
//# sourceMappingURL=defaultConfig.js.map