import { Command } from 'commander';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { findVaultRoot, vaultPaths } from '../lib/config.js';
import { installSkillsTo } from '../lib/skills.js';

const PURPOSE_TEMPLATE = `---
title: Wiki Purpose
---

# Purpose

Describe what this wiki is about, its scope, and intended audience.

Example: "This wiki tracks my research on distributed systems, covering papers, concepts, and open questions."
`;

const SCHEMA_TEMPLATE = `---
title: Wiki Schema
---

# Schema

## Page Types

Define the types of pages in this wiki and their conventions.

## Naming Convention

- Use kebab-case for page filenames (e.g., \`distributed-consensus.md\`)
- Use subdirectories for categories if needed (e.g., \`wiki/papers/raft.md\`)

## Required Frontmatter

Every wiki page must include:

\`\`\`yaml
---
title: Page Title
description: One-line summary
tags: []
sources: []
created: YYYY-MM-DD
updated: YYYY-MM-DD
---
\`\`\`

## Tags

Define your tag taxonomy here as the wiki grows.
`;

const CONFIG_TEMPLATE = `[vault]
name = "My Wiki"
language = "en"

# [db9]
# url = "your-db9-connection-string"
`;

const LOG_TEMPLATE = `# Change Log

Append-only record of wiki operations. Format: \`[date] verb | subject\`
`;

const CLAUDE_MD_TEMPLATE = `# LLM Wiki

This workspace is an LLM Wiki vault. Use the \`llm-wiki\` skill for all wiki operations.

## Quick Start

- Read \`purpose.md\` — wiki scope and audience
- Read \`schema.md\` — structure and naming rules
- Use \`/ingest <path>\`, \`/query <question>\`, \`/lint\`, \`/research <topic>\`

## Layout

- \`wiki/\` — AI-maintained wiki pages (Obsidian-compatible)
- \`sources/\` — Raw source documents, date-partitioned (immutable)
- \`log.md\` — Append-only operation log
- \`.llm-wiki/\` — Config and sync state

## Rules

1. Always read \`purpose.md\` and \`schema.md\` before any operation
2. Never modify files in \`sources/\` — they are immutable raw inputs
3. Use \`[[wikilinks]]\` for cross-references between wiki pages
4. Append every operation to \`log.md\`
5. Run \`llm-wiki sync\` after making changes
`;

const AGENTS_MD_TEMPLATE = `# AGENTS.md

This workspace is an LLM Wiki vault. Use the \`llm-wiki\` skill for all wiki operations.

## Quick Start

- Read \`purpose.md\` — wiki scope and audience
- Read \`schema.md\` — structure and naming rules
- Use \`/ingest <path>\`, \`/query <question>\`, \`/lint\`, \`/research <topic>\`

## Layout

- \`wiki/\` — AI-maintained wiki pages
- \`sources/\` — Raw source documents, date-partitioned (immutable)
- \`log.md\` — Append-only operation log
- \`.llm-wiki/\` — Config and sync state

## Rules

1. Always read \`purpose.md\` and \`schema.md\` before any operation
2. Never modify files in \`sources/\` — they are immutable raw inputs
3. Use \`[[wikilinks]]\` for cross-references between wiki pages
4. Append every operation to \`log.md\`
5. Run \`llm-wiki sync\` after making changes
`;

export const initCommand = new Command('init')
  .description('Initialize a new llm-wiki vault')
  .argument('[directory]', 'directory to initialize', '.')
  .action((directory: string) => {
    const targetDir = join(process.cwd(), directory);

    // Check if already initialized
    if (findVaultRoot(targetDir)) {
      console.error('Error: This directory is already inside an llm-wiki vault.');
      process.exit(1);
    }

    const paths = vaultPaths(targetDir);

    // Create directories
    mkdirSync(paths.wiki, { recursive: true });
    mkdirSync(paths.sources, { recursive: true });
    mkdirSync(paths.llmWikiDir, { recursive: true });

    // Install skills first (before vault marker) so a failure here leaves
    // the dir in a re-runnable state instead of half-initialized.
    // overwrite=false so a user's customized skill file is preserved.
    const claudeSkills = installSkillsTo(paths.claudeSkillsDir, false);
    const agentsSkills = installSkillsTo(paths.agentsSkillsDir, false);

    // Create files (only if they don't exist)
    const filesToCreate: [string, string][] = [
      [paths.purpose, PURPOSE_TEMPLATE],
      [paths.schema, SCHEMA_TEMPLATE],
      [paths.config, CONFIG_TEMPLATE],
      [paths.log, LOG_TEMPLATE],
      [paths.claudeMd, CLAUDE_MD_TEMPLATE],
      [paths.agentsMd, AGENTS_MD_TEMPLATE],
    ];

    for (const [path, content] of filesToCreate) {
      if (!existsSync(path)) {
        writeFileSync(path, content);
      }
    }

    const skillSummary = (r: { installed: string[]; skipped: string[] }) => {
      const parts: string[] = [];
      if (r.installed.length) parts.push(`${r.installed.length} installed`);
      if (r.skipped.length) parts.push(`${r.skipped.length} kept`);
      return parts.join(', ') || 'no skills';
    };

    console.log(`Initialized llm-wiki vault in ${targetDir}`);
    console.log('');
    console.log('Created:');
    console.log('  wiki/           — AI-maintained wiki pages');
    console.log('  sources/        — Raw source documents');
    console.log('  purpose.md      — Wiki purpose and scope');
    console.log('  schema.md       — Page conventions and structure');
    console.log('  log.md          — Change log');
    console.log('  CLAUDE.md       — Agent bootstrap (Claude Code)');
    console.log('  AGENTS.md       — Agent bootstrap (Codex)');
    console.log('  .llm-wiki/      — Config and state');
    console.log(`  .claude/skills/ — ${skillSummary(claudeSkills)}`);
    console.log(`  .agents/skills/ — ${skillSummary(agentsSkills)}`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Edit purpose.md to define your wiki\'s scope');
    console.log('  2. Edit schema.md to set naming conventions');
    console.log('  3. Use your AI agent with /ingest to start building the wiki');
    console.log('');
    console.log('To upgrade skills later: `llm-wiki skill install`');
  });
