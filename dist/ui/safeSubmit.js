"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeSubmit = safeSubmit;
const vscode = require("vscode");
const defaultConfig_1 = require("../config/defaultConfig");
const engine_1 = require("../rules/engine");
const modeState_1 = require("./modeState");
const ACTION_CONTINUE = "Continue";
const ACTION_SWITCH_ASK = "Switch to Ask (demo)";
const ACTION_SWITCH_LIGHT = "Switch to light model (demo)";
const ACTION_MUTE_RULE = "Mute this rule (demo)";
const ACTION_CHANGE_MODE = "Change mode...";
const MODEL_TIERS = ["light", "standard", "reasoning"];
const MODEL_TIER_KEY = "throttle.modelTier";
function getDefaultTier(mode) {
    return mode === "plan" ? "standard" : "light";
}
function getStoredTier(context) {
    return context.globalState.get(MODEL_TIER_KEY);
}
async function setStoredTier(context, tier) {
    await context.globalState.update(MODEL_TIER_KEY, tier);
}
async function pickModelTier(context, mode) {
    const stored = getStoredTier(context);
    const defaultTier = stored ?? getDefaultTier(mode);
    const selection = await vscode.window.showQuickPick(MODEL_TIERS, {
        placeHolder: `Select model tier (Dev). Default: ${defaultTier}`,
        canPickMany: false,
    });
    if (selection === "reasoning" || selection === "standard" || selection === "light") {
        await setStoredTier(context, selection);
        return selection;
    }
    return undefined;
}
async function safeSubmit(context) {
    const prompt = await vscode.window.showInputBox({
        prompt: "Enter a prompt to safely submit",
        placeHolder: "Describe what you want the model to do",
    });
    if (!prompt) {
        return;
    }
    let mode = (0, modeState_1.getMode)(context);
    const modeChoice = await vscode.window.showQuickPick([
        { label: `Use mode: ${mode}`, detail: "Keep the current mode." },
        {
            label: ACTION_CHANGE_MODE,
            detail: "Select a different mode for this and future submits.",
        },
    ], { placeHolder: "Confirm or change mode for this submit." });
    if (!modeChoice) {
        return;
    }
    if (modeChoice.label === ACTION_CHANGE_MODE) {
        const newMode = await vscode.window.showQuickPick(["plan", "ask", "exec"], {
            placeHolder: "Select mode for Throttle (Dev)",
            canPickMany: false,
        });
        if (!newMode) {
            return;
        }
        mode = newMode;
        await (0, modeState_1.setMode)(context, mode);
    }
    const tier = await pickModelTier(context, mode);
    if (!tier) {
        return;
    }
    const model = {
        tier,
    };
    const results = (0, engine_1.runRuleEngine)({
        mode,
        prompt,
        model,
    }, defaultConfig_1.defaultConfig);
    if (results.length === 0) {
        return;
    }
    const [first] = results;
    const detail = first?.message ??
        "This looks like execution work that may not need a reasoning model.";
    const confidence = first?.confidence ?? 0;
    const actionDetail = `${detail} Confidence: ${confidence.toFixed(2)} Mode: ${mode}. Tier: ${tier}.`;
    const items = [
        { label: ACTION_CONTINUE, detail: actionDetail },
        { label: ACTION_SWITCH_ASK, detail: actionDetail },
        { label: ACTION_SWITCH_LIGHT, detail: actionDetail },
        { label: ACTION_MUTE_RULE, detail: actionDetail },
        { label: ACTION_CHANGE_MODE, detail: actionDetail },
    ];
    const selection = await vscode.window.showQuickPick(items, {
        placeHolder: "Throttle warning: select an action.",
    });
    if (!selection) {
        return;
    }
    switch (selection.label) {
        case ACTION_SWITCH_ASK: {
            await (0, modeState_1.setMode)(context, "ask");
            void vscode.window.showInformationMessage("Switched to Ask mode (demo).");
            break;
        }
        case ACTION_SWITCH_LIGHT: {
            void vscode.window.showInformationMessage("Switching to a light model is a demo action.");
            break;
        }
        case ACTION_MUTE_RULE: {
            void vscode.window.showInformationMessage("Muting rules is a demo action.");
            break;
        }
        case ACTION_CHANGE_MODE: {
            const newMode = await vscode.window.showQuickPick(["plan", "ask", "exec"], {
                placeHolder: "Select mode for Throttle (Dev)",
                canPickMany: false,
            });
            if (!newMode) {
                return;
            }
            await (0, modeState_1.setMode)(context, newMode);
            void vscode.window.showInformationMessage(`Throttle mode set to ${newMode}.`);
            break;
        }
        default:
            break;
    }
}
//# sourceMappingURL=safeSubmit.js.map