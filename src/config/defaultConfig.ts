import { Mode, RuleThresholds, ThrottleConfig } from "../rules/types";

export const defaultRuleThresholds: RuleThresholds = {
  R001_PLAN_EXEC_REASONING: 0.7,
  R010_LOAD_OVERFLOW: 0.7,
  R011_AUTHORITY_OVERREACH: 0.65,
  R012_NOISE_OVERLOAD: 0.65,
};

export const defaultConfig: ThrottleConfig = {
  defaultMode: "plan",
  reasoningTiers: ["reasoning"],
  reasoningModelAllowlist: ["o1", "o3-mini", "gpt-4.1-reasoning"],
  ruleThresholds: defaultRuleThresholds,
  governanceKeywords: {
    load: [
      "full context",
      "entire repo",
      "all files",
      "whole codebase",
      "全仓",
      "整个仓库",
      "所有文件",
      "全部文件",
      "完整上下文",
    ],
    authority: [
      "browser",
      "chrome",
      "devtools",
      "puppeteer",
      "playwright",
      "root",
      "sudo",
      "管理员",
      "权限",
      "认证",
      "auth",
      "security",
    ],
    noise: [
      "log",
      "trace",
      "stack trace",
      "screenshot",
      "dump",
      "profiling",
      "截图",
      "日志",
      "全量输出",
      "抓包",
    ],
  },
};

export const modeOptions: Mode[] = ["plan", "ask", "exec"];
