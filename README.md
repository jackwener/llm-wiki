# LLM Wiki

Agent-native persistent knowledge management — compile knowledge once, query forever.

Based on [Andrej Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

## What is this?

LLM Wiki is a CLI tool + AI Agent skill system that maintains an evolving, interconnected Markdown knowledge base. Instead of traditional RAG (re-deriving answers from raw documents each time), LLM Wiki **compiles** knowledge into structured wiki pages that AI agents maintain and grow over time.

**Key principle:** The tool itself doesn't call LLMs. It provides skill files that let any AI agent (Claude Code, Codex, etc.) operate the wiki. Obsidian is the human interface — no self-built GUI.

## Quick Start

```bash
# Install globally
npm install -g @jackwener/llm-wiki

# Initialize a new wiki vault
mkdir my-wiki && cd my-wiki
llm-wiki init

# Now use your AI agent:
#   /ingest sources/some-article.md
#   /query "What do we know about X?"
#   /lint
#   /research "deep dive on Y"
```

`llm-wiki init` is the only setup command — it creates the vault files, the
agent bootstrap files (`CLAUDE.md`, `AGENTS.md`), and installs the bundled
skill into `.claude/skills/` and `.agents/skills/` in one step.

After upgrading the package, refresh the installed skill files with:

```bash
llm-wiki skill install
```

## Vault Structure

```
my-wiki/
├── CLAUDE.md              # Agent bootstrap for Claude Code (auto-loaded)
├── AGENTS.md              # Agent bootstrap for Codex (auto-loaded)
├── wiki-purpose.md        # Wiki scope and audience
├── wiki-schema.md         # Page types, naming conventions, frontmatter rules
├── wiki-log.md            # Append-only operation log
├── wiki/                  # AI-maintained wiki pages (Obsidian-compatible)
├── sources/               # Raw, immutable source documents
│   └── YYYY-MM-DD/        # Date-based storage
├── .claude/
│   └── skills/
│       └── llm-wiki.md    # Skill file for Claude Code
├── .agents/
│   └── skills/
│       └── llm-wiki.md    # Skill file for Codex
└── .llm-wiki/
    ├── config.toml        # Vault configuration
    └── sync-state.json    # Incremental sync tracking
```

`llm-wiki init` generates every file above in one step. `CLAUDE.md` and
`AGENTS.md` at the vault root are loaded automatically by their respective
agents on session start, so the agent knows this workspace is a wiki vault
and picks up the bundled skill without manual configuration.

## Agent Skill

One unified skill (`llm-wiki.md`) with four operations:

| Operation | Usage | What it does |
|-----------|-------|-------------|
| **ingest** | `/ingest <path>` | Read source → extract entities → create/update wiki pages with `[[wikilinks]]` |
| **query** | `/query <question>` | Search wiki → synthesize answer → write back valuable insights (knowledge compounding) |
| **lint** | `/lint` | Health check: broken links, orphans, contradictions, stale content → auto-fix safe issues |
| **research** | `/research <topic>` | Go beyond wiki: search web → save sources → ingest → synthesize report |

## CLI Commands

| Command | Description |
|---------|-------------|
| `llm-wiki init [dir]` | Initialize a new wiki vault |
| `llm-wiki search <query>` | BM25 keyword search (+ DB9 vector search if configured) |
| `llm-wiki graph [--json]` | Analyze wikilink graph: communities, hubs, orphans, wanted pages |
| `llm-wiki status` | Wiki statistics and health summary |
| `llm-wiki sync [--dry-run]` | Track changes (mtime + SHA256), sync embeddings to DB9 |
| `llm-wiki skill install` | Install all skills to your AI agent workspace |
| `llm-wiki skill list` | List available skills |
| `llm-wiki skill show <name>` | Print skill content to stdout |

## Search

**BM25 keyword search** with CJK bigram tokenization (Chinese/Japanese/Korean support).

When DB9 is configured, search becomes **hybrid**: BM25 + vector similarity, merged via Reciprocal Rank Fusion (RRF, K=60).

```bash
llm-wiki search "distributed consensus"
llm-wiki search "分布式共识" -n 5
llm-wiki search "raft algorithm" --bm25-only
```

## Graph Analysis

Analyzes the `[[wikilink]]` graph to find structure in your knowledge:

- **Communities** — Topic clusters detected via label propagation
- **Hub pages** — Most connected pages (high incoming + outgoing links)
- **Orphan pages** — Pages with no incoming links
- **Wanted pages** — Pages linked but not yet created

```bash
llm-wiki graph          # Human-readable output
llm-wiki graph --json   # Machine-readable for programmatic use
```

## DB9 Integration (Optional)

[DB9](https://db9.ai) adds vector search and cloud sync:

- Server-side embeddings via `embedding(text)::vector(1024)` — no local model needed
- HNSW vector index for semantic similarity search
- Reverse source lookup: "which wiki pages reference this source?"

Enable by adding to `.llm-wiki/config.toml`:

```toml
[db9]
url = "your-db9-connection-string"
```

Then run `llm-wiki sync` to upload embeddings.

## Obsidian Compatibility

The `wiki/` directory is a standard Obsidian vault:
- YAML frontmatter
- `[[wikilink]]` cross-references
- Open directly in Obsidian for browsing, graph view, and editing

## Configuration

`.llm-wiki/config.toml`:

```toml
[vault]
name = "My Wiki"
language = "en"

# Optional: DB9 for vector search + cloud sync
# [db9]
# url = "your-db9-connection-string"
```

## Tech Stack

- TypeScript (ESM, Node 20+)
- [Commander.js](https://github.com/tj/commander.js/) — CLI framework
- [gray-matter](https://github.com/jonschlinkert/gray-matter) — Frontmatter parsing
- [pg](https://node-postgres.com/) — PostgreSQL client (for DB9)
- [tsup](https://tsup.egoist.dev/) — Build
- [Vitest](https://vitest.dev/) — Testing

## License

Apache-2.0
