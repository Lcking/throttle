"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMode = getMode;
exports.setMode = setMode;
exports.setModeCommand = setModeCommand;
const vscode = require("vscode");
const defaultConfig_1 = require("../config/defaultConfig");
const MODE_STATE_KEY = "throttle.mode";
function getMode(context) {
    const stored = context.globalState.get(MODE_STATE_KEY);
    return stored ?? defaultConfig_1.defaultConfig.defaultMode;
}
async function setMode(context, mode) {
    await context.globalState.update(MODE_STATE_KEY, mode);
}
async function setModeCommand(context) {
    const current = getMode(context);
    const selection = await vscode.window.showQuickPick(defaultConfig_1.modeOptions, {
        placeHolder: "Select mode for Throttle (Dev)",
        canPickMany: false,
    });
    if (!selection) {
        return;
    }
    const mode = selection;
    if (mode !== current) {
        await setMode(context, mode);
    }
    void vscode.window.showInformationMessage(`Throttle mode set to ${mode}.`);
}
//# sourceMappingURL=modeState.js.map