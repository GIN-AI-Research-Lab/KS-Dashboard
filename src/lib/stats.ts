import { prisma } from "@/lib/db";
import { cached } from "@/lib/cache";
import { cacheReadSavingsUsd, modelTier } from "@/lib/pricing";
import { MINUTES_SAVED_PER_TURN, DEV_HOURLY_USD } from "@/lib/roi-config";
import type { Prisma, SessionOutcome, SessionStatus, LibraryItemKind } from "@prisma/client";

// Company-wide aggregates are identical for every viewer and only need to be a
// few seconds fresh, so cache them briefly to absorb the dashboard's 5s
// auto-refresh across many concurrent viewers.
const DASH_TTL = 15_000;

export type RangeKey = "24h" | "7d" | "30d" | "90d" | "all";

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

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

// Calendar-day key in the server's local time. Used for the activity streak so
// "today" lines up with the user's local calendar rather than UTC.
function dayKeyLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// p-th percentile of an ascending-sorted array (nearest-rank).
function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.floor((p / 100) * sortedAsc.length));
  return sortedAsc[idx];
}

// Percentage change of `current` vs `previous`. Returns null when there is no
// usable baseline (previous period had zero) so callers can hide the delta
// rather than show a meaningless "+∞%".
function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

// Timestamp of the most recent activity ingested — used as a "data freshness"
// indicator in the topbar. Cached briefly like the other dashboard reads.
export async function getLastActivity(): Promise<Date | null> {
  return cached("last-activity", DASH_TTL, async () => {
    const row = await prisma.turn.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    return row?.createdAt ?? null;
  });
}

// Top-N rankings for the current window, enriched with each user's rank change
// vs the previous equal-length window (rankDelta > 0 = moved up; null = new /
// not ranked last period). Separate from getRankings so other callers don't pay
// for the extra previous-window query. Movement isn't computed for
// sessionDuration or the "all" range.
export async function getRankingMovement(metric: RankingMetric, range: RangeKey, limit = 25) {
  const current = await getRankings(metric, range, limit);
  const since = rangeToDate(range);
  if (!since || metric === "sessionDuration") {
    return current.map((r) => ({ ...r, rankDelta: null as number | null }));
  }

  const prevSince = new Date(since.getTime() - (Date.now() - since.getTime()));
  const prevRank = await cached(`prevrank:${metric}:${range}`, DASH_TTL, async () => {
    const grouped = await prisma.turn.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: prevSince, lt: since } },
      _sum: { inputTokens: true, outputTokens: true, costUsd: true },
      _count: true,
    });
    const ranked = grouped
      .map((g) => {
        let value = 0;
        switch (metric) {
          case "totalTokens":
            value = (g._sum.inputTokens ?? 0) + (g._sum.outputTokens ?? 0);
            break;
          case "inputTokens":
            value = g._sum.inputTokens ?? 0;
            break;
          case "outputTokens":
            value = g._sum.outputTokens ?? 0;
            break;
          case "costUsd":
            value = g._sum.costUsd ?? 0;
            break;
          case "turnCount":
            value = g._count;
            break;
        }
        return { userId: g.userId, value };
      })
      .sort((a, b) => b.value - a.value);
    const map = new Map<string, number>();
    ranked.forEach((r, i) => map.set(r.userId, i + 1));
    return map;
  });

  return current.map((r, i) => {
    const pr = prevRank.get(r.userId);
    return { ...r, rankDelta: pr ? pr - (i + 1) : null };
  });
}

export async function getOverviewStats(range: RangeKey) {
  return cached(`overview:${range}`, DASH_TTL, async () => {
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
  });
}

export type RankingMetric = "totalTokens" | "inputTokens" | "outputTokens" | "costUsd" | "sessionDuration" | "turnCount";

export async function getRankings(metric: RankingMetric, range: RangeKey, limit = 10) {
  return cached(`rankings:${metric}:${range}:${limit}`, DASH_TTL, async () => {
    const since = rangeToDate(range);

    if (metric === "sessionDuration") {
      const sessions = await prisma.claudeSession.findMany({
        where: since ? { startedAt: { gte: since } } : undefined,
        select: {
          userId: true,
          startedAt: true,
          endedAt: true,
          lastEventAt: true,
          externalId: true,
          projectLabel: true,
          user: { select: { name: true, image: true, department: { select: { name: true } } } },
        },
      });
      return sessions
        .map((s) => ({
          userId: s.userId,
          userName: s.user.name,
          image: s.user.image ?? null,
          department: s.user.department?.name ?? null,
          value: (s.endedAt ?? s.lastEventAt).getTime() - s.startedAt.getTime(),
          sessionId: s.externalId,
          projectLabel: s.projectLabel,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);
    }

    // Aggregate per user in SQL instead of loading every turn into memory.
    const grouped = await prisma.turn.groupBy({
      by: ["userId"],
      where: since ? { createdAt: { gte: since } } : undefined,
      _sum: { inputTokens: true, outputTokens: true, costUsd: true },
      _count: true,
    });

    const ranked = grouped
      .map((g) => {
        let value = 0;
        switch (metric) {
          case "totalTokens":
            value = (g._sum.inputTokens ?? 0) + (g._sum.outputTokens ?? 0);
            break;
          case "inputTokens":
            value = g._sum.inputTokens ?? 0;
            break;
          case "outputTokens":
            value = g._sum.outputTokens ?? 0;
            break;
          case "costUsd":
            value = g._sum.costUsd ?? 0;
            break;
          case "turnCount":
            value = g._count;
            break;
        }
        return { userId: g.userId, value };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);

    // Fetch names/departments only for the top N.
    const users = await prisma.user.findMany({
      where: { id: { in: ranked.map((r) => r.userId) } },
      select: { id: true, name: true, image: true, department: { select: { name: true } } },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    return ranked.map((r) => {
      const u = byId.get(r.userId);
      return {
        userId: r.userId,
        userName: u?.name ?? "?",
        image: u?.image ?? null,
        department: u?.department?.name ?? null,
        value: r.value,
      };
    });
  });
}

// Reads the mv_daily_usage materialized view (Giai đoạn 2) -- toàn bộ lịch sử
// theo ngày, cực nhanh nhờ đọc bảng rollup thay vì quét Turn. Dữ liệu cập nhật
// khi chạy `npm run db:refresh-views`. Chỉ dùng khi đã bật Postgres + Phase 2.
export async function getDailyUsageRollup() {
  const rows = await prisma.$queryRawUnsafe<
    Array<{ day: string; input_tokens: bigint; output_tokens: bigint; cost_usd: number; turns: bigint }>
  >(`SELECT day, input_tokens, output_tokens, cost_usd, turns FROM mv_daily_usage ORDER BY day`);
  return rows.map((r) => ({
    date: r.day,
    inputTokens: Number(r.input_tokens),
    outputTokens: Number(r.output_tokens),
    costUsd: Number(r.cost_usd),
    turns: Number(r.turns),
  }));
}

export async function getModelLeaderboard(range: RangeKey) {
  return cached(`models:${range}`, DASH_TTL, async () => {
    const since = rangeToDate(range);
    const where = since ? { createdAt: { gte: since } } : undefined;

    // Aggregate in SQL; a second grouping gives distinct users per model.
    const [agg, userAgg] = await Promise.all([
      prisma.turn.groupBy({ by: ["model"], where, _sum: { inputTokens: true, outputTokens: true, costUsd: true }, _count: true }),
      prisma.turn.groupBy({ by: ["model", "userId"], where }),
    ]);

    const usersByModel = new Map<string, Set<string>>();
    for (const r of userAgg) {
      const set = usersByModel.get(r.model) ?? usersByModel.set(r.model, new Set()).get(r.model)!;
      set.add(r.userId);
    }

    return agg
      .map((m) => ({
        model: m.model,
        turns: m._count,
        inputTokens: m._sum.inputTokens ?? 0,
        outputTokens: m._sum.outputTokens ?? 0,
        costUsd: m._sum.costUsd ?? 0,
        users: usersByModel.get(m.model)?.size ?? 0,
        totalTokens: (m._sum.inputTokens ?? 0) + (m._sum.outputTokens ?? 0),
      }))
      .sort((a, b) => b.totalTokens - a.totalTokens);
  });
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

// Number of consecutive calendar days (ending today, or yesterday if today has
// no activity yet) on which the user had at least one turn.
export async function getActiveDayStreak(userId: string): Promise<number> {
  const turns = await prisma.turn.findMany({
    where: { userId },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 3000,
  });
  if (turns.length === 0) return 0;

  const days = new Set(turns.map((t) => dayKeyLocal(t.createdAt)));
  const DAY_MS = 24 * 60 * 60 * 1000;

  let cursor = new Date();
  if (!days.has(dayKeyLocal(cursor))) {
    // No activity today -- don't count today's absence as a broken streak.
    cursor = new Date(cursor.getTime() - DAY_MS);
    if (!days.has(dayKeyLocal(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(dayKeyLocal(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}

export type BadgeCategory = "volume" | "money" | "efficiency" | "time" | "tools" | "streak" | "community" | "fun";
export type Badge = { key: string; label: string; icon: string; earned: boolean; desc: string; category: BadgeCategory };

export const BADGE_CATEGORY_LABEL: Record<BadgeCategory, string> = {
  volume: "Khối lượng",
  money: "Chi tiêu",
  efficiency: "Hiệu quả",
  time: "Thời gian",
  tools: "Công cụ",
  streak: "Chuyên cần",
  community: "Cộng đồng",
  fun: "Vui nhộn",
};

// Personal gamification: a rich badge set (a user can earn many) + a
// "this week vs last week" recap. Tất cả tính từ dữ liệu đã có sẵn.
export async function getUserGamification(userId: string) {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const d7 = new Date(now - 7 * DAY);
  const d14 = new Date(now - 14 * DAY);

  const [turnAgg, toolGroups, toolTotal, toolErrors, turnTimes, streak, sessions, libItems, libComments, libReactions, libBookmarks] =
    await Promise.all([
      prisma.turn.aggregate({
        where: { userId },
        _sum: { inputTokens: true, outputTokens: true, costUsd: true, cacheReadTokens: true },
        _count: true,
      }),
      prisma.toolCall.groupBy({ by: ["toolName"], where: { userId }, _count: { toolName: true } }),
      prisma.toolCall.count({ where: { userId } }),
      prisma.toolCall.count({ where: { userId, status: "ERROR" } }),
      prisma.turn.findMany({ where: { userId }, select: { createdAt: true, inputTokens: true, outputTokens: true }, orderBy: { createdAt: "desc" }, take: 5000 }),
      getActiveDayStreak(userId),
      prisma.claudeSession.findMany({ where: { userId }, select: { startedAt: true, endedAt: true, lastEventAt: true } }),
      prisma.libraryItem.count({ where: { authorId: userId } }),
      prisma.libraryComment.count({ where: { authorId: userId } }),
      prisma.libraryReaction.count({ where: { userId } }),
      prisma.libraryBookmark.count({ where: { userId } }),
    ]);

  const inputTok = turnAgg._sum.inputTokens ?? 0;
  const lifetimeTokens = inputTok + (turnAgg._sum.outputTokens ?? 0);
  const lifetimeCost = turnAgg._sum.costUsd ?? 0;
  const cacheRead = turnAgg._sum.cacheReadTokens ?? 0;
  const turnCount = turnAgg._count;
  const cacheHitRatio = cacheRead + inputTok > 0 ? cacheRead / (cacheRead + inputTok) : 0;
  const costPerTurn = turnCount > 0 ? lifetimeCost / turnCount : 0;
  const tokensPerTurn = turnCount > 0 ? lifetimeTokens / turnCount : 0;

  const toolByName = new Map(toolGroups.map((g) => [g.toolName, g._count.toolName]));
  const distinctTools = toolGroups.length;
  const bashCount = toolByName.get("Bash") ?? 0;
  const editWrites = (toolByName.get("Edit") ?? 0) + (toolByName.get("Write") ?? 0);
  const errorRate = toolTotal > 0 ? toolErrors / toolTotal : 0;

  const sessionCount = sessions.length;
  const longestSessionMs = sessions.reduce((m, s) => Math.max(m, (s.endedAt ?? s.lastEventAt).getTime() - s.startedAt.getTime()), 0);

  let nightOwl = false;
  let earlyBird = false;
  let weekend = false;
  const activeDaySet = new Set<string>();
  const week = { tokens: 0, turns: 0, days: new Set<string>() };
  const prev = { tokens: 0, turns: 0, days: new Set<string>() };
  for (const t of turnTimes) {
    const h = t.createdAt.getHours();
    if (h >= 0 && h < 5) nightOwl = true;
    if (h >= 5 && h < 8) earlyBird = true;
    const wd = t.createdAt.getDay();
    if (wd === 0 || wd === 6) weekend = true;
    activeDaySet.add(dayKeyLocal(t.createdAt));
    if (t.createdAt >= d7) {
      week.tokens += t.inputTokens + t.outputTokens;
      week.turns += 1;
      week.days.add(dayKeyLocal(t.createdAt));
    } else if (t.createdAt >= d14) {
      prev.tokens += t.inputTokens + t.outputTokens;
      prev.turns += 1;
      prev.days.add(dayKeyLocal(t.createdAt));
    }
  }
  const activeDays = activeDaySet.size;

  const recap = {
    thisWeek: { tokens: week.tokens, turns: week.turns, days: week.days.size },
    lastWeek: { tokens: prev.tokens, turns: prev.turns, days: prev.days.size },
  };

  const catalog: Badge[] = [
    // Khối lượng
    { key: "tokens1m", label: "Triệu token", icon: "💎", category: "volume", earned: lifetimeTokens >= 1_000_000, desc: "Đạt 1M token tích luỹ" },
    { key: "tokens10m", label: "Đại gia token", icon: "🚀", category: "volume", earned: lifetimeTokens >= 10_000_000, desc: "Đạt 10M token tích luỹ" },
    { key: "tokens100m", label: "Cá voi token", icon: "🐳", category: "volume", earned: lifetimeTokens >= 100_000_000, desc: "Đạt 100M token tích luỹ" },
    { key: "turns1000", label: "Máy hỏi đáp", icon: "⌨️", category: "volume", earned: turnCount >= 1000, desc: "≥1000 lượt hỏi (turns)" },
    { key: "sessions100", label: "Con thoi", icon: "🛰️", category: "volume", earned: sessionCount >= 100, desc: "≥100 phiên làm việc" },
    // Chi tiêu
    { key: "spender", label: "Đốt tiền", icon: "💸", category: "money", earned: lifetimeCost >= 20, desc: "Tiêu ≥ $20 chi phí Claude" },
    { key: "bigSpender", label: "Ông trùm chi tiêu", icon: "🤑", category: "money", earned: lifetimeCost >= 100, desc: "Tiêu ≥ $100" },
    { key: "whale", label: "Cá mập chi tiêu", icon: "🦈", category: "money", earned: lifetimeCost >= 500, desc: "Tiêu ≥ $500" },
    { key: "thrifty", label: "Tiết kiệm", icon: "🪙", category: "money", earned: turnCount >= 50 && costPerTurn < 0.05, desc: "≥50 turns mà chi phí/turn < $0.05" },
    // Hiệu quả
    { key: "cacheKing", label: "Vua cache", icon: "⚡", category: "efficiency", earned: turnCount >= 20 && cacheHitRatio >= 0.9, desc: "Cache hit ≥ 90% (rất hiệu quả)" },
    { key: "flawless", label: "Không tì vết", icon: "✨", category: "efficiency", earned: toolTotal >= 50 && errorRate === 0, desc: "≥50 lượt tool, 0 lỗi" },
    // Công cụ
    { key: "toolsmith", label: "Thợ công cụ", icon: "🛠️", category: "tools", earned: distinctTools >= 8, desc: "Dùng ≥8 loại công cụ" },
    { key: "bashLord", label: "Cuồng Bash", icon: "🐚", category: "tools", earned: bashCount >= 100, desc: "≥100 lệnh Bash" },
    { key: "codeSurgeon", label: "Bác sĩ code", icon: "🩺", category: "tools", earned: editWrites >= 100, desc: "≥100 lần sửa file (Edit/Write)" },
    // Thời gian
    { key: "nightowl", label: "Cú đêm", icon: "🦉", category: "time", earned: nightOwl, desc: "Làm việc lúc 0–5h sáng" },
    { key: "earlybird", label: "Chào bình minh", icon: "🌅", category: "time", earned: earlyBird, desc: "Làm việc lúc 5–8h sáng" },
    { key: "weekend", label: "Chiến binh cuối tuần", icon: "🏖️", category: "time", earned: weekend, desc: "Làm việc vào T7/CN" },
    { key: "marathon", label: "Marathon", icon: "🏃", category: "time", earned: longestSessionMs >= 2 * 60 * 60 * 1000, desc: "Một phiên kéo dài ≥ 2 giờ" },
    // Chuyên cần
    { key: "streak7", label: "Chuỗi 7 ngày", icon: "🔥", category: "streak", earned: streak >= 7, desc: "Hoạt động 7 ngày liên tục" },
    { key: "streak30", label: "Chuỗi 30 ngày", icon: "🏆", category: "streak", earned: streak >= 30, desc: "Hoạt động 30 ngày liên tục" },
    { key: "streak100", label: "Huyền thoại", icon: "👑", category: "streak", earned: streak >= 100, desc: "Hoạt động 100 ngày liên tục" },
    { key: "regular", label: "Chăm chỉ", icon: "📅", category: "streak", earned: activeDays >= 30, desc: "≥30 ngày có hoạt động" },
    // Cộng đồng (Thư viện)
    { key: "sharer", label: "Người chia sẻ", icon: "📤", category: "community", earned: libItems >= 1, desc: "Đăng ≥1 bài lên Thư viện" },
    { key: "prolificSharer", label: "Kho tàng tri thức", icon: "📚", category: "community", earned: libItems >= 10, desc: "Đăng ≥10 bài" },
    { key: "commenter", label: "Cây bình luận", icon: "💬", category: "community", earned: libComments >= 10, desc: "Viết ≥10 bình luận" },
    { key: "reactor", label: "Vua thả tim", icon: "❤️", category: "community", earned: libReactions >= 20, desc: "Thả ≥20 react" },
    { key: "collector", label: "Nhà sưu tầm", icon: "⭐", category: "community", earned: libBookmarks >= 10, desc: "Lưu ≥10 bài" },
    // Vui nhộn / hài hước
    { key: "newbie", label: "Lính mới", icon: "🐣", category: "fun", earned: turnCount >= 1 && turnCount < 20, desc: "Mới dùng (<20 turns)" },
    { key: "verbose", label: "Nói nhiều", icon: "🗣️", category: "fun", earned: turnCount >= 20 && tokensPerTurn >= 30_000, desc: "Trung bình ≥30K token/turn (dài dòng)" },
    { key: "errorProne", label: "Vua lỗi", icon: "💥", category: "fun", earned: toolTotal >= 20 && errorRate >= 0.2, desc: "≥20% lượt tool bị lỗi" },
    { key: "burner", label: "Đốt token", icon: "🪫", category: "fun", earned: lifetimeTokens >= 5_000_000 && cacheHitRatio < 0.5, desc: "Xài nhiều token mà ít tận dụng cache" },
    { key: "ghost", label: "Bóng ma", icon: "👻", category: "fun", earned: turnCount > 0 && (now - (turnTimes[0]?.createdAt.getTime() ?? now)) > 14 * DAY, desc: "Không hoạt động >14 ngày" },
  ];

  const earned = catalog.filter((b) => b.earned);
  return {
    badges: catalog,
    earnedCount: earned.length,
    totalCount: catalog.length,
    recap,
    streak,
    lifetimeTokens,
    distinctTools,
  };
}

// Per-member averages for a department, used to compare an individual against
// their department on the personal page.
export async function getDepartmentAverages(departmentId: string, range: RangeKey) {
  const members = await prisma.user.findMany({ where: { departmentId }, select: { id: true } });
  const memberCount = members.length;
  const stats = await scopedStats({ userId: { in: members.map((m) => m.id) } }, rangeToDate(range));
  const div = memberCount > 0 ? memberCount : 1;
  return {
    memberCount,
    avg: {
      totalTokens: stats.totals.totalTokens / div,
      costUsd: stats.totals.costUsd / div,
      turnCount: stats.totals.turnCount / div,
    },
  };
}

export async function getDepartmentStats(departmentId: string, range: RangeKey) {
  const users = await prisma.user.findMany({ where: { departmentId }, select: { id: true } });
  return scopedStats({ userId: { in: users.map((u) => u.id) } }, rangeToDate(range));
}

export async function getMemberBreakdown(userIds: string[], range: RangeKey) {
  const since = rangeToDate(range);
  const turns = await prisma.turn.findMany({
    where: { userId: { in: userIds }, ...(since ? { createdAt: { gte: since } } : {}) },
    include: { user: { select: { id: true, name: true } } },
  });

  const byUser = new Map<
    string,
    { userId: string; userName: string; image: string | null; inputTokens: number; outputTokens: number; costUsd: number; turnCount: number }
  >();

  for (const id of userIds) {
    byUser.set(id, { userId: id, userName: "", image: null, inputTokens: 0, outputTokens: 0, costUsd: 0, turnCount: 0 });
  }

  for (const t of turns) {
    const bucket = byUser.get(t.userId)!;
    bucket.userName = t.user.name;
    bucket.inputTokens += t.inputTokens;
    bucket.outputTokens += t.outputTokens;
    bucket.costUsd += t.costUsd;
    bucket.turnCount += 1;
  }

  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, image: true } });
  const userMap = new Map(users.map((u) => [u.id, u]));
  for (const [id, bucket] of byUser) {
    const u = userMap.get(id);
    if (!bucket.userName) bucket.userName = u?.name ?? "?";
    bucket.image = u?.image ?? null;
  }

  return Array.from(byUser.values()).sort((a, b) => b.inputTokens + b.outputTokens - (a.inputTokens + a.outputTokens));
}

export async function getSessionDetail(id: string) {
  return prisma.claudeSession.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, name: true, department: { select: { name: true } } },
      },
      turns: { orderBy: { createdAt: "asc" } },
      toolCalls: { orderBy: { startedAt: "asc" } },
      comments: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
      feedback: { select: { userId: true, value: true } },
    },
  });
}

export async function getSessionLibrary(opts: {
  outcome?: SessionOutcome;
  featured?: boolean;
  q?: string;
  limit?: number;
}) {
  const { outcome, featured, q, limit = 100 } = opts;
  const where: Prisma.ClaudeSessionWhereInput = {};
  if (outcome) where.outcome = outcome;
  if (featured) where.featured = true;
  if (q) {
    where.OR = [
      { note: { contains: q, mode: "insensitive" } },
      { tags: { contains: q, mode: "insensitive" } },
      { projectLabel: { contains: q, mode: "insensitive" } },
      { user: { is: { name: { contains: q, mode: "insensitive" } } } },
    ];
  }
  return prisma.claudeSession.findMany({
    where,
    orderBy: [{ featured: "desc" }, { lastEventAt: "desc" }],
    take: limit,
    include: { user: { select: { id: true, name: true } } },
  });
}

function librarySortOrder(sort: string): Prisma.LibraryItemOrderByWithRelationInput {
  switch (sort) {
    case "comments":
      return { comments: { _count: "desc" } };
    case "reactions":
      return { reactions: { _count: "desc" } };
    case "stars":
      return { bookmarks: { _count: "desc" } };
    default:
      return { createdAt: "desc" };
  }
}

export async function getLibraryFeed(opts: { kind?: LibraryItemKind; sort?: string; q?: string; viewerId: string; limit?: number }) {
  const { kind, sort = "new", q, viewerId, limit = 100 } = opts;
  const where: Prisma.LibraryItemWhereInput = { visibility: "PUBLIC" };
  if (kind) where.kind = kind;
  if (q)
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { body: { contains: q, mode: "insensitive" } },
      { tags: { contains: q, mode: "insensitive" } },
    ];

  const items = await prisma.libraryItem.findMany({
    where,
    orderBy: librarySortOrder(sort),
    take: limit,
    include: {
      author: { select: { id: true, name: true } },
      _count: { select: { comments: true, reactions: true, bookmarks: true } },
      bookmarks: { where: { userId: viewerId }, select: { id: true } },
    },
  });

  return items.map((it) => ({
    id: it.id,
    kind: it.kind,
    title: it.title,
    body: it.body,
    tags: it.tags,
    skillName: it.skillName,
    author: it.author,
    createdAt: it.createdAt,
    counts: { comments: it._count.comments, reactions: it._count.reactions, bookmarks: it._count.bookmarks },
    bookmarked: it.bookmarks.length > 0,
  }));
}

export async function getLibraryItem(id: string, viewerId: string) {
  const item = await prisma.libraryItem.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true } },
      comments: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
      reactions: { select: { userId: true, emoji: true } },
      bookmarks: { select: { userId: true } },
    },
  });
  if (!item) return null;

  const reactionCounts = new Map<string, number>();
  const myReactions = new Set<string>();
  for (const rx of item.reactions) {
    reactionCounts.set(rx.emoji, (reactionCounts.get(rx.emoji) ?? 0) + 1);
    if (rx.userId === viewerId) myReactions.add(rx.emoji);
  }

  return {
    item,
    reactionCounts: Array.from(reactionCounts.entries()).map(([emoji, count]) => ({ emoji, count })),
    myReactions: Array.from(myReactions),
    bookmarked: item.bookmarks.some((b) => b.userId === viewerId),
    bookmarkCount: item.bookmarks.length,
  };
}

export async function getMyLibrary(userId: string) {
  const countSelect = { _count: { select: { comments: true, reactions: true, bookmarks: true } } };
  const [mine, saved] = await Promise.all([
    prisma.libraryItem.findMany({ where: { authorId: userId }, orderBy: { createdAt: "desc" }, include: countSelect }),
    prisma.libraryItem.findMany({
      where: { bookmarks: { some: { userId } }, OR: [{ visibility: "PUBLIC" }, { authorId: userId }] },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { id: true, name: true } }, ...countSelect },
    }),
  ]);
  return { mine, saved };
}

export async function getRecentSessions(limit = 50) {
  return prisma.claudeSession.findMany({
    orderBy: { lastEventAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, name: true, department: { select: { name: true } } } },
      toolCalls: { orderBy: { startedAt: "desc" }, take: 8 },
    },
  });
}

export type LiveSessionStatusFilter = "online" | "ended";

export type LiveSessionRow = {
  id: string;
  userId: string;
  userName: string;
  image: string | null;
  department: string | null;
  projectLabel: string | null;
  model: string | null;
  status: SessionStatus;
  startedAt: Date;
  lastEventAt: Date;
  endedAt: Date | null;
  costUsd: number;
  turnCount: number;
  toolCallCount: number;
  inputTokens: number;
  outputTokens: number;
};

// Powers the /live browser: sessions with optional search (user/project/model),
// department scope, start-date window, and online/ended status. Sorting is done
// client-side on the returned rows. Not cached -- filters are per-viewer.
export async function getLiveSessions(opts: {
  q?: string;
  departmentId?: string;
  from?: Date;
  to?: Date;
  status?: LiveSessionStatusFilter;
  limit?: number;
}): Promise<LiveSessionRow[]> {
  const { q, departmentId, from, to, status, limit = 200 } = opts;
  const where: Prisma.ClaudeSessionWhereInput = {};

  if (status === "online") where.status = { in: ["ACTIVE", "IDLE"] };
  else if (status === "ended") where.status = "ENDED";

  if (from || to) {
    where.startedAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  }

  if (departmentId) {
    where.user = { is: { departmentId } };
  }

  if (q) {
    where.OR = [
      { projectLabel: { contains: q, mode: "insensitive" } },
      { model: { contains: q, mode: "insensitive" } },
      { user: { is: { name: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const rows = await prisma.claudeSession.findMany({
    where,
    orderBy: { lastEventAt: "desc" },
    take: limit,
    include: {
      user: {
        select: { id: true, name: true, image: true, department: { select: { name: true } } },
      },
    },
  });

  return rows.map((s) => ({
    id: s.id,
    userId: s.userId,
    userName: s.user.name,
    image: s.user.image ?? null,
    department: s.user.department?.name ?? null,
    projectLabel: s.projectLabel,
    model: s.model,
    status: s.status,
    startedAt: s.startedAt,
    lastEventAt: s.lastEventAt,
    endedAt: s.endedAt,
    costUsd: s.costUsd,
    turnCount: s.turnCount,
    toolCallCount: s.toolCallCount,
    inputTokens: s.inputTokens,
    outputTokens: s.outputTokens,
  }));
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
  return cached(`tools:${range}`, DASH_TTL, async () => {
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
  });
}

// 7 x 24 grid of turn counts, bucketed by weekday (Mon..Sun) and hour of day.
// Uses the server runtime's local time -- fine for a single-region company.
export async function getActivityHeatmap(range: RangeKey) {
  return cached(`heatmap:${range}`, DASH_TTL, async () => {
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
  });
}

// Bipartite Sankey of tool transitions: "<tool> →" (source column) to
// "→ <tool>" (target column). Bipartite avoids the cycles that break a normal
// Sankey (tool sequences loop, e.g. Read→Edit→Read).
export async function getToolSankey(range: RangeKey) {
  return cached(`sankey:${range}`, DASH_TTL, async () => {
  const since = rangeToDate(range);
  const toolCalls = await prisma.toolCall.findMany({
    where: since ? { startedAt: { gte: since } } : undefined,
    select: { sessionId: true, toolName: true, startedAt: true },
    orderBy: [{ sessionId: "asc" }, { startedAt: "asc" }],
  });

  const counts = new Map<string, number>();
  for (const t of toolCalls) counts.set(t.toolName, (counts.get(t.toolName) ?? 0) + 1);
  const topTools = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([n]) => n);
  const topSet = new Set(topTools);
  const names = [...topTools, "Khác"];
  const label = (n: string) => (topSet.has(n) ? n : "Khác");

  const transitions = new Map<string, number>();
  let prevSession: string | null = null;
  let prevTool: string | null = null;
  for (const t of toolCalls) {
    const name = label(t.toolName);
    if (t.sessionId === prevSession && prevTool) {
      const key = `${prevTool}\t${name}`;
      transitions.set(key, (transitions.get(key) ?? 0) + 1);
    }
    prevSession = t.sessionId;
    prevTool = name;
  }

  const sourceIndex = new Map<string, number>();
  const targetIndex = new Map<string, number>();
  const nodes: { name: string }[] = [];
  names.forEach((n) => {
    sourceIndex.set(n, nodes.length);
    nodes.push({ name: `${n} →` });
  });
  names.forEach((n) => {
    targetIndex.set(n, nodes.length);
    nodes.push({ name: `→ ${n}` });
  });

  const links = Array.from(transitions.entries())
    .map(([k, value]) => {
      const [from, to] = k.split("\t");
      return { source: sourceIndex.get(from)!, target: targetIndex.get(to)!, value };
    })
    .filter((l) => l.value > 0)
    .sort((a, b) => b.value - a.value);

  return { nodes, links };
  });
}

// Heuristic: did this session likely resolve its task? Used as a soft hint
// alongside the manual outcome tag on the session detail page.
export function detectSessionAutoSuccess(
  toolCalls: { toolName: string; status: string; startedAt: Date }[],
): { likely: boolean; reason: string } {
  if (toolCalls.length === 0) return { likely: false, reason: "Không có hoạt động công cụ" };
  const ordered = [...toolCalls].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  const hasEdit = ordered.some((t) => (t.toolName === "Edit" || t.toolName === "Write") && t.status === "SUCCESS");
  const bashOk = ordered.some((t) => t.toolName === "Bash" && t.status === "SUCCESS");
  const noRecentError = !ordered.slice(-3).some((t) => t.status === "ERROR");
  const likely = hasEdit && noRecentError;
  const reason = likely
    ? `Sửa file thành công${bashOk ? " + chạy lệnh OK" : ""}, không có lỗi ở cuối phiên`
    : "Chưa đủ tín hiệu (thiếu sửa file thành công, hoặc có lỗi ở cuối phiên)";
  return { likely, reason };
}

// Group A engineering metrics from the richer OTel capture: lines of code,
// edit acceptance rate, API errors, and API latency / time-to-first-token.
export async function getCodeStats(range: RangeKey) {
  return cached(`code:${range}`, DASH_TTL, async () => {
    const since = rangeToDate(range);
    const [sessAgg, turns] = await Promise.all([
      prisma.claudeSession.aggregate({
        where: since ? { startedAt: { gte: since } } : undefined,
        _sum: { linesAdded: true, linesRemoved: true, editsAccepted: true, editsRejected: true, apiErrorCount: true },
      }),
      prisma.turn.findMany({
        where: {
          ...(since ? { createdAt: { gte: since } } : {}),
          OR: [{ durationMs: { not: null } }, { ttftMs: { not: null } }],
        },
        select: { durationMs: true, ttftMs: true },
      }),
    ]);

    const dur = turns.map((t) => t.durationMs).filter((v): v is number => v != null).sort((a, b) => a - b);
    const ttft = turns.map((t) => t.ttftMs).filter((v): v is number => v != null).sort((a, b) => a - b);
    const accepted = sessAgg._sum.editsAccepted ?? 0;
    const rejected = sessAgg._sum.editsRejected ?? 0;

    return {
      linesAdded: sessAgg._sum.linesAdded ?? 0,
      linesRemoved: sessAgg._sum.linesRemoved ?? 0,
      editsAccepted: accepted,
      editsRejected: rejected,
      acceptanceRate: accepted + rejected > 0 ? accepted / (accepted + rejected) : 0,
      apiErrors: sessAgg._sum.apiErrorCount ?? 0,
      apiLatency: { count: dur.length, p50: percentile(dur, 50), p90: percentile(dur, 90), p99: percentile(dur, 99) },
      ttft: { count: ttft.length, p50: percentile(ttft, 50), p90: percentile(ttft, 90), p99: percentile(ttft, 99) },
    };
  });
}

// Per-user version of the Group A code metrics (lines + edit acceptance).
export async function getUserCodeStats(userId: string, range: RangeKey) {
  return cached(`usercode:${userId}:${range}`, DASH_TTL, async () => {
    const since = rangeToDate(range);
    const agg = await prisma.claudeSession.aggregate({
      where: { userId, ...(since ? { startedAt: { gte: since } } : {}) },
      _sum: { linesAdded: true, linesRemoved: true, editsAccepted: true, editsRejected: true },
    });
    const accepted = agg._sum.editsAccepted ?? 0;
    const rejected = agg._sum.editsRejected ?? 0;
    return {
      linesAdded: agg._sum.linesAdded ?? 0,
      linesRemoved: agg._sum.linesRemoved ?? 0,
      editsAccepted: accepted,
      editsRejected: rejected,
      acceptanceRate: accepted + rejected > 0 ? accepted / (accepted + rejected) : 0,
    };
  });
}

export async function getInsightsStats(range: RangeKey) {
  return cached(`insights:${range}`, DASH_TTL, async () => {
  const since = rangeToDate(range);
  const DAY_MS = 24 * 60 * 60 * 1000;

  const [toolCalls, sessions, turns] = await Promise.all([
    prisma.toolCall.findMany({
      where: { ...(since ? { startedAt: { gte: since } } : {}), durationMs: { not: null } },
      select: { durationMs: true },
    }),
    prisma.claudeSession.findMany({
      where: since ? { startedAt: { gte: since } } : undefined,
      select: { startedAt: true, endedAt: true, lastEventAt: true, source: true },
    }),
    prisma.turn.findMany({
      where: since ? { createdAt: { gte: since } } : undefined,
      select: { createdAt: true, model: true, inputTokens: true, outputTokens: true, stopReason: true },
    }),
  ]);

  // Latency percentiles.
  const durs = toolCalls.map((t) => t.durationMs as number).sort((a, b) => a - b);
  const toolLatency = { count: durs.length, p50: percentile(durs, 50), p90: percentile(durs, 90), p99: percentile(durs, 99) };

  const sessDurs = sessions
    .map((s) => (s.endedAt ?? s.lastEventAt).getTime() - s.startedAt.getTime())
    .filter((d) => d >= 0)
    .sort((a, b) => a - b);
  const sessionDuration = { count: sessDurs.length, p50: percentile(sessDurs, 50), p90: percentile(sessDurs, 90), p99: percentile(sessDurs, 99) };

  // Session-duration histogram.
  const HIST_BUCKETS = [
    { label: "<1m", max: 60_000 },
    { label: "1–5m", max: 300_000 },
    { label: "5–15m", max: 900_000 },
    { label: "15–60m", max: 3_600_000 },
    { label: "1–4h", max: 14_400_000 },
    { label: ">4h", max: Infinity },
  ];
  const durationHistogram = HIST_BUCKETS.map((b) => ({ label: b.label, count: 0 }));
  for (const d of sessDurs) {
    const i = HIST_BUCKETS.findIndex((b) => d < b.max);
    durationHistogram[i >= 0 ? i : HIST_BUCKETS.length - 1].count += 1;
  }

  // Distributions.
  const sourceMap = new Map<string, number>();
  for (const s of sessions) {
    const k = s.source ?? "(không rõ)";
    sourceMap.set(k, (sourceMap.get(k) ?? 0) + 1);
  }
  const bySource = Array.from(sourceMap.entries()).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);

  const stopMap = new Map<string, number>();
  for (const t of turns) {
    const k = t.stopReason ?? "(không rõ)";
    stopMap.set(k, (stopMap.get(k) ?? 0) + 1);
  }
  const byStopReason = Array.from(stopMap.entries()).map(([stopReason, count]) => ({ stopReason, count })).sort((a, b) => b.count - a.count);

  // Model mix over time (weekly, by tokens), 100%-stacked.
  const weekMap = new Map<string, Map<string, number>>();
  const modelTotals = new Map<string, number>();
  for (const t of turns) {
    const d = t.createdAt;
    const monday = new Date(d.getTime() - ((d.getDay() + 6) % 7) * DAY_MS);
    const wk = dayKeyLocal(monday);
    const tokens = t.inputTokens + t.outputTokens;
    const wm = weekMap.get(wk) ?? weekMap.set(wk, new Map()).get(wk)!;
    wm.set(t.model, (wm.get(t.model) ?? 0) + tokens);
    modelTotals.set(t.model, (modelTotals.get(t.model) ?? 0) + tokens);
  }
  const topModels = Array.from(modelTotals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([m]) => m);
  const modelMix = Array.from(weekMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, wm]) => {
      const total = Array.from(wm.values()).reduce((s, v) => s + v, 0);
      const segments = topModels
        .map((m) => ({ model: m, tokens: wm.get(m) ?? 0 }))
        .filter((s) => s.tokens > 0)
        .map((s) => ({ ...s, pct: total > 0 ? s.tokens / total : 0 }));
      return { week, total, segments };
    });

  // Peak concurrency via sweep line (end before start on ties).
  const events: { t: number; delta: number }[] = [];
  for (const s of sessions) {
    events.push({ t: s.startedAt.getTime(), delta: 1 });
    events.push({ t: (s.endedAt ?? s.lastEventAt).getTime(), delta: -1 });
  }
  events.sort((a, b) => a.t - b.t || a.delta - b.delta);
  let cur = 0;
  let peak = 0;
  let peakAt = 0;
  for (const e of events) {
    cur += e.delta;
    if (cur > peak) {
      peak = cur;
      peakAt = e.t;
    }
  }

  return {
    toolLatency,
    sessionDuration,
    durationHistogram,
    bySource,
    byStopReason,
    modelMix,
    topModels,
    peakConcurrency: { peak, peakAt: peakAt ? new Date(peakAt).toISOString() : null },
  };
  });
}

// Ước lượng loại tác vụ của mỗi session (research / code / lập kế hoạch /
// điều tra-debug), ưu tiên tag người dùng tự gắn (ClaudeSession.tags), nếu
// không có tag khớp thì suy ra từ loại tool được gọi nhiều nhất trong phiên.
// Đây chỉ là ước lượng gần đúng (heuristic) -- không đọc nội dung prompt/tool
// (không lưu, xem PRIVACY.md), nên không thể phân loại tuyệt đối.
export type TaskCategory = "research" | "code" | "planning" | "investigation" | "other";

export const TASK_CATEGORY_LABEL: Record<TaskCategory, string> = {
  research: "Research / Tìm hiểu",
  code: "Viết code",
  planning: "Lập kế hoạch",
  investigation: "Điều tra / Debug",
  other: "Khác",
};

const TAG_CATEGORY_KEYWORDS: [TaskCategory, string[]][] = [
  ["research", ["research", "tìm hiểu", "khảo sát", "tài liệu", "doc"]],
  ["planning", ["kế hoạch", "plan", "thiết kế", "design"]],
  ["investigation", ["sửa lỗi", "bug", "fix", "debug", "điều tra"]],
  ["code", ["tính năng", "feature", "refactor", "viết test", "test", "review code", "code"]],
];

function taskCategoryFromTags(tags: string | null): TaskCategory | null {
  if (!tags) return null;
  const parts = tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  for (const part of parts) {
    for (const [category, keywords] of TAG_CATEGORY_KEYWORDS) {
      if (keywords.some((k) => part.includes(k))) return category;
    }
  }
  return null;
}

// Bash nhóm cùng Edit/Write (chạy build/test đi kèm sửa code) -- cùng cách
// tính "hoạt động code trong project" mà getProjectStats từng dùng.
const RESEARCH_TOOLS = new Set(["WebSearch", "WebFetch"]);
const CODE_TOOLS = new Set(["Edit", "Write", "NotebookEdit", "Bash"]);
const INVESTIGATION_TOOLS = new Set(["Read", "Grep", "Glob"]);
const PLANNING_TOOLS = new Set(["TodoWrite", "AskUserQuestion"]);

function taskCategoryFromTools(toolCounts: Record<string, number>): TaskCategory {
  let research = 0, code = 0, investigation = 0, planning = 0;
  for (const [name, count] of Object.entries(toolCounts)) {
    if (RESEARCH_TOOLS.has(name)) research += count;
    else if (CODE_TOOLS.has(name)) code += count;
    else if (INVESTIGATION_TOOLS.has(name)) investigation += count;
    else if (PLANNING_TOOLS.has(name)) planning += count;
  }
  const max = Math.max(research, code, investigation, planning);
  if (max === 0) return "other";
  if (max === code) return "code";
  if (max === investigation) return "investigation";
  if (max === research) return "research";
  return "planning";
}

export type TaskCategoryRow = {
  category: TaskCategory;
  label: string;
  sessions: number;
  totalTokens: number;
  costUsd: number;
  byTagCount: number;
};

export async function getTaskCategoryStats(range: RangeKey, userId?: string) {
  return cached(`taskcat:${range}:${userId ?? "all"}`, DASH_TTL, async () => {
    const since = rangeToDate(range);

    const [sessions, toolGroups] = await Promise.all([
      prisma.claudeSession.findMany({
        where: { ...(since ? { startedAt: { gte: since } } : {}), ...(userId ? { userId } : {}) },
        select: { id: true, tags: true, inputTokens: true, outputTokens: true, costUsd: true },
      }),
      prisma.toolCall.groupBy({
        by: ["sessionId", "toolName"],
        where: { ...(since ? { session: { startedAt: { gte: since } } } : {}), ...(userId ? { userId } : {}) },
        _count: { toolName: true },
      }),
    ]);

    const toolsBySession = new Map<string, Record<string, number>>();
    for (const g of toolGroups) {
      const m = toolsBySession.get(g.sessionId) ?? toolsBySession.set(g.sessionId, {}).get(g.sessionId)!;
      m[g.toolName] = g._count.toolName;
    }

    const buckets = new Map<TaskCategory, TaskCategoryRow>(
      (Object.keys(TASK_CATEGORY_LABEL) as TaskCategory[]).map((category) => [
        category,
        { category, label: TASK_CATEGORY_LABEL[category], sessions: 0, totalTokens: 0, costUsd: 0, byTagCount: 0 },
      ]),
    );

    for (const s of sessions) {
      const fromTag = taskCategoryFromTags(s.tags);
      const category = fromTag ?? taskCategoryFromTools(toolsBySession.get(s.id) ?? {});
      const b = buckets.get(category)!;
      b.sessions += 1;
      b.totalTokens += s.inputTokens + s.outputTokens;
      b.costUsd += s.costUsd;
      if (fromTag) b.byTagCount += 1;
    }

    const rows = Array.from(buckets.values())
      .filter((r) => r.sessions > 0)
      .sort((a, b) => b.sessions - a.sessions);

    return {
      rows,
      totalSessions: sessions.length,
      totalTaggedSessions: rows.reduce((sum, r) => sum + r.byTagCount, 0),
    };
  });
}

// Weekly cohort retention: rows = cohort (week of first activity), columns =
// week offset from that cohort, cell = share of the cohort still active.
export async function getCohortRetention(weeksBack = 8) {
  return cached(`cohort:${weeksBack}`, DASH_TTL, async () => {
  const now = Date.now();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const turns = await prisma.turn.findMany({ select: { userId: true, createdAt: true }, orderBy: { createdAt: "asc" } });

  function mondayTs(d: Date) {
    const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
    return m.getTime();
  }

  const userWeeks = new Map<string, Set<number>>();
  const userFirst = new Map<string, number>();
  for (const t of turns) {
    const wk = mondayTs(t.createdAt);
    const set = userWeeks.get(t.userId) ?? userWeeks.set(t.userId, new Set()).get(t.userId)!;
    set.add(wk);
    if (!userFirst.has(t.userId)) userFirst.set(t.userId, wk); // turns are ascending
  }

  const currentMonday = mondayTs(new Date(now));
  const maxOffset = weeksBack - 1;
  const cohortMondays: number[] = [];
  for (let i = maxOffset; i >= 0; i--) cohortMondays.push(currentMonday - i * WEEK_MS);

  const rows = cohortMondays.map((cohortWk) => {
    const cohortUsers = Array.from(userFirst.entries()).filter(([, f]) => f === cohortWk).map(([u]) => u);
    const size = cohortUsers.length;
    const cells: (number | null)[] = [];
    for (let off = 0; off <= maxOffset; off++) {
      const wk = cohortWk + off * WEEK_MS;
      if (wk > currentMonday || size === 0) {
        cells.push(null);
        continue;
      }
      const active = cohortUsers.filter((u) => userWeeks.get(u)?.has(wk)).length;
      cells.push(active / size);
    }
    return { cohort: dayKeyLocal(new Date(cohortWk)), size, cells };
  });

  return { rows, maxOffset };
  });
}

// Pivot table: total tokens by department (rows) x model (columns).
export async function getDepartmentModelPivot(range: RangeKey) {
  return cached(`pivot:${range}`, DASH_TTL, async () => {
  const since = rangeToDate(range);
  const [users, turns] = await Promise.all([
    prisma.user.findMany({ select: { id: true, department: { select: { name: true } } } }),
    prisma.turn.findMany({
      where: since ? { createdAt: { gte: since } } : undefined,
      select: { userId: true, model: true, inputTokens: true, outputTokens: true },
    }),
  ]);

  const deptByUser = new Map(users.map((u) => [u.id, u.department?.name ?? "(chưa gán bộ phận)"]));
  const modelTotals = new Map<string, number>();
  const grid = new Map<string, Map<string, number>>();
  for (const t of turns) {
    const dept = deptByUser.get(t.userId) ?? "(chưa gán bộ phận)";
    const tokens = t.inputTokens + t.outputTokens;
    modelTotals.set(t.model, (modelTotals.get(t.model) ?? 0) + tokens);
    const row = grid.get(dept) ?? grid.set(dept, new Map()).get(dept)!;
    row.set(t.model, (row.get(t.model) ?? 0) + tokens);
  }

  const models = Array.from(modelTotals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([m]) => m);
  const rows = Array.from(grid.entries())
    .map(([department, row]) => ({
      department,
      cells: models.map((m) => row.get(m) ?? 0),
      total: Array.from(row.values()).reduce((s, v) => s + v, 0),
    }))
    .sort((a, b) => b.total - a.total);

  return { models, rows };
  });
}

export async function getCostInsights(range: RangeKey) {
  return cached(`cost:${range}`, DASH_TTL, async () => {
  const since = rangeToDate(range);
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const [rangeTurns, monthStartTurns, last28] = await Promise.all([
    prisma.turn.findMany({
      where: since ? { createdAt: { gte: since } } : undefined,
      select: { model: true, costUsd: true, cacheReadTokens: true },
    }),
    prisma.turn.findMany({
      where: { createdAt: { gte: startOfMonth() } },
      select: { costUsd: true },
    }),
    prisma.turn.findMany({
      where: { createdAt: { gte: new Date(now - 28 * DAY_MS) } },
      select: { userId: true, costUsd: true, createdAt: true },
    }),
  ]);

  // Spend + cache savings + tier breakdown.
  let spendUsd = 0;
  let cacheSavingsUsd = 0;
  const tierMap = new Map<string, { tier: string; costUsd: number; turns: number }>();
  for (const t of rangeTurns) {
    spendUsd += t.costUsd;
    cacheSavingsUsd += cacheReadSavingsUsd(t.model, t.cacheReadTokens);
    const tier = modelTier(t.model);
    const b = tierMap.get(tier) ?? { tier, costUsd: 0, turns: 0 };
    b.costUsd += t.costUsd;
    b.turns += 1;
    tierMap.set(tier, b);
  }
  const byTier = Array.from(tierMap.values()).sort((a, b) => b.costUsd - a.costUsd);

  // ROI estimate from tunable assumptions (see roi-config.ts).
  const turnCount = rangeTurns.length;
  const timeSavedHours = (turnCount * MINUTES_SAVED_PER_TURN) / 60;
  const productivityValueUsd = timeSavedHours * DEV_HOURLY_USD;
  const roiRatio = spendUsd > 0 ? productivityValueUsd / spendUsd : null;

  // Month-end forecast by simple run-rate.
  const spendThisMonth = monthStartTurns.reduce((s, t) => s + t.costUsd, 0);
  const nowDate = new Date();
  const daysElapsed = nowDate.getDate();
  const daysInMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0).getDate();
  const projectedMonthUsd = daysElapsed > 0 ? (spendThisMonth / daysElapsed) * daysInMonth : 0;

  // Spend spikes: last 7 days vs the prior 21 days (normalised to a 7-day rate).
  const d7 = new Date(now - 7 * DAY_MS);
  const recent = new Map<string, number>();
  const prior = new Map<string, number>();
  for (const t of last28) {
    if (t.createdAt >= d7) recent.set(t.userId, (recent.get(t.userId) ?? 0) + t.costUsd);
    else prior.set(t.userId, (prior.get(t.userId) ?? 0) + t.costUsd);
  }
  const spikeUserIds = new Set([...recent.keys()]);
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(spikeUserIds) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  const spikes = Array.from(spikeUserIds)
    .map((id) => {
      const recent7 = recent.get(id) ?? 0;
      const baseline7 = (prior.get(id) ?? 0) / 3; // 21 days -> 7-day equivalent
      const ratio = baseline7 > 0 ? recent7 / baseline7 : recent7 > 0 ? Infinity : 0;
      return { userId: id, name: nameById.get(id) ?? "?", recent7, baseline7, ratio };
    })
    .filter((s) => s.recent7 >= 0.5 && s.ratio >= 2)
    .sort((a, b) => b.ratio - a.ratio);

  return {
    spendUsd,
    cacheSavingsUsd,
    byTier,
    roi: { turnCount, timeSavedHours, productivityValueUsd, roiRatio },
    forecast: { spendThisMonth, projectedMonthUsd, daysElapsed, daysInMonth },
    spikes,
  };
  });
}

export type AdoptionPhase = "power" | "regular" | "trial" | "inactive";

// Company adoption & engagement metrics, modelled on GitHub Copilot's business
// dashboard: active-user trends (DAU/WAU/MAU), a stickiness ratio, per-user
// adoption phases over a rolling 28-day window, department coverage, and new
// vs churned users.
export async function getAdoptionStats(range: RangeKey) {
  return cached(`adoption:${range}`, DASH_TTL, async () => {
  const since = rangeToDate(range);
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const d7 = new Date(now - 7 * DAY_MS);
  const d14 = new Date(now - 14 * DAY_MS);
  const d28 = new Date(now - 28 * DAY_MS);

  const [rangeTurns, turns28, last14, firstSeen, users] = await Promise.all([
    prisma.turn.findMany({
      where: since ? { createdAt: { gte: since } } : undefined,
      select: { createdAt: true, userId: true },
    }),
    prisma.turn.findMany({ where: { createdAt: { gte: d28 } }, select: { createdAt: true, userId: true } }),
    prisma.turn.findMany({ where: { createdAt: { gte: d14 } }, select: { userId: true }, distinct: ["userId"] }),
    prisma.turn.groupBy({ by: ["userId"], _min: { createdAt: true } }),
    prisma.user.findMany({
      select: { id: true, name: true, department: { select: { id: true, name: true } } },
    }),
  ]);

  // DAU series across the selected range.
  const dauMap = new Map<string, Set<string>>();
  for (const t of rangeTurns) {
    const key = dayKeyLocal(t.createdAt);
    (dauMap.get(key) ?? dauMap.set(key, new Set()).get(key)!).add(t.userId);
  }
  const dauSeries = Array.from(dauMap.entries())
    .map(([date, set]) => ({ date, users: set.size }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Rolling windows over the last 28 days (independent of the selected range).
  const wau = new Set<string>();
  const mau = new Set<string>();
  const activeDaysByUser = new Map<string, Set<string>>();
  for (const t of turns28) {
    mau.add(t.userId);
    if (t.createdAt >= d7) wau.add(t.userId);
    const set = activeDaysByUser.get(t.userId) ?? activeDaysByUser.set(t.userId, new Set()).get(t.userId)!;
    set.add(dayKeyLocal(t.createdAt));
  }
  // Average DAU over the last 28 days = total (user,day) pairs / 28.
  let pairs28 = 0;
  for (const set of activeDaysByUser.values()) pairs28 += set.size;
  const avgDau = pairs28 / 28;
  const stickiness = mau.size > 0 ? avgDau / mau.size : 0;

  // Adoption phase per account, by active days in the last 28 days.
  function phaseFor(activeDays: number): AdoptionPhase {
    if (activeDays >= 12) return "power";
    if (activeDays >= 5) return "regular";
    if (activeDays >= 1) return "trial";
    return "inactive";
  }
  const phaseCounts: Record<AdoptionPhase, number> = { power: 0, regular: 0, trial: 0, inactive: 0 };
  const powerUsers: { userId: string; name: string; activeDays: number }[] = [];
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  for (const u of users) {
    const days = activeDaysByUser.get(u.id)?.size ?? 0;
    const p = phaseFor(days);
    phaseCounts[p] += 1;
    if (p === "power") powerUsers.push({ userId: u.id, name: u.name, activeDays: days });
  }
  powerUsers.sort((a, b) => b.activeDays - a.activeDays);

  // Coverage: who used Claude at all within the selected range, overall + department.
  const activeInRange = new Set(rangeTurns.map((t) => t.userId));
  const deptAgg = new Map<string, { department: string; total: number; active: number }>();
  for (const u of users) {
    const deptName = u.department?.name ?? "(chưa gán bộ phận)";
    const b = deptAgg.get(deptName) ?? { department: deptName, total: 0, active: 0 };
    b.total += 1;
    if (activeInRange.has(u.id)) b.active += 1;
    deptAgg.set(deptName, b);
  }
  const coverageByDepartment = Array.from(deptAgg.values())
    .map((t) => ({ ...t, pct: t.total > 0 ? t.active / t.total : 0 }))
    .sort((a, b) => b.pct - a.pct);

  // New adopters: first-ever turn falls inside the range (fallback: last 30d
  // for the "all" range so the metric stays meaningful).
  const newSince = since ?? new Date(now - 30 * DAY_MS);
  const newAdopters = firstSeen
    .filter((f) => f._min.createdAt && f._min.createdAt >= newSince)
    .map((f) => ({ userId: f.userId, name: nameById.get(f.userId) ?? "?", since: f._min.createdAt!.toISOString() }))
    .sort((a, b) => b.since.localeCompare(a.since));

  // Churned: had activity at some point but none in the last 14 days.
  const last14Set = new Set(last14.map((t) => t.userId));
  const churned = firstSeen
    .filter((f) => !last14Set.has(f.userId))
    .map((f) => ({ userId: f.userId, name: nameById.get(f.userId) ?? "?" }));

  const funnel = [
    { stage: "Tài khoản", count: users.length },
    { stage: "Đã từng dùng", count: firstSeen.length },
    { stage: "Hoạt động trong kỳ", count: activeInRange.size },
    { stage: "Power user (28 ngày)", count: phaseCounts.power },
  ];

  return {
    dauSeries,
    current: { avgDau, wau: wau.size, mau: mau.size, stickiness },
    phases: phaseCounts,
    funnel,
    powerUsers: powerUsers.slice(0, 10),
    coverage: {
      totalUsers: users.length,
      activeInRange: activeInRange.size,
      pct: users.length > 0 ? activeInRange.size / users.length : 0,
      byDepartment: coverageByDepartment,
    },
    newAdopters,
    churned,
  };
  });
}

// Per-department scorecard with per-capita normalisation and a company
// benchmark (median tokens/member), so departments of different sizes
// compare fairly.
export async function getDepartmentScorecards(range: RangeKey) {
  return cached(`deptscore:${range}`, DASH_TTL, async () => {
  const since = rangeToDate(range);
  const [departments, turns] = await Promise.all([
    prisma.department.findMany({ select: { id: true, name: true, users: { select: { id: true } } } }),
    prisma.turn.findMany({
      where: since ? { createdAt: { gte: since } } : undefined,
      select: { userId: true, inputTokens: true, outputTokens: true, costUsd: true },
    }),
  ]);

  const userDept = new Map<string, string>();
  for (const d of departments) for (const u of d.users) userDept.set(u.id, d.id);

  type Agg = { departmentId: string; name: string; members: number; active: Set<string>; tokens: number; cost: number };
  const map = new Map<string, Agg>();
  for (const d of departments) map.set(d.id, { departmentId: d.id, name: d.name, members: d.users.length, active: new Set(), tokens: 0, cost: 0 });
  for (const turn of turns) {
    const departmentId = userDept.get(turn.userId);
    if (!departmentId) continue;
    const a = map.get(departmentId)!;
    a.active.add(turn.userId);
    a.tokens += turn.inputTokens + turn.outputTokens;
    a.cost += turn.costUsd;
  }

  const rows = Array.from(map.values())
    .map((a) => ({
      departmentId: a.departmentId,
      name: a.name,
      members: a.members,
      activeUsers: a.active.size,
      coverage: a.members > 0 ? a.active.size / a.members : 0,
      totalTokens: a.tokens,
      costUsd: a.cost,
      tokensPerMember: a.members > 0 ? a.tokens / a.members : 0,
      costPerActiveUser: a.active.size > 0 ? a.cost / a.active.size : 0,
    }))
    .sort((x, y) => y.totalTokens - x.totalTokens);

  const perMember = rows.map((r) => r.tokensPerMember).filter((v) => v > 0).sort((a, b) => a - b);
  const medianTokensPerMember = perMember.length ? perMember[Math.floor(perMember.length / 2)] : 0;

  return { rows, medianTokensPerMember };
  });
}

export async function getIngestionHealth() {
  return cached(`ingestion`, DASH_TTL, async () => {
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
  });
}
