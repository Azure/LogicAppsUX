# Squad AI — LogicAppsUX

Squad is a multi-agent coordination layer for this monorepo. It routes tasks to specialized agents based on file paths and domain ownership, preventing conflicts and keeping each agent focused.

## How It Works

1. A task arrives (PR, issue, or prompt).
2. **[routing.md](routing.md)** maps changed file paths to the owning agent(s).
3. Each agent reads its charter (`.squad/agents/<name>/charter.md`) for scope, boundaries, and knowledge references.
4. Cross-cutting changes spawn multiple agents; they coordinate via **[decisions.md](decisions.md)**.

## Key Files

| File | Purpose |
|------|---------|
| [config.json](config.json) | Squad version and platform settings |
| [team.md](team.md) | Team roster, stack, directory ownership |
| [routing.md](routing.md) | File-path → agent routing table |
| [decisions.md](decisions.md) | Cross-agent decision log |
| `agents/<name>/charter.md` | Per-agent identity, scope, boundaries |

## Quick Start

- **Adding a feature?** Check `routing.md` to find the owning agent, then read its charter.
- **Cross-cutting change?** The routing table tells you which agents to spawn. They'll coordinate via `decisions.md`.
- **New agent needed?** Create `agents/<name>/charter.md` following existing charters as templates, then add routes in `routing.md` and an entry in `team.md`.
