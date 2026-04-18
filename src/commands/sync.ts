import { Command } from 'commander';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { requireVaultRoot, vaultPaths, loadConfig } from '../lib/config.js';
import { computeSync, loadSyncState, saveSyncState, updateSyncState, contentHash } from '../lib/sync.js';
import { createDB9Client } from '../lib/db9.js';
import { parseWikiPage } from '../lib/wiki.js';

export const syncCommand = new Command('sync')
  .description('Track changes and update sync state (mtime + content hash). Syncs embeddings to DB9 if configured.')
  .option('--dry-run', 'show changes without updating state')
  .action(async (opts: { dryRun?: boolean }) => {
    const root = requireVaultRoot();
    const paths = vaultPaths(root);
    const config = loadConfig(root);

    // Ensure .llm-wiki directory exists
    mkdirSync(dirname(paths.syncState), { recursive: true });

    const state = loadSyncState(paths.syncState);
    const result = computeSync([paths.wiki, paths.sources], root, state);

    const totalChanges = result.added.length + result.modified.length + result.deleted.length;

    if (totalChanges === 0) {
      console.log('Everything up to date.');
      return;
    }

    if (result.added.length > 0) {
      console.log(`Added (${result.added.length}):`);
      for (const f of result.added) console.log(`  + ${f}`);
    }
    if (result.modified.length > 0) {
      console.log(`Modified (${result.modified.length}):`);
      for (const f of result.modified) console.log(`  ~ ${f}`);
    }
    if (result.deleted.length > 0) {
      console.log(`Deleted (${result.deleted.length}):`);
      for (const f of result.deleted) console.log(`  - ${f}`);
    }

    console.log(`\nTotal: ${totalChanges} changes, ${result.unchanged.length} unchanged`);

    if (opts.dryRun) {
      console.log('\n(dry run — state not updated)');
      return;
    }

    // Update local sync state
    const newState = updateSyncState([paths.wiki, paths.sources], root, state);
    saveSyncState(paths.syncState, newState);
    console.log(`\nSync state updated (${newState.lastSync})`);

    // Sync to DB9 if configured
    const db9 = createDB9Client(config);
    if (db9) {
      console.log('\nSyncing to DB9...');
      try {
        await db9.ensureSchema();

        // Upsert added/modified wiki pages
        const wikiChanges = [...result.added, ...result.modified]
          .filter(f => f.startsWith('wiki/'));

        for (const rel of wikiChanges) {
          const filePath = join(root, rel);
          const page = parseWikiPage(filePath, paths.wiki);
          const hash = contentHash(filePath);
          await db9.upsertPage(page, hash);
          console.log(`  ↑ ${rel}`);
        }

        // Delete removed wiki pages
        const wikiDeleted = result.deleted.filter(f => f.startsWith('wiki/'));
        for (const rel of wikiDeleted) {
          const slug = rel.replace(/^wiki\//, '').replace(/\.md$/, '');
          await db9.deletePage(slug);
          console.log(`  ✕ ${rel}`);
        }

        const syncedCount = wikiChanges.length + wikiDeleted.length;
        console.log(`DB9 sync complete (${syncedCount} pages)`);
      } catch (err) {
        console.error(`DB9 sync failed: ${err instanceof Error ? err.message : err}`);
      } finally {
        await db9.close();
      }
    }
  });
