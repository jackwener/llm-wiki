import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DB9Client } from '../src/lib/db9.js';
import type { WikiPage } from '../src/lib/wiki.js';

const DB9_URL = process.env.DB9_URL;

// Skip all DB9 tests if no connection string is set
const describeDB9 = DB9_URL ? describe : describe.skip;

function makePage(slug: string, title: string, content: string): WikiPage {
  return {
    path: `wiki/${slug}.md`,
    relativePath: `${slug}.md`,
    slug,
    title,
    description: `About ${title}`,
    content,
    tags: ['test'],
    sources: ['2026-04-19/test-source.md'],
    aliases: [],
    wikilinks: [],
    mtime: Date.now(),
    updated: '2026-04-19',
  };
}

describeDB9('DB9 integration', () => {
  let client: DB9Client;

  beforeAll(async () => {
    client = new DB9Client({ url: DB9_URL! });
    await client.ensureSchema();
  });

  afterAll(async () => {
    await client.close();
  });

  it('should upsert and retrieve a page hash', async () => {
    const page = makePage('test-page', 'Test Page', 'This is a test page about distributed systems.');
    await client.upsertPage(page, 'abc123');

    const hash = await client.getContentHash('test-page');
    expect(hash).toBe('abc123');
  });

  it('should update a page on upsert', async () => {
    const page = makePage('test-page', 'Test Page Updated', 'Updated content.');
    await client.upsertPage(page, 'def456');

    const hash = await client.getContentHash('test-page');
    expect(hash).toBe('def456');
  });

  it('should vector search', async () => {
    // Insert a few pages with different topics
    await client.upsertPage(
      makePage('consensus', 'Consensus', 'Distributed consensus algorithms like Raft and Paxos.'),
      'hash1'
    );
    await client.upsertPage(
      makePage('cooking', 'Cooking', 'How to make pasta carbonara with eggs and bacon.'),
      'hash2'
    );

    const results = await client.vectorSearch('distributed systems agreement protocol', 5);
    expect(results.length).toBeGreaterThan(0);
    // Consensus should rank higher than cooking for this query
    const consensusIdx = results.findIndex(r => r.slug === 'consensus');
    const cookingIdx = results.findIndex(r => r.slug === 'cooking');
    if (consensusIdx >= 0 && cookingIdx >= 0) {
      expect(consensusIdx).toBeLessThan(cookingIdx);
    }
  });

  it('should get all hashes', async () => {
    const hashes = await client.getAllHashes();
    expect(hashes.size).toBeGreaterThanOrEqual(2);
    expect(hashes.has('consensus')).toBe(true);
  });

  it('should track page-source mappings', async () => {
    const pages = await client.pagesBySource('2026-04-19/test-source.md');
    expect(pages.length).toBeGreaterThan(0);
  });

  it('should delete a page', async () => {
    await client.deletePage('cooking');
    const hash = await client.getContentHash('cooking');
    expect(hash).toBeNull();
  });
});
