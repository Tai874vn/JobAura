/**
 * Small helper functions for the Recommended candidates (/recommendations/candidates) page.
 * Formats the daily quota reset time and sorts recommended candidates by final score and rank.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/candidates/components/recommended-candidates/recommended-candidates-page.tsx
 *   - features/candidates/components/recommended-candidates/sidebar-cards.tsx
 */

export function formatReset(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "daily";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function sortByFinalScore<
  T extends { recommendation: { finalScore: number; rank?: number } },
>(items: T[]) {
  return [...items].sort((first, second) => {
    const scoreDelta =
      second.recommendation.finalScore - first.recommendation.finalScore;
    if (scoreDelta !== 0) return scoreDelta;
    return (
      (first.recommendation.rank ?? Number.MAX_SAFE_INTEGER) -
      (second.recommendation.rank ?? Number.MAX_SAFE_INTEGER)
    );
  });
}
