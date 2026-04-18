# Lint

Health-check the wiki for issues.

## Usage

`/lint` — Run a full wiki health check.
`/lint <page>` — Lint a specific page and its immediate neighbors.
`/lint --fix` — Auto-fix safe issues after reporting.

## Steps

1. Read `schema.md` to understand expected structure, naming conventions, and required frontmatter fields.
2. Scan all pages in `wiki/` and all files in `sources/`.
3. Build a link graph — for each page, extract all `[[wikilinks]]`.
4. Check for issues in three categories:

### Structural Issues
- **Broken links**: `[[wikilinks]]` pointing to non-existent pages
- **Orphan pages**: Pages with no incoming links from other pages
- **Missing frontmatter**: Pages lacking required fields (title, description, tags, sources, updated)
- **Naming violations**: Page names that don't follow `schema.md` conventions
- **Duplicate topics**: Multiple pages covering the same entity/concept (check `aliases`)

### Content Issues
- **Contradictions**: Pages making conflicting claims about the same topic (compare pages sharing `[[wikilinks]]` or tags)
- **Stale content**: Pages whose `updated` date is older than their sources' modification dates
- **Unsourced claims**: Pages with empty or missing `sources` in frontmatter
- **Shallow pages**: Pages with < 3 sentences (excluding frontmatter) that should be expanded or merged

### Source Issues
- **Uningested sources**: Files in `sources/` without an `ingested` date in frontmatter
- **Source drift**: Sources whose content changed since their `ingested` date

5. Present a structured report:
   ```
   ## Lint Report — YYYY-MM-DD

   ### Summary
   - Total pages: N | Total sources: N
   - Issues: N (critical: X, warning: Y, info: Z)

   ### Critical
   - **Broken link**: [[page-a]] → [[nonexistent]]
   - **Contradiction**: [[page-b]] vs [[page-c]] on topic Z

   ### Warning
   - **Orphan**: [[page-d]] — no incoming links
   - **Stale**: [[page-e]] — not updated since YYYY-MM-DD
   - **Unsourced**: [[page-f]] — no sources listed

   ### Info
   - **Shallow**: [[page-g]] — 2 sentences, consider expanding
   - **Wanted**: [[unwritten-page]] — linked from 3 pages
   - **Uningested**: sources/YYYY-MM-DD/new-article.md
   ```

6. If `--fix` is requested, apply safe fixes:

| Issue | Auto-Fix |
|-------|----------|
| Broken link | Remove the link or create a stub page |
| Missing frontmatter | Add required fields with sensible defaults |
| Orphan page | Add links from related pages (find by tag/topic) |
| Stale content | Re-read source and update the page (mini-ingest) |
| Duplicate topics | Merge into one page, add alias for the other |
| Shallow page | Expand from sources, or merge into related page |

7. **Never auto-fix contradictions** — report for human review.
8. Append to `log.md`:
   ```
   ## [YYYY-MM-DD] lint | Health Check
   - fixed `page-name` — fix description
   - flagged `page-name` — needs human review
   ```
9. Run `llm-wiki sync` if any changes were made.

## Guidelines

- Always present findings before making changes.
- Wait for user confirmation before applying fixes (unless `--fix` was explicitly requested).
- Prefer merging over deleting when handling duplicates.
- Contradictions require human judgment — never auto-resolve.
- Run lint periodically to keep the wiki healthy as it grows.
