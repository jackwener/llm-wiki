# Ingest

Process new source material into the wiki.

## Usage

`/ingest <path-or-url>` — Ingest a file, directory, or URL into the wiki.

## Steps

1. Read `purpose.md` and `schema.md` to understand the wiki's scope, page types, naming conventions, and structure rules.
2. Read the source material provided by the user.
3. Decide whether this ingest needs discussion before editing wiki pages:
   - If the wiki already has a clear structure and the change is only a small addition or minor refinement that fits the existing framework, proceed directly.
   - If the ingest would change structure, naming, scope, page boundaries, or linking strategy in a non-obvious way, discuss the plan with the user first.
   - When discussion is needed, summarize the proposed new pages, updated pages, naming, and link strategy before editing.
4. If the wiki is still empty, do not start writing pages immediately:
   - First discuss and agree on the wiki's organization rules with the user.
   - Cover at least directory structure, whether to use subdirectories, wiki language, and filename format.
   - After agreement, write those rules into `schema.md` before ingesting content.
5. Copy the raw source into `sources/` using date-based storage rules:
   - A single file goes to `sources/YYYY-MM-DD/<original-filename>`
   - A directory goes to `sources/YYYY-MM-DD/<original-directory>/`
   - Preserve the original file or directory name whenever possible.
   - If a name already exists inside that date folder, rename with a version suffix.
6. Run `llm-wiki search` or scan `wiki/` to see existing wiki pages.
7. Analyze the source content and decide:
   - Which new wiki pages to create
   - Which existing pages to update with new information
   - What cross-references to add using `[[wikilinks]]`
   - A single source may touch 5–15 wiki pages.
8. Write/update markdown files in `wiki/` with proper frontmatter:
   ```yaml
   ---
   title: Page Title
   description: One-line summary
   aliases: [alternate names]
   tags: [domain-specific tags from schema.md]
   sources: [YYYY-MM-DD/source-filename.md]
   created: YYYY-MM-DD
   updated: YYYY-MM-DD
   ---
   ```
   - The `sources` field is **required**. List paths relative to `sources/`, without the `sources/` prefix.
   - When updating an existing page, **merge** new information. Do not overwrite unless contradicted by a more authoritative or recent source. If contradicted, note the conflict with both sources cited.
   - Use `[[wikilinks]]` generously — every entity mention that has (or should have) its own page gets a link.
   - Keep pages focused on a single topic. If a section grows too large, split into its own page.
   - Add a `## Related` section at the bottom: `- [[page-name]] — one-line relationship description`
9. Add frontmatter to the source document:
   ```yaml
   ---
   ingested: YYYY-MM-DD
   wiki_pages: [list of wiki pages created/updated]
   ---
   ```
10. Append an entry to `log.md`:
    ```
    ## [YYYY-MM-DD] ingest | Source Title
    - created `page-name` — reason
    - updated `page-name` — what changed
    ```
11. Run `llm-wiki sync` to update the search index.

## Guidelines

- Each page should focus on a single topic.
- Write in clear, concise prose. Summarize, don't copy.
- Always add cross-references between related pages.
- If you reference an entity that doesn't have a wiki page yet, still use `[[wikilink]]` — it creates a discoverable "wanted page."
- Ingestion should be collaborative when structure, naming, or scope is uncertain, but straightforward additions within an established framework can be applied directly.
- Use descriptive slugs following `schema.md` conventions.
- The `sources` field in frontmatter is mandatory — every claim must be traceable.
