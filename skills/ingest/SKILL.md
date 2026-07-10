---
name: ingest
description: Ingest source material into an LLM Wiki vault. Use whenever the user invokes `/ingest`, asks to turn documents, notes, chats, or URLs into durable wiki knowledge, or asks to create or update interconnected wiki pages from source material.
---

# Ingest an LLM Wiki source

Turn a source into concise, attributable, interconnected wiki pages. The wiki
is the maintained knowledge layer; `sources/` is the immutable evidence layer.

## Before editing

1. Locate the vault by finding `.llm-wiki/config.toml`.
2. Read `wiki-purpose.md`, `wiki-schema.md`, and `wiki-agent.md` when present.
   The latter defines vault-specific MUST / MAY / NEVER ingest criteria.
3. Skip material that the agent policy excludes, contains credentials or
   personal data, or duplicates existing knowledge.
4. If the vault is empty, agree with the user on language, page layout,
   directory structure, and filename conventions before creating pages.
5. If the material would change established scope, page boundaries, naming, or
   linking strategy, present the proposed structure before editing. Apply
   straightforward additions directly.

## Workflow

1. Check `wiki/`, `wiki-log.md`, and `llm-wiki search` for prior ingestion of
   the source or its topics. Re-ingest only changed or newly useful material.
2. Copy raw input to `sources/YYYY-MM-DD/`, preserving its original name. Add
   a version suffix if needed. Once saved, never edit that copy. Split large
   chat logs or collections by date or topic before saving.
3. Extract claims, entities, decisions, open questions, and relationships.
4. Create or merge focused pages in `wiki/`. Every page needs the fields
   required by `wiki-schema.md`; normally this includes:

   ```yaml
   ---
   title: Page Title
   description: One-line summary
   aliases: [alternate names]
   tags: [taxonomy tags]
   sources: [YYYY-MM-DD/source.md]
   created: YYYY-MM-DD
   updated: YYYY-MM-DD
   ---
   ```

   Bug or issue pages also need machine-readable `status: open | resolved |
   wontfix`.
5. Merge rather than overwrite. When sources conflict, preserve both claims,
   identify their sources, and flag the conflict rather than silently choosing
   one.
6. Add `[[wikilinks]]` for related entities, including useful not-yet-created
   pages, and finish each page with a `## Related` section.
7. Append a concise `## [YYYY-MM-DD] ingest | …` entry to `wiki-log.md` with
   pages created or updated.
8. Run `llm-wiki sync` after the changes.

## Quality bar

- Summarize rather than copy source text.
- Keep every claim traceable through `sources` frontmatter.
- Keep each page about one topic; split pages that become multi-topic.
- Write in the language specified in `.llm-wiki/config.toml`.
