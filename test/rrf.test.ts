import { describe, it, expect } from 'vitest';
import { rrfMerge } from '../src/lib/search.js';

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
    expect(result[0].slug).toBe('a');
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });
});
