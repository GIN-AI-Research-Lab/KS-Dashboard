// Vietnamese explanations for the abbreviated / jargon metrics shown across the
// dashboard. Reused by StatCards, table headers and chart titles via <InfoTip>.
// Keep entries short (one hover-sized sentence) and plain-language.
export const METRIC_HELP: Record<string, string> = {
  // Tokens
  totalTokens: "Tổng số token (input + output) Claude xử lý trong kỳ. Token ≈ mẩu chữ; chi phí tính theo token.",
  inputTokens: "Token đầu vào — nội dung gửi cho model: câu hỏi, ngữ cảnh, file đính kèm.",
  outputTokens: "Token đầu ra — nội dung model sinh ra: câu trả lời, đoạn code.",
  turns: "Số lượt qua lại trong phiên (bạn gửi → Claude trả lời tính là 1 lượt).",

  // Cache
  cacheHitRatio:
    "Tỷ lệ token đầu vào được lấy lại từ 'prompt cache' thay vì tính phí như input mới — càng cao càng tiết kiệm.",
  cacheReadTokens: "Token đọc lại từ cache. Rẻ hơn nhiều so với token input mới.",
  cacheCreationTokens:
    "Token dùng để GHI vào cache lần đầu (có phụ phí nhỏ), giúp các lần gọi sau rẻ hơn.",

  // Cost / ROI
  cost: "Chi phí ước tính, quy đổi theo đơn giá token của từng model.",
  costPerUser: "Chi phí trung bình trên mỗi người dùng có hoạt động.",
  roi: "ROI — ước tính giá trị mang lại so với chi phí bỏ ra (giá trị / chi phí).",

  // Sessions / activity
  sessionCount: "Số phiên làm việc với Claude Code trong kỳ.",
  activeSessions: "Số phiên đang diễn ra / còn hoạt động ngay lúc này.",
  activeUsers: "Số người thực sự có dùng Claude trong kỳ (khác với tổng tài khoản).",

  // Team / org
  coverage: "Độ phủ — tỷ lệ thành viên trong nhóm thực sự có dùng Claude.",
  tokensPerMember: "Trung bình số token trên mỗi thành viên của nhóm.",

  // Code / OTel
  linesAdded: "Số dòng code Claude thêm vào, đo qua OpenTelemetry (OTel) của Claude Code.",
  linesRemoved: "Số dòng code Claude xoá đi, đo qua OpenTelemetry (OTel) của Claude Code.",
  acceptanceRate: "Tỷ lệ gợi ý sửa code của Claude được bạn chấp nhận (accept) thay vì bỏ qua.",
  otel: "OpenTelemetry — chuẩn thu thập số liệu mà Claude Code gửi lên để thống kê.",

  // Models
  model: "Mô hình Claude được dùng (Opus/Sonnet/Haiku…). Mỗi model có tốc độ, chất lượng và đơn giá khác nhau.",
};

// Grouped, display-friendly version for the standalone glossary page. Reuses the
// METRIC_HELP text where possible so tooltips and the glossary stay in sync.
export const GLOSSARY: { group: string; items: { term: string; desc: string }[] }[] = [
  {
    group: "Token & chi phí",
    items: [
      { term: "Token", desc: "Đơn vị mà model đọc/ghi (≈ một mẩu chữ). Chi phí và giới hạn đều tính theo token." },
      { term: "Input token", desc: METRIC_HELP.inputTokens },
      { term: "Output token", desc: METRIC_HELP.outputTokens },
      { term: "Chi phí ước tính", desc: METRIC_HELP.cost },
      { term: "ROI", desc: METRIC_HELP.roi },
    ],
  },
  {
    group: "Cache (bộ nhớ đệm prompt)",
    items: [
      { term: "Cache hit ratio", desc: METRIC_HELP.cacheHitRatio },
      { term: "Token đọc từ cache", desc: METRIC_HELP.cacheReadTokens },
      { term: "Token tạo cache", desc: METRIC_HELP.cacheCreationTokens },
    ],
  },
  {
    group: "Phiên & hoạt động",
    items: [
      { term: "Phiên (session)", desc: "Một lần làm việc với Claude Code (mở tới khi kết thúc)." },
      { term: "Turn (lượt)", desc: METRIC_HELP.turns },
      { term: "Người dùng hoạt động", desc: METRIC_HELP.activeUsers },
      { term: "DAU / WAU / MAU", desc: "Số người dùng hoạt động theo Ngày / Tuần / Tháng." },
      { term: "Stickiness", desc: "DAU/MAU — mức độ quay lại đều đặn; càng cao càng 'dính'." },
    ],
  },
  {
    group: "Nhóm & tổ chức",
    items: [
      { term: "Độ phủ (coverage)", desc: METRIC_HELP.coverage },
      { term: "Token/người", desc: METRIC_HELP.tokensPerMember },
      { term: "Cohort", desc: "Nhóm người bắt đầu dùng trong cùng một kỳ; dùng để đo tỷ lệ giữ chân (retention) T+1, T+2…" },
    ],
  },
  {
    group: "Code & model",
    items: [
      { term: "Dòng code thêm/xoá", desc: METRIC_HELP.linesAdded },
      { term: "Tỷ lệ chấp nhận sửa", desc: METRIC_HELP.acceptanceRate },
      { term: "OTel (OpenTelemetry)", desc: METRIC_HELP.otel },
      { term: "Model / tier", desc: "Model Claude (Opus/Sonnet/Haiku…); 'tier' là cấp model, đơn giá token khác nhau." },
      { term: "Percentile (P50/P95)", desc: "P95 = 95% trường hợp nhanh hơn giá trị này; đo độ trễ ở phần 'xấu' chứ không chỉ trung bình." },
    ],
  },
];
