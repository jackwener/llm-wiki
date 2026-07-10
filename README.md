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
agent bootstrap files (`CLAUDE.md`, `AGENTS.md`), and installs the four bundled
operation skills into `.claude/skills/` and `.agents/skills/` in one step.

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
│       ├── ingest/SKILL.md    # Source → wiki pages
│       ├── query/SKILL.md     # Evidence-grounded wiki answers
│       ├── lint/SKILL.md      # Wiki health checks
│       └── research/SKILL.md  # External research → wiki
├── .agents/
│   └── skills/
│       ├── ingest/SKILL.md
│       ├── query/SKILL.md
│       ├── lint/SKILL.md
│       └── research/SKILL.md
└── .llm-wiki/
    ├── config.toml        # Vault configuration
    └── sync-state.json    # Incremental sync tracking
```

`llm-wiki init` generates every file above in one step.

## Agent Bootstrap

LLM Wiki uses a two-file pattern so any AI agent can operate the vault out of
the box, with no manual setup beyond `llm-wiki init`:

**1. Entry files — `CLAUDE.md` and `AGENTS.md` (vault root)**

Short bootstrap documents that are **auto-loaded on every session start** —
Claude Code reads `CLAUDE.md`, Codex reads `AGENTS.md`. They tell the agent:

- this workspace is an LLM Wiki vault
- where to find `wiki-purpose.md` and `wiki-schema.md`
- which `/ingest`, `/query`, `/lint`, `/research` commands are available
- which of the four operation skills to load (`ingest`, `query`, `lint`, or
  `research`)
- a short CLI cheat-sheet and the core operating rules

Because they are auto-loaded, they are intentionally small — a few dozen
lines — to keep session-start context cheap.

**2. Operation skills — `.claude/skills/{ingest,query,lint,research}/SKILL.md`
and `.agents/skills/{ingest,query,lint,research}/SKILL.md`**

Each operation has a focused playbook, **loaded on demand** when the matching
command is invoked. The skills contain the relevant procedure, page schemas,
frontmatter rules, and invariants (for example, source immutability and the
wiki-log.md + sync tail rule). Every skill follows the
[Agent Skills specification](https://agentskills.io/specification)
(`skills/<name>/SKILL.md` with YAML frontmatter), so spec-compliant agents
(Claude Code, Codex, Amp, and others) discover them independently. All four
are installed into both platform directories for a shared vault setup.

**Upgrading.** `llm-wiki init` is the only setup command — it writes both
entry files and installs the four skills. After upgrading the npm package, run
`llm-wiki skill install` to refresh the skill files. Your edits to
`CLAUDE.md` / `AGENTS.md` are preserved across reinstalls.

**Upgrading to the four-skill layout.** Run `llm-wiki skill install` to add
the operation skills. If you previously installed the legacy monolithic skill,
remove it afterwards so its broad trigger does not overlap the four focused
skills:

```bash
rm -rf .claude/skills/llm-wiki .agents/skills/llm-wiki
```

## Operations

The skill exposes four operations, each invoked as a slash command:

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
