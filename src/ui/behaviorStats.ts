import * as vscode from "vscode";

export type BehaviorEventType =
  | "hit"
  | "load"
  | "authority"
  | "noise"
  | "continue"
  | "switch_ask"
  | "switch_light"
  | "change_mode"
  | "mute_rule"
  | "guard_template";

interface BehaviorEvent {
  ts: number;
  type: BehaviorEventType;
  ruleId?: string;
}

const EVENTS_KEY = "throttle.behaviorEvents";
const MAX_EVENTS = 500;

export function recordBehaviorEvent(
  context: vscode.ExtensionContext,
  event: BehaviorEvent
): void {
  const stored = context.workspaceState.get<BehaviorEvent[]>(EVENTS_KEY) ?? [];
  const next = [...stored, event].slice(-MAX_EVENTS);
  void context.workspaceState.update(EVENTS_KEY, next);
}

export function clearBehaviorEvents(
  context: vscode.ExtensionContext
): void {
  void context.workspaceState.update(EVENTS_KEY, []);
}

export function getBehaviorEvents(
  context: vscode.ExtensionContext
): BehaviorEvent[] {
  return context.workspaceState.get<BehaviorEvent[]>(EVENTS_KEY) ?? [];
}

function filterSince(events: BehaviorEvent[], sinceMs: number): BehaviorEvent[] {
  return events.filter((event) => event.ts >= sinceMs);
}

function countByType(events: BehaviorEvent[]): Record<BehaviorEventType, number> {
  const counts: Record<BehaviorEventType, number> = {
    hit: 0,
    load: 0,
    authority: 0,
    noise: 0,
    continue: 0,
    switch_ask: 0,
    switch_light: 0,
    change_mode: 0,
    mute_rule: 0,
    guard_template: 0,
  };
  for (const event of events) {
    counts[event.type] += 1;
  }
  return counts;
}

export function getBehaviorStats(
  context: vscode.ExtensionContext
): {
  totals: Record<BehaviorEventType, number>;
  last7Days: Record<BehaviorEventType, number>;
  previous7Days: Record<BehaviorEventType, number>;
  totalEvents: number;
  totalsRerouteRate: number;
  last7DaysRerouteRate: number;
  previous7DaysRerouteRate: number;
  rerouteRateDelta: number;
  badges: BadgeProgress[];
  governanceRate: number;
  governanceAdoptionRate: number;
} {
  const events = getBehaviorEvents(context);
  const totals = countByType(events);
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weekAgo = now - weekMs;
  const twoWeeksAgo = now - 2 * weekMs;
  const last7Days = countByType(filterSince(events, weekAgo));
  const previous7Days = countByType(
    events.filter((event) => event.ts >= twoWeeksAgo && event.ts < weekAgo)
  );
  const totalsRerouteRate = computeRerouteRate(totals);
  const last7DaysRerouteRate = computeRerouteRate(last7Days);
  const previous7DaysRerouteRate = computeRerouteRate(previous7Days);
  const rerouteRateDelta = last7DaysRerouteRate - previous7DaysRerouteRate;
  const badges = getBadges(last7Days, totals, last7DaysRerouteRate);
  const governanceRate = computeGovernanceRate(last7Days);
  const governanceAdoptionRate = computeGovernanceAdoptionRate(last7Days);
  return {
    totals,
    last7Days,
    previous7Days,
    totalEvents: events.length,
    totalsRerouteRate,
    last7DaysRerouteRate,
    previous7DaysRerouteRate,
    rerouteRateDelta,
    badges,
    governanceRate,
    governanceAdoptionRate,
  };
}

function computeRerouteRate(
  stats: Record<BehaviorEventType, number>
): number {
  const hits = stats.hit;
  if (!hits) {
    return 0;
  }
  const reroutes = stats.switch_ask + stats.switch_light + stats.change_mode;
  return reroutes / hits;
}

function computeGovernanceRate(
  stats: Record<BehaviorEventType, number>
): number {
  const hits = stats.hit;
  if (!hits) {
    return 0;
  }
  const governanceHits = stats.load + stats.authority + stats.noise;
  return governanceHits / hits;
}

function computeGovernanceAdoptionRate(
  stats: Record<BehaviorEventType, number>
): number {
  const governanceHits = stats.load + stats.authority + stats.noise;
  if (!governanceHits) {
    return 0;
  }
  const actions = stats.switch_ask + stats.switch_light + stats.change_mode;
  return actions / governanceHits;
}

export interface BadgeProgress {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
}

function getBadges(
  last7Days: Record<BehaviorEventType, number>,
  totals: Record<BehaviorEventType, number>,
  last7DaysRerouteRate: number
): BadgeProgress[] {
  const reroutes =
    totals.switch_ask + totals.switch_light + totals.change_mode;
  const badges: BadgeProgress[] = [
    {
      id: "steady_start",
      title: "稳健起步",
      description: "累计改道 3 次",
      unlocked: reroutes >= 3,
    },
    {
      id: "pace_control",
      title: "节奏掌控",
      description: "最近 7 天改道率 ≥ 30%",
      unlocked: last7Days.hit >= 3 && last7DaysRerouteRate >= 0.3,
    },
    {
      id: "efficient_reroute",
      title: "省油高手",
      description: "最近 7 天改道率 ≥ 50%",
      unlocked: last7Days.hit >= 3 && last7DaysRerouteRate >= 0.5,
    },
    {
      id: "calm_driver",
      title: "冷静驾驶",
      description: "累计继续 5 次 + 切轻量 1 次",
      unlocked: totals.continue >= 5 && totals.switch_light >= 1,
    },
  ];
  return badges;
}
