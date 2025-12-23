import * as vscode from "vscode";

const DEFAULT_KEYWORDS = [
  "chat",
  "send",
  "cursor",
  "ai",
  "assistant",
  "copilot",
  "ask",
  "submit",
  "prompt",
];

function parseKeywords(input: string): string[] {
  return input
    .split(/\s+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

export async function discoverSendCommand(
  output: vscode.OutputChannel
): Promise<void> {
  const input = await vscode.window.showInputBox({
    prompt: "输入关键词以筛选命令（空格分隔）",
    value: DEFAULT_KEYWORDS.join(" "),
  });
  if (!input) {
    output.appendLine("Discover Send Command canceled (no input).");
    return;
  }

  const keywords = parseKeywords(input);
  if (keywords.length === 0) {
    output.appendLine("Discover Send Command canceled (empty keywords).");
    return;
  }

  const commands = await vscode.commands.getCommands(true);
  const matches = commands
    .filter((command) =>
      keywords.some((keyword) => command.toLowerCase().includes(keyword))
    )
    .sort((a, b) => a.localeCompare(b));

  output.appendLine(
    `Discover Send Command: ${matches.length} matches out of ${commands.length}.`
  );
  output.appendLine(`Keywords: ${keywords.join(", ")}`);
  for (const match of matches) {
    output.appendLine(match);
  }
  output.show(true);

  if (matches.length === 0) {
    void vscode.window.showInformationMessage("未找到匹配的命令。");
    return;
  }

  const selection = await vscode.window.showQuickPick(matches, {
    placeHolder: "选择一个命令 ID 复制到剪贴板",
    canPickMany: false,
  });
  if (!selection) {
    return;
  }

  await vscode.env.clipboard.writeText(selection);
  void vscode.window.showInformationMessage(
    `已复制命令 ID：${selection}`
  );
}
