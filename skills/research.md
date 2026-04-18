# Research

Deep-dive investigation that goes beyond existing wiki content.

## Usage

`/research <topic>` — Research a topic, gather external sources, and ingest findings into the wiki.

## Steps

1. Read `purpose.md` — confirm the topic is within the wiki's domain.
2. Read `schema.md` — understand page types and naming conventions.
3. Run a **Query** first — understand what the wiki already knows. Identify knowledge gaps.
4. Define a clear research question and scope. Avoid scope creep.
5. Search for high-quality external sources. Prioritize:
   - Primary sources (official docs, papers, original announcements)
   - Authoritative secondary sources (well-known publications, expert blogs)
   - Recency — prefer recent sources for fast-moving topics
6. For each source found, save to `sources/YYYY-MM-DD/` with frontmatter:
   ```yaml
   ---
   title: Source Title
   url: https://original-url
   author: Author Name
   date: YYYY-MM-DD
   retrieved: YYYY-MM-DD
   type: article | paper | documentation | blog | video-transcript
   ---
   ```
7. For each new source, run the **Ingest** procedure:
   - Extract key entities and claims
   - Create or update wiki pages
   - Add cross-references
   - Mark source as ingested
8. After all sources are ingested, write a research summary and present to the user:
   ```
   ## Research Report: [Topic]

   ### Question
   [The original research question]

   ### Findings
   [Synthesized answer based on all sources]

   ### Sources Added
   - sources/YYYY-MM-DD/source-1.md — what it contributed

   ### Wiki Pages Created/Updated
   - [[page-1]] — what was added

   ### Remaining Gaps
   - What still couldn't be answered
   - Suggested follow-up research
   ```
9. If the research produced novel synthesis, create a synthesis page following Query's compounding rules.
10. Append to `log.md`:
    ```
    ## [YYYY-MM-DD] research | Topic Summary
    - added N sources
    - created `page-name` — reason
    - updated `page-name` — what changed
    ```
11. Run `llm-wiki sync`.

## Guidelines

- **Source diversity** — Don't rely on a single source. Cross-reference claims across 2+ sources.
- **Recency** — Note publication dates. Flag information older than 2 years for fast-moving fields.
- **Attribution** — Every claim must be traceable to a source via `sources` frontmatter.
- **Scope discipline** — Stay within the research question. Note interesting tangents as "suggested follow-up" but don't pursue them.
- Research is the most expensive operation — it calls Query, then gathers external sources, then calls Ingest for each. Use when Query alone isn't sufficient.
