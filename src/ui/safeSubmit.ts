import * as vscode from "vscode";
import { defaultConfig, modeOptions } from "../config/defaultConfig";
import { runRuleEngine } from "../rules/engine";
import { Mode, ModelInfo } from "../rules/types";
import {
  getMode,
  getModelTier,
  getStoredModelTier,
  setMode,
  setModelTier,
} from "./modeState";

const ACTION_CONTINUE = "Continue";
const ACTION_SWITCH_ASK = "Switch to Ask (demo)";
const ACTION_SWITCH_LIGHT = "Switch to light model (demo)";
const ACTION_MUTE_RULE = "Mute this rule (demo)";
const ACTION_CHANGE_MODE = "Change mode...";

export async function safeSubmit(
  context: vscode.ExtensionContext
): Promise<void> {
  const prompt = await vscode.window.showInputBox({
    prompt: "Enter a prompt to safely submit",
    placeHolder: "Describe what you want the model to do",
  });
  if (!prompt) {
    return;
  }

  const mode = getMode(context);
  const storedTier = getStoredModelTier(context);
  const tier = getModelTier(context, mode);
  if (!storedTier) {
    await setModelTier(context, tier);
  }

  const model: ModelInfo = {
    tier,
  };
  const results = runRuleEngine(
    {
      mode,
      prompt,
      model,
    },
    defaultConfig
  );

  if (results.length === 0) {
    return;
  }

  const [first] = results;
  const confidence = first?.confidence ?? 0;
  const detailLines = [
    first?.message ??
      "This looks like execution work in Plan mode with a reasoning model.",
    `Detected: ${mode} + ${tier} model + execution intent.`,
    "Impact: reasoning models can be costly for execution work.",
    "Suggested: continue, switch to Ask, or use a light model.",
    `Confidence: ${confidence.toFixed(2)}.`,
  ];
  const selection = await vscode.window.showWarningMessage(
    "Possible overkill in Plan mode",
    { detail: detailLines.join("\n") },
    ACTION_CONTINUE,
    ACTION_SWITCH_ASK,
    ACTION_SWITCH_LIGHT,
    ACTION_MUTE_RULE,
    ACTION_CHANGE_MODE
  );
  if (!selection) {
    return;
  }

  switch (selection) {
    case ACTION_SWITCH_ASK: {
      await setMode(context, "ask");
      void vscode.window.showInformationMessage(
        "Switched to Ask mode (demo)."
      );
      break;
    }
    case ACTION_SWITCH_LIGHT: {
      await setModelTier(context, "light");
      void vscode.window.showInformationMessage(
        "Switched to a light model tier (demo)."
      );
      break;
    }
    case ACTION_MUTE_RULE: {
      void vscode.window.showInformationMessage(
        "Muting rules is a demo action."
      );
      break;
    }
    case ACTION_CHANGE_MODE: {
      const newMode = await vscode.window.showQuickPick(modeOptions, {
        placeHolder: "Select mode for Throttle (Dev)",
        canPickMany: false,
      });
      if (!newMode) {
        return;
      }
      await setMode(context, newMode as Mode);
      void vscode.window.showInformationMessage(
        `Throttle mode set to ${newMode}.`
      );
      break;
    }
    default:
      break;
  }
}
