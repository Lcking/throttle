"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.R001_PLAN_EXEC_REASONING = void 0;
exports.R001_PLAN_EXEC_REASONING = {
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
            message: "This looks like execution work in Plan mode with a reasoning model.",
        };
    },
};
//# sourceMappingURL=R001_plan_exec_reasoning.js.map