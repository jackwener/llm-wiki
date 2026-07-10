---
name: query
description: Answer questions from an LLM Wiki vault. Use whenever the user invokes `/query`, asks what the wiki knows about a topic, or needs an evidence-grounded synthesis of existing wiki pages and their links.
---

# Query an LLM Wiki

Answer from the maintained wiki, then capture only durable synthesis that makes
future queries more useful.

## Workflow

1. Find the vault and read `wiki-purpose.md`; confirm that the question falls
   within its intended scope. Read `wiki-schema.md` for local conventions.
2. Search with `llm-wiki search "<question>"`. Use `--bm25-only` only when
   vector search is unavailable or inappropriate. Scan `wiki/` for exact terms
   if needed.
3. Read the matched pages and follow relevant `[[wikilinks]]` and `## Related`
   sections. Use the graph as context rather than treating search ranking as
   the answer.
4. Give a direct answer grounded in the pages. Cite pages as `[[slug]]`, state
   uncertainty, distinguish evidence from inference, and surface conflicts or
   gaps instead of guessing.
5. If the wiki lacks enough evidence, say so and suggest specific material to
   ingest. Do not fill gaps from unsaved external knowledge.

## When knowledge should compound

Write back only a non-trivial, high-confidence synthesis: for example, a new
connection among at least three pages, a resolved contradiction, or a useful
comparison absent from all source pages. Do not create a page for a simple
lookup or speculative conclusion.

For a durable synthesis, create a focused wiki page with complete frontmatter:

```yaml
---
title: Synthesis Title
description: One-line summary
tags: [synthesis]
sources: [contributing-page-slugs]
source_type: query-synthesis
created: YYYY-MM-DD
updated: YYYY-MM-DD
---
```

Link it to the contributing pages, append a `query` entry to `wiki-log.md`,
and run `llm-wiki sync`. Do not modify anything under `sources/`.
