"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const safeSubmit_1 = require("./ui/safeSubmit");
const modeState_1 = require("./ui/modeState");
const samplesCheck_1 = require("./ui/samplesCheck");
function activate(context) {
    const safeSubmitDisposable = vscode.commands.registerCommand("throttle.safeSubmit", () => (0, safeSubmit_1.safeSubmit)(context));
    const setModeDisposable = vscode.commands.registerCommand("throttle.setMode", () => (0, modeState_1.setModeCommand)(context));
    const samplesDisposable = vscode.commands.registerCommand("throttle.runSamplesCheck", () => (0, samplesCheck_1.runSamplesCheck)());
    context.subscriptions.push(safeSubmitDisposable, setModeDisposable, samplesDisposable);
}
function deactivate() {
    // No-op for MVP.
}
//# sourceMappingURL=extension.js.map