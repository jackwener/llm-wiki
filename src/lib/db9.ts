import pg from 'pg';
import type { WikiPage } from './wiki.js';

const { Pool } = pg;

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
  private pool: pg.Pool;

  constructor(config: DB9Config) {
    this.pool = new Pool({ connectionString: config.url });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Create the wiki_index and wiki_page_sources tables if they don't exist.
   */
  async ensureSchema(): Promise<void> {
    await this.pool.query(`
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

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS wiki_page_sources (
        slug TEXT NOT NULL,
        source_path TEXT NOT NULL,
        PRIMARY KEY (slug, source_path)
      )
    `);

    // Create HNSW index for vector search if not exists
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wiki_embedding
      ON wiki_index USING hnsw (embedding vector_cosine_ops)
    `);
  }

  /**
   * Upsert a wiki page into the index with server-side embedding.
   */
  async upsertPage(page: WikiPage, contentHash: string): Promise<void> {
    const embeddingText = `${page.title}. ${page.description ?? ''}. ${page.content}`;

    await this.pool.query(
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

    // Update source mappings
    await this.pool.query(`DELETE FROM wiki_page_sources WHERE slug = $1`, [page.slug]);
    for (const source of page.sources) {
      await this.pool.query(
        `INSERT INTO wiki_page_sources (slug, source_path) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [page.slug, source]
      );
    }
  }

  /**
   * Delete a page from the index.
   */
  async deletePage(slug: string): Promise<void> {
    await this.pool.query(`DELETE FROM wiki_page_sources WHERE slug = $1`, [slug]);
    await this.pool.query(`DELETE FROM wiki_index WHERE slug = $1`, [slug]);
  }

  /**
   * Vector similarity search using DB9's embedding() function.
   */
  async vectorSearch(query: string, limit: number = 10): Promise<DB9SearchResult[]> {
    const result = await this.pool.query(
      `WITH q AS (SELECT embedding($1)::vector(1024) AS qv)
       SELECT slug, title, 1 - (embedding <=> q.qv) AS similarity
       FROM wiki_index, q
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> q.qv
       LIMIT $2`,
      [query, limit]
    );

    return result.rows.map(row => ({
      slug: row.slug,
      title: row.title,
      similarity: parseFloat(row.similarity),
    }));
  }

  /**
   * Get content hash for a page (used for incremental sync).
   */
  async getContentHash(slug: string): Promise<string | null> {
    const result = await this.pool.query(
      `SELECT content_hash FROM wiki_index WHERE slug = $1`,
      [slug]
    );
    return result.rows[0]?.content_hash ?? null;
  }

  /**
   * Get all indexed slugs with their content hashes.
   */
  async getAllHashes(): Promise<Map<string, string>> {
    const result = await this.pool.query(`SELECT slug, content_hash FROM wiki_index`);
    const map = new Map<string, string>();
    for (const row of result.rows) {
      map.set(row.slug, row.content_hash);
    }
    return map;
  }

  /**
   * Reverse lookup: find all wiki pages that reference a given source.
   */
  async pagesBySource(sourcePath: string): Promise<string[]> {
    const result = await this.pool.query(
      `SELECT slug FROM wiki_page_sources WHERE source_path = $1`,
      [sourcePath]
    );
    return result.rows.map(row => row.slug);
  }
}

/**
 * Create a DB9 client from config, or null if not configured.
 */
export function createDB9Client(config: { db9?: { url: string } }): DB9Client | null {
  if (!config.db9?.url) return null;
  return new DB9Client({ url: config.db9.url });
}
