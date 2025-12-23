import * as vscode from "vscode";
import { runRuleEngine } from "../rules/engine";
import { ModelTier, RuleContext } from "../rules/types";

const OUTPUT_CHANNEL_NAME = "Throttle Samples Check";

type SampleExpectation = "HIT" | "NO_HIT" | "LOW";

interface SampleRecord {
  prompt: string;
  mode: RuleContext["mode"];
  modelTier: ModelTier;
  expected: SampleExpectation;
  note?: string;
}

function parseSample(line: string): SampleRecord | null {
  if (!line.trim()) {
    return null;
  }
  try {
    const raw = JSON.parse(line) as SampleRecord;
    if (!raw.prompt || !raw.mode || !raw.modelTier || !raw.expected) {
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

export async function runSamplesCheck(
  context: vscode.ExtensionContext
): Promise<void> {
  const candidates: vscode.Uri[] = [];
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder?.uri) {
    candidates.push(
      vscode.Uri.joinPath(workspaceFolder.uri, "samples", "prompts.jsonl")
    );
  }
  candidates.push(
    vscode.Uri.joinPath(context.extensionUri, "samples", "prompts.jsonl")
  );

  let content: Uint8Array | undefined;
  let resolvedUri: vscode.Uri | undefined;
  for (const candidate of candidates) {
    try {
      content = await vscode.workspace.fs.readFile(candidate);
      resolvedUri = candidate;
      break;
    } catch {
      // Try the next candidate.
    }
  }

  if (!content || !resolvedUri) {
    const attempted = candidates.map((uri) => uri.fsPath).join(" | ");
    void vscode.window.showWarningMessage(
      `Unable to read samples/prompts.jsonl. Tried: ${attempted}`
    );
    return;
  }

  const text = new TextDecoder("utf-8").decode(content);
  const lines = text.split(/\r?\n/);
  const output = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  output.clear();
  output.appendLine(`Samples file: ${resolvedUri.fsPath}`);

  let falsePositives = 0;
  let falseNegatives = 0;
  let total = 0;

  for (const [index, line] of lines.entries()) {
    const sample = parseSample(line);
    if (!sample) {
      continue;
    }
    total += 1;
    const results = runRuleEngine({
      mode: sample.mode,
      prompt: sample.prompt,
      model: { tier: sample.modelTier },
    });
    const hit = results.length > 0;
    const expectedHit = sample.expected === "HIT";
    const expectedNoHit = sample.expected === "NO_HIT" || sample.expected === "LOW";

    if (expectedHit && !hit) {
      falseNegatives += 1;
      output.appendLine(
        `False negative [${index + 1}]: ${sample.prompt} (${sample.note ?? "no note"})`
      );
    } else if (expectedNoHit && hit) {
      falsePositives += 1;
      output.appendLine(
        `False positive [${index + 1}]: ${sample.prompt} (${sample.note ?? "no note"})`
      );
    }
  }

  output.appendLine("");
  output.appendLine(
    `Samples: ${total}. False positives: ${falsePositives}. False negatives: ${falseNegatives}.`
  );
  output.show(true);
}
