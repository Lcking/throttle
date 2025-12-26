import * as vscode from "vscode";
import { safeSubmitWithSample } from "./safeSubmit";
import { manageMutesCommand } from "./ruleMuteState";
import { showPreflight } from "./preflight";

const ONBOARDING_KEY = "throttle.onboarding.v0.4.1";
const ACTION_START_TOUR = "Start Quick Tour";
const ACTION_NOT_NOW = "Not now";
const ACTION_NEXT = "Next";
const ACTION_EXIT = "Exit";
const ACTION_RUN_SAMPLE = "Run sample nudge";
const ACTION_SKIP = "Skip";
const ACTION_MANAGE_MUTES = "Manage Mutes";
const ACTION_OPEN_PREFLIGHT = "Open Preflight";
const ACTION_FINISH = "Finish";
const SAMPLE_PROMPT =
  "Write code to implement a retry queue for failed jobs.";

export async function maybeShowOnboarding(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel
): Promise<void> {
  const welcomeEnabled = vscode.workspace
    .getConfiguration("throttle")
    .get<boolean>("welcome.enabled", true);
  const hasSeenOnboarding =
    context.globalState.get<boolean>(ONBOARDING_KEY) ?? false;
  if (!welcomeEnabled || hasSeenOnboarding) {
    return;
  }

  const selection = await vscode.window.showInformationMessage(
    "Welcome to Throttle. Want a 30-second Quick Tour?",
    ACTION_START_TOUR,
    ACTION_NOT_NOW
  );
  await context.globalState.update(ONBOARDING_KEY, true);
  if (selection === ACTION_START_TOUR) {
    await runQuickTour(context, output);
  }
}

export async function runQuickTour(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel
): Promise<void> {
  const step1 = await vscode.window.showInformationMessage(
    "Quick Tour (1/3): Throttle is a pre-call co-pilot. It warns on mode/model mismatch and never blocks—Continue stays primary.",
    ACTION_NEXT,
    ACTION_EXIT
  );
  if (step1 !== ACTION_NEXT) {
    return;
  }

  const step2 = await vscode.window.showInformationMessage(
    "Quick Tour (2/3): Trigger a sample nudge. Use Plan + Reasoning for the demo.",
    ACTION_RUN_SAMPLE,
    ACTION_SKIP
  );
  if (step2 === ACTION_RUN_SAMPLE) {
    await safeSubmitWithSample(context, output, SAMPLE_PROMPT);
  }

  const step3 = await vscode.window.showInformationMessage(
    "Quick Tour (3/3): Manage mutes or run Preflight to review mode, tier, and cooldowns.",
    ACTION_MANAGE_MUTES,
    ACTION_OPEN_PREFLIGHT,
    ACTION_FINISH
  );
  if (step3 === ACTION_MANAGE_MUTES) {
    await manageMutesCommand(context);
    return;
  }
  if (step3 === ACTION_OPEN_PREFLIGHT) {
    await showPreflight(context);
  }
}
