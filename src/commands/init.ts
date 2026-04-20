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

function agentTemplate(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `---
title: Wiki Agent
description: Agent identity, responsibilities, and auto-ingest rules for this vault
tags: [meta]
created: ${today}
updated: ${today}
---

# Wiki Agent

This page defines who the wiki agent is and how it behaves. The agent reads
this on startup (via CLAUDE.md/AGENTS.md) to understand its role.

## Identity

Describe the agent's role here. Example:

> I am the knowledge maintainer for [project name]. I observe discussions,
> extract valuable information, and organize it into structured wiki pages.

## Responsibilities

- Continuously ingest wiki-worthy information from received inputs
- Maintain accuracy and freshness of existing wiki pages
- Cross-reference related topics with [[wikilinks]]
- Never participate in discussions — observe and record only

## Ingest Rules

### MUST capture
- Decisions and their rationale
- Architecture and design conclusions
- Task/issue lifecycle events (created, assigned, completed)
- Bug reports and resolutions
- New systems, concepts, or processes

### MAY capture
- Unconfirmed proposals and ideas
- Tool and workflow discussions
- Performance observations

### NEVER capture
- Casual conversation and greetings
- Credentials, tokens, personal data
- Information already recorded in the wiki
- Emoji-only or single-word reactions

## Output Standards

- Write in the language specified in \`.llm-wiki/config.toml\`
- Each wiki page focuses on one topic
- Always include source attribution
- Use [[wikilinks]] for every entity that has or should have a page
- Append every action to wiki-log.md
`;
}

const CLAUDE_MD_TEMPLATE = `# LLM Wiki

This workspace is an LLM Wiki vault. Use the \`llm-wiki\` skill for all wiki
operations. The full skill (operation steps, schemas, examples) lives at
\`.claude/skills/llm-wiki.md\` and is loaded on demand by Claude Code.

## Agent Identity

You are a wiki maintenance agent. Your role is defined by this wiki itself —
read \`wiki-purpose.md\` for scope and \`wiki-agent.md\` (if it exists) for
detailed behavioral rules specific to this vault.

### Default Behavior (when wiki-agent.md is absent)

- You maintain this wiki by ingesting information from sources you receive
- When you receive new information, evaluate whether it is wiki-worthy
- If wiki-worthy: update or create wiki pages using the /ingest workflow
- If not wiki-worthy: ignore silently
- You do not need explicit \`/ingest\` commands to act — any information input
  that matches your ingest criteria should be processed automatically

### Auto-Ingest Criteria (defaults, override in wiki-agent.md)

**MUST capture:**
- Decisions (who decided what, when, why)
- Technical architecture and design discussions with conclusions
- Task/issue status changes
- Bug reports and their resolutions
- New concepts, systems, or processes introduced

**MAY capture (use judgment):**
- Ideas and proposals not yet confirmed
- Tool and workflow discussions

**NEVER capture:**
- Casual chat, greetings, emoji-only messages
- Credentials, tokens, personal information
- Duplicate information already in the wiki

## Layout

- \`wiki/\` — AI-maintained wiki pages (Obsidian-compatible)
- \`wiki-agent.md\` — Agent behavioral rules (optional, vault-specific)
- \`sources/\` — Raw source documents, date-partitioned (immutable)
- \`wiki-log.md\` — Append-only operation log
- \`.llm-wiki/\` — Config and sync state

## CLI

- \`llm-wiki search <query>\` — BM25 (+ vector, if DB9 configured) keyword search
- \`llm-wiki graph\` — communities, hubs, orphans, wanted pages
- \`llm-wiki status\` — stats + health summary
- \`llm-wiki sync\` — track mtime/SHA256, push embeddings to DB9 if configured

## Rules

1. Always read \`wiki-purpose.md\` and \`wiki-schema.md\` before any operation
2. Never modify files in \`sources/\` — they are immutable raw inputs
3. Use \`[[wikilinks]]\` for cross-references between wiki pages
4. After every operation, append an entry to \`wiki-log.md\` **and** run \`llm-wiki sync\`
5. When you receive information, apply your auto-ingest criteria — do not wait for explicit commands
`;

const AGENTS_MD_TEMPLATE = `# LLM Wiki

This workspace is an LLM Wiki vault. Use the \`llm-wiki\` skill for all wiki
operations. The full skill (operation steps, schemas, examples) lives at
\`.agents/skills/llm-wiki.md\` and is loaded on demand by Codex.

## Agent Identity

You are a wiki maintenance agent. Your role is defined by this wiki itself —
read \`wiki-purpose.md\` for scope and \`wiki-agent.md\` (if it exists) for
detailed behavioral rules specific to this vault.

### Default Behavior (when wiki-agent.md is absent)

- You maintain this wiki by ingesting information from sources you receive
- When you receive new information, evaluate whether it is wiki-worthy
- If wiki-worthy: update or create wiki pages using the /ingest workflow
- If not wiki-worthy: ignore silently
- You do not need explicit \`/ingest\` commands to act — any information input
  that matches your ingest criteria should be processed automatically

### Auto-Ingest Criteria (defaults, override in wiki-agent.md)

**MUST capture:**
- Decisions (who decided what, when, why)
- Technical architecture and design discussions with conclusions
- Task/issue status changes
- Bug reports and their resolutions
- New concepts, systems, or processes introduced

**MAY capture (use judgment):**
- Ideas and proposals not yet confirmed
- Tool and workflow discussions

**NEVER capture:**
- Casual chat, greetings, emoji-only messages
- Credentials, tokens, personal information
- Duplicate information already in the wiki

## Layout

- \`wiki/\` — AI-maintained wiki pages (Obsidian-compatible)
- \`wiki-agent.md\` — Agent behavioral rules (optional, vault-specific)
- \`sources/\` — Raw source documents, date-partitioned (immutable)
- \`wiki-log.md\` — Append-only operation log
- \`.llm-wiki/\` — Config and sync state

## CLI

- \`llm-wiki search <query>\` — BM25 (+ vector, if DB9 configured) keyword search
- \`llm-wiki graph\` — communities, hubs, orphans, wanted pages
- \`llm-wiki status\` — stats + health summary
- \`llm-wiki sync\` — track mtime/SHA256, push embeddings to DB9 if configured

## Rules

1. Always read \`wiki-purpose.md\` and \`wiki-schema.md\` before any operation
2. Never modify files in \`sources/\` — they are immutable raw inputs
3. Use \`[[wikilinks]]\` for cross-references between wiki pages
4. After every operation, append an entry to \`wiki-log.md\` **and** run \`llm-wiki sync\`
5. When you receive information, apply your auto-ingest criteria — do not wait for explicit commands
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
      [paths.agent, agentTemplate()],
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
    console.log('  wiki/            — AI-maintained wiki pages');
    console.log('  sources/         — Raw source documents');
    console.log('  wiki-purpose.md  — Wiki purpose and scope');
    console.log('  wiki-schema.md   — Page conventions and structure');
    console.log('  wiki-agent.md    — Agent identity and ingest rules');
    console.log('  wiki-log.md      — Change log');
    console.log('  CLAUDE.md        — Agent bootstrap (Claude Code)');
    console.log('  AGENTS.md        — Agent bootstrap (Codex)');
    console.log('  .llm-wiki/       — Config and state');
    console.log(`  .claude/skills/  — ${skillSummary(claudeSkills)}`);
    console.log(`  .agents/skills/  — ${skillSummary(agentsSkills)}`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Edit wiki-purpose.md to define your wiki\'s scope');
    console.log('  2. Edit wiki-schema.md to set naming conventions');
    console.log('  3. Use your AI agent with /ingest to start building the wiki');
    console.log('');
    console.log('To upgrade skills later: `llm-wiki skill install`');
  });
