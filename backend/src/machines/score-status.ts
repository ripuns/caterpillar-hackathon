// Port of data-ml/thresholds.py's SCORE_STATUS_BANDS + scoring.py's
// _status_for_score(). Shared status-band convention for both Operator
// Score and Machine Health Score (CONTRACTS.md §11).
const SCORE_STATUS_BANDS: Array<[number, number, string]> = [
  [85, 100, 'EXCELLENT'],
  [65, 84, 'GOOD'],
  [40, 64, 'NEEDS_ATTENTION'],
  [0, 39, 'CRITICAL'],
];

export function statusForScore(score: number): string {
  for (const [low, high, label] of SCORE_STATUS_BANDS) {
    if (score >= low && score <= high) return label;
  }
  return 'UNKNOWN';
}
