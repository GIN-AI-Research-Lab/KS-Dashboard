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
