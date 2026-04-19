import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import TOML from 'toml';

export interface WikiConfig {
  vault: {
    name: string;
    language: string;
  };
  db9?: {
    url: string;
  };
}

const DEFAULT_CONFIG: WikiConfig = {
  vault: {
    name: 'My Wiki',
    language: 'en',
  },
};

const CONFIG_PATH = '.llm-wiki/config.toml';

export function findVaultRoot(from: string = process.cwd()): string | null {
  let dir = resolve(from);
  while (true) {
    if (existsSync(join(dir, CONFIG_PATH))) {
      return dir;
    }
    const parent = resolve(dir, '..');
    if (parent === dir) return null;
    dir = parent;
  }
}

export function requireVaultRoot(from?: string): string {
  const root = findVaultRoot(from);
  if (!root) {
    console.error('Error: Not inside an llm-wiki vault. Run `llm-wiki init` first.');
    process.exit(1);
  }
  return root;
}

export function loadConfig(vaultRoot: string): WikiConfig {
  const configPath = join(vaultRoot, CONFIG_PATH);
  if (!existsSync(configPath)) return DEFAULT_CONFIG;
  const raw = readFileSync(configPath, 'utf-8');
  return { ...DEFAULT_CONFIG, ...TOML.parse(raw) } as WikiConfig;
}

export function vaultPaths(root: string) {
  return {
    wiki: join(root, 'wiki'),
    sources: join(root, 'sources'),
    purpose: join(root, 'wiki-purpose.md'),
    schema: join(root, 'wiki-schema.md'),
    log: join(root, 'wiki-log.md'),
    claudeMd: join(root, 'CLAUDE.md'),
    agentsMd: join(root, 'AGENTS.md'),
    claudeSkillsDir: join(root, '.claude', 'skills'),
    agentsSkillsDir: join(root, '.agents', 'skills'),
    config: join(root, CONFIG_PATH),
    syncState: join(root, '.llm-wiki/sync-state.json'),
    lintResult: join(root, '.llm-wiki/lint-result.yaml'),
    llmWikiDir: join(root, '.llm-wiki'),
  };
}
