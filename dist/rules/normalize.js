"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePrompt = normalizePrompt;
function normalizePrompt(prompt) {
    const trimmed = prompt.trim();
    const collapsed = trimmed.replace(/\s+/g, " ");
    return {
        prompt: collapsed.toLowerCase(),
    };
}
//# sourceMappingURL=normalize.js.map