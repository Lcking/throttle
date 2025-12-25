import * as vscode from "vscode";
import { defaultConfig } from "../config/defaultConfig";
import { extractPromptFeatures } from "../rules/features";
import { normalizePrompt } from "../rules/normalize";

const EXEC_KEYWORDS = [
  "implement",
  "implementation",
  "refactor",
  "rewrite",
  "build",
  "create",
  "generate code",
  "write code",
  "实现",
  "重构",
  "改造",
  "写代码",
  "生成代码",
  "开发",
];

const DOC_HEADER_TOKENS = ["input", "output", "pos"];
const HEADER_SCAN_LINES = 40;
const IGNORED_DIRS = new Set([
  ".git",
  ".vscode",
  "node_modules",
  "dist",
  "out",
  "build",
  "assets",
  "coverage",
  "samples",
]);

type DocDriftIssue =
  | {
      type: "file_header";
      uri: vscode.Uri;
      missingTokens: string[];
    }
  | {
      type: "dir_readme";
      folderName: string;
      targetPath: string;
    };

const ACTION_CONTINUE = "继续";
const ACTION_TEMPLATE = "生成模板";
const ACTION_OPEN_FILE = "打开文件";

function isDocDriftEnabled(): boolean {
  return vscode.workspace
    .getConfiguration("throttle")
    .get<boolean>("docDrift.enabled", false);
}

function isExecPrompt(prompt: string): boolean {
  const normalized = normalizePrompt(prompt);
  const features = extractPromptFeatures(normalized.prompt, defaultConfig);
  if (features.execIntentScore >= 0.7) {
    return true;
  }
  const lowered = normalized.prompt.toLowerCase();
  return EXEC_KEYWORDS.some((keyword) => lowered.includes(keyword));
}

async function findMissingReadme(): Promise<DocDriftIssue | null> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return null;
  }
  const root = folders[0];
  if (!root) {
    return null;
  }
  const entries = await vscode.workspace.fs.readDirectory(root.uri);
  for (const [name, type] of entries) {
    if (type !== vscode.FileType.Directory) {
      continue;
    }
    if (IGNORED_DIRS.has(name)) {
      continue;
    }
    const readmePath = vscode.Uri.joinPath(root.uri, name, "README.md");
    try {
      await vscode.workspace.fs.stat(readmePath);
    } catch {
      return {
        type: "dir_readme",
        folderName: name,
        targetPath: vscode.workspace.asRelativePath(readmePath),
      };
    }
  }
  return null;
}

function checkActiveFileHeader(): DocDriftIssue | null {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return null;
  }
  const doc = editor.document;
  if (doc.uri.scheme !== "file") {
    return null;
  }
  const maxLine = Math.min(doc.lineCount, HEADER_SCAN_LINES);
  const header = doc.getText(
    new vscode.Range(new vscode.Position(0, 0), new vscode.Position(maxLine, 0))
  );
  const missing = DOC_HEADER_TOKENS.filter(
    (token) => !new RegExp(`${token}\\s*:`, "i").test(header)
  );
  if (missing.length === 0) {
    return null;
  }
  return {
    type: "file_header",
    uri: doc.uri,
    missingTokens: missing,
  };
}

function buildTemplate(issue: DocDriftIssue): string {
  if (issue.type === "dir_readme") {
    return [
      `# ${issue.folderName}`,
      "职责:",
      "- ",
    ].join("\n");
  }
  return [
    "/**",
    " * Input:",
    " * Output:",
    " * Pos:",
    " */",
  ].join("\n");
}

async function openTarget(issue: DocDriftIssue): Promise<void> {
  if (issue.type === "file_header") {
    const doc = await vscode.workspace.openTextDocument(issue.uri);
    await vscode.window.showTextDocument(doc, { preview: false });
    return;
  }
  const template = buildTemplate(issue);
  const doc = await vscode.workspace.openTextDocument({
    language: "markdown",
    content: template,
  });
  await vscode.window.showTextDocument(doc, { preview: false });
  void vscode.window.showInformationMessage(
    `建议补齐：${issue.targetPath}`
  );
}

async function showDocDriftNudge(
  issue: DocDriftIssue
): Promise<string | undefined> {
  const description =
    issue.type === "file_header"
      ? `缺少头注释：${issue.missingTokens.join(", ")}`
      : `缺少目录说明：${issue.targetPath}`;
  type ActionItem = vscode.QuickPickItem & { action: string };
  const continueItem: ActionItem = {
    label: ACTION_CONTINUE,
    description: "继续本次操作",
    detail: "Doc Drift Sentinel（可选）。不阻断，仅提醒。",
    action: ACTION_CONTINUE,
  };
  const items: ActionItem[] = [
    continueItem,
    {
      label: ACTION_TEMPLATE,
      description,
      detail: "生成最小模板并复制到剪贴板",
      action: ACTION_TEMPLATE,
    },
    {
      label: ACTION_OPEN_FILE,
      description,
      detail: "打开需要补齐的文件/模板",
      action: ACTION_OPEN_FILE,
    },
  ];
  return await new Promise((resolve) => {
    const quickPick = vscode.window.createQuickPick<ActionItem>();
    quickPick.items = items;
    quickPick.placeholder = "Doc Drift Sentinel：文档纪律提醒（可选）";
    quickPick.canSelectMany = false;
    quickPick.ignoreFocusOut = true;
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;
    quickPick.activeItems = [continueItem];
    quickPick.onDidAccept(() => {
      resolve(quickPick.selectedItems[0]?.action);
      quickPick.hide();
    });
    quickPick.onDidHide(() => {
      resolve(undefined);
      quickPick.dispose();
    });
    quickPick.show();
  });
}

export async function runDocDriftSentinel(
  prompt: string
): Promise<void> {
  if (!isDocDriftEnabled()) {
    return;
  }
  if (!isExecPrompt(prompt)) {
    return;
  }

  const issue = checkActiveFileHeader() ?? (await findMissingReadme());
  if (!issue) {
    return;
  }

  const action = await showDocDriftNudge(issue);
  if (!action) {
    return;
  }

  if (action === ACTION_TEMPLATE) {
    const template = buildTemplate(issue);
    await vscode.env.clipboard.writeText(template);
    void vscode.window.showInformationMessage("模板已复制到剪贴板。");
    return;
  }

  if (action === ACTION_OPEN_FILE) {
    await openTarget(issue);
  }
}
