# Graph Report - src  (2026-05-19)

## Corpus Check
- 17 files · ~6,787 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 96 nodes · 90 edges · 28 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `76fb15f7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]

## God Nodes (most connected - your core abstractions)
1. `useChatbotStyles` - 5 edges
2. `mockUseIntl()` - 4 edges
3. `CopilotPanelHeader()` - 4 edges
4. `ChatbotUI()` - 3 edges
5. `AssistantChat()` - 3 edges
6. `CoPilotChatbot()` - 2 edges
7. `isSuccessResponse()` - 2 edges
8. `RequestData` - 2 edges
9. `cache` - 1 edges
10. `intl` - 1 edges

## Surprising Connections (you probably didn't know these)
- `ChatbotUI()` --calls--> `useChatbotStyles`  [EXTRACTED]
  lib/ui/ChatbotUi.tsx → lib/ui/styles.ts
- `CopilotPanelHeader()` --calls--> `useChatbotStyles`  [EXTRACTED]
  lib/ui/panelheader.tsx → lib/ui/styles.ts

## Communities (28 total, 0 thin omitted)

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (13): abort, actual, { container }, input, messages, onDismiss, onSubmit, props (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (12): actual, capturedAssistantChatProps, closeChatBot, defaultProps, errorMessage, greeting, mockGetCopilotResponse, mockGetWorkflowEdit (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.17
Nodes (9): cache, intl, mockUseIntl(), { container }, heading, icon, protectedLink, protectedPill (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.28
Nodes (5): RequestData, ResponseData, CoPilotChatbot(), CoPilotChatbotProps, isSuccessResponse()

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (6): AssistantChat(), ChatbotUI(), ChatbotUIProps, CopilotPanelHeader(), useChatbotDarkStyles, useChatbotStyles

### Community 22 - "Community 22"
Cohesion: 0.25
Nodes (7): ApiHubAuthentication, ConnectionReference, ConnectionReferences, Impersonation, ImpersonationSource, ReferenceKey, WorkflowParameter

## Knowledge Gaps
- **44 isolated node(s):** `cache`, `intl`, `ChatbotUIProps`, `CoPilotChatbotProps`, `useChatbotDarkStyles` (+39 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `mockUseIntl()` connect `Community 19` to `Community 17`, `Community 18`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `AssistantChat()` connect `Community 21` to `Community 17`, `Community 20`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `CopilotPanelHeader()` connect `Community 21` to `Community 19`, `Community 20`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `cache`, `intl`, `ChatbotUIProps` to the rest of the system?**
  _44 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 17` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `Community 18` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._