# Graph Report - src  (2026-05-06)

## Corpus Check
- 31 files · ~4,796 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 102 nodes · 78 edges · 60 communities (57 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `299674b2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]

## God Nodes (most connected - your core abstractions)
1. `HttpClient` - 10 edges
2. `HttpClient` - 9 edges
3. `JwtTokenHelper` - 5 edges
4. `isArmResourceId()` - 5 edges
5. `JwtTokenHelper` - 5 edges
6. `isArmResourceId()` - 5 edges
7. `isSuccessResponse()` - 4 edges
8. `parseResponse()` - 4 edges
9. `isSuccessResponse()` - 4 edges
10. `parseResponse()` - 4 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities (60 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.26
Nodes (6): getExtraHeaders(), HttpClient, isArmResourceId(), isSuccessResponse(), isUrl(), parseResponse()

### Community 1 - "Community 1"
Cohesion: 0.29
Nodes (6): getExtraHeaders(), HttpClient, isArmResourceId(), isSuccessResponse(), isUrl(), parseResponse()

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Not enough signal to generate questions. This usually means the corpus has no AMBIGUOUS edges, no bridge nodes, no INFERRED relationships, and all communities are tightly cohesive. Add more files or run with --mode deep to extract richer edges._