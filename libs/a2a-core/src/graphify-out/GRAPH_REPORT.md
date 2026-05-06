# Graph Report - src  (2026-05-06)

## Corpus Check
- 139 files · ~79,356 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 817 nodes · 920 edges · 201 communities (175 shown, 26 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 70 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 49|Community 49]]

## God Nodes (most connected - your core abstractions)
1. `SessionManager` - 22 edges
2. `A2AClient` - 18 edges
3. `HttpClient` - 18 edges
4. `ChatInterface` - 18 edges
5. `SessionManager` - 18 edges
6. `ChatInterface` - 17 edges
7. `SSEClient` - 16 edges
8. `ServerHistoryStorage` - 14 edges
9. `SSEClient` - 13 edges
10. `HttpClient` - 13 edges

## Surprising Connections (you probably didn't know these)
- `ExampleWithHooks()` --calls--> `useA2A()`  [INFERRED]
  examples/obo-authentication.ts → react/use-a2a.ts
- `manualAuthFlow()` --calls--> `openPopupWindow()`  [INFERRED]
  examples/obo-authentication.ts → utils/popup-window.ts
- `messageHandler()` --calls--> `validatePopupUrl()`  [INFERRED]
  client/a2a-client.ts → utils/popup-window.ts
- `MessageComponent()` --calls--> `sanitizeHtml()`  [INFERRED]
  react/components/Message/Message.tsx → utils/sanitize.ts
- `formatErrorMessage()` --calls--> `extractErrorDetails()`  [INFERRED]
  react/utils/errorUtils.ts → types/errors.ts

## Communities (201 total, 26 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (18): messageHandler(), HttpClient, A2AError, AuthenticationError, createJsonRpcError(), extractErrorDetails(), isJsonRpcErrorResponse(), JsonRpcErrorResponse (+10 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (12): AgentDiscovery, HistoryApiClient, extractAuthEventFromMessage(), extractLastMessage(), isAuthRequiredMessage(), parseServerDate(), transformContext(), transformMessage() (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (13): ExampleWithHooks(), manualAuthFlow(), useChatWidget(), mergeTheme(), useTheme(), useA2A(), isDirectAgentCardUrl(), isPopupSupported() (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (8): createHistoryApi(), LoggerPlugin, ExampleWithHooks(), manualAuthFlow(), openPopupWindow(), SSEClient, useA2A(), useChatWidget()

### Community 4 - "Community 4"
Cohesion: 0.1
Nodes (11): createHistoryApi(), extractAuthEventFromMessage(), extractLastMessage(), isAuthRequiredMessage(), parseServerDate(), transformContext(), transformMessage(), transformMessageParts() (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.1
Nodes (3): LocalStoragePlugin, SessionManager, DataTransferPolyfill

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (11): A2AError, AuthenticationError, extractErrorDetails(), isJsonRpcErrorResponse(), JsonRpcErrorResponse, NetworkError, StreamingError, TaskError (+3 more)

### Community 8 - "Community 8"
Cohesion: 0.1
Nodes (5): A2AClient, MockSSEClient, errorHandler(), messageHandler(), MockEventSource

### Community 11 - "Community 11"
Cohesion: 0.16
Nodes (5): HttpClient, createJsonRpcResponseSchema(), createJsonRpcResultSchema(), isJsonRpcError(), isJsonRpcResult()

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (9): handleKeyDown(), handleSubmit(), StatusMessage(), createArtifactMessage(), createGroupedArtifactMessage(), createMessage(), formatCodeContent(), generateMessageId() (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.16
Nodes (9): CodeBlockHeader(), escapeAttr(), getLanguageFromFilename(), highlight(), link(), MessageComponent(), downloadFile(), getMimeType() (+1 more)

### Community 28 - "Community 28"
Cohesion: 0.36
Nodes (6): escapeAttr(), getLanguageFromFilename(), highlight(), link(), MessageComponent(), sanitizeHtml()

### Community 31 - "Community 31"
Cohesion: 0.38
Nodes (4): adjustBrightness(), createCustomTheme(), generateBrandVariants(), ChatThemeProvider()

### Community 32 - "Community 32"
Cohesion: 0.52
Nodes (6): createArtifactMessage(), createGroupedArtifactMessage(), createMessage(), formatCodeContent(), generateMessageId(), getLanguageFromFilename()

### Community 37 - "Community 37"
Cohesion: 0.6
Nodes (3): getAgentContextStorageKey(), getAgentMessagesStorageKey(), getAgentStorageIdentifier()

### Community 44 - "Community 44"
Cohesion: 0.83
Nodes (3): adjustBrightness(), createCustomTheme(), generateBrandVariants()

## Knowledge Gaps
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `A2AClient` connect `Community 18` to `Community 0`, `Community 2`, `Community 35`, `Community 36`, `Community 10`, `Community 20`, `Community 21`, `Community 22`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `SessionManager` connect `Community 6` to `Community 18`, `Community 10`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._