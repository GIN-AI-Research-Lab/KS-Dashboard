// Sinh dữ liệu MẪU (demo) đa dạng để đối chiếu mọi màn hình của dashboard:
// nhiều phòng ban/nhân viên, session/turn/tool call trải dài ~10 tuần với
// nhiều "hồ sơ mức độ dùng" khác nhau (power/regular/trial/churned/silent), vài
// bài Thư viện (prompt/skill) kèm comment/react/bookmark, vài comment/feedback
// trên session. KHÔNG đụng tới admin thật hay dữ liệu đã có.
//   npm run db:seed:sample
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { computeCostUsd } from "../src/lib/pricing";

const prisma = new PrismaClient();

// ---------- helpers ----------
function id(prefix: string) {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}
function apiKey() {
  return `ksd_${randomBytes(24).toString("hex")}`;
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randFloat(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}
function weightedPick<T>(items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [v, w] of items) {
    if (r < w) return v;
    r -= w;
  }
  return items[items.length - 1][0];
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const NOW = new Date();
function daysAgoAt(daysAgo: number, hour: number, minute = randInt(0, 59)) {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, randInt(0, 59), 0);
  return d;
}

// ---------- vocab ----------
const HO = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Vũ", "Đặng", "Bùi", "Đỗ", "Ngô", "Dương"];
const TEN_NAM = ["Văn An", "Minh Đức", "Quốc Huy", "Thành Long", "Tuấn Anh", "Hữu Phúc", "Nhật Nam", "Chí Cường", "Đình Khoa", "Bảo Long"];
const TEN_NU = ["Thị Hương", "Ngọc Anh", "Thu Trang", "Minh Thư", "Thanh Huyền", "Bích Ngọc", "Phương Linh", "Kim Ngân", "Hồng Nhung", "Mai Anh"];

const MODELS: [string, number][] = [
  ["claude-sonnet-5", 55],
  ["claude-opus-4-8", 12],
  ["claude-haiku-4-5", 25],
  ["claude-sonnet-4-6", 8],
];
const PROJECTS = [
  "ks-dashboard",
  "erp-portal",
  "mobile-app",
  "data-pipeline",
  "internal-tools",
  "website-redesign",
  "api-gateway",
  "chatbot-support",
  "invoice-system",
  "crm-sync",
  "payroll-service",
  "warehouse-tracker",
];
const TOOLS: [string, number][] = [
  ["Read", 26],
  ["Bash", 18],
  ["Edit", 16],
  ["Grep", 12],
  ["Glob", 8],
  ["Write", 7],
  ["TodoWrite", 6],
  ["WebFetch", 3],
  ["WebSearch", 2],
  ["Agent", 1],
  ["NotebookEdit", 1],
];
const SOURCES: [string, number][] = [
  ["startup", 60],
  ["resume", 25],
  ["clear", 10],
  ["compact", 5],
];
const STOP_REASONS: [string, number][] = [
  ["end_turn", 68],
  ["tool_use", 26],
  ["max_tokens", 6],
];
const SESSION_TAGS = ["sửa lỗi", "tính năng mới", "refactor", "research", "viết test", "tối ưu hiệu năng", "review code", "tài liệu"];
const NOTES_SOLVED = [
  "Xong, đã merge.",
  "Fix xong bug báo cáo hôm qua.",
  "Đã deploy lên staging, ok.",
  "Xử lý gọn, không cần sửa gì thêm.",
  "Hoàn thành tính năng theo yêu cầu.",
];
const NOTES_PROGRESS = ["Đang làm tiếp, chưa xong hẳn.", "Còn 1 case edge chưa test.", "Chờ review từ team lead."];
const NOTES_ABANDONED = ["Bỏ giữa đường, đổi hướng khác.", "Không tái hiện được bug, tạm dừng.", "Ưu tiên việc khác trước."];

type Profile = "power" | "regular" | "trial" | "churned" | "silent";

const DEPARTMENTS = ["Kỹ thuật", "Kinh doanh", "Nhân sự", "Marketing", "Vận hành"];

type UserPlan = { departmentSlot: number; profile: Profile; isDeptHead?: boolean };

async function main() {
  const already = await prisma.department.findFirst({ where: { name: "Kỹ thuật" } });
  if (already) {
    console.log("Dữ liệu mẫu có vẻ đã tồn tại (Department 'Kỹ thuật') -- bỏ qua, không seed lại.");
    return;
  }

  console.log("Tạo phòng ban...");
  const deptRows: { id: string; name: string }[] = [];
  for (const name of DEPARTMENTS) {
    const dept = await prisma.department.create({ data: { name } });
    deptRows.push(dept);
  }

  // Kế hoạch user: mỗi phòng ban có 1 trưởng phòng + 4-7 thành viên.
  const plans: UserPlan[] = [];
  deptRows.forEach((_, di) => {
    plans.push({ departmentSlot: di, profile: "regular", isDeptHead: true });
    const memberCount = randInt(4, 7);
    for (let i = 0; i < memberCount; i++) {
      plans.push({ departmentSlot: di, profile: pick<Profile>(["power", "power", "regular", "regular", "regular", "trial", "churned"]) });
    }
  });
  // Thêm 1 user hoàn toàn im lặng (chưa từng dùng) để test "Tình trạng thu thập dữ liệu".
  plans.push({ departmentSlot: 0, profile: "silent" });

  const passwordHash = await bcrypt.hash("demo1234", 10);
  const usedLocalParts = new Set<string>(["admin"]);
  const usedEmojiNames = new Set<string>();

  function makeName(): { name: string; localPart: string } {
    const ho = pick(HO);
    const isFemale = Math.random() < 0.5;
    const ten = pick(isFemale ? TEN_NU : TEN_NAM);
    const name = `${ho} ${ten}`;
    const tenParts = ten.split(" ");
    const initials = tenParts.map((p) => p[0]).join("").toLowerCase();
    const hoInitial = ho
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()[0];
    const base = `${initials}${hoInitial}`;
    let local = base;
    let n = 1;
    while (usedLocalParts.has(local)) {
      local = `${base}${n}`;
      n += 1;
    }
    usedLocalParts.add(local);
    return { name, localPart: local };
  }

  console.log(`Tạo ${plans.length} user mẫu...`);
  type CreatedUser = { id: string; profile: Profile; name: string };
  const users: CreatedUser[] = [];
  for (const p of plans) {
    const { name, localPart } = makeName();
    const role = p.isDeptHead ? "DEPARTMENT_HEAD" : "MEMBER";
    const departmentId = deptRows[p.departmentSlot].id;
    const u = await prisma.user.create({
      data: {
        name,
        email: `${localPart}@kstns.biz`,
        emailLocalPart: localPart,
        passwordHash,
        role,
        apiKey: apiKey(),
        departmentId,
        note: "Dữ liệu mẫu (demo) — tạo để đối chiếu màn hình dashboard.",
      },
    });
    users.push({ id: u.id, profile: p.profile, name: u.name });
  }

  // ---------- sinh session/turn/toolcall ----------
  function activeDaysAgo(profile: Profile): number[] {
    const days: number[] = [];
    if (profile === "silent") return days;
    for (let d = 0; d < 70; d++) {
      const date = new Date(NOW);
      date.setDate(date.getDate() - d);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      let p = 0;
      switch (profile) {
        case "power":
          p = isWeekend ? 0.12 : 0.82;
          break;
        case "regular":
          p = isWeekend ? 0.05 : 0.32;
          break;
        case "trial":
          p = d <= 13 ? (isWeekend ? 0.1 : 0.55) : 0;
          break;
        case "churned":
          p = d >= 20 && d <= 55 && !isWeekend ? 0.4 : 0;
          break;
      }
      if (Math.random() < p) days.push(d);
    }
    return days;
  }

  type SessionRow = {
    id: string;
    externalId: string;
    userId: string;
    projectLabel: string;
    source: string;
    model: string;
    status: "ACTIVE" | "IDLE" | "ENDED";
    startedAt: Date;
    endedAt: Date | null;
    lastEventAt: Date;
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    costUsd: number;
    turnCount: number;
    toolCallCount: number;
    promptCount: number;
    editsAccepted: number;
    editsRejected: number;
    apiErrorCount: number;
    linesAdded: number;
    linesRemoved: number;
    outcome: "SOLVED" | "IN_PROGRESS" | "ABANDONED" | null;
    note: string | null;
    tags: string | null;
    featured: boolean;
  };
  type TurnRow = {
    id: string;
    sessionId: string;
    userId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    costUsd: number;
    durationMs: number;
    ttftMs: number;
    stopReason: string;
    createdAt: Date;
  };
  type ToolCallRow = {
    id: string;
    sessionId: string;
    userId: string;
    toolName: string;
    status: "STARTED" | "SUCCESS" | "ERROR";
    startedAt: Date;
    endedAt: Date | null;
    durationMs: number | null;
  };

  const sessions: SessionRow[] = [];
  const turns: TurnRow[] = [];
  const toolCalls: ToolCallRow[] = [];
  let featuredCount = 0;

  // Vài user "power" sẽ có 1 session đang mở (ACTIVE/IDLE) ngay lúc chạy script,
  // để trang /live và "phiên đang hoạt động" trên Tổng quan có dữ liệu thật.
  const powerUsers = users.filter((u) => u.profile === "power");
  const liveUserIds = new Set(shuffle(powerUsers).slice(0, Math.min(3, powerUsers.length)).map((u) => u.id));

  for (const user of users) {
    const days = activeDaysAgo(user.profile);
    const favoriteProjects = shuffle(PROJECTS).slice(0, randInt(1, 3));
    const sessionsPerDay = user.profile === "power" ? [1, 1, 1, 2, 2, 3] : user.profile === "regular" ? [1, 1, 2] : [1];

    for (const dAgo of days) {
      const nSessions = pick(sessionsPerDay);
      for (let s = 0; s < nSessions; s++) {
        const isLiveNow = dAgo === 0 && liveUserIds.has(user.id) && s === nSessions - 1;
        const startHour = isLiveNow ? NOW.getHours() : Math.random() < 0.06 ? randInt(0, 5) : randInt(8, 21);
        const startedAt = isLiveNow ? new Date(NOW.getTime() - randInt(5, 40) * 60_000) : daysAgoAt(dAgo, startHour);

        const sessionModel = weightedPick(MODELS);
        const project = Math.random() < 0.75 ? pick(favoriteProjects) : pick(PROJECTS);
        const source = weightedPick(SOURCES);
        const turnCount =
          user.profile === "power" ? randInt(6, 32) : user.profile === "regular" ? randInt(3, 16) : randInt(2, 8);

        const sessionId = id("cmses");
        let cursor = new Date(startedAt);
        let sInput = 0,
          sOutput = 0,
          sCacheCreate = 0,
          sCacheRead = 0,
          sCost = 0;

        for (let t = 0; t < turnCount; t++) {
          cursor = new Date(cursor.getTime() + randInt(20, 340) * 1000);
          const model = Math.random() < 0.9 ? sessionModel : weightedPick(MODELS);
          const inputTokens = randInt(150, 3500);
          const outputTokens = randInt(80, 3200);
          const cacheCreationTokens = t === 0 ? randInt(500, 18000) : Math.random() < 0.15 ? randInt(100, 4000) : 0;
          const cacheReadTokens = t === 0 ? 0 : randInt(2000, 160000);
          const costUsd = computeCostUsd(model, inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens);

          sInput += inputTokens;
          sOutput += outputTokens;
          sCacheCreate += cacheCreationTokens;
          sCacheRead += cacheReadTokens;
          sCost += costUsd;

          turns.push({
            id: id("cmtrn"),
            sessionId,
            userId: user.id,
            model,
            inputTokens,
            outputTokens,
            cacheCreationTokens,
            cacheReadTokens,
            costUsd,
            durationMs: randInt(700, 16000),
            ttftMs: randInt(180, 3200),
            stopReason: weightedPick(STOP_REASONS),
            createdAt: cursor,
          });
        }

        const toolCallCount =
          user.profile === "power" ? randInt(4, 26) : user.profile === "regular" ? randInt(2, 14) : randInt(1, 6);
        let editWriteSuccess = 0;
        let toolCursor = new Date(startedAt.getTime() + 5000);
        for (let tc = 0; tc < toolCallCount; tc++) {
          toolCursor = new Date(toolCursor.getTime() + randInt(5, 200) * 1000);
          const toolName = weightedPick(TOOLS);
          const status = weightedPick<"STARTED" | "SUCCESS" | "ERROR">([
            ["SUCCESS", 88],
            ["ERROR", 8],
            ["STARTED", 4],
          ]);
          const durationMs =
            toolName === "Bash" || toolName === "WebFetch" || toolName === "WebSearch"
              ? randInt(400, 14000)
              : randInt(40, 3000);
          if ((toolName === "Edit" || toolName === "Write") && status === "SUCCESS") editWriteSuccess += 1;
          toolCalls.push({
            id: id("cmtool"),
            sessionId,
            userId: user.id,
            toolName,
            status,
            startedAt: toolCursor,
            endedAt: status === "STARTED" ? null : new Date(toolCursor.getTime() + durationMs),
            durationMs: status === "STARTED" ? null : durationMs,
          });
        }

        const lastEventAt = isLiveNow
          ? new Date(NOW.getTime() - randInt(0, 3) * 60_000)
          : new Date(cursor.getTime() + randInt(0, 60_000));
        const status: SessionRow["status"] = isLiveNow ? weightedPick([["ACTIVE", 1], ["IDLE", 1]]) : "ENDED";

        let outcome: SessionRow["outcome"] = null;
        let note: string | null = null;
        let tags: string | null = null;
        let featured = false;
        if (status === "ENDED" && Math.random() < 0.28) {
          outcome = weightedPick([["SOLVED", 60], ["IN_PROGRESS", 25], ["ABANDONED", 15]]);
          note = pick(outcome === "SOLVED" ? NOTES_SOLVED : outcome === "IN_PROGRESS" ? NOTES_PROGRESS : NOTES_ABANDONED);
          tags = shuffle(SESSION_TAGS).slice(0, randInt(1, 3)).join(",");
          if (outcome === "SOLVED" && featuredCount < 8 && Math.random() < 0.15) {
            featured = true;
            featuredCount += 1;
          }
        }

        sessions.push({
          id: sessionId,
          externalId: id("ext"),
          userId: user.id,
          projectLabel: project,
          source,
          model: sessionModel,
          status,
          startedAt,
          endedAt: status === "ENDED" ? lastEventAt : null,
          lastEventAt,
          inputTokens: sInput,
          outputTokens: sOutput,
          cacheCreationTokens: sCacheCreate,
          cacheReadTokens: sCacheRead,
          costUsd: sCost,
          turnCount,
          toolCallCount,
          promptCount: Math.max(1, Math.round(turnCount * randFloat(0.6, 0.95))),
          editsAccepted: editWriteSuccess > 0 ? randInt(0, editWriteSuccess) : 0,
          editsRejected: randInt(0, 2),
          apiErrorCount: Math.random() < 0.1 ? randInt(1, 3) : 0,
          linesAdded: editWriteSuccess * randInt(3, 40),
          linesRemoved: editWriteSuccess * randInt(0, 15),
          outcome,
          note,
          tags,
          featured,
        });
      }
    }
  }

  console.log(
    `Chuẩn bị insert: ${sessions.length} session, ${turns.length} turn, ${toolCalls.length} tool call...`,
  );

  const CHUNK = 500;
  for (let i = 0; i < sessions.length; i += CHUNK) {
    await prisma.claudeSession.createMany({ data: sessions.slice(i, i + CHUNK) });
  }
  for (let i = 0; i < turns.length; i += CHUNK) {
    await prisma.turn.createMany({ data: turns.slice(i, i + CHUNK) });
  }
  for (let i = 0; i < toolCalls.length; i += CHUNK) {
    await prisma.toolCall.createMany({ data: toolCalls.slice(i, i + CHUNK) });
  }

  // ---------- comment + feedback trên session ----------
  console.log("Tạo comment/feedback trên session...");
  const endedSessions = sessions.filter((s) => s.status === "ENDED");
  const commentPool = [
    "Nice, cách này hay đó!",
    "Sao không dùng batch luôn cho nhanh?",
    "Đã review, ok merge.",
    "Case này team mình cũng gặp, để tham khảo thêm.",
    "@here có ai gặp lỗi tương tự chưa?",
  ];
  let commentInserted = 0;
  let feedbackInserted = 0;
  for (const s of shuffle(endedSessions).slice(0, 60)) {
    const author = pick(users.filter((u) => u.id !== s.userId));
    await prisma.sessionComment.create({
      data: { sessionId: s.id, authorId: author.id, body: pick(commentPool) },
    });
    commentInserted += 1;
  }
  for (const s of shuffle(endedSessions).slice(0, 120)) {
    const voters = shuffle(users.filter((u) => u.id !== s.userId)).slice(0, randInt(1, 3));
    for (const voter of voters) {
      await prisma.sessionFeedback
        .create({ data: { sessionId: s.id, userId: voter.id, value: Math.random() < 0.85 ? 1 : -1 } })
        .then(() => feedbackInserted++)
        .catch(() => {}); // bỏ qua trùng (sessionId,userId) hiếm gặp
    }
  }

  // ---------- Thư viện (Library) ----------
  console.log("Tạo bài viết Thư viện (prompt/skill)...");
  const promptItems = [
    { title: "Prompt review PR nhanh", body: "Review đoạn diff sau, tập trung vào bug logic và bảo mật, bỏ qua style:\n\n{diff}", tags: "review,code" },
    { title: "Prompt viết test case", body: "Viết unit test cho hàm sau, cover cả edge case:\n\n{code}", tags: "test" },
    { title: "Prompt tóm tắt cuộc họp", body: "Tóm tắt nội dung họp sau thành các đầu việc (action items) kèm người phụ trách:\n\n{transcript}", tags: "meeting" },
    { title: "Prompt debug lỗi production", body: "Đây là log lỗi từ production, hãy phân tích nguyên nhân khả dĩ và đề xuất hướng fix:\n\n{log}", tags: "debug" },
    { title: "Prompt viết mô tả PR", body: "Dựa trên diff sau, viết mô tả PR ngắn gọn theo format Summary/Test plan:\n\n{diff}", tags: "review" },
  ];
  const skillItems = [
    { title: "Skill kiểm tra chất lượng migration DB", desc: "Rà soát migration SQL trước khi apply production", skillName: "db-migration-check" },
    { title: "Skill sinh changelog từ commit", desc: "Tự tổng hợp changelog theo Conventional Commits", skillName: "changelog-gen" },
    { title: "Skill audit bảo mật API", desc: "Quét route Next.js để tìm lỗ hổng OWASP top 10", skillName: "api-security-audit" },
    { title: "Skill chuẩn hoá i18n", desc: "Đồng bộ file dịch vi/en/ja, báo thiếu key", skillName: "i18n-sync" },
  ];
  const libraryItemIds: string[] = [];
  for (const p of promptItems) {
    const author = pick(users);
    const item = await prisma.libraryItem.create({
      data: {
        kind: "PROMPT",
        title: p.title,
        body: p.body,
        tags: p.tags,
        visibility: Math.random() < 0.85 ? "PUBLIC" : "PRIVATE",
        authorId: author.id,
      },
    });
    libraryItemIds.push(item.id);
  }
  for (const sk of skillItems) {
    const author = pick(users);
    const item = await prisma.libraryItem.create({
      data: {
        kind: "SKILL",
        title: sk.title,
        body: `# ${sk.title}\n\n${sk.desc}. Xem SKILL.md để biết chi tiết cách dùng.`,
        skillName: sk.skillName,
        skillDescription: sk.desc,
        visibility: "PUBLIC",
        authorId: author.id,
      },
    });
    libraryItemIds.push(item.id);
  }

  console.log("Tạo comment/react/bookmark cho Thư viện...");
  const EMOJIS = ["👍", "❤️", "🔥", "🎉", "🚀"];
  for (const itemId of libraryItemIds) {
    const commenters = shuffle(users).slice(0, randInt(0, 4));
    for (const c of commenters) {
      await prisma.libraryComment.create({ data: { itemId, authorId: c.id, body: pick(commentPool) } });
    }
    const reactors = shuffle(users).slice(0, randInt(0, 8));
    for (const r of reactors) {
      const key = `${itemId}:${r.id}`;
      if (usedEmojiNames.has(key)) continue;
      usedEmojiNames.add(key);
      await prisma.libraryReaction
        .create({ data: { itemId, userId: r.id, emoji: pick(EMOJIS) } })
        .catch(() => {});
    }
    const bookmarkers = shuffle(users).slice(0, randInt(0, 5));
    for (const b of bookmarkers) {
      await prisma.libraryBookmark.create({ data: { itemId, userId: b.id } }).catch(() => {});
    }
  }

  console.log("\nXong! Tổng kết:");
  console.log(
    JSON.stringify(
      {
        departments: deptRows.length,
        users: users.length,
        sessions: sessions.length,
        turns: turns.length,
        toolCalls: toolCalls.length,
        sessionComments: commentInserted,
        sessionFeedback: feedbackInserted,
        libraryItems: libraryItemIds.length,
        featuredSessions: featuredCount,
        liveSessionsNow: sessions.filter((s) => s.status !== "ENDED").length,
      },
      null,
      2,
    ),
  );
  console.log("\nĐăng nhập thử 1 user mẫu bất kỳ với mật khẩu: demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
