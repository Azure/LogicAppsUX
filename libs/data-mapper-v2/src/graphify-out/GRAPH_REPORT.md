# Graph Report - src  (2026-06-22)

## Corpus Check
- 143 files · ~77,576 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 804 nodes · 2185 edges · 44 communities (40 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]

## God Nodes (most connected - your core abstractions)
1. `FunctionData` - 36 edges
2. `MapDefinitionDeserializer` - 35 edges
3. `RootState` - 31 edges
4. `isSchemaNodeExtended()` - 26 edges
5. `applyConnectionValue()` - 25 edges
6. `ConnectionDictionary` - 24 edges
7. `isEmptyConnection()` - 18 edges
8. `isCustomValueConnection()` - 18 edges
9. `convertSchemaToSchemaExtended()` - 18 edges
10. `isNodeConnection()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `FunctionIconProps` --references--> `FunctionCategory`  [EXTRACTED]
  components/functionIcon/FunctionIcon.tsx → models/Function.ts
- `FunctionListItemProps` --references--> `FunctionData`  [EXTRACTED]
  components/functionList/FunctionListItem.tsx → models/Function.ts
- `DataMapDataProviderProps` --references--> `FunctionData`  [EXTRACTED]
  core/DataMapDataProvider.tsx → models/Function.ts
- `DataProviderInner()` --calls--> `convertSchemaToSchemaExtended()`  [EXTRACTED]
  core/DataMapDataProvider.tsx → utils/Schema.Utils.ts
- `InitialDataMapAction` --references--> `ConnectionDictionary`  [EXTRACTED]
  core/state/DataMapSlice.ts → models/Connection.ts

## Import Cycles
- 3-file cycle: `mapHandling/MapMetadataSerializer.ts -> utils/Connection.Utils.ts -> utils/Function.Utils.ts -> mapHandling/MapMetadataSerializer.ts`
- 4-file cycle: `mapHandling/MapMetadataSerializer.ts -> utils/Connection.Utils.ts -> utils/ReactFlow.Util.ts -> utils/Function.Utils.ts -> mapHandling/MapMetadataSerializer.ts`

## Communities (44 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.13
Nodes (8): MapDefinitionDeserializer, getSourceNode(), separateFunctions(), isIfAndGuid(), addSourceReactFlowPrefix(), createReactFlowFunctionKey(), findNodeForKey(), removeGuidFromKey()

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (29): addConditionalToNewPathItems(), addLoopingForToNewPathItems(), convertToArray(), convertToMapDefinition(), createSourcePath(), createYamlFromMap(), FailedMapDefinition, findKeyInMap() (+21 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (8): Count32Regular, Divide32Regular, EPowerX32Regular, GreaterThan32Regular, IndexRegular, LessThan32Regular, LessThanOrEqual32Regular, TenPowerX32Regular

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (12): Any16Filled, Any16Regular, Array16Filled, Array16Regular, Binary16Filled, Binary16Regular, Decimal16Filled, Decimal16Regular (+4 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (12): Any24Filled, Any24Regular, Array24Filled, Array24Regular, Binary24Filled, Binary24Regular, Decimal24Filled, Decimal24Regular (+4 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (84): InputDropdown(), InputDropdownProps, InputOptionProps, useStyles, InputCustomInfoLabel(), CommonProps, CustomListItem(), CustomListItemProps (+76 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (21): DataMapperApiService, DataMapperApiServiceOptions, DmErrorResponse, dataMapperApiVersions, defaultDataMapperApiServiceOptions, GenerateXsltResponse, IDataMapperApiService, InitDataMapperApiService() (+13 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (16): DataMapDataProviderProps, DataProviderInner(), appSlice, AppState, initialState, functionSlice, FunctionState, initialFunctionState (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (15): convertSchemaNodeToSchemaNodeExtended(), deepestNode(), flattenSchemaIntoDictionary(), flattenSchemaIntoSortArray(), flattenSchemaNode(), flattenSchemaNodeMap(), getFileNameAndPath(), maxProperties() (+7 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (21): ComponentState, dataMapSlice, DataMapState, DeleteConnectionAction, deleteNodeFromConnections(), deleteParentRepeatingConnections(), Draft2, emptyPristineState (+13 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (17): indexed, amendSourceKeyForDirectAccessIfNeeded(), createSchemaNodeOrFunction(), DSeparators, getDestinationNode(), getSingleValueMetadata(), getTargetValueWithoutLoops(), isQuotedString() (+9 more)

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (3): TrieTree, TrieTreeNode, AppState

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (12): useStyles, DataMapperFileService(), FileDropdownTree(), FileDropdownTreeProps, InputListWrapper, FileSelectorProps, SchemaFileSelector(), U (+4 more)

### Community 13 - "Community 13"
Cohesion: 0.20
Nodes (16): getCoordinatesForHandle(), MapCheckerItem(), MapCheckerItemProps, MapCheckerPanel(), useMapCheckerItemStyles, useStyles, MapCheckTabType, iconForMapCheckerSeverity() (+8 more)

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (14): HandleResponseProps, useSchemaProps, SchemaTree(), SchemaTreeProps, SchemaTreeNode(), SchemaTreeNodeProps, TypeAnnotation(), SchemaTreeNodeHandle() (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.60
Nodes (4): FunctionIcon(), FunctionIconProps, iconForFunction(), iconForFunctionCategory()

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (45): reactPlugin, EditorCommandBar(), EditorCommandBarProps, useStyles, DataMapperDesignerContext, DataMapperWrappedContext, ScrollLocation, ScrollProps (+37 more)

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (16): BoundingBox, convertCanvasToGridPoint(), findPath(), generateBoundingBoxes(), generatePathfindingGrid(), getLinearDistance(), getLineStretchLength(), getNextPointFromPosition() (+8 more)

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (13): collectionBranding, conversionBranding, customBranding, dateTimeBranding, FunctionGroupBranding, logicalBranding, mathBranding, stringBranding (+5 more)

### Community 19 - "Community 19"
Cohesion: 0.25
Nodes (13): FileWithVsCodePath, SchemaFile, SchemaPanelNodeReactFlowDataProps, ConfigPanelProps, schemaFileQuerySettings, SchemaPanel(), SchemaPanelBody(), SchemaPanelBodyProps (+5 more)

### Community 20 - "Community 20"
Cohesion: 0.24
Nodes (13): FunctionDataTreeItem, FunctionList(), FunctionListProps, fuseFunctionSearchOptions, loopFuseFunctionSearchOptions, FunctionListHeader(), FunctionListHeaderProps, DropResult (+5 more)

### Community 21 - "Community 21"
Cohesion: 0.20
Nodes (13): EdgePopOver(), EdgePopOverProps, DMReactFlowProps, edgeTypes, nodeTypes, ReactFlowWrapper(), reactFlowStyle, useStyles (+5 more)

### Community 22 - "Community 22"
Cohesion: 0.16
Nodes (13): mapNodeParams, reservedMapDefinitionKeys, reservedMapDefinitionKeysArray, reservedMapNodeParamsArray, ConditionalMetadata, getLoopTargetNode(), getLoopTargetNodeWithJson(), LoopMetadata (+5 more)

### Community 23 - "Community 23"
Cohesion: 0.12
Nodes (14): AbsoluteValue32Regular, AngleIcon, CeilingValue32Regular, FloorValue32Regular, GreaterThanOrEqual32Regular, LogYX32Regular, PercentageIcon, RightTriangleRegular (+6 more)

### Community 24 - "Community 24"
Cohesion: 0.20
Nodes (8): FunctionCategoryColorToken, customDarkTokens, customTokens, DataMapperTheme, extendedWebDarkTheme, extendedWebLightTheme, fnColors, spacingOverrides

### Community 25 - "Community 25"
Cohesion: 0.27
Nodes (5): checkIfValueNeedsQuotes(), quoteSelectedCustomValue(), quoteString(), fixMapDefinitionCustomValues(), loadMapDefinition()

### Community 26 - "Community 26"
Cohesion: 0.31
Nodes (8): CanvasNode(), CanvasNodeProps, CardProps, FunctionCardProps, FunctionNode(), useStyles, useHoverFunctionNode(), useSelectedNode()

### Community 27 - "Community 27"
Cohesion: 0.20
Nodes (10): generateInputHandleId(), ContainerLayoutNode, createReactFlowEdgeLabels(), isIntermediateNode(), LayoutContainer, LayoutEdge, LayoutNode, ReactFlowIdParts (+2 more)

### Community 28 - "Community 28"
Cohesion: 0.29
Nodes (9): ReactFlowStatesProps, useReactFlowStates(), collectSourceNodeIdsForConnectionChain(), collectTargetNodeIdsForConnectionChain(), getActiveNodes(), createEdgeId(), getFunctionNode(), convertWholeDataMapToLayoutTree() (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.39
Nodes (6): ConnectedEdge(), useEdgePath(), useHoverEdge(), useHoverNode(), useSelectedEdge(), getReactFlowNodeId()

### Community 30 - "Community 30"
Cohesion: 0.36
Nodes (7): DetailsTabContents(), FunctionConfigurationPopover(), FunctionConfigurationPopoverProps, TabTypes, useStyles, OutputTabContents(), isFileDropdownFunction()

### Community 31 - "Community 31"
Cohesion: 0.46
Nodes (5): CodeViewPanel(), CodeViewPanelProps, CodeViewPanelBody(), CodeViewPanelBodyProps, useStyles

### Community 32 - "Community 32"
Cohesion: 0.43
Nodes (4): FunctionPanel(), PanelProps, useStyles, FunctionsSVG()

### Community 33 - "Community 33"
Cohesion: 0.29
Nodes (5): autoLayout(), Direction, elk, LayoutAlgorithm, LayoutOptions

### Community 34 - "Community 34"
Cohesion: 0.29
Nodes (5): getPathForSrcSchemaNode(), findLast(), addParentConnectionForRepeatingElementsNested(), isParentTargetNode(), addTargetReactFlowPrefix()

### Community 35 - "Community 35"
Cohesion: 0.40
Nodes (4): NodeIds, ReactFlowEdgeType, ReactFlowNodeType, SchemaTreeDataProps

### Community 37 - "Community 37"
Cohesion: 0.50
Nodes (4): errorsSlice, ErrorsState, initialFunctionState, MapIssue

## Knowledge Gaps
- **112 isolated node(s):** `cache`, `intl`, `EdgePopOverProps`, `DMReactFlowProps`, `nodeTypes` (+107 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MapDefinitionDeserializer` connect `Community 0` to `Community 34`, `Community 5`, `Community 37`, `Community 7`, `Community 8`, `Community 22`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `FunctionData` connect `Community 5` to `Community 0`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 16`, `Community 18`, `Community 20`, `Community 22`, `Community 26`, `Community 30`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `RootState` connect `Community 7` to `Community 32`, `Community 35`, `Community 5`, `Community 12`, `Community 13`, `Community 14`, `Community 16`, `Community 19`, `Community 20`, `Community 21`, `Community 26`, `Community 28`, `Community 29`, `Community 30`, `Community 31`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `cache`, `intl`, `EdgePopOverProps` to the rest of the system?**
  _112 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.12941176470588237 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.12096774193548387 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._