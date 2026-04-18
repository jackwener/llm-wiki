# Query

Search the wiki and synthesize answers.

## Usage

`/query <question>` — Ask a question and get an answer based on wiki content.

## Steps

1. Read `purpose.md` to confirm the question is within the wiki's domain.
2. Use hybrid search to find relevant pages:
   - Run `llm-wiki search "<question>"` for semantic/BM25 search
   - Scan `wiki/` for exact keyword matching if needed
   - Combine results — semantic search catches related concepts, keyword search catches exact terms.
3. Read the returned markdown files from `wiki/`.
4. Follow `[[wikilinks]]` and `## Related` sections from matched pages to discover connected knowledge (graph walk).
5. Synthesize an answer that:
   - Directly addresses the user's question
   - Cites wiki pages using `[[wikilinks]]`: "According to [[page-name]], ..."
   - Notes any contradictions or knowledge gaps found
   - Distinguishes between well-sourced claims and inferences
6. If the wiki lacks information to answer, say so clearly and suggest sources to ingest.
7. If the answer produces **valuable new knowledge** (a comparison, connection, or synthesis not in any single page), write it back to the wiki:
   - Create a new wiki page with proper frontmatter:
     ```yaml
     ---
     title: Synthesis Title
     description: One-line summary
     tags: [synthesis]
     sources: [wiki pages that contributed]
     source_type: query-synthesis
     created: YYYY-MM-DD
     updated: YYYY-MM-DD
     ---
     ```
   - Add `[[wikilinks]]` connecting to source pages
   - Update cross-references on related pages
   - Append to `log.md`:
     ```
     ## [YYYY-MM-DD] query | Question Summary
     - created `page-name` — captured query synthesis
     ```
   - Run `llm-wiki sync`

## Guidelines

- Always ground answers in wiki content — don't fabricate.
- If the wiki lacks information, say so clearly rather than guessing.
- Use both search methods: `llm-wiki search` for semantic matches, file scanning for precise hits.
- **When to compound** (write back):
  - The answer connects 3+ wiki pages in a way not previously documented
  - The answer resolves a contradiction
  - The answer fills a knowledge gap with high-confidence synthesis
  - The user explicitly asks to save the answer
- **When NOT to compound**:
  - Simple lookup returning what's already on one page
  - Answer relies heavily on information outside the wiki
  - The synthesis is speculative or low-confidence
- Compounded pages must have complete frontmatter including `sources` and `source_type: query-synthesis`.
