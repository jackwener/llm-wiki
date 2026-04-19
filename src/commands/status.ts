import { Command } from 'commander';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { requireVaultRoot, vaultPaths, loadConfig } from '../lib/config.js';
import { loadWikiPages, listMarkdownFiles } from '../lib/wiki.js';
import { loadSyncState } from '../lib/sync.js';

export const statusCommand = new Command('status')
  .description('Show wiki statistics and health summary')
  .action(() => {
    const root = requireVaultRoot();
    const paths = vaultPaths(root);
    const config = loadConfig(root);

    // Count pages
    const pages = loadWikiPages(paths.wiki);
    const sourceFiles = listMarkdownFiles(paths.sources);

    // Check sync state
    const syncState = loadSyncState(paths.syncState);

    // Count log entries
    let logEntries = 0;
    let lastLogEntry = '';
    if (existsSync(paths.log)) {
      const logContent = readFileSync(paths.log, 'utf-8');
      const logLines = logContent.match(/^## \[/gm);
      logEntries = logLines?.length ?? 0;
      const lastMatch = logContent.match(/^## \[[\d-]+\].+$/gm);
      if (lastMatch) lastLogEntry = lastMatch[lastMatch.length - 1];
    }

    // Health checks
    const issues: string[] = [];
    const legacyRename: [string, string][] = [
      ['purpose.md', 'wiki-purpose.md'],
      ['schema.md', 'wiki-schema.md'],
      ['log.md', 'wiki-log.md'],
    ];
    for (const [oldName, newName] of legacyRename) {
      if (!existsSync(join(root, newName)) && existsSync(join(root, oldName))) {
        issues.push(`legacy ${oldName} detected — rename to ${newName} (v0.4.2 vault file rename)`);
      }
    }
    if (!existsSync(paths.purpose)) issues.push('wiki-purpose.md missing');
    if (!existsSync(paths.schema)) issues.push('wiki-schema.md missing');

    const pagesWithoutSources = pages.filter(p => p.sources.length === 0);
    if (pagesWithoutSources.length > 0) {
      issues.push(`${pagesWithoutSources.length} pages without sources`);
    }

    // Find broken wikilinks
    const slugSet = new Set(pages.map(p => p.slug.toLowerCase()));
    let brokenLinks = 0;
    for (const page of pages) {
      for (const link of page.wikilinks) {
        if (!slugSet.has(link.toLowerCase().replace(/\.md$/, ''))) {
          brokenLinks++;
        }
      }
    }
    if (brokenLinks > 0) issues.push(`${brokenLinks} broken wikilinks`);

    // Recent pages (last 5 modified)
    const recentPages = [...pages]
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 5);

    // Output
    console.log(`Wiki: ${config.vault.name}`);
    console.log(`Language: ${config.vault.language}`);
    console.log('');
    console.log(`Pages:   ${pages.length}`);
    console.log(`Sources: ${sourceFiles.length}`);
    console.log(`Links:   ${pages.reduce((sum, p) => sum + p.wikilinks.length, 0)}`);
    console.log(`Log:     ${logEntries} entries`);
    if (syncState.lastSync) {
      console.log(`Synced:  ${syncState.lastSync}`);
    }
    console.log('');

    if (recentPages.length > 0) {
      console.log('Recently Modified:');
      for (const page of recentPages) {
        const date = new Date(page.mtime).toISOString().slice(0, 10);
        console.log(`  ${date} — [[${page.slug}]]`);
      }
      console.log('');
    }

    if (issues.length > 0) {
      console.log('Health Issues:');
      for (const issue of issues) {
        console.log(`  ⚠ ${issue}`);
      }
      console.log('');
      console.log('Run `llm-wiki graph` for detailed analysis or `/lint` for a full health check.');
    } else {
      console.log('Health: OK');
    }
  });
