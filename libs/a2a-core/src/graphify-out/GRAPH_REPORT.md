# Graph Report - src  (2026-05-19)

## Corpus Check
- 140 files · ~79,356 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1471 nodes · 1981 edges · 210 communities (186 shown, 24 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 64 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `76fb15f7`
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
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 127|Community 127]]
- [[_COMMUNITY_Community 128|Community 128]]
- [[_COMMUNITY_Community 129|Community 129]]
- [[_COMMUNITY_Community 130|Community 130]]
- [[_COMMUNITY_Community 131|Community 131]]
- [[_COMMUNITY_Community 132|Community 132]]
- [[_COMMUNITY_Community 133|Community 133]]
- [[_COMMUNITY_Community 134|Community 134]]
- [[_COMMUNITY_Community 135|Community 135]]
- [[_COMMUNITY_Community 136|Community 136]]
- [[_COMMUNITY_Community 137|Community 137]]
- [[_COMMUNITY_Community 138|Community 138]]
- [[_COMMUNITY_Community 139|Community 139]]
- [[_COMMUNITY_Community 140|Community 140]]
- [[_COMMUNITY_Community 141|Community 141]]
- [[_COMMUNITY_Community 142|Community 142]]
- [[_COMMUNITY_Community 143|Community 143]]
- [[_COMMUNITY_Community 144|Community 144]]
- [[_COMMUNITY_Community 145|Community 145]]
- [[_COMMUNITY_Community 146|Community 146]]
- [[_COMMUNITY_Community 147|Community 147]]
- [[_COMMUNITY_Community 148|Community 148]]
- [[_COMMUNITY_Community 149|Community 149]]
- [[_COMMUNITY_Community 150|Community 150]]
- [[_COMMUNITY_Community 151|Community 151]]
- [[_COMMUNITY_Community 152|Community 152]]
- [[_COMMUNITY_Community 153|Community 153]]
- [[_COMMUNITY_Community 154|Community 154]]
- [[_COMMUNITY_Community 155|Community 155]]
- [[_COMMUNITY_Community 156|Community 156]]
- [[_COMMUNITY_Community 157|Community 157]]
- [[_COMMUNITY_Community 158|Community 158]]
- [[_COMMUNITY_Community 159|Community 159]]
- [[_COMMUNITY_Community 160|Community 160]]
- [[_COMMUNITY_Community 161|Community 161]]
- [[_COMMUNITY_Community 162|Community 162]]
- [[_COMMUNITY_Community 163|Community 163]]
- [[_COMMUNITY_Community 164|Community 164]]
- [[_COMMUNITY_Community 165|Community 165]]
- [[_COMMUNITY_Community 166|Community 166]]
- [[_COMMUNITY_Community 167|Community 167]]
- [[_COMMUNITY_Community 168|Community 168]]
- [[_COMMUNITY_Community 169|Community 169]]
- [[_COMMUNITY_Community 170|Community 170]]
- [[_COMMUNITY_Community 171|Community 171]]
- [[_COMMUNITY_Community 172|Community 172]]
- [[_COMMUNITY_Community 173|Community 173]]
- [[_COMMUNITY_Community 174|Community 174]]
- [[_COMMUNITY_Community 175|Community 175]]
- [[_COMMUNITY_Community 176|Community 176]]
- [[_COMMUNITY_Community 177|Community 177]]
- [[_COMMUNITY_Community 178|Community 178]]
- [[_COMMUNITY_Community 179|Community 179]]
- [[_COMMUNITY_Community 180|Community 180]]
- [[_COMMUNITY_Community 181|Community 181]]
- [[_COMMUNITY_Community 182|Community 182]]
- [[_COMMUNITY_Community 183|Community 183]]
- [[_COMMUNITY_Community 184|Community 184]]
- [[_COMMUNITY_Community 185|Community 185]]
- [[_COMMUNITY_Community 186|Community 186]]
- [[_COMMUNITY_Community 187|Community 187]]
- [[_COMMUNITY_Community 188|Community 188]]
- [[_COMMUNITY_Community 189|Community 189]]

## God Nodes (most connected - your core abstractions)
1. `SessionManager` - 22 edges
2. `A2AClient` - 18 edges
3. `HttpClient` - 18 edges
4. `ChatInterface` - 18 edges
5. `SessionManager` - 18 edges
6. `useChatStore` - 17 edges
7. `ChatInterface` - 17 edges
8. `SSEClient` - 16 edges
9. `Message` - 15 edges
10. `ServerHistoryStorage` - 14 edges

## Surprising Connections (you probably didn't know these)
- `ExampleWithHooks()` --calls--> `useA2A()`  [EXTRACTED]
  examples/obo-authentication.ts → react/use-a2a.ts
- `CustomChatImplementation()` --calls--> `useChatWidget()`  [INFERRED]
  examples/integrated-auth-ui.tsx → react/hooks/useChatWidget.ts
- `ManualAuthUIExample()` --calls--> `useChatWidget()`  [INFERRED]
  examples/integrated-auth-ui.tsx → react/hooks/useChatWidget.ts
- `messageHandler()` --calls--> `validatePopupUrl()`  [EXTRACTED]
  client/a2a-client.ts → utils/popup-window.ts
- `AuthStateExample()` --calls--> `useChatWidget()`  [INFERRED]
  examples/integrated-auth-ui.tsx → react/hooks/useChatWidget.ts

## Communities (210 total, 24 thin omitted)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (11): A2AError, AuthenticationError, extractErrorDetails(), isJsonRpcErrorResponse(), JsonRpcErrorResponse, NetworkError, StreamingError, TaskError (+3 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (3): LocalStoragePlugin, SessionManager, DataTransferPolyfill

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (10): A2AClient, MockSSEClient, errorHandler(), messageHandler(), HttpClient, createJsonRpcResponseSchema(), createJsonRpcResultSchema(), isJsonRpcError() (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (27): LocalStoragePlugin, newSession, SessionManager, changeHandler, dataCall, destroyHandler, event, existingSession (+19 more)

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (5): ExampleWithHooks(), manualAuthFlow(), openPopupWindow(), useA2A(), useChatWidget()

### Community 9 - "Community 9"
Cohesion: 0.38
Nodes (8): extractAuthEventFromMessage(), extractLastMessage(), isAuthRequiredMessage(), parseServerDate(), transformContext(), transformMessage(), transformMessageParts(), transformTasksToMessages()

### Community 13 - "Community 13"
Cohesion: 0.05
Nodes (38): ChatWindow(), ChatWindowProps, agentDescription, agentName, chatWindow, { container }, defaultProps, input (+30 more)

### Community 14 - "Community 14"
Cohesion: 0.36
Nodes (6): escapeAttr(), getLanguageFromFilename(), highlight(), link(), MessageComponent(), sanitizeHtml()

### Community 15 - "Community 15"
Cohesion: 0.52
Nodes (6): createArtifactMessage(), createGroupedArtifactMessage(), createMessage(), formatCodeContent(), generateMessageId(), getLanguageFromFilename()

### Community 17 - "Community 17"
Cohesion: 0.60
Nodes (3): getAgentContextStorageKey(), getAgentMessagesStorageKey(), getAgentStorageIdentifier()

### Community 22 - "Community 22"
Cohesion: 0.83
Nodes (3): adjustBrightness(), createCustomTheme(), generateBrandVariants()

### Community 127 - "Community 127"
Cohesion: 0.06
Nodes (42): MessageInput(), MessageInputProps, buttons, { container }, dataTransfer, file, fileInput, files (+34 more)

### Community 128 - "Community 128"
Cohesion: 0.07
Nodes (24): body, capabilities, completedTask, invalidMessage, iterator, message, mockClose, mockEmit (+16 more)

### Community 129 - "Community 129"
Cohesion: 0.07
Nodes (32): request, result, AgentCapabilities, AgentCapabilitiesSchema, AgentCard, AgentInterface, AgentInterfaceSchema, AgentProvider (+24 more)

### Community 130 - "Community 130"
Cohesion: 0.08
Nodes (16): error, mockFetch, body, mockFetch, [request], HttpClient, authConfig, body (+8 more)

### Community 131 - "Community 131"
Cohesion: 0.07
Nodes (28): artifactContent, artifactMessage, assistantMessage, authMessage, baseMessage, codeBlock, codeElement, codeMessage (+20 more)

### Community 132 - "Community 132"
Cohesion: 0.11
Nodes (21): ExampleWithHooks(), manualAuthFlow(), AuthenticationMessage(), AuthenticationMessageProps, AuthPartState, useStyles, cancelButton, mockAuthParts (+13 more)

### Community 133 - "Community 133"
Cohesion: 0.11
Nodes (23): JsonRpcRequest, ListContextsParams, ListContextsResponse, ListContextsResponseSchema, ListTasksParams, ListTasksResponse, ListTasksResponseSchema, MessageContent (+15 more)

### Community 134 - "Community 134"
Cohesion: 0.08
Nodes (17): errorData, expectedResponse, expectedResult, expectedTask, jsonRpcError, mockFetch, A2AError, AuthenticationError (+9 more)

### Community 135 - "Community 135"
Cohesion: 0.08
Nodes (24): cause, converted, customError, details, error, errorObj, errorResponse, invalid (+16 more)

### Community 136 - "Community 136"
Cohesion: 0.10
Nodes (19): FileUpload(), FileUploadProps, allowedFileTypes, button, clickSpy, file, file1, file2 (+11 more)

### Community 137 - "Community 137"
Cohesion: 0.10
Nodes (17): MessageList(), MessageListProps, { container }, message, message1, message2, messageElements, messageList (+9 more)

### Community 138 - "Community 138"
Cohesion: 0.14
Nodes (16): ChatWidget(), chatWindow, { container }, props, theme, themeData, { unmount }, wrapper (+8 more)

### Community 139 - "Community 139"
Cohesion: 0.14
Nodes (14): AuthRequiredEvent, AuthStateExample(), CustomChatImplementation(), ManualAuthUIExample(), useChatWidget(), UseChatWidgetProps, useA2A(), useChatStore (+6 more)

### Community 140 - "Community 140"
Cohesion: 0.19
Nodes (17): extractAuthEventFromMessage(), extractLastMessage(), isAuthRequiredMessage(), parseServerDate(), message, parts, result, serverContext (+9 more)

### Community 141 - "Community 141"
Cohesion: 0.12
Nodes (16): ChatSession, SessionList(), SessionListProps, confirmButton, defaultProps, deleteButton, input, mockSessions (+8 more)

### Community 142 - "Community 142"
Cohesion: 0.11
Nodes (17): A2AClientConfig, a2aMessage, checkQueue, headers, jsonRpcRequest, messageHandler(), messageQueue, messageRequest (+9 more)

### Community 143 - "Community 143"
Cohesion: 0.16
Nodes (16): AuthConfig, AuthRequiredPart, HttpClientOptions, IdentityProvider, RequestConfig, RequestInterceptor, ResponseInterceptor, UnauthorizedEvent (+8 more)

### Community 144 - "Community 144"
Cohesion: 0.11
Nodes (18): asyncHook, dependentPlugin, error, errorHook, hook1, hook2, message, onStart (+10 more)

### Community 145 - "Community 145"
Cohesion: 0.11
Nodes (18): baseMessage, { container }, fileNameElements, images, imageTypes, img, messageWithEmptyData, messageWithEmptyFiles (+10 more)

### Community 146 - "Community 146"
Cohesion: 0.11
Nodes (17): authenticatedClient, completedPromise, errorPromise, firstPromise, initialPromise, invalidRequest, iterator, mockAgentCard (+9 more)

### Community 147 - "Community 147"
Cohesion: 0.14
Nodes (9): AgentRegistry, AgentSummary, mockFetch, registry, EnterpriseAgentRegistry, PublicAgentRegistry, mockAgentCard, mockFetch (+1 more)

### Community 148 - "Community 148"
Cohesion: 0.12
Nodes (16): bubbleElement, { container }, { container: container1 }, { container: container2 }, containerElement, dots, elements1, elements2 (+8 more)

### Community 150 - "Community 150"
Cohesion: 0.12
Nodes (16): complexError, converted, data, error, errorData, errorWithNullId, jsonRpcError, parseResult (+8 more)

### Community 151 - "Community 151"
Cohesion: 0.12
Nodes (16): assistantMessage, completedTask, failedTask, filePart, invalidState, multiPartMessage, pendingTask, result (+8 more)

### Community 152 - "Community 152"
Cohesion: 0.12
Nodes (15): agentCard, mockAddMessage, mockClearLocalMessages, mockClearMessages, mockConnect, mockDiscoveryInstance, mockFromWellKnownUri, mockMessage (+7 more)

### Community 153 - "Community 153"
Cohesion: 0.21
Nodes (10): ChatMessage, FileAttachment, UseA2AOptions, UseA2AReturn, ChatHistoryStorage, StorageConfig, createHistoryStorage(), getAgentContextStorageKey() (+2 more)

### Community 154 - "Community 154"
Cohesion: 0.14
Nodes (13): chat, error, errorHandler, errorStream, exported, history, messageHandler, messages (+5 more)

### Community 155 - "Community 155"
Cohesion: 0.22
Nodes (9): escapeAttr(), formatTime(), link(), MessageComponent(), MessageProps, useStyles, downloadFile(), getMimeType() (+1 more)

### Community 156 - "Community 156"
Cohesion: 0.14
Nodes (13): error, existingSessions, expectedUIMessage, initialSession, listSessionsPromise, loadPromise, mockMessages, mockSessions (+5 more)

### Community 157 - "Community 157"
Cohesion: 0.15
Nodes (10): HistoryApiConfig, api, error, firstRequestBody, mockContexts, mockTasks, mockUpdatedContext, requestBody (+2 more)

### Community 158 - "Community 158"
Cohesion: 0.27
Nodes (9): AnalyticsConfig, AnalyticsEvent, LoggerConfig, LogLevel, Plugin, PluginContext, PluginHooks, PluginInfo (+1 more)

### Community 159 - "Community 159"
Cohesion: 0.19
Nodes (9): AgentDiscoveryOptions, CacheEntry, agentCard, mockAgentCard, mockFetch, mockAgentCard, mockFetch, getMockAgentCard() (+1 more)

### Community 160 - "Community 160"
Cohesion: 0.15
Nodes (12): A2A Chat React Components, code:tsx (// Import the chat widget component), Components, Features, Hooks, Important: CSS Import Required, Main Component, State Management (+4 more)

### Community 161 - "Community 161"
Cohesion: 0.18
Nodes (4): A2AClient, client, mockAgentCard, mockHttpClient

### Community 162 - "Community 162"
Cohesion: 0.17
Nodes (11): artifact, iterator, mockAgentCard, request, stream, task1Promise, task2Promise, task3Promise (+3 more)

### Community 163 - "Community 163"
Cohesion: 0.24
Nodes (6): extractErrorDetails(), JsonRpcErrorResponse, formatErrorMessage(), getUserFriendlyErrorMessage(), error, result

### Community 164 - "Community 164"
Cohesion: 0.18
Nodes (10): finalPromise, iterator, mockAgentCard, request, stream, task1Promise, task2Promise, task4Promise (+2 more)

### Community 166 - "Community 166"
Cohesion: 0.18
Nodes (8): Message, copyButton, copyButtons, message, viewButton, { container }, link, message

### Community 168 - "Community 168"
Cohesion: 0.18
Nodes (10): errorMessage, message, message1, message2, messages, messageWithAttachments, messageWithMetadata, state1 (+2 more)

### Community 170 - "Community 170"
Cohesion: 0.36
Nodes (7): ChatInterfaceConfig, ChatEventMap, ChatMessage, ChatOptions, ChatRole, ConversationExport, StreamUpdate

### Community 171 - "Community 171"
Cohesion: 0.28
Nodes (5): AuthRequiredHandler, ChatState, SessionConnectionConfig, Message, transformStorageMessagesToUI()

### Community 172 - "Community 172"
Cohesion: 0.22
Nodes (8): existingIndex, fileMessage, fileMessage1, fileMessage2, messages, newSessionMessages, store, textMessage

### Community 174 - "Community 174"
Cohesion: 0.22
Nodes (7): assistantMessage, mockAgentCard, mockStreamReturnValue, removeItemSpy, { result }, setItemSpy, storedMessages

### Community 176 - "Community 176"
Cohesion: 0.25
Nodes (7): completeCard, invalidCard, minimalCard, missingFields, multiSkillCard, result, urlIssue

### Community 178 - "Community 178"
Cohesion: 0.29
Nodes (5): createHistoryApi(), HistoryApi, Message, ListSessionsOptions, ServerHistoryStorageConfig

### Community 184 - "Community 184"
Cohesion: 0.29
Nodes (6): agentCard, cached, invalidAgentCard, invalidCard, mockAgentCard, mockFetch

### Community 187 - "Community 187"
Cohesion: 0.33
Nodes (5): ALLOWED_ATTR, ALLOWED_TAGS, sanitizeHtml(), result, result2

### Community 189 - "Community 189"
Cohesion: 0.47
Nodes (4): CodeBlockHeader(), CodeBlockHeaderProps, useStyles, copyButton

## Knowledge Gaps
- **572 isolated node(s):** `mockFetch`, `jsonRpcError`, `errorData`, `expectedResult`, `expectedResponse` (+567 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Message` connect `Community 171` to `Community 128`, `Community 131`, `Community 166`, `Community 137`, `Community 170`, `Community 139`, `Community 172`, `Community 143`, `Community 145`, `Community 155`, `Community 158`, `Community 127`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `A2AClient` connect `Community 161` to `Community 128`, `Community 162`, `Community 164`, `Community 132`, `Community 170`, `Community 171`, `Community 142`, `Community 146`, `Community 153`, `Community 154`, `Community 158`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `SessionManager` connect `Community 4` to `Community 170`, `Community 154`, `Community 158`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `mockFetch`, `jsonRpcError`, `errorData` to the rest of the system?**
  _572 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09057971014492754 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.0989247311827957 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.06341463414634146 - nodes in this community are weakly interconnected._