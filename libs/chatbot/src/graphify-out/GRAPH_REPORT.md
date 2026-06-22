# Graph Report - src  (2026-06-22)

## Corpus Check
- 17 files · ~6,787 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 48 nodes · 65 edges · 7 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d59cb30b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]

## God Nodes (most connected - your core abstractions)
1. `useChatbotStyles` - 5 edges
2. `mockUseIntl()` - 4 edges
3. `CopilotPanelHeader()` - 4 edges
4. `ChatbotUI()` - 3 edges
5. `AssistantChat()` - 3 edges
6. `RequestData` - 2 edges
7. `isSuccessResponse()` - 2 edges
8. `CoPilotChatbot()` - 2 edges
9. `cache` - 1 edges
10. `intl` - 1 edges

## Surprising Connections (you probably didn't know these)
- `ChatbotUI()` --calls--> `useChatbotStyles`  [EXTRACTED]
  lib/ui/ChatbotUi.tsx → lib/ui/styles.ts
- `CopilotPanelHeader()` --calls--> `useChatbotStyles`  [EXTRACTED]
  lib/ui/panelheader.tsx → lib/ui/styles.ts

## Import Cycles
- None detected.

## Communities (7 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.21
Nodes (5): RequestData, ResponseData, CoPilotChatbot(), CoPilotChatbotProps, isSuccessResponse()

### Community 1 - "Community 1"
Cohesion: 0.18
Nodes (8): capturedAssistantChatProps, defaultProps, mockGetCopilotResponse, mockGetWorkflowEdit, mockWorkflow, cache, intl, mockUseIntl()

### Community 2 - "Community 2"
Cohesion: 0.25
Nodes (7): ApiHubAuthentication, ConnectionReference, ConnectionReferences, Impersonation, ImpersonationSource, ReferenceKey, WorkflowParameter

### Community 3 - "Community 3"
Cohesion: 0.38
Nodes (3): AssistantChat(), ChatbotUI(), ChatbotUIProps

### Community 4 - "Community 4"
Cohesion: 0.43
Nodes (3): CopilotPanelHeader(), useChatbotDarkStyles, useChatbotStyles

## Knowledge Gaps
- **18 isolated node(s):** `cache`, `intl`, `ResponseData`, `ConnectionReference`, `ApiHubAuthentication` (+13 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `mockUseIntl()` connect `Community 1` to `Community 3`, `Community 4`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `CopilotPanelHeader()` connect `Community 4` to `Community 0`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `AssistantChat()` connect `Community 3` to `Community 0`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `cache`, `intl`, `ResponseData` to the rest of the system?**
  _18 weakly-connected nodes found - possible documentation gaps or missing edges._