import type { WikiPage } from './wiki.js';

async function loadPg() {
  try {
    const pg = await import('pg');
    return pg.default;
  } catch {
    throw new Error(
      'pg is required for DB9 integration. Install it with: npm install pg'
    );
  }
}

export interface DB9Config {
  url: string;
}

export interface DB9SearchResult {
  slug: string;
  title: string;
  similarity: number;
}

/**
 * DB9 client wrapper for vector search and wiki index management.
 * Uses DB9's built-in embedding() function for server-side embeddings.
 */
export class DB9Client {
  private pool: any; // pg.Pool — dynamically loaded
  private url: string;

  constructor(config: DB9Config) {
    this.url = config.url;
  }

  private async getPool() {
    if (!this.pool) {
      const pg = await loadPg();
      this.pool = new pg.Pool({ connectionString: this.url });
    }
    return this.pool;
  }

  async close(): Promise<void> {
    if (this.pool) await this.pool.end();
  }

  async ensureSchema(): Promise<void> {
    const pool = await this.getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wiki_index (
        slug TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        content TEXT NOT NULL,
        tags TEXT[] DEFAULT '{}',
        sources TEXT[] DEFAULT '{}',
        content_hash TEXT NOT NULL,
        updated TEXT,
        embedding VECTOR(1024)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS wiki_page_sources (
        slug TEXT NOT NULL,
        source_path TEXT NOT NULL,
        PRIMARY KEY (slug, source_path)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wiki_embedding
      ON wiki_index USING hnsw (embedding vector_cosine_ops)
    `);
  }

  async upsertPage(page: WikiPage, contentHash: string): Promise<void> {
    const pool = await this.getPool();
    const embeddingText = `${page.title}. ${page.description ?? ''}. ${page.content}`;

    await pool.query(
      `INSERT INTO wiki_index (slug, title, description, content, tags, sources, content_hash, updated, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, embedding($9)::vector(1024))
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         content = EXCLUDED.content,
         tags = EXCLUDED.tags,
         sources = EXCLUDED.sources,
         content_hash = EXCLUDED.content_hash,
         updated = EXCLUDED.updated,
         embedding = EXCLUDED.embedding`,
      [
        page.slug,
        page.title,
        page.description ?? '',
        page.content,
        page.tags,
        page.sources,
        contentHash,
        page.updated ?? '',
        embeddingText,
      ]
    );

    await pool.query(`DELETE FROM wiki_page_sources WHERE slug = $1`, [page.slug]);
    for (const source of page.sources) {
      await pool.query(
        `INSERT INTO wiki_page_sources (slug, source_path) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [page.slug, source]
      );
    }
  }

  async deletePage(slug: string): Promise<void> {
    const pool = await this.getPool();
    await pool.query(`DELETE FROM wiki_page_sources WHERE slug = $1`, [slug]);
    await pool.query(`DELETE FROM wiki_index WHERE slug = $1`, [slug]);
  }

  async vectorSearch(query: string, limit: number = 10): Promise<DB9SearchResult[]> {
    const pool = await this.getPool();
    const result = await pool.query(
      `WITH q AS (SELECT embedding($1)::vector(1024) AS qv)
       SELECT slug, title, 1 - (embedding <=> q.qv) AS similarity
       FROM wiki_index, q
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> q.qv
       LIMIT $2`,
      [query, limit]
    );

    return result.rows.map((row: any) => ({
      slug: row.slug,
      title: row.title,
      similarity: parseFloat(row.similarity),
    }));
  }

  async getContentHash(slug: string): Promise<string | null> {
    const pool = await this.getPool();
    const result = await pool.query(
      `SELECT content_hash FROM wiki_index WHERE slug = $1`,
      [slug]
    );
    return result.rows[0]?.content_hash ?? null;
  }

  async getAllHashes(): Promise<Map<string, string>> {
    const pool = await this.getPool();
    const result = await pool.query(`SELECT slug, content_hash FROM wiki_index`);
    const map = new Map<string, string>();
    for (const row of result.rows) {
      map.set(row.slug, row.content_hash);
    }
    return map;
  }

  async pagesBySource(sourcePath: string): Promise<string[]> {
    const pool = await this.getPool();
    const result = await pool.query(
      `SELECT slug FROM wiki_page_sources WHERE source_path = $1`,
      [sourcePath]
    );
    return result.rows.map((row: any) => row.slug);
  }
}

/**
 * Create a DB9 client from config, or null if not configured.
 */
export function createDB9Client(config: { db9?: { url: string } }): DB9Client | null {
  if (!config.db9?.url) return null;
  return new DB9Client({ url: config.db9.url });
}
