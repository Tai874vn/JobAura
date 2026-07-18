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
