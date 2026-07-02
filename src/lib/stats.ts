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

  const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  const byModel = Array.from(modelMap.values()).sort((a, b) => b.totalTokens - a.totalTokens);

  return {
    totals: {
      inputTokens: totalInput,
      outputTokens: totalOutput,
      cacheCreationTokens: totalCacheCreate,
      cacheReadTokens: totalCacheRead,
      totalTokens: totalInput + totalOutput,
      costUsd: totalCost,
      turnCount: turns.length,
      sessionCount,
      userCount,
      activeUserCount: activeUserIds.size,
      activeSessionCount,
    },
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
