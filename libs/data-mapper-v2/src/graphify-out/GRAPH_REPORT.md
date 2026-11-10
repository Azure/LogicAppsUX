# Graph Report - src  (2026-08-26)

## Corpus Check
- 143 files · ~77,576 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1292 nodes · 3828 edges · 71 communities (63 shown, 8 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 74 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5c7453c9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- MapDefinitionDeserializer
- MapDefinitionSerializer.ts
- images/FunctionIcons/FunctionIcons.tsx
- images/FunctionIcons/DataType16Icons.tsx
- images/FunctionIcons/DataType24Icons.tsx
- components/functionConfigurationMenu/inputTab/inputTab.tsx
- core/services/dataMapperApiService/index.ts
- core/state/Store.ts
- Schema.Utils.ts
- core/state/DataMapSlice.ts
- DataMap.Utils.ts
- TrieTree
- components/common/selector/FileSelector.tsx
- MapChecker.Utils.ts
- components/schema/useSchema.ts
- src/components/functionIcon/FunctionIcon.tsx
- core/index.ts
- Edge.Utils.ts
- Function.Utils.ts
- components/schema/SchemaPanel.tsx
- components/functionList/FunctionList.tsx
- components/canvas/ReactFlow.tsx
- MapDefinitionDeserializer.ts
- src/images/FunctionIcons/FunctionIcons.tsx
- ThemeConect.ts
- CustomValue.Utils.ts
- components/common/reactflow/FunctionNode.tsx
- ReactFlow.Util.ts
- src/components/canvas/useReactflowStates.ts
- src/core/state/selectors/selectors.ts
- components/functionConfigurationMenu/functionConfigurationPopover.tsx
- components/codeView/CodeViewPanel.tsx
- src/components/functionsPanel/FunctionPanel.tsx
- src/core/state/DataMapSlice.ts
- src/components/functionConfigurationMenu/inputTab/inputTab.tsx
- src/core/state/Store.ts
- Icon.Utils.tsx
- FunctionData
- intl-test-helper.tsx
- utils/reactFlowTesting/NodeInspector.tsx
- ReactFlow.ts
- Svg.d.ts
- DataMapperDesigner.tsx
- Connection.Utils.ts
- src/components/canvas/ReactFlow.tsx
- src/images/FunctionIcons/DataType16Icons.tsx
- src/images/FunctionIcons/DataType24Icons.tsx
- applyConnectionValue
- src/components/schema/SchemaPanel.tsx
- src/components/schema/useSchema.ts
- TrieTree
- src/components/functionList/FunctionList.tsx
- RootState
- core/state/PanelSlice.ts
- isEmptyConnection
- src/core/services/dataMapperApiService/index.ts
- src/components/commandBar/EditorCommandBar.tsx
- src/core/state/PanelSlice.ts
- DataMapperApiService
- DataMapperApiService
- components/commandBar/EditorCommandBar.tsx
- src/components/test/TestPanel.tsx
- src/components/common/reactflow/FunctionNode.tsx
- src/components/common/selector/__test__/FileSelector.spec.tsx
- IDataMapperApiService
- MapDefinition.Utils.ts
- src/utils/reactFlowTesting/NodeInspector.tsx

## God Nodes (most connected - your core abstractions)
1. `FunctionData` - 60 edges
2. `isSchemaNodeExtended()` - 43 edges
3. `ConnectionDictionary` - 38 edges
4. `MapDefinitionDeserializer` - 37 edges
5. `applyConnectionValue()` - 36 edges
6. `isNodeConnection()` - 32 edges
7. `RootState` - 31 edges
8. `RootState` - 31 edges
9. `isCustomValueConnection()` - 30 edges
10. `convertSchemaToSchemaExtended()` - 30 edges

## Surprising Connections (you probably didn't know these)
- `InitialDataMapAction` --references--> `ConnectionDictionary`  [EXTRACTED]
  core/state/DataMapSlice.ts → src/models/Connection.ts
- `FunctionListItemProps` --references--> `FunctionData`  [EXTRACTED]
  components/functionList/FunctionListItem.tsx → src/models/Function.ts
- `InputDropdownProps` --references--> `FunctionData`  [EXTRACTED]
  components/functionConfigurationMenu/inputDropdown/InputDropdown.tsx → src/models/Function.ts
- `FunctionState` --references--> `FunctionData`  [EXTRACTED]
  core/state/FunctionSlice.ts → src/models/Function.ts
- `FunctionIconProps` --references--> `FunctionCategory`  [EXTRACTED]
  components/functionIcon/FunctionIcon.tsx → src/models/Function.ts

## Import Cycles
- None detected.

## Communities (71 total, 8 thin omitted)

### Community 0 - "MapDefinitionDeserializer"
Cohesion: 0.13
Nodes (9): DataProviderInner(), MapDefinitionDeserializer, createSchemaNodeOrFunction(), getSourceNode(), separateFunctions(), addSourceReactFlowPrefix(), createReactFlowFunctionKey(), findNodeForKey() (+1 more)

### Community 1 - "MapDefinitionSerializer.ts"
Cohesion: 0.15
Nodes (29): addConditionalToNewPathItems(), addLoopingForToNewPathItems(), applyValueAtPath(), createNewPathItems(), createSourcePath(), createYamlFromMap(), findKeyInMap(), generateMapDefinitionBody() (+21 more)

### Community 2 - "images/FunctionIcons/FunctionIcons.tsx"
Cohesion: 0.05
Nodes (20): AbsoluteValue32Regular, AngleIcon, CeilingValue32Regular, Count32Regular, Divide32Regular, EPowerX32Regular, FloorValue32Regular, GreaterThan32Regular (+12 more)

### Community 3 - "images/FunctionIcons/DataType16Icons.tsx"
Cohesion: 0.08
Nodes (12): Any16Filled, Any16Regular, Array16Filled, Array16Regular, Binary16Filled, Binary16Regular, Decimal16Filled, Decimal16Regular (+4 more)

### Community 4 - "images/FunctionIcons/DataType24Icons.tsx"
Cohesion: 0.08
Nodes (12): Any24Filled, Any24Regular, Array24Filled, Array24Regular, Binary24Filled, Binary24Regular, Decimal24Filled, Decimal24Regular (+4 more)

### Community 5 - "components/functionConfigurationMenu/inputTab/inputTab.tsx"
Cohesion: 0.18
Nodes (13): InputDropdown(), InputDropdownProps, InputOptionProps, useStyles, InputCustomInfoLabel(), CommonProps, CustomListItem(), CustomListItemProps (+5 more)

### Community 6 - "core/services/dataMapperApiService/index.ts"
Cohesion: 0.23
Nodes (9): DataMapperApiServiceOptions, DmErrorResponse, dataMapperApiVersions, defaultDataMapperApiServiceOptions, GenerateXsltResponse, IDataMapperApiService, InitDataMapperApiService(), exampleTree (+1 more)

### Community 7 - "core/state/Store.ts"
Cohesion: 0.14
Nodes (15): AppStore, XsltFilePickerProps, appSlice, AppState, initialState, functionSlice, FunctionState, initialFunctionState (+7 more)

### Community 8 - "Schema.Utils.ts"
Cohesion: 0.16
Nodes (12): convertSchemaNodeToSchemaNodeExtended(), convertSchemaToSchemaExtended(), deepestNode(), getFileNameAndPath(), maxProperties(), nodeCount(), NodeScrollDirectionType, parsePropertiesIntoNodeProperties() (+4 more)

### Community 9 - "core/state/DataMapSlice.ts"
Cohesion: 0.09
Nodes (28): DataMapOperationState, convertConnectionShorthandToId(), generateFunctionConnectionMetadata(), generateMapMetadata(), FunctionDictionary, ComponentState, DataMapOperationState, dataMapSlice (+20 more)

### Community 10 - "DataMap.Utils.ts"
Cohesion: 0.11
Nodes (25): directAccessPseudoFunctionKey, ifPseudoFunctionKey, indexPseudoFunctionKey, indexed, addParentConnectionForRepeatingElementsNested(), amendSourceKeyForDirectAccessIfNeeded(), DSeparators, getDestinationKey() (+17 more)

### Community 11 - "TrieTree"
Cohesion: 0.15
Nodes (3): TrieTree, TrieTreeNode, AppState

### Community 12 - "components/common/selector/FileSelector.tsx"
Cohesion: 0.20
Nodes (11): useStyles, DataMapperFileService(), FileDropdownTree(), FileDropdownTreeProps, XsltFilePicker(), FileSelectorProps, SchemaFileSelector(), U (+3 more)

### Community 13 - "MapChecker.Utils.ts"
Cohesion: 0.08
Nodes (40): MapCheckerItem(), MapCheckerItemProps, MapCheckerPanel(), useMapCheckerItemStyles, useStyles, errorsSlice, ErrorsState, initialFunctionState (+32 more)

### Community 14 - "components/schema/useSchema.ts"
Cohesion: 0.24
Nodes (13): HandleResponseProps, useSchemaProps, SchemaTree(), SchemaTreeProps, SchemaTreeNode(), SchemaTreeNodeProps, TypeAnnotation(), SchemaTreeNodeHandle() (+5 more)

### Community 15 - "src/components/functionIcon/FunctionIcon.tsx"
Cohesion: 0.43
Nodes (6): FunctionIcon(), FunctionIconProps, FunctionIcon(), FunctionIconProps, iconForFunction(), iconForFunctionCategory()

### Community 16 - "core/index.ts"
Cohesion: 0.16
Nodes (14): getFunctions(), DataMapperApiServiceInstance(), pseudoFunctions, generateDataMapXslt(), testDataMap(), getFunctions(), getSelectedSchema(), useStyles (+6 more)

### Community 17 - "Edge.Utils.ts"
Cohesion: 0.19
Nodes (17): BoundingBox, convertCanvasToGridPoint(), convertGridToCanvasPoint(), findPath(), generateBoundingBoxes(), generatePathfindingGrid(), getLinearDistance(), getLineStretchLength() (+9 more)

### Community 18 - "Function.Utils.ts"
Cohesion: 0.13
Nodes (17): InputTextbox(), InputTextboxProps, collectionBranding, conversionBranding, customBranding, dateTimeBranding, FunctionGroupBranding, logicalBranding (+9 more)

### Community 19 - "components/schema/SchemaPanel.tsx"
Cohesion: 0.25
Nodes (13): FileWithVsCodePath, SchemaFile, SchemaPanelNodeReactFlowDataProps, ConfigPanelProps, schemaFileQuerySettings, SchemaPanel(), SchemaPanelBody(), SchemaPanelBodyProps (+5 more)

### Community 20 - "components/functionList/FunctionList.tsx"
Cohesion: 0.25
Nodes (11): FunctionDataTreeItem, FunctionList(), FunctionListProps, fuseFunctionSearchOptions, loopFuseFunctionSearchOptions, FunctionListHeader(), FunctionListHeaderProps, DropResult (+3 more)

### Community 21 - "components/canvas/ReactFlow.tsx"
Cohesion: 0.12
Nodes (21): EdgePopOver(), EdgePopOverProps, DMReactFlowProps, edgeTypes, nodeTypes, ReactFlowWrapper(), reactFlowStyle, useStyles (+13 more)

### Community 22 - "MapDefinitionDeserializer.ts"
Cohesion: 0.17
Nodes (13): mapDefinitionVersion, mapNodeParams, reservedMapDefinitionKeysArray, reservedMapNodeParamsArray, targetPrefix, ConditionalMetadata, getLoopTargetNode(), getLoopTargetNodeWithJson() (+5 more)

### Community 23 - "src/images/FunctionIcons/FunctionIcons.tsx"
Cohesion: 0.05
Nodes (20): AbsoluteValue32Regular, AngleIcon, CeilingValue32Regular, Count32Regular, Divide32Regular, EPowerX32Regular, FloorValue32Regular, GreaterThan32Regular (+12 more)

### Community 24 - "ThemeConect.ts"
Cohesion: 0.18
Nodes (9): ConnectionLineComponent(), FunctionCategoryColorToken, customDarkTokens, customTokens, DataMapperTheme, extendedWebDarkTheme, extendedWebLightTheme, fnColors (+1 more)

### Community 25 - "CustomValue.Utils.ts"
Cohesion: 0.73
Nodes (3): checkIfValueNeedsQuotes(), quoteSelectedCustomValue(), quoteString()

### Community 26 - "components/common/reactflow/FunctionNode.tsx"
Cohesion: 0.31
Nodes (8): CanvasNode(), CanvasNodeProps, CardProps, FunctionCardProps, FunctionNode(), useStyles, useHoverFunctionNode(), useSelectedNode()

### Community 27 - "ReactFlow.Util.ts"
Cohesion: 0.13
Nodes (20): getCoordinatesForHandle(), functionPrefix, NodeIds, ReactFlowEdgeType, ReactFlowNodeType, sourcePrefix, getCoordinatesForHandle(), useEdgePath() (+12 more)

### Community 28 - "src/components/canvas/useReactflowStates.ts"
Cohesion: 0.44
Nodes (7): ReactFlowStatesProps, useReactFlowStates(), ReactFlowStatesProps, useReactFlowStates(), createEdgeId(), getFunctionNode(), convertWholeDataMapToLayoutTree()

### Community 29 - "src/core/state/selectors/selectors.ts"
Cohesion: 0.33
Nodes (8): ConnectedEdge(), useEdgePath(), useHoverEdge(), useHoverNode(), useSelectedEdge(), useSelectedIntermediateEdge(), useHoverNode(), getReactFlowNodeId()

### Community 30 - "components/functionConfigurationMenu/functionConfigurationPopover.tsx"
Cohesion: 0.36
Nodes (7): DetailsTabContents(), FunctionConfigurationPopover(), FunctionConfigurationPopoverProps, TabTypes, useStyles, OutputTabContents(), isFileDropdownFunction()

### Community 31 - "components/codeView/CodeViewPanel.tsx"
Cohesion: 0.46
Nodes (5): CodeViewPanel(), CodeViewPanelProps, CodeViewPanelBody(), CodeViewPanelBodyProps, useStyles

### Community 32 - "src/components/functionsPanel/FunctionPanel.tsx"
Cohesion: 0.26
Nodes (7): FunctionPanel(), PanelProps, useStyles, FunctionPanel(), PanelProps, useStyles, FunctionsSVG()

### Community 33 - "src/core/state/DataMapSlice.ts"
Cohesion: 0.09
Nodes (36): UnboundedInput, ComponentState, dataMapSlice, DataMapState, DeleteConnectionAction, deleteConnectionFromConnections(), deleteNodeFromConnections(), deleteParentRepeatingConnections() (+28 more)

### Community 34 - "src/components/functionConfigurationMenu/inputTab/inputTab.tsx"
Cohesion: 0.14
Nodes (26): InputDropdown(), InputDropdownProps, InputOptionProps, useStyles, InputCustomInfoLabel(), CommonProps, CustomListItem(), CustomListItemProps (+18 more)

### Community 35 - "src/core/state/Store.ts"
Cohesion: 0.08
Nodes (22): reactPlugin, DataMapDataProviderProps, DataMapperDesignerContext, DataMapperWrappedContext, ScrollLocation, ScrollProps, DataMapperDesignerProvider(), DataMapperDesignerProviderProps (+14 more)

### Community 36 - "Icon.Utils.tsx"
Cohesion: 0.18
Nodes (7): CollectionRegular, StringCategory20Regular, CollectionRegular, StringCategory20Regular, iconBaseUrl, iconSize, mapCheckerIconStyle

### Community 37 - "FunctionData"
Cohesion: 0.17
Nodes (15): getConnectionForAnyKey(), hasExpectedConnection(), ConnectionDictionary, CustomValueConnection, EmptyConnection, NodeConnection, FunctionData, functionMock (+7 more)

### Community 44 - "DataMapperDesigner.tsx"
Cohesion: 0.11
Nodes (11): IDataMapperFileService, InitDataMapperFileService(), SchemaFile, IDataMapperFileService, InitDataMapperFileService(), SchemaFile, DataMapperDesigner(), DataMapperDesignerProps (+3 more)

### Community 45 - "Connection.Utils.ts"
Cohesion: 0.15
Nodes (22): SetConnectionInputAction, InputConnection, FunctionCategory, SetConnectionInputAction, mockBoundedFunctionInputs, parentManyToOneTargetNode, parentTargetNode, areAllFunctionInputsFilled() (+14 more)

### Community 46 - "src/components/canvas/ReactFlow.tsx"
Cohesion: 0.12
Nodes (21): EdgePopOver(), EdgePopOverProps, DMReactFlowProps, edgeTypes, nodeTypes, NOTE: Putting this useEffect here for vis next to onSave, ReactFlowWrapper(), reactFlowStyle (+13 more)

### Community 47 - "src/images/FunctionIcons/DataType16Icons.tsx"
Cohesion: 0.08
Nodes (12): Any16Filled, Any16Regular, Array16Filled, Array16Regular, Binary16Filled, Binary16Regular, Decimal16Filled, Decimal16Regular (+4 more)

### Community 48 - "src/images/FunctionIcons/DataType24Icons.tsx"
Cohesion: 0.08
Nodes (12): Any24Filled, Any24Regular, Array24Filled, Array24Regular, Binary24Filled, Binary24Regular, Decimal24Filled, Decimal24Regular (+4 more)

### Community 49 - "applyConnectionValue"
Cohesion: 0.21
Nodes (18): reservedMapDefinitionKeys, addConnection(), convertToArray(), generateMapDefinitionHeader(), createSchemaToSchemaNodeConnection(), isEqualToCustomValue(), directAccessPseudoFunction, ifPseudoFunction (+10 more)

### Community 50 - "src/components/schema/SchemaPanel.tsx"
Cohesion: 0.19
Nodes (16): FileSelectorOption, SchemaFileSelector(), U, useStyles, ConfigPanelProps, schemaFileQuerySettings, SchemaPanel(), SchemaPanelBody() (+8 more)

### Community 51 - "src/components/schema/useSchema.ts"
Cohesion: 0.23
Nodes (16): SchemaTree(), SchemaTreeProps, SchemaTreeNode(), SchemaTreeNodeProps, TypeAnnotation(), SchemaTreeNodeHandle(), SchemaTreeNodeHandleProps, useHandleStyles (+8 more)

### Community 52 - "TrieTree"
Cohesion: 0.20
Nodes (3): TrieTree, TrieTreeNode, AppState

### Community 53 - "src/components/functionList/FunctionList.tsx"
Cohesion: 0.21
Nodes (15): functionCategoryItemKeyPrefix, FunctionDataTreeItem, FunctionList(), FunctionListProps, fuseFunctionSearchOptions, loopFuseFunctionSearchOptions, NOTE: Explicitly use this instead of isAddingInlineFunction to track…, FunctionListHeader() (+7 more)

### Community 54 - "RootState"
Cohesion: 0.21
Nodes (11): CodeViewPanel(), CodeViewPanelProps, CodeViewPanelBody(), CodeViewPanelBodyProps, useStyles, Panel(), PanelProps, PanelXButton() (+3 more)

### Community 55 - "core/state/PanelSlice.ts"
Cohesion: 0.16
Nodes (13): TestMapResponse, InputListWrapper, CodeViewState, ConfigPanelView, FunctionPanelState, initialState, MapCheckPanelState, MapCheckTabType (+5 more)

### Community 56 - "isEmptyConnection"
Cohesion: 0.26
Nodes (12): DetailsTabContents(), FunctionConfigurationPopover(), FunctionConfigurationPopoverProps, TabTypes, OutputTabContents(), validateAndCreateConnectionOutput(), useStyles, validateAndCreateConnectionInput() (+4 more)

### Community 57 - "src/core/services/dataMapperApiService/index.ts"
Cohesion: 0.22
Nodes (10): DataMapperApiServiceOptions, DmErrorResponse, NOTE: From BPM repo, looks like two schema files with the same name will prefer…, dataMapperApiVersions, defaultDataMapperApiServiceOptions, GenerateXsltResponse, InitDataMapperApiService(), exampleTree (+2 more)

### Community 58 - "src/components/commandBar/EditorCommandBar.tsx"
Cohesion: 0.22
Nodes (9): EditorCommandBar(), EditorCommandBarProps, useStyles, initialState, modalSlice, ModalState, NOTE: Currently, modal is just used for discard data map changes warning, WarningModalState (+1 more)

### Community 59 - "src/core/state/PanelSlice.ts"
Cohesion: 0.21
Nodes (11): TestMapResponse, CodeViewState, ConfigPanelView, FunctionPanelState, initialState, MapCheckPanelState, MapCheckTabType, panelSlice (+3 more)

### Community 62 - "components/commandBar/EditorCommandBar.tsx"
Cohesion: 0.21
Nodes (9): EditorCommandBar(), EditorCommandBarProps, useStyles, MetaMapDefinition, initialState, modalSlice, ModalState, WarningModalState (+1 more)

### Community 63 - "src/components/test/TestPanel.tsx"
Cohesion: 0.32
Nodes (8): useStyles, TestPanel(), TestPanelProps, TestPanelBody(), TestPanelBodyProps, generateDataMapXslt(), testDataMap(), DataMapperApiServiceInstance()

### Community 64 - "src/components/common/reactflow/FunctionNode.tsx"
Cohesion: 0.31
Nodes (8): CanvasNode(), CanvasNodeProps, CardProps, FunctionCardProps, FunctionNode(), useStyles, useHoverFunctionNode(), useSelectedNode()

### Community 65 - "src/components/common/selector/__test__/FileSelector.spec.tsx"
Cohesion: 0.31
Nodes (6): FileDropdownTree(), FileDropdownTreeProps, MockFileService, FileSelectorProps, MockFileService, useStyles

### Community 67 - "MapDefinition.Utils.ts"
Cohesion: 0.67
Nodes (3): fixMapDefinitionCustomValues(), loadMapDefinition(), TODO: Handle arrays better, currently fine for XML, but this will need to be…

## Knowledge Gaps
- **197 isolated node(s):** `cache`, `intl`, `EdgePopOverProps`, `DMReactFlowProps`, `nodeTypes` (+192 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `FunctionData` connect `FunctionData` to `MapDefinitionDeserializer`, `components/functionConfigurationMenu/inputTab/inputTab.tsx`, `core/state/Store.ts`, `Schema.Utils.ts`, `core/state/DataMapSlice.ts`, `DataMap.Utils.ts`, `MapChecker.Utils.ts`, `core/index.ts`, `Function.Utils.ts`, `components/functionList/FunctionList.tsx`, `MapDefinitionDeserializer.ts`, `components/common/reactflow/FunctionNode.tsx`, `ReactFlow.Util.ts`, `components/functionConfigurationMenu/functionConfigurationPopover.tsx`, `src/core/state/DataMapSlice.ts`, `src/components/functionConfigurationMenu/inputTab/inputTab.tsx`, `src/core/state/Store.ts`, `Connection.Utils.ts`, `applyConnectionValue`, `src/components/functionList/FunctionList.tsx`, `isEmptyConnection`, `src/components/common/reactflow/FunctionNode.tsx`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `LogCategory` connect `core/index.ts` to `Icon.Utils.tsx`, `Schema.Utils.ts`, `Edge.Utils.ts`, `Function.Utils.ts`, `components/functionList/FunctionList.tsx`, `src/components/functionList/FunctionList.tsx`, `src/components/commandBar/EditorCommandBar.tsx`, `components/commandBar/EditorCommandBar.tsx`, `src/components/test/TestPanel.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `MapDefinitionDeserializer` connect `MapDefinitionDeserializer` to `src/core/state/Store.ts`, `FunctionData`, `DataMap.Utils.ts`, `MapChecker.Utils.ts`, `MapDefinitionDeserializer.ts`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `cache`, `intl`, `EdgePopOverProps` to the rest of the system?**
  _197 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `MapDefinitionDeserializer` be split into smaller, more focused modules?**
  _Cohesion score 0.13363363363363365 - nodes in this community are weakly interconnected._
- **Should `MapDefinitionSerializer.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14623655913978495 - nodes in this community are weakly interconnected._
- **Should `images/FunctionIcons/FunctionIcons.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._