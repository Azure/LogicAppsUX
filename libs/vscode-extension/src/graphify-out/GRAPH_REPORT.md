# Graph Report - src  (2026-05-19)

## Corpus Check
- 31 files · ~4,891 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 224 nodes · 239 edges · 49 communities (43 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `76fb15f7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]

## God Nodes (most connected - your core abstractions)
1. `HttpClient` - 10 edges
2. `HttpClient` - 9 edges
3. `isArmResourceId()` - 5 edges
4. `JwtTokenHelper` - 5 edges
5. `JwtTokenHelper` - 5 edges
6. `isArmResourceId()` - 5 edges
7. `isSuccessResponse()` - 4 edges
8. `parseResponse()` - 4 edges
9. `isSuccessResponse()` - 4 edges
10. `parseResponse()` - 4 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities (49 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.29
Nodes (6): getExtraHeaders(), HttpClient, isArmResourceId(), isSuccessResponse(), isUrl(), parseResponse()

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (35): ICliFeed, IRelease, ITag, IWorkerRuntime, azureFunctionsVersion, ICommandResult, ICreateFunctionOptions, IFunctionWizardContext (+27 more)

### Community 32 - "Community 32"
Cohesion: 0.09
Nodes (21): Artifacts, FileDetails, IArtifactFile, IGitHubReleaseInfo, IParametersFileContent, Parameter, ParametersData, AzureConnectorDetails (+13 more)

### Community 33 - "Community 33"
Cohesion: 0.09
Nodes (22): AgentConnectionModel, AgentMcpConnectionModel, AllCustomCodeFiles, APIManagementConnectionModel, ConnectionAcl, ConnectionAndSettings, ConnectionReferenceModel, ConnectionsData (+14 more)

### Community 34 - "Community 34"
Cohesion: 0.18
Nodes (11): getExtraHeaders(), HttpClient, HttpOptions, isArmResourceId(), isSuccessResponse(), isUrl(), parseResponse(), errorMessage (+3 more)

### Community 35 - "Community 35"
Cohesion: 0.13
Nodes (16): IBundleDependencyFeed, IBundleFeed, BindingSettingValue, IBindingSetting, IBindingTemplate, IEnumValue, ResourceType, ValueType (+8 more)

### Community 36 - "Community 36"
Cohesion: 0.20
Nodes (9): FetchSchemaData, InitializeData, MapDefinitionData, MessageToVsix, MessageToWebview, SchemaPathData, XsltData, ExtensionCommand (+1 more)

### Community 37 - "Community 37"
Cohesion: 0.32
Nodes (3): IDecodedJwtToken, JwtTokenConstants, JwtTokenHelper

### Community 38 - "Community 38"
Cohesion: 0.40
Nodes (4): ITask, ITaskInputs, ITaskOptions, ITasksJson

### Community 39 - "Community 39"
Cohesion: 0.50
Nodes (3): AssertionResults, UnitTestExecutionResult, UnitTestResult

## Knowledge Gaps
- **103 isolated node(s):** `JwtTokenConstants`, `IDecodedJwtToken`, `httpClientOptions`, `responseData`, `options` (+98 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `FuncVersion` connect `Community 33` to `Community 1`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `JwtTokenConstants`, `IDecodedJwtToken`, `httpClientOptions` to the rest of the system?**
  _103 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05897435897435897 - nodes in this community are weakly interconnected._
- **Should `Community 32` be split into smaller, more focused modules?**
  _Cohesion score 0.09420289855072464 - nodes in this community are weakly interconnected._
- **Should `Community 33` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `Community 35` be split into smaller, more focused modules?**
  _Cohesion score 0.12631578947368421 - nodes in this community are weakly interconnected._