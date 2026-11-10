# Graph Report - src  (2026-08-26)

## Corpus Check
- 17 files · ~6,787 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 94 nodes · 133 edges · 11 communities (10 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5c7453c9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- lib/ui/CopilotChatbot.tsx
- lib/ui/__test__/CopilotChatbot.spec.tsx
- lib/common/models/workflow.ts
- lib/ui/ChatbotUi.tsx
- src/lib/ui/ChatbotUi.tsx
- Svg.d.ts
- src/lib/ui/__test__/CopilotChatbot.spec.tsx
- src/lib/ui/CopilotChatbot.tsx
- src/lib/common/models/workflow.ts

## God Nodes (most connected - your core abstractions)
1. `useChatbotStyles` - 5 edges
2. `useChatbotStyles` - 5 edges
3. `mockUseIntl()` - 4 edges
4. `CopilotPanelHeader()` - 4 edges
5. `mockUseIntl()` - 4 edges
6. `CopilotPanelHeader()` - 4 edges
7. `isSuccessResponse()` - 3 edges
8. `defaultChatbotPanelWidth` - 3 edges
9. `ChatbotUI()` - 3 edges
10. `AssistantChat()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `CoPilotChatbot()` --calls--> `isSuccessResponse()`  [EXTRACTED]
  src/lib/ui/CopilotChatbot.tsx → src/lib/core/util/index.ts
- `ChatbotUI()` --calls--> `useChatbotStyles`  [EXTRACTED]
  src/lib/ui/ChatbotUi.tsx → src/lib/ui/styles.ts
- `CopilotPanelHeader()` --calls--> `useChatbotStyles`  [EXTRACTED]
  src/lib/ui/panelheader.tsx → src/lib/ui/styles.ts
- `ChatbotUI()` --calls--> `useChatbotStyles`  [EXTRACTED]
  lib/ui/ChatbotUi.tsx → lib/ui/styles.ts
- `CopilotPanelHeader()` --calls--> `useChatbotStyles`  [EXTRACTED]
  lib/ui/panelheader.tsx → lib/ui/styles.ts

## Import Cycles
- None detected.

## Communities (11 total, 1 thin omitted)

### Community 0 - "lib/ui/CopilotChatbot.tsx"
Cohesion: 0.21
Nodes (5): RequestData, ResponseData, CoPilotChatbot(), CoPilotChatbotProps, isSuccessResponse()

### Community 1 - "lib/ui/__test__/CopilotChatbot.spec.tsx"
Cohesion: 0.16
Nodes (8): capturedAssistantChatProps, defaultProps, mockGetCopilotResponse, mockGetWorkflowEdit, mockWorkflow, cache, intl, mockUseIntl()

### Community 2 - "lib/common/models/workflow.ts"
Cohesion: 0.25
Nodes (7): ApiHubAuthentication, ConnectionReference, ConnectionReferences, Impersonation, ImpersonationSource, ReferenceKey, WorkflowParameter

### Community 3 - "lib/ui/ChatbotUi.tsx"
Cohesion: 0.26
Nodes (6): AssistantChat(), ChatbotUI(), ChatbotUIProps, CopilotPanelHeader(), useChatbotDarkStyles, useChatbotStyles

### Community 4 - "src/lib/ui/ChatbotUi.tsx"
Cohesion: 0.21
Nodes (7): AssistantChat(), ChatbotUI(), ChatbotUIProps, defaultChatbotPanelWidth, CopilotPanelHeader(), useChatbotDarkStyles, useChatbotStyles

### Community 7 - "src/lib/ui/__test__/CopilotChatbot.spec.tsx"
Cohesion: 0.18
Nodes (8): cache, intl, mockUseIntl(), capturedAssistantChatProps, defaultProps, mockGetCopilotResponse, mockGetWorkflowEdit, mockWorkflow

### Community 8 - "src/lib/ui/CopilotChatbot.tsx"
Cohesion: 0.31
Nodes (5): RequestData, ResponseData, isSuccessResponse(), CoPilotChatbot(), CoPilotChatbotProps

### Community 9 - "src/lib/common/models/workflow.ts"
Cohesion: 0.25
Nodes (7): ApiHubAuthentication, ConnectionReference, ConnectionReferences, Impersonation, ImpersonationSource, ReferenceKey, WorkflowParameter

## Knowledge Gaps
- **37 isolated node(s):** `cache`, `intl`, `ResponseData`, `ConnectionReference`, `ApiHubAuthentication` (+32 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CopilotPanelHeader()` connect `lib/ui/ChatbotUi.tsx` to `lib/ui/CopilotChatbot.tsx`, `lib/ui/__test__/CopilotChatbot.spec.tsx`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `CopilotPanelHeader()` connect `src/lib/ui/ChatbotUi.tsx` to `src/lib/ui/CopilotChatbot.tsx`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `mockUseIntl()` connect `src/lib/ui/__test__/CopilotChatbot.spec.tsx` to `src/lib/ui/ChatbotUi.tsx`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `cache`, `intl`, `ResponseData` to the rest of the system?**
  _37 weakly-connected nodes found - possible documentation gaps or missing edges._