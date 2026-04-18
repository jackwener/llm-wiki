import { Command } from 'commander';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { findVaultRoot, vaultPaths } from '../lib/config.js';

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

    // Create files (only if they don't exist)
    const filesToCreate: [string, string][] = [
      [paths.purpose, PURPOSE_TEMPLATE],
      [paths.schema, SCHEMA_TEMPLATE],
      [paths.config, CONFIG_TEMPLATE],
      [paths.log, LOG_TEMPLATE],
    ];

    for (const [path, content] of filesToCreate) {
      if (!existsSync(path)) {
        writeFileSync(path, content);
      }
    }

    console.log(`Initialized llm-wiki vault in ${targetDir}`);
    console.log('');
    console.log('Created:');
    console.log('  wiki/           — AI-maintained wiki pages');
    console.log('  sources/        — Raw source documents');
    console.log('  purpose.md      — Wiki purpose and scope');
    console.log('  schema.md       — Page conventions and structure');
    console.log('  log.md          — Change log');
    console.log('  .llm-wiki/      — Config and state');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Edit purpose.md to define your wiki\'s scope');
    console.log('  2. Edit schema.md to set naming conventions');
    console.log('  3. Run `llm-wiki skill install` to install the wiki skill');
    console.log('  4. Use your AI agent with /ingest to start building the wiki');
  });
