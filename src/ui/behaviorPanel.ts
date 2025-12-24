import * as vscode from "vscode";
import { BadgeProgress, getBehaviorStats } from "./behaviorStats";

function renderTable(title: string, stats: Record<string, number>): string {
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

function renderBars(stats: Record<string, number>): string {
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
      <h3>最近 7 天（可视化）</h3>
      <div class="bars">${rows}</div>
    </section>
  `;
}

function renderBadges(badges: BadgeProgress[]): string {
  const rows = badges
    .map((badge) => {
      const status = badge.unlocked ? "已解锁" : "未解锁";
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
  target: number
): string {
  const reroute7d = Math.round(stats.last7DaysRerouteRate * 100);
  const hits7d = stats.last7Days.hit;
  const risks: string[] = [];
  if (hits7d >= 10 && reroute7d < target) {
    risks.push("提醒频繁但改道率偏低：建议先补 Spec 或切轻量模型。");
  }
  if (stats.last7Days.continue >= 8 && hits7d >= 10) {
    risks.push("连续继续偏多：建议复核任务范围与工程约束。");
  }
  if (risks.length === 0) {
    risks.push("暂无明显风险信号。");
  }
  const rows = risks.map((item) => `<li>${item}</li>`).join("");
  return `
    <section class="card">
      <h3>风险提示</h3>
      <ul class="risk-list">${rows}</ul>
    </section>
  `;
}

function renderGuidance(): string {
  return `
    <section class="card">
      <h3>使用路径（新手 / 老手）</h3>
      <div class="guide">
        <strong>新手：</strong> 看改道率与风险提示，先把改道率拉到目标值。<br />
        <strong>老手：</strong> 关注工程约束模板，防止高效节奏下漏项。
      </div>
    </section>
  `;
}

export function showBehaviorPanel(
  context: vscode.ExtensionContext
): void {
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
    "Throttle: 行为反馈",
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
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 20px; color: #111; }
        h1 { font-size: 20px; margin: 0 0 12px; }
        .meta { color: #666; margin-bottom: 16px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
        .card { border: 1px solid #e2e2e2; border-radius: 10px; padding: 12px; background: #fafafa; }
        h3 { margin: 0 0 8px; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 4px 0; font-size: 13px; }
        .bars { display: flex; flex-direction: column; gap: 6px; }
        .bar-row { display: grid; grid-template-columns: 90px 1fr 40px; gap: 8px; align-items: center; font-size: 12px; }
        .bar { background: #e8e8e8; border-radius: 999px; height: 8px; overflow: hidden; }
        .bar-fill { display: block; height: 100%; background: #5a67d8; }
        .bar-label { color: #444; }
        .bar-value { text-align: right; color: #555; }
        .badges { display: flex; flex-direction: column; gap: 8px; }
        .badge-row { display: grid; grid-template-columns: 90px 1fr 60px; gap: 8px; font-size: 12px; align-items: center; }
        .badge-title { font-weight: 600; color: #222; }
        .badge-desc { color: #555; }
        .badge-status { text-align: right; color: #555; }
        .risk-list { margin: 0; padding-left: 16px; font-size: 12px; color: #444; }
        .risk-list li { margin: 4px 0; }
        .guide { font-size: 12px; color: #444; line-height: 1.5; }
        .note { margin-top: 16px; font-size: 12px; color: #555; }
      </style>
    </head>
    <body>
      <h1>Throttle 行为反馈</h1>
      <div class="meta">记录数：${stats.totalEvents}（最近 7 天 & 总计）</div>
      <div class="meta">改道率：${reroute7d}% / ${rerouteTotal}%</div>
      <div class="meta">治理命中率：${governanceRate}% · 采用率：${governanceAdoption}%</div>
      <div class="meta">趋势：${deltaText}（对比上周）｜目标：${target}%</div>
      <div class="grid">
        ${renderTable("最近 7 天", stats.last7Days)}
        ${renderTable("总计", stats.totals)}
        ${renderBars(stats.last7Days)}
        ${renderBadges(stats.badges)}
        ${renderRisks(stats, target)}
        ${renderGuidance()}
      </div>
      <div class="note">提示：这些统计用于衡量“提醒→改道”的行为变化。</div>
    </body>
  </html>`;
  panel.webview.html = html;
}
