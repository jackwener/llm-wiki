import { describe, it, expect } from 'vitest';

// Inline the RRF function for unit testing (same logic as in search.ts)
function rrfMerge(
  bm25Results: { slug: string; score: number }[],
  vectorResults: { slug: string; score: number }[],
  limit: number,
  k: number = 60
): { slug: string; score: number }[] {
  const scores = new Map<string, number>();

  for (let i = 0; i < bm25Results.length; i++) {
    const slug = bm25Results[i].slug;
    scores.set(slug, (scores.get(slug) ?? 0) + 1 / (k + i + 1));
  }

  for (let i = 0; i < vectorResults.length; i++) {
    const slug = vectorResults[i].slug;
    scores.set(slug, (scores.get(slug) ?? 0) + 1 / (k + i + 1));
  }

  return [...scores.entries()]
    .map(([slug, score]) => ({ slug, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

describe('RRF merge', () => {
  it('should boost pages that appear in both lists', () => {
    const bm25 = [
      { slug: 'a', score: 5 },
      { slug: 'b', score: 3 },
    ];
    const vector = [
      { slug: 'b', score: 0.9 },
      { slug: 'c', score: 0.8 },
    ];
    const result = rrfMerge(bm25, vector, 10);
    // 'b' appears in both lists, should rank highest
    expect(result[0].slug).toBe('b');
  });

  it('should respect limit', () => {
    const bm25 = [
      { slug: 'a', score: 5 },
      { slug: 'b', score: 3 },
      { slug: 'c', score: 1 },
    ];
    const vector = [
      { slug: 'd', score: 0.9 },
      { slug: 'e', score: 0.8 },
    ];
    const result = rrfMerge(bm25, vector, 3);
    expect(result.length).toBe(3);
  });

  it('should handle empty inputs', () => {
    expect(rrfMerge([], [], 10)).toEqual([]);
    expect(rrfMerge([{ slug: 'a', score: 1 }], [], 10).length).toBe(1);
    expect(rrfMerge([], [{ slug: 'a', score: 1 }], 10).length).toBe(1);
  });

  it('should maintain scores relative to rank position', () => {
    const bm25 = [
      { slug: 'a', score: 10 },
      { slug: 'b', score: 5 },
    ];
    const vector: { slug: string; score: number }[] = [];
    const result = rrfMerge(bm25, vector, 10);
    // 'a' is rank 1, 'b' is rank 2, so a's RRF score should be higher
    expect(result[0].slug).toBe('a');
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });
});
