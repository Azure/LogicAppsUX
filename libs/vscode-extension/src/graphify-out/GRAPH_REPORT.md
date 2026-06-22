# Graph Report - src  (2026-06-22)

## Corpus Check
- 31 files · ~4,922 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 170 nodes · 246 edges · 9 communities
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
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]

## God Nodes (most connected - your core abstractions)
1. `HttpClient` - 10 edges
2. `IProjectWizardContext` - 8 edges
3. `IWorkflowTemplate` - 6 edges
4. `FuncVersion` - 5 edges
5. `ProjectLanguage` - 5 edges
6. `JwtTokenHelper` - 5 edges
7. `isArmResourceId()` - 5 edges
8. `IDesignerPanelMetadata` - 4 edges
9. `TargetFramework` - 4 edges
10. `isSuccessResponse()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `IProjectWizardContext` --references--> `IWorkerRuntime`  [EXTRACTED]
  lib/models/project.ts → lib/models/cliFeed.ts
- `IFunctionWizardContext` --references--> `IWorkflowTemplate`  [EXTRACTED]
  lib/models/functions.ts → lib/models/templates/IWorkflowTemplate.ts
- `IProjectWizardContext` --references--> `TargetFramework`  [EXTRACTED]
  lib/models/project.ts → lib/models/workflow.ts
- `IDesignerPanelMetadata` --references--> `Artifacts`  [EXTRACTED]
  lib/models/workflow.ts → lib/models/artifact.ts
- `IDesignerPanelMetadata` --references--> `FileDetails`  [EXTRACTED]
  lib/models/workflow.ts → lib/models/artifact.ts

## Import Cycles
- None detected.

## Communities (9 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (26): ICliFeed, IRelease, ITag, IWorkerRuntime, IBundleMetadata, IHostJsonV1, IHostJsonV2, IParsedHostJson (+18 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (19): StorageOptions, ICreateLogicAppContext, IDebugModeContext, IIdentityWizardContext, ILogicAppWizardContext, azureFunctionsVersion, FuncVersion, ICommandResult (+11 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (18): Artifacts, FileDetails, IArtifactFile, IGitHubReleaseInfo, IParametersFileContent, Parameter, ParametersData, AzureConnectorDetails (+10 more)

### Community 3 - "Community 3"
Cohesion: 0.15
Nodes (16): IBundleDependencyFeed, IBundleFeed, BindingSettingValue, IBindingSetting, IBindingTemplate, IEnumValue, ResourceType, ValueType (+8 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (12): FileShare, ILaunchJson, Platform, IProcessInfo, IProcessTreeNode, ITask, ITaskInputs, ITaskOptions (+4 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (16): AgentConnectionModel, AgentMcpConnectionModel, AllCustomCodeFiles, APIManagementConnectionModel, ConnectionAcl, ConnectionAndSettings, ConnectionReferenceModel, ConnectionsData (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.25
Nodes (7): getExtraHeaders(), HttpClient, HttpOptions, isArmResourceId(), isSuccessResponse(), isUrl(), parseResponse()

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (4): getBaseGraphApi(), IDecodedJwtToken, JwtTokenConstants, JwtTokenHelper

### Community 8 - "Community 8"
Cohesion: 0.20
Nodes (9): FetchSchemaData, InitializeData, MapDefinitionData, MessageToVsix, MessageToWebview, SchemaPathData, XsltData, ExtensionCommand (+1 more)

## Knowledge Gaps
- **91 isolated node(s):** `IArtifactFile`, `IGitHubReleaseInfo`, `IBundleDependencyFeed`, `ICliFeed`, `IRelease` (+86 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `IArtifactFile`, `IGitHubReleaseInfo`, `IBundleDependencyFeed` to the rest of the system?**
  _91 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07881773399014778 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.12987012987012986 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12380952380952381 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.14736842105263157 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._