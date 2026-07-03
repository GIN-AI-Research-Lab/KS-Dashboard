// Tunable assumptions for the ROI estimate on the "Hiệu quả & Chi phí" page.
// These are deliberately conservative, transparent guesses -- adjust to match
// your team's reality. Every ROI figure shown in the UI is labelled as an
// estimate derived from these numbers, not a measured value.

// Rough developer time saved per Claude "turn" (one model response). A turn
// often replaces a few minutes of manual work (writing code, reading docs,
// debugging). Keep this conservative.
export const MINUTES_SAVED_PER_TURN = 3;

// Fully-loaded developer cost per hour (USD), used to convert saved time into a
// monetary "productivity value".
export const DEV_HOURLY_USD = 15;
