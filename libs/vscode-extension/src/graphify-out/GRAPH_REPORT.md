# Graph Report - src  (2026-08-26)

## Corpus Check
- 31 files · ~5,730 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 347 nodes · 515 edges · 17 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5c7453c9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- lib/models/project.ts
- src/lib/models/connection.ts
- lib/models/workflow.ts
- lib/models/templates/index.ts
- lib/models/index.ts
- lib/models/connection.ts
- HttpClient
- src/index.ts
- src/lib/models/index.ts
- src/lib/models/templates/index.ts
- HttpClient
- src/lib/models/project.ts
- src/lib/models/functions.ts
- src/lib/models/host.ts
- src/lib/models/context.ts
- src/lib/models/cliFeed.ts
- IProjectWizardContext

## God Nodes (most connected - your core abstractions)
1. `HttpClient` - 11 edges
2. `HttpClient` - 10 edges
3. `IProjectWizardContext` - 8 edges
4. `IProjectWizardContext` - 8 edges
5. `FuncVersion` - 6 edges
6. `IProjectTreeItem` - 6 edges
7. `IWorkflowTemplate` - 6 edges
8. `IWorkflowTemplate` - 6 edges
9. `Artifacts` - 5 edges
10. `FileDetails` - 5 edges

## Surprising Connections (you probably didn't know these)
- `IProjectWizardContext` --references--> `IWorkerRuntime`  [EXTRACTED]
  src/lib/models/project.ts → src/lib/models/cliFeed.ts
- `IProjectWizardContext` --references--> `FuncVersion`  [EXTRACTED]
  src/lib/models/project.ts → src/lib/models/functions.ts
- `IFunctionWizardContext` --inherits--> `IProjectWizardContext`  [EXTRACTED]
  src/lib/models/functions.ts → src/lib/models/project.ts
- `IProjectWizardContext` --references--> `ProjectLanguage`  [EXTRACTED]
  src/lib/models/project.ts → src/lib/models/language.ts
- `ILogicAppWizardContext` --references--> `FuncVersion`  [EXTRACTED]
  lib/models/context.ts → lib/models/functions.ts

## Import Cycles
- None detected.

## Communities (17 total, 0 thin omitted)

### Community 0 - "lib/models/project.ts"
Cohesion: 0.06
Nodes (39): ICliFeed, IRelease, ITag, IWorkerRuntime, azureFunctionsVersion, FuncVersion, ICommandResult, ICreateFunctionOptions (+31 more)

### Community 1 - "src/lib/models/connection.ts"
Cohesion: 0.07
Nodes (35): Artifacts, FileDetails, IArtifactFile, IGitHubReleaseInfo, AgentConnectionModel, AgentMcpConnectionModel, AllCustomCodeFiles, APIManagementConnectionModel (+27 more)

### Community 2 - "lib/models/workflow.ts"
Cohesion: 0.12
Nodes (19): Artifacts, FileDetails, IArtifactFile, IGitHubReleaseInfo, IParametersFileContent, Parameter, ParametersData, AzureConnectorDetails (+11 more)

### Community 3 - "lib/models/templates/index.ts"
Cohesion: 0.15
Nodes (16): IRuntimeDependencyVersions, IBundleFeed, BindingSettingValue, IBindingSetting, IBindingTemplate, IEnumValue, ResourceType, ValueType (+8 more)

### Community 4 - "lib/models/index.ts"
Cohesion: 0.07
Nodes (21): FetchSchemaData, InitializeData, MapDefinitionData, MessageToVsix, MessageToWebview, SchemaPathData, XsltData, ExtensionCommand (+13 more)

### Community 5 - "lib/models/connection.ts"
Cohesion: 0.10
Nodes (21): AgentConnectionModel, AgentMcpConnectionModel, AllCustomCodeFiles, APIManagementConnectionModel, ConnectionAcl, ConnectionAndSettings, ConnectionReferenceModel, ConnectionsData (+13 more)

### Community 6 - "HttpClient"
Cohesion: 0.25
Nodes (7): getExtraHeaders(), HttpClient, HttpOptions, isArmResourceId(), isSuccessResponse(), isUrl(), parseResponse()

### Community 7 - "src/index.ts"
Cohesion: 0.09
Nodes (8): getBaseGraphApi(), getBaseGraphApi(), IDecodedJwtToken, JwtTokenConstants, JwtTokenHelper, IDecodedJwtToken, JwtTokenConstants, JwtTokenHelper

### Community 8 - "src/lib/models/index.ts"
Cohesion: 0.08
Nodes (19): CodeSelection, FetchSchemaData, InitializeData, MapDefinitionData, MessageToVsix, MessageToWebview, SchemaPathData, XsltData (+11 more)

### Community 9 - "src/lib/models/templates/index.ts"
Cohesion: 0.13
Nodes (17): IBundleFeed, IRuntimeDependencyVersions, IFunctionWizardContext, BindingSettingValue, IBindingSetting, IBindingTemplate, IEnumValue, ResourceType (+9 more)

### Community 10 - "HttpClient"
Cohesion: 0.24
Nodes (7): getExtraHeaders(), HttpClient, HttpOptions, isArmResourceId(), isSuccessResponse(), isUrl(), parseResponse()

### Community 11 - "src/lib/models/project.ts"
Cohesion: 0.13
Nodes (14): ApplicationSettings, DeploymentScriptType, DeploymentTargetType, FuncHostRequest, ITargetDirectory, OpenBehavior, ProjectAccess, ProjectName (+6 more)

### Community 12 - "src/lib/models/functions.ts"
Cohesion: 0.18
Nodes (12): azureFunctionsVersion, ICommandResult, ICreateFunctionOptions, INpmDistTag, IPackageMetadata, latestGAVersion, pathRelativeFunc, NOTE: The language part of the id is optional. Aka "HttpTrigger" will work just… (+4 more)

### Community 13 - "src/lib/models/host.ts"
Cohesion: 0.18
Nodes (5): IBundleMetadata, IHostJsonV1, IHostJsonV2, IParsedHostJson, IProjectTreeItem

### Community 14 - "src/lib/models/context.ts"
Cohesion: 0.38
Nodes (6): StorageOptions, ICreateLogicAppContext, IDebugModeContext, IIdentityWizardContext, ILogicAppWizardContext, FuncVersion

### Community 15 - "src/lib/models/cliFeed.ts"
Cohesion: 0.40
Nodes (4): ICliFeed, IRelease, ITag, IWorkerRuntime

### Community 16 - "IProjectWizardContext"
Cohesion: 0.50
Nodes (5): IProjectWizardContext, IWebviewProjectContext, ProjectPackageType, TargetFramework, WorkflowType

## Knowledge Gaps
- **179 isolated node(s):** `IArtifactFile`, `IGitHubReleaseInfo`, `IRuntimeDependencyVersions`, `ICliFeed`, `IRelease` (+174 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `IArtifactFile`, `IGitHubReleaseInfo`, `IRuntimeDependencyVersions` to the rest of the system?**
  _179 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `lib/models/project.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06342494714587738 - nodes in this community are weakly interconnected._
- **Should `src/lib/models/connection.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07422402159244265 - nodes in this community are weakly interconnected._
- **Should `lib/models/workflow.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11688311688311688 - nodes in this community are weakly interconnected._
- **Should `lib/models/templates/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14736842105263157 - nodes in this community are weakly interconnected._
- **Should `lib/models/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07126436781609195 - nodes in this community are weakly interconnected._
- **Should `lib/models/connection.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09881422924901186 - nodes in this community are weakly interconnected._