import { prisma } from "@/lib/db";

export type RangeKey = "24h" | "7d" | "30d" | "90d" | "all";

export function rangeToDate(range: RangeKey): Date | undefined {
  const now = Date.now();
  switch (range) {
    case "24h":
      return new Date(now - 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now - 90 * 24 * 60 * 60 * 1000);
    case "all":
    default:
      return undefined;
  }
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Percentage change of `current` vs `previous`. Returns null when there is no
// usable baseline (previous period had zero) so callers can hide the delta
// rather than show a meaningless "+∞%".
function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export async function getOverviewStats(range: RangeKey) {
  const since = rangeToDate(range);
  const where = since ? { createdAt: { gte: since } } : {};

  const turns = await prisma.turn.findMany({
    where,
    select: {
      createdAt: true,
      inputTokens: true,
      outputTokens: true,
      cacheCreationTokens: true,
      cacheReadTokens: true,
      costUsd: true,
      model: true,
      userId: true,
    },
  });

  const dailyMap = new Map<
    string,
    { date: string; inputTokens: number; outputTokens: number; costUsd: number; turns: number }
  >();
  const modelMap = new Map<string, { model: string; turns: number; totalTokens: number; costUsd: number }>();
  const activeUserIds = new Set<string>();

  let totalInput = 0;
  let totalOutput = 0;
  let totalCacheCreate = 0;
  let totalCacheRead = 0;
  let totalCost = 0;

  for (const t of turns) {
    totalInput += t.inputTokens;
    totalOutput += t.outputTokens;
    totalCacheCreate += t.cacheCreationTokens;
    totalCacheRead += t.cacheReadTokens;
    totalCost += t.costUsd;
    activeUserIds.add(t.userId);

    const key = dayKey(t.createdAt);
    const bucket = dailyMap.get(key) ?? { date: key, inputTokens: 0, outputTokens: 0, costUsd: 0, turns: 0 };
    bucket.inputTokens += t.inputTokens;
    bucket.outputTokens += t.outputTokens;
    bucket.costUsd += t.costUsd;
    bucket.turns += 1;
    dailyMap.set(key, bucket);

    const modelBucket = modelMap.get(t.model) ?? { model: t.model, turns: 0, totalTokens: 0, costUsd: 0 };
    modelBucket.turns += 1;
    modelBucket.totalTokens += t.inputTokens + t.outputTokens;
    modelBucket.costUsd += t.costUsd;
    modelMap.set(t.model, modelBucket);
  }

  const [sessionCount, userCount, activeSessionCount] = await Promise.all([
    prisma.claudeSession.count(since ? { where: { startedAt: { gte: since } } } : undefined),
    prisma.user.count(),
    prisma.claudeSession.count({ where: { status: { in: ["ACTIVE", "IDLE"] } } }),
  ]);

  // Period-over-period deltas: compare the current window with the immediately
  // preceding window of the same length. Only meaningful when a range is set
  // (the "all" range has no "previous period").
  let deltas: {
    totalTokens: number | null;
    costUsd: number | null;
    turnCount: number | null;
    sessionCount: number | null;
  } | null = null;
  if (since) {
    const windowMs = Date.now() - since.getTime();
    const prevSince = new Date(since.getTime() - windowMs);
    const [prevTurns, prevSessionCount] = await Promise.all([
      prisma.turn.aggregate({
        where: { createdAt: { gte: prevSince, lt: since } },
        _sum: { inputTokens: true, outputTokens: true, costUsd: true },
        _count: true,
      }),
      prisma.claudeSession.count({ where: { startedAt: { gte: prevSince, lt: since } } }),
    ]);
    const prevTokens = (prevTurns._sum.inputTokens ?? 0) + (prevTurns._sum.outputTokens ?? 0);
    deltas = {
      totalTokens: pctDelta(totalInput + totalOutput, prevTokens),
      costUsd: pctDelta(totalCost, prevTurns._sum.costUsd ?? 0),
      turnCount: pctDelta(turns.length, prevTurns._count),
      sessionCount: pctDelta(sessionCount, prevSessionCount),
    };
  }

  const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  const byModel = Array.from(modelMap.values()).sort((a, b) => b.totalTokens - a.totalTokens);

  // Cache hit ratio: share of "read" input that was served from the prompt
  // cache instead of billed as fresh input tokens.
  const cacheDenominator = totalCacheRead + totalInput;
  const cacheHitRatio = cacheDenominator > 0 ? totalCacheRead / cacheDenominator : 0;

  return {
    totals: {
      inputTokens: totalInput,
      outputTokens: totalOutput,
      cacheCreationTokens: totalCacheCreate,
      cacheReadTokens: totalCacheRead,
      cacheHitRatio,
      totalTokens: totalInput + totalOutput,
      costUsd: totalCost,
      turnCount: turns.length,
      sessionCount,
      userCount,
      activeUserCount: activeUserIds.size,
      activeSessionCount,
    },
    deltas,
    daily,
    byModel,
  };
}

export type RankingMetric = "totalTokens" | "inputTokens" | "outputTokens" | "costUsd" | "sessionDuration" | "turnCount";

export async function getRankings(metric: RankingMetric, range: RangeKey, limit = 10) {
  const since = rangeToDate(range);

  if (metric === "sessionDuration") {
    const sessions = await prisma.claudeSession.findMany({
      where: since ? { startedAt: { gte: since } } : undefined,
      include: { user: { select: { id: true, name: true, team: { select: { name: true } }, department: { select: { name: true } } } } },
    });
    return sessions
      .map((s) => ({
        userId: s.userId,
        userName: s.user.name,
        team: s.user.team?.name ?? null,
        department: s.user.department?.name ?? null,
        value: (s.endedAt ?? s.lastEventAt).getTime() - s.startedAt.getTime(),
        sessionId: s.externalId,
        projectLabel: s.projectLabel,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  }

  const turns = await prisma.turn.findMany({
    where: since ? { createdAt: { gte: since } } : undefined,
    include: { user: { select: { id: true, name: true, team: { select: { name: true } }, department: { select: { name: true } } } } },
  });

  const byUser = new Map<
    string,
    { userId: string; userName: string; team: string | null; department: string | null; value: number }
  >();

  for (const t of turns) {
    const bucket = byUser.get(t.userId) ?? {
      userId: t.userId,
      userName: t.user.name,
      team: t.user.team?.name ?? null,
      department: t.user.department?.name ?? null,
      value: 0,
    };
    switch (metric) {
      case "totalTokens":
        bucket.value += t.inputTokens + t.outputTokens;
        break;
      case "inputTokens":
        bucket.value += t.inputTokens;
        break;
      case "outputTokens":
        bucket.value += t.outputTokens;
        break;
      case "costUsd":
        bucket.value += t.costUsd;
        break;
      case "turnCount":
        bucket.value += 1;
        break;
    }
    byUser.set(t.userId, bucket);
  }

  return Array.from(byUser.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export async function getModelLeaderboard(range: RangeKey) {
  const since = rangeToDate(range);
  const turns = await prisma.turn.findMany({
    where: since ? { createdAt: { gte: since } } : undefined,
    select: { model: true, inputTokens: true, outputTokens: true, costUsd: true, userId: true },
  });

  const map = new Map<
    string,
    { model: string; turns: number; inputTokens: number; outputTokens: number; costUsd: number; users: Set<string> }
  >();

  for (const t of turns) {
    const bucket = map.get(t.model) ?? {
      model: t.model,
      turns: 0,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      users: new Set<string>(),
    };
    bucket.turns += 1;
    bucket.inputTokens += t.inputTokens;
    bucket.outputTokens += t.outputTokens;
    bucket.costUsd += t.costUsd;
    bucket.users.add(t.userId);
    map.set(t.model, bucket);
  }

  return Array.from(map.values())
    .map((m) => ({ ...m, users: m.users.size, totalTokens: m.inputTokens + m.outputTokens }))
    .sort((a, b) => b.totalTokens - a.totalTokens);
}

async function scopedStats(where: { userId: { in: string[] } } | Record<string, never>, since?: Date) {
  const turnWhere = since ? { ...where, createdAt: { gte: since } } : where;
  const turns = await prisma.turn.findMany({ where: turnWhere });

  let inputTokens = 0;
  let outputTokens = 0;
  let costUsd = 0;
  const daily = new Map<string, { date: string; inputTokens: number; outputTokens: number; costUsd: number }>();

  for (const t of turns) {
    inputTokens += t.inputTokens;
    outputTokens += t.outputTokens;
    costUsd += t.costUsd;
    const key = dayKey(t.createdAt);
    const bucket = daily.get(key) ?? { date: key, inputTokens: 0, outputTokens: 0, costUsd: 0 };
    bucket.inputTokens += t.inputTokens;
    bucket.outputTokens += t.outputTokens;
    bucket.costUsd += t.costUsd;
    daily.set(key, bucket);
  }

  const toolCallWhere = since ? { ...where, startedAt: { gte: since } } : where;
  const toolCallsByName = await prisma.toolCall.groupBy({
    by: ["toolName"],
    where: toolCallWhere,
    _count: { toolName: true },
  });

  return {
    totals: {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      costUsd,
      turnCount: turns.length,
    },
    daily: Array.from(daily.values()).sort((a, b) => a.date.localeCompare(b.date)),
    topTools: toolCallsByName
      .map((t) => ({ toolName: t.toolName, count: t._count.toolName }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  };
}

export async function getUserStats(userId: string, range: RangeKey) {
  return scopedStats({ userId: { in: [userId] } }, rangeToDate(range));
}

export async function getTeamStats(teamId: string, range: RangeKey) {
  const users = await prisma.user.findMany({ where: { teamId }, select: { id: true } });
  return scopedStats({ userId: { in: users.map((u) => u.id) } }, rangeToDate(range));
}

export async function getDepartmentStats(departmentId: string, range: RangeKey) {
  const users = await prisma.user.findMany({ where: { departmentId }, select: { id: true } });
  const teamUsers = await prisma.user.findMany({ where: { team: { departmentId } }, select: { id: true } });
  const ids = new Set([...users.map((u) => u.id), ...teamUsers.map((u) => u.id)]);
  return scopedStats({ userId: { in: Array.from(ids) } }, rangeToDate(range));
}

export async function getMemberBreakdown(userIds: string[], range: RangeKey) {
  const since = rangeToDate(range);
  const turns = await prisma.turn.findMany({
    where: { userId: { in: userIds }, ...(since ? { createdAt: { gte: since } } : {}) },
    include: { user: { select: { id: true, name: true } } },
  });

  const byUser = new Map<
    string,
    { userId: string; userName: string; inputTokens: number; outputTokens: number; costUsd: number; turnCount: number }
  >();

  for (const id of userIds) {
    byUser.set(id, { userId: id, userName: "", inputTokens: 0, outputTokens: 0, costUsd: 0, turnCount: 0 });
  }

  for (const t of turns) {
    const bucket = byUser.get(t.userId)!;
    bucket.userName = t.user.name;
    bucket.inputTokens += t.inputTokens;
    bucket.outputTokens += t.outputTokens;
    bucket.costUsd += t.costUsd;
    bucket.turnCount += 1;
  }

  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
  const nameMap = new Map(users.map((u) => [u.id, u.name]));
  for (const [id, bucket] of byUser) {
    if (!bucket.userName) bucket.userName = nameMap.get(id) ?? "?";
  }

  return Array.from(byUser.values()).sort((a, b) => b.inputTokens + b.outputTokens - (a.inputTokens + a.outputTokens));
}

export async function getRecentSessions(limit = 50) {
  return prisma.claudeSession.findMany({
    orderBy: { lastEventAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, name: true, team: { select: { name: true } }, department: { select: { name: true } } } },
      toolCalls: { orderBy: { startedAt: "desc" }, take: 8 },
    },
  });
}

export type ToolStatRow = {
  toolName: string;
  total: number;
  success: number;
  error: number;
  started: number;
  errorRate: number; // 0..1
  avgDurationMs: number | null;
};

export async function getToolStats(range: RangeKey) {
  const since = rangeToDate(range);
  const toolCalls = await prisma.toolCall.findMany({
    where: since ? { startedAt: { gte: since } } : undefined,
    select: { toolName: true, status: true, durationMs: true },
  });

  const map = new Map<
    string,
    { toolName: string; total: number; success: number; error: number; started: number; durationSum: number; durationCount: number }
  >();

  let total = 0;
  let errorTotal = 0;
  let durationSum = 0;
  let durationCount = 0;

  for (const tc of toolCalls) {
    total += 1;
    const b =
      map.get(tc.toolName) ??
      { toolName: tc.toolName, total: 0, success: 0, error: 0, started: 0, durationSum: 0, durationCount: 0 };
    b.total += 1;
    if (tc.status === "SUCCESS") b.success += 1;
    else if (tc.status === "ERROR") {
      b.error += 1;
      errorTotal += 1;
    } else b.started += 1;
    if (tc.durationMs != null) {
      b.durationSum += tc.durationMs;
      b.durationCount += 1;
      durationSum += tc.durationMs;
      durationCount += 1;
    }
    map.set(tc.toolName, b);
  }

  const tools: ToolStatRow[] = Array.from(map.values())
    .map((b) => ({
      toolName: b.toolName,
      total: b.total,
      success: b.success,
      error: b.error,
      started: b.started,
      errorRate: b.total > 0 ? b.error / b.total : 0,
      avgDurationMs: b.durationCount > 0 ? b.durationSum / b.durationCount : null,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    totals: {
      total,
      errorTotal,
      errorRate: total > 0 ? errorTotal / total : 0,
      avgDurationMs: durationCount > 0 ? durationSum / durationCount : null,
      uniqueTools: map.size,
    },
    tools,
  };
}

// 7 x 24 grid of turn counts, bucketed by weekday (Mon..Sun) and hour of day.
// Uses the server runtime's local time -- fine for a single-region company.
export async function getActivityHeatmap(range: RangeKey) {
  const since = rangeToDate(range);
  const turns = await prisma.turn.findMany({
    where: since ? { createdAt: { gte: since } } : undefined,
    select: { createdAt: true },
  });

  const grid: number[][] = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  let max = 0;
  for (const t of turns) {
    const d = t.createdAt;
    const weekdayMon0 = (d.getDay() + 6) % 7; // JS 0=Sun -> our 0=Mon
    const hour = d.getHours();
    const v = ++grid[weekdayMon0][hour];
    if (v > max) max = v;
  }
  return { grid, max };
}

export async function getIngestionHealth() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      sessions: { select: { lastEventAt: true }, orderBy: { lastEventAt: "desc" }, take: 1 },
      _count: { select: { sessions: true, turns: true } },
    },
  });

  const now = Date.now();
  const SILENT_MS = 7 * 24 * 60 * 60 * 1000;

  const rows = users
    .map((u) => {
      const last = u.sessions[0]?.lastEventAt ?? null;
      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        lastEventAt: last ? last.toISOString() : null,
        sessionCount: u._count.sessions,
        turnCount: u._count.turns,
        noData: u._count.turns === 0,
        silent: !last || now - last.getTime() > SILENT_MS,
      };
    })
    .sort((a, b) => (b.lastEventAt ? Date.parse(b.lastEventAt) : 0) - (a.lastEventAt ? Date.parse(a.lastEventAt) : 0));

  const [activeSessions, lastOverall, errorCount] = await Promise.all([
    prisma.claudeSession.count({ where: { status: { in: ["ACTIVE", "IDLE"] } } }),
    prisma.claudeSession.findFirst({ orderBy: { lastEventAt: "desc" }, select: { lastEventAt: true } }),
    prisma.toolCall.count({ where: { status: "ERROR" } }),
  ]);

  return {
    rows,
    summary: {
      totalUsers: rows.length,
      reporting: rows.filter((r) => !r.noData).length,
      silent: rows.filter((r) => r.silent).length,
      activeSessions,
      lastEventAt: lastOverall?.lastEventAt ? lastOverall.lastEventAt.toISOString() : null,
      errorCount,
    },
  };
}
