"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSamplesCheck = runSamplesCheck;
const vscode = require("vscode");
const engine_1 = require("../rules/engine");
const OUTPUT_CHANNEL_NAME = "Throttle Samples Check";
function parseSample(line) {
    if (!line.trim()) {
        return null;
    }
    try {
        const raw = JSON.parse(line);
        if (!raw.prompt || !raw.mode || !raw.modelTier || !raw.expected) {
            return null;
        }
        return raw;
    }
    catch {
        return null;
    }
}
async function runSamplesCheck() {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
        void vscode.window.showWarningMessage("No workspace folder found.");
        return;
    }
    const fileUri = vscode.Uri.joinPath(folder.uri, "samples", "prompts.jsonl");
    let content;
    try {
        content = await vscode.workspace.fs.readFile(fileUri);
    }
    catch {
        void vscode.window.showWarningMessage("Unable to read samples/prompts.jsonl.");
        return;
    }
    const text = new TextDecoder("utf-8").decode(content);
    const lines = text.split(/\r?\n/);
    const output = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
    output.clear();
    let falsePositives = 0;
    let falseNegatives = 0;
    let total = 0;
    for (const [index, line] of lines.entries()) {
        const sample = parseSample(line);
        if (!sample) {
            continue;
        }
        total += 1;
        const results = (0, engine_1.runRuleEngine)({
            mode: sample.mode,
            prompt: sample.prompt,
            model: { tier: sample.modelTier },
        });
        const hit = results.length > 0;
        const expectedHit = sample.expected === "HIT";
        const expectedNoHit = sample.expected === "NO_HIT" || sample.expected === "LOW";
        if (expectedHit && !hit) {
            falseNegatives += 1;
            output.appendLine(`False negative [${index + 1}]: ${sample.prompt} (${sample.note ?? "no note"})`);
        }
        else if (expectedNoHit && hit) {
            falsePositives += 1;
            output.appendLine(`False positive [${index + 1}]: ${sample.prompt} (${sample.note ?? "no note"})`);
        }
    }
    output.appendLine("");
    output.appendLine(`Samples: ${total}. False positives: ${falsePositives}. False negatives: ${falseNegatives}.`);
    output.show(true);
}
//# sourceMappingURL=samplesCheck.js.map