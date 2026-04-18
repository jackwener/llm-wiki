import type { WikiPage } from './wiki.js';

// CJK Unicode ranges for bigram tokenization
const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/;

export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const normalized = text.toLowerCase();

  // Split into segments: CJK vs non-CJK
  let i = 0;
  let nonCjkBuffer = '';

  while (i < normalized.length) {
    const char = normalized[i];
    if (CJK_RE.test(char)) {
      // Flush non-CJK buffer
      if (nonCjkBuffer.length > 0) {
        tokens.push(...nonCjkBuffer.split(/\s+/).filter(t => t.length > 0));
        nonCjkBuffer = '';
      }
      // CJK bigram: emit single char + bigram with next CJK char
      tokens.push(char);
      if (i + 1 < normalized.length && CJK_RE.test(normalized[i + 1])) {
        tokens.push(char + normalized[i + 1]);
      }
      i++;
    } else {
      nonCjkBuffer += char;
      i++;
    }
  }
  if (nonCjkBuffer.length > 0) {
    tokens.push(...nonCjkBuffer.split(/\s+/).filter(t => t.length > 0));
  }

  return tokens;
}

interface BM25Index {
  /** Document frequency: token → number of docs containing it */
  df: Map<string, number>;
  /** Term frequency per doc: docIndex → token → count */
  tf: Map<number, Map<string, number>>;
  /** Document lengths (in tokens) */
  docLengths: number[];
  /** Average document length */
  avgDl: number;
  /** Total documents */
  n: number;
}

function buildIndex(pages: WikiPage[]): BM25Index {
  const df = new Map<string, number>();
  const tf = new Map<number, Map<string, number>>();
  const docLengths: number[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const text = `${page.title} ${page.description ?? ''} ${page.content}`;
    const tokens = tokenize(text);
    docLengths.push(tokens.length);

    const termFreq = new Map<string, number>();
    const seenTerms = new Set<string>();

    for (const token of tokens) {
      termFreq.set(token, (termFreq.get(token) ?? 0) + 1);
      seenTerms.add(token);
    }

    tf.set(i, termFreq);
    for (const term of seenTerms) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  const totalLen = docLengths.reduce((a, b) => a + b, 0);
  const avgDl = pages.length > 0 ? totalLen / pages.length : 0;

  return { df, tf, docLengths, avgDl, n: pages.length };
}

const K1 = 1.2;
const B = 0.75;

function scoreBM25(index: BM25Index, queryTokens: string[], docIdx: number): number {
  let score = 0;
  const docTf = index.tf.get(docIdx);
  if (!docTf) return 0;
  const dl = index.docLengths[docIdx];

  for (const token of queryTokens) {
    const docFreq = index.df.get(token) ?? 0;
    if (docFreq === 0) continue;

    const idf = Math.log((index.n - docFreq + 0.5) / (docFreq + 0.5) + 1);
    const termFreq = docTf.get(token) ?? 0;
    const tfNorm = (termFreq * (K1 + 1)) / (termFreq + K1 * (1 - B + B * dl / index.avgDl));
    score += idf * tfNorm;
  }

  return score;
}

export interface SearchResult {
  page: WikiPage;
  score: number;
}

export function bm25Search(pages: WikiPage[], query: string, limit: number = 10): SearchResult[] {
  if (pages.length === 0) return [];

  const index = buildIndex(pages);
  const queryTokens = tokenize(query);

  const results: SearchResult[] = [];
  for (let i = 0; i < pages.length; i++) {
    const score = scoreBM25(index, queryTokens, i);
    if (score > 0) {
      results.push({ page: pages[i], score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/**
 * Reciprocal Rank Fusion (RRF) — merges ranked lists from different search methods.
 * K=60 is the standard constant.
 */
export function rrfMerge(
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
