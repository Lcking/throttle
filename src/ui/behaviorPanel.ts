import * as vscode from "vscode";
import { BadgeProgress, getBehaviorStats } from "./behaviorStats";

type LocaleStrings = {
  title: string;
  records: string;
  rerouteRate: string;
  governanceRate: string;
  adoptionRate: string;
  trend: string;
  target: string;
  last7d: string;
  total: string;
  last7dVisual: string;
  badges: string;
  risks: string;
  guideTitle: string;
  guideNewLabel: string;
  guideNewText: string;
  guideProLabel: string;
  guideProText: string;
  riskLowReroute: string;
  riskContinue: string;
  riskNone: string;
  note: string;
  unlocked: string;
  locked: string;
};

function isZhLocale(): boolean {
  const lang = vscode.env.language.toLowerCase();
  return lang.startsWith("zh");
}

function getStrings(): LocaleStrings {
  if (isZhLocale()) {
    return {
      title: "Throttle 行为反馈",
      records: "记录数",
      rerouteRate: "改道率",
      governanceRate: "治理命中率",
      adoptionRate: "采用率",
      trend: "趋势",
      target: "目标",
      last7d: "最近 7 天",
      total: "总计",
      last7dVisual: "最近 7 天（可视化）",
      badges: "成就徽章",
      risks: "风险提示",
      guideTitle: "使用路径（新手 / 老手）",
      guideNewLabel: "新手",
      guideNewText: "看改道率与风险提示，先把改道率拉到目标值。",
      guideProLabel: "老手",
      guideProText: "关注工程约束模板，防止高效节奏下漏项。",
      riskLowReroute: "提醒频繁但改道率偏低：建议先补 Spec 或切轻量模型。",
      riskContinue: "连续继续偏多：建议复核任务范围与工程约束。",
      riskNone: "暂无明显风险信号。",
      note: "提示：这些统计用于衡量“提醒→改道”的行为变化。",
      unlocked: "已解锁",
      locked: "未解锁",
    };
  }
  return {
    title: "Throttle Behavior",
    records: "Records",
    rerouteRate: "Reroute rate",
    governanceRate: "Governance hit rate",
    adoptionRate: "Adoption rate",
    trend: "Trend",
    target: "Target",
    last7d: "Last 7 days",
    total: "Total",
    last7dVisual: "Last 7 days (visual)",
    badges: "Badges",
    risks: "Risk signals",
    guideTitle: "Paths (New / Pro)",
    guideNewLabel: "New",
    guideNewText: "Watch reroute rate and risk signals; reach the target first.",
    guideProLabel: "Pro",
    guideProText: "Watch guardrails so you don't miss constraints at speed.",
    riskLowReroute: "Frequent nudges but low reroute rate: consider Spec or light tier.",
    riskContinue: "Many continues in a row: re-check scope and guardrails.",
    riskNone: "No obvious risk signals.",
    note: "Note: these stats track behavior shifts from nudges to reroutes.",
    unlocked: "Unlocked",
    locked: "Locked",
  };
}

function renderTable(
  title: string,
  stats: Record<string, number>
): string {
  const rows = Object.entries(stats)
    .map(
      ([key, value]) =>
        `<tr><td>${key}</td><td style="text-align:right;">${value}</td></tr>`
    )
    .join("");
  return `
    <section class="card">
      <h3>${title}</h3>
      <table>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
}

function renderBars(
  title: string,
  stats: Record<string, number>
): string {
  const values = Object.values(stats);
  const max = Math.max(1, ...values);
  const rows = Object.entries(stats)
    .map(([key, value]) => {
      const width = Math.round((value / max) * 80);
      return `
        <div class="bar-row">
          <span class="bar-label">${key}</span>
          <span class="bar">
            <span class="bar-fill" style="width:${width}%"></span>
          </span>
          <span class="bar-value">${value}</span>
        </div>
      `;
    })
    .join("");
  return `
    <section class="card">
      <h3>${title}</h3>
      <div class="bars">${rows}</div>
    </section>
  `;
}

function renderBadges(
  title: string,
  badges: BadgeProgress[],
  strings: LocaleStrings
): string {
  const rows = badges
    .map((badge) => {
      const status = badge.unlocked ? strings.unlocked : strings.locked;
      return `
        <div class="badge-row">
          <div class="badge-title">${badge.title}</div>
          <div class="badge-desc">${badge.description}</div>
          <div class="badge-status">${status}</div>
        </div>
      `;
    })
    .join("");
  return `
    <section class="card">
      <h3>成就徽章</h3>
      <div class="badges">${rows}</div>
    </section>
  `;
}

function renderRisks(
  stats: ReturnType<typeof getBehaviorStats>,
  target: number,
  strings: LocaleStrings
): string {
  const reroute7d = Math.round(stats.last7DaysRerouteRate * 100);
  const hits7d = stats.last7Days.hit;
  const risks: string[] = [];
  if (hits7d >= 10 && reroute7d < target) {
    risks.push(strings.riskLowReroute);
  }
  if (stats.last7Days.continue >= 8 && hits7d >= 10) {
    risks.push(strings.riskContinue);
  }
  if (risks.length === 0) {
    risks.push(strings.riskNone);
  }
  const rows = risks.map((item) => `<li>${item}</li>`).join("");
  return `
    <section class="card">
      <h3>${strings.risks}</h3>
      <ul class="risk-list">${rows}</ul>
    </section>
  `;
}

function renderGuidance(strings: LocaleStrings): string {
  return `
    <section class="card">
      <h3>${strings.guideTitle}</h3>
      <div class="guide">
        <strong>${strings.guideNewLabel}:</strong>
        ${strings.guideNewText}<br />
        <strong>${strings.guideProLabel}:</strong>
        ${strings.guideProText}
      </div>
    </section>
  `;
}

export function showBehaviorPanel(
  context: vscode.ExtensionContext
): void {
  const strings = getStrings();
  const stats = getBehaviorStats(context);
  const reroute7d = Math.round(stats.last7DaysRerouteRate * 100);
  const rerouteTotal = Math.round(stats.totalsRerouteRate * 100);
  const governanceRate = Math.round(stats.governanceRate * 100);
  const governanceAdoption = Math.round(stats.governanceAdoptionRate * 100);
  const delta = Math.round(stats.rerouteRateDelta * 100);
  const deltaText = delta === 0 ? "—" : delta > 0 ? `+${delta}%` : `${delta}%`;
  const target = Math.max(
    0,
    Math.min(
      100,
      vscode.workspace.getConfiguration("throttle").get<number>(
        "behavior.targetRerouteRate",
        30
      )
    )
  );
  const panel = vscode.window.createWebviewPanel(
    "throttle.behavior",
    `Throttle: ${strings.title}`,
    vscode.ViewColumn.One,
    {
      enableScripts: false,
      retainContextWhenHidden: false,
    }
  );

  const html = `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body {
          font-family: var(--vscode-font-family);
          padding: 20px;
          color: var(--vscode-editor-foreground);
          background: var(--vscode-editor-background);
        }
        h1 { font-size: 20px; margin: 0 0 12px; }
        .meta { color: var(--vscode-descriptionForeground); margin-bottom: 16px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
        .card {
          border: 1px solid var(--vscode-editorWidget-border);
          border-radius: 10px;
          padding: 12px;
          background: var(--vscode-editorWidget-background);
        }
        h3 { margin: 0 0 8px; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 4px 0; font-size: 13px; }
        .bars { display: flex; flex-direction: column; gap: 6px; }
        .bar-row { display: grid; grid-template-columns: 90px 1fr 40px; gap: 8px; align-items: center; font-size: 12px; }
        .bar { background: var(--vscode-editorWidget-border); border-radius: 999px; height: 8px; overflow: hidden; }
        .bar-fill { display: block; height: 100%; background: var(--vscode-charts-blue); }
        .bar-label { color: var(--vscode-foreground); }
        .bar-value { text-align: right; color: var(--vscode-descriptionForeground); }
        .badges { display: flex; flex-direction: column; gap: 8px; }
        .badge-row { display: grid; grid-template-columns: 90px 1fr 60px; gap: 8px; font-size: 12px; align-items: center; }
        .badge-title { font-weight: 600; color: var(--vscode-foreground); }
        .badge-desc { color: var(--vscode-descriptionForeground); }
        .badge-status { text-align: right; color: var(--vscode-descriptionForeground); }
        .risk-list { margin: 0; padding-left: 16px; font-size: 12px; color: var(--vscode-foreground); }
        .risk-list li { margin: 4px 0; }
        .guide { font-size: 12px; color: var(--vscode-foreground); line-height: 1.5; }
        .note { margin-top: 16px; font-size: 12px; color: var(--vscode-descriptionForeground); }
      </style>
    </head>
    <body>
      <h1>${strings.title}</h1>
      <div class="meta">${strings.records}: ${stats.totalEvents} (${strings.last7d} & ${strings.total})</div>
      <div class="meta">${strings.rerouteRate}: ${reroute7d}% / ${rerouteTotal}%</div>
      <div class="meta">${strings.governanceRate}: ${governanceRate}% · ${strings.adoptionRate}: ${governanceAdoption}%</div>
      <div class="meta">${strings.trend}: ${deltaText} · ${strings.target}: ${target}%</div>
      <div class="grid">
        ${renderTable(strings.last7d, stats.last7Days)}
        ${renderTable(strings.total, stats.totals)}
        ${renderBars(strings.last7dVisual, stats.last7Days)}
        ${renderBadges(strings.badges, stats.badges, strings)}
        ${renderRisks(stats, target, strings)}
        ${renderGuidance(strings)}
      </div>
      <div class="note">${strings.note}</div>
    </body>
  </html>`;
  panel.webview.html = html;
}
