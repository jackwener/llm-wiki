---
name: lint
description: Audit and safely maintain an LLM Wiki vault. Use whenever the user invokes `/lint`, asks to check wiki quality or health, or asks to find and optionally repair broken links, missing frontmatter, stale pages, orphan pages, source drift, or duplicate topics.
---

# Lint an LLM Wiki

Audit structural integrity and knowledge quality. Read `wiki-schema.md` first;
it is the authority for page types, fields, naming, and tags.

## Scan

Inspect all `wiki/` pages and `sources/` files, then use `llm-wiki graph` to
cross-check the wikilink graph. Report these categories:

- **Structural:** broken links, orphan pages, wanted pages, missing required
  frontmatter, missing aliases, naming violations, and duplicate topics.
- **Content:** conflicting claims, stale pages whose sources changed, unsourced
  claims, and pages too shallow to be useful.
- **Sources:** unreferenced or untracked source material and source drift.

## Report

Present the findings before changing files unless the user explicitly passed
`--fix`. Use this structure:

```markdown
## Lint Report — YYYY-MM-DD

### Summary
- Total pages: N | Total sources: N
- Issues: N (critical: X, warning: Y, info: Z)

### Critical
### Warning
### Info
```

Always write the same result in `.llm-wiki/lint-result.yaml` with date,
summary counts, and issue objects (`type`, `severity`, `page`, `detail`).

## Fixes

With `--fix`, repair only safe, evidence-preserving issues: add missing
frontmatter defaults, repair or remove plainly invalid links, add clearly
relevant backlinks, and merge unambiguous duplicates while retaining aliases.
Never auto-resolve a contradiction. Do not edit raw files under `sources/`.

Record fixes and unresolved findings in `wiki-log.md`. Run `llm-wiki sync`
when changes were made.
