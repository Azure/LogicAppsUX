# Graph Report - src  (2026-09-13)

## Corpus Check
- 143 files · ~77,576 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1292 nodes · 3868 edges · 69 communities (56 shown, 9 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 74 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f1dec486`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- MapDefinitionDeserializer
- MapDefinitionSerializer.ts
- Icon.Utils.tsx
- images/FunctionIcons/DataType16Icons.tsx
- images/FunctionIcons/DataType24Icons.tsx
- FunctionData
- core/services/dataMapperApiService/index.ts
- DataMapDataProvider.tsx
- Schema.Utils.ts
- src/core/state/DataMapSlice.ts
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
- components/functionConfigurationMenu/inputTab/inputTab.tsx
- ThemeConect.ts
- CustomValue.Utils.ts
- src/images/FunctionIcons/FunctionIcons.tsx
- ReactFlow.Util.ts
- isFunctionNode
- src/core/state/selectors/selectors.ts
- DataMapperDesigner.tsx
- core/state/Store.ts
- src/components/functionsPanel/FunctionPanel.tsx
- src/components/functionConfigurationMenu/inputTab/inputTab.tsx
- src/images/FunctionIcons/DataType16Icons.tsx
- src/images/FunctionIcons/DataType24Icons.tsx
- Connection.Utils.ts
- src/components/schema/SchemaPanel.tsx
- intl-test-helper.tsx
- utils/reactFlowTesting/NodeInspector.tsx
- ReactFlow.ts
- Svg.d.ts
- src/core/state/Store.ts
- TrieTree
- src/components/canvas/ReactFlow.tsx
- src/components/schema/useSchema.ts
- src/components/functionList/FunctionList.tsx
- src/components/codeView/CodeViewPanel.tsx
- src/core/services/dataMapperApiService/index.ts
- src/core/state/PanelSlice.ts
- DataMapperApiService
- ConnectionDictionary
- DataMapperApiService
- core/state/PanelSlice.ts
- src/components/commandBar/EditorCommandBar.tsx
- components/commandBar/EditorCommandBar.tsx
- src/components/common/reactflow/FunctionNode.tsx
- src/components/common/selector/__test__/FileSelector.spec.tsx
- src/components/test/TestPanel.tsx
- components/common/panel/Panel.tsx
- src/ui/hooks/useAutoLayout.ts
- IDataMapperApiService
- src/images/FunctionIcons/CategoryIcons.tsx
- MapDefinition.Utils.ts
- src/utils/reactFlowTesting/NodeInspector.tsx

## God Nodes (most connected - your core abstractions)
1. `FunctionData` - 60 edges
2. `isSchemaNodeExtended()` - 43 edges
3. `MapDefinitionDeserializer` - 38 edges
4. `ConnectionDictionary` - 38 edges
5. `applyConnectionValue()` - 36 edges
6. `isNodeConnection()` - 32 edges
7. `RootState` - 31 edges
8. `RootState` - 31 edges
9. `isCustomValueConnection()` - 30 edges
10. `convertSchemaToSchemaExtended()` - 30 edges

## Surprising Connections (you probably didn't know these)
- `FunctionListItemProps` --references--> `FunctionData`  [EXTRACTED]
  components/functionList/FunctionListItem.tsx → src/models/Function.ts
- `InputDropdownProps` --references--> `FunctionData`  [EXTRACTED]
  components/functionConfigurationMenu/inputDropdown/InputDropdown.tsx → src/models/Function.ts
- `FunctionState` --references--> `FunctionData`  [EXTRACTED]
  core/state/FunctionSlice.ts → src/models/Function.ts
- `FunctionIconProps` --references--> `FunctionCategory`  [EXTRACTED]
  components/functionIcon/FunctionIcon.tsx → src/models/Function.ts
- `ExtendedRenderOptions` --references--> `RootState`  [EXTRACTED]
  src/__test__/redux-test-helper-dm.tsx → core/state/Store.ts

## Import Cycles
- None detected.

## Communities (69 total, 9 thin omitted)

### Community 0 - "MapDefinitionDeserializer"
Cohesion: 0.14
Nodes (7): DataProviderInner(), MapDefinitionDeserializer, createSchemaNodeOrFunction(), separateFunctions(), DeserializationError, addSourceReactFlowPrefix(), createReactFlowFunctionKey()

### Community 1 - "MapDefinitionSerializer.ts"
Cohesion: 0.14
Nodes (33): addConditionalToNewPathItems(), addLoopingForToNewPathItems(), applyValueAtPath(), convertToArray(), convertToMapDefinition(), createNewPathItems(), createSourcePath(), createYamlFromMap() (+25 more)

### Community 2 - "Icon.Utils.tsx"
Cohesion: 0.06
Nodes (23): AbsoluteValue32Regular, AngleIcon, CeilingValue32Regular, Count32Regular, Divide32Regular, EPowerX32Regular, FloorValue32Regular, GreaterThan32Regular (+15 more)

### Community 3 - "images/FunctionIcons/DataType16Icons.tsx"
Cohesion: 0.08
Nodes (12): Any16Filled, Any16Regular, Array16Filled, Array16Regular, Binary16Filled, Binary16Regular, Decimal16Filled, Decimal16Regular (+4 more)

### Community 4 - "images/FunctionIcons/DataType24Icons.tsx"
Cohesion: 0.08
Nodes (12): Any24Filled, Any24Regular, Array24Filled, Array24Regular, Binary24Filled, Binary24Regular, Decimal24Filled, Decimal24Regular (+4 more)

### Community 5 - "FunctionData"
Cohesion: 0.11
Nodes (41): reservedMapDefinitionKeys, addConnection(), SetConnectionInputAction, generateMapDefinitionHeader(), getConnectionForAnyKey(), hasExpectedConnection(), createSchemaToSchemaNodeConnection(), isEqualToCustomValue() (+33 more)

### Community 6 - "core/services/dataMapperApiService/index.ts"
Cohesion: 0.23
Nodes (9): DataMapperApiServiceOptions, DmErrorResponse, dataMapperApiVersions, defaultDataMapperApiServiceOptions, GenerateXsltResponse, IDataMapperApiService, InitDataMapperApiService(), exampleTree (+1 more)

### Community 7 - "DataMapDataProvider.tsx"
Cohesion: 0.13
Nodes (10): DataMapDataProviderProps, appSlice, AppState, initialState, functionSlice, FunctionState, initialFunctionState, initialSchemaState (+2 more)

### Community 8 - "Schema.Utils.ts"
Cohesion: 0.16
Nodes (15): targetPrefix, convertSchemaNodeToSchemaNodeExtended(), convertSchemaToSchemaExtended(), deepestNode(), findNodeForKey(), getFileNameAndPath(), maxProperties(), nodeCount() (+7 more)

### Community 9 - "src/core/state/DataMapSlice.ts"
Cohesion: 0.06
Nodes (51): UnboundedInput, ComponentState, dataMapSlice, DataMapState, DeleteConnectionAction, deleteConnectionFromConnections(), deleteNodeFromConnections(), deleteParentRepeatingConnections() (+43 more)

### Community 10 - "DataMap.Utils.ts"
Cohesion: 0.12
Nodes (25): directAccessPseudoFunctionKey, indexPseudoFunctionKey, indexed, addParentConnectionForRepeatingElementsNested(), amendSourceKeyForDirectAccessIfNeeded(), Dseparators, flattenMapDefinitionValues(), getDestinationKey() (+17 more)

### Community 11 - "TrieTree"
Cohesion: 0.15
Nodes (3): TrieTree, TrieTreeNode, AppState

### Community 12 - "components/common/selector/FileSelector.tsx"
Cohesion: 0.19
Nodes (12): useStyles, DataMapperFileService(), FileDropdownTree(), FileDropdownTreeProps, XsltFilePicker(), XsltFilePickerProps, FileSelectorProps, SchemaFileSelector() (+4 more)

### Community 13 - "MapChecker.Utils.ts"
Cohesion: 0.09
Nodes (34): MapCheckerItem(), MapCheckerItemProps, MapCheckerPanel(), useMapCheckerItemStyles, useStyles, errorsSlice, ErrorsState, initialFunctionState (+26 more)

### Community 14 - "components/schema/useSchema.ts"
Cohesion: 0.24
Nodes (15): HandleResponseProps, useSchema(), useSchemaProps, AppDispatch, SchemaTree(), SchemaTreeProps, SchemaTreeNode(), SchemaTreeNodeProps (+7 more)

### Community 15 - "src/components/functionIcon/FunctionIcon.tsx"
Cohesion: 0.43
Nodes (6): FunctionIcon(), FunctionIconProps, FunctionIcon(), FunctionIconProps, iconForFunction(), iconForFunctionCategory()

### Community 16 - "core/index.ts"
Cohesion: 0.12
Nodes (16): getFunctions(), DataMapperApiServiceInstance(), DataMapperApiServiceInstance(), SchemaFile, pseudoFunctions, generateDataMapXslt(), testDataMap(), getFunctions() (+8 more)

### Community 17 - "Edge.Utils.ts"
Cohesion: 0.19
Nodes (17): BoundingBox, convertCanvasToGridPoint(), convertGridToCanvasPoint(), findPath(), generateBoundingBoxes(), generatePathfindingGrid(), getLinearDistance(), getLineStretchLength() (+9 more)

### Community 18 - "Function.Utils.ts"
Cohesion: 0.11
Nodes (21): InputTextbox(), InputTextboxProps, collectionBranding, conversionBranding, customBranding, dateTimeBranding, FunctionGroupBranding, logicalBranding (+13 more)

### Community 19 - "components/schema/SchemaPanel.tsx"
Cohesion: 0.25
Nodes (12): FileWithVsCodePath, SchemaFile, SchemaPanelNodeReactFlowDataProps, ConfigPanelProps, schemaFileQuerySettings, SchemaPanel(), SchemaPanelBody(), SchemaPanelBodyProps (+4 more)

### Community 20 - "components/functionList/FunctionList.tsx"
Cohesion: 0.25
Nodes (11): FunctionDataTreeItem, FunctionList(), FunctionListProps, fuseFunctionSearchOptions, loopFuseFunctionSearchOptions, FunctionListHeader(), FunctionListHeaderProps, DropResult (+3 more)

### Community 21 - "components/canvas/ReactFlow.tsx"
Cohesion: 0.07
Nodes (37): EdgePopOver(), EdgePopOverProps, DMReactFlowProps, edgeTypes, nodeTypes, ReactFlowWrapper(), reactFlowStyle, useStyles (+29 more)

### Community 22 - "MapDefinitionDeserializer.ts"
Cohesion: 0.20
Nodes (12): mapDefinitionVersion, mapNodeParams, reservedMapDefinitionKeysArray, reservedMapNodeParamsArray, ConditionalMetadata, getLoopTargetNode(), getLoopTargetNodeWithJson(), LoopMetadata (+4 more)

### Community 23 - "components/functionConfigurationMenu/inputTab/inputTab.tsx"
Cohesion: 0.11
Nodes (27): DetailsTabContents(), FunctionConfigurationPopover(), FunctionConfigurationPopoverProps, TabTypes, OutputTabContents(), validateAndCreateConnectionOutput(), useStyles, InputDropdown() (+19 more)

### Community 24 - "ThemeConect.ts"
Cohesion: 0.20
Nodes (8): FunctionCategoryColorToken, customDarkTokens, customTokens, DataMapperTheme, extendedWebDarkTheme, extendedWebLightTheme, fnColors, spacingOverrides

### Community 25 - "CustomValue.Utils.ts"
Cohesion: 0.73
Nodes (3): checkIfValueNeedsQuotes(), quoteSelectedCustomValue(), quoteString()

### Community 26 - "src/images/FunctionIcons/FunctionIcons.tsx"
Cohesion: 0.05
Nodes (20): AbsoluteValue32Regular, AngleIcon, CeilingValue32Regular, Count32Regular, Divide32Regular, EPowerX32Regular, FloorValue32Regular, GreaterThan32Regular (+12 more)

### Community 27 - "ReactFlow.Util.ts"
Cohesion: 0.14
Nodes (13): functionPrefix, ReactFlowEdgeType, ReactFlowNodeType, sourcePrefix, ContainerLayoutNode, LayoutContainer, LayoutEdge, LayoutNode (+5 more)

### Community 28 - "isFunctionNode"
Cohesion: 0.30
Nodes (11): ReactFlowStatesProps, useReactFlowStates(), ReactFlowStatesProps, useReactFlowStates(), NodeIds, getCoordinatesForHandle(), createEdgeId(), getFunctionNode() (+3 more)

### Community 29 - "src/core/state/selectors/selectors.ts"
Cohesion: 0.28
Nodes (10): ConnectedEdge(), getCoordinatesForHandle(), useEdgePath(), useHoverEdge(), useHoverNode(), useSelectedEdge(), useSelectedIntermediateEdge(), useHoverNode() (+2 more)

### Community 30 - "DataMapperDesigner.tsx"
Cohesion: 0.11
Nodes (13): DataMapperWrappedContext, ScrollLocation, ScrollProps, IDataMapperFileService, InitDataMapperFileService(), SchemaFile, IDataMapperFileService, InitDataMapperFileService() (+5 more)

### Community 31 - "core/state/Store.ts"
Cohesion: 0.15
Nodes (15): reactPlugin, CodeViewPanel(), CodeViewPanelProps, CodeViewPanelBody(), CodeViewPanelBodyProps, useStyles, DataMapperDesignerContext, DataMapperDesignerProvider() (+7 more)

### Community 32 - "src/components/functionsPanel/FunctionPanel.tsx"
Cohesion: 0.26
Nodes (7): FunctionPanel(), PanelProps, useStyles, FunctionPanel(), PanelProps, useStyles, FunctionsSVG()

### Community 33 - "src/components/functionConfigurationMenu/inputTab/inputTab.tsx"
Cohesion: 0.18
Nodes (19): InputOptionProps, InputCustomInfoLabel(), CommonProps, CustomListItem(), CustomListItemProps, InputList(), InputListProps, InputListWrapper (+11 more)

### Community 34 - "src/images/FunctionIcons/DataType16Icons.tsx"
Cohesion: 0.08
Nodes (12): Any16Filled, Any16Regular, Array16Filled, Array16Regular, Binary16Filled, Binary16Regular, Decimal16Filled, Decimal16Regular (+4 more)

### Community 35 - "src/images/FunctionIcons/DataType24Icons.tsx"
Cohesion: 0.08
Nodes (12): Any24Filled, Any24Regular, Array24Filled, Array24Regular, Binary24Filled, Binary24Regular, Decimal24Filled, Decimal24Regular (+4 more)

### Community 36 - "Connection.Utils.ts"
Cohesion: 0.18
Nodes (18): InputDropdown(), InputDropdownProps, useStyles, addRepeatingInputConnection(), areAllFunctionInputsFilled(), collectSourceNodeIdsForConnectionChain(), collectSourceNodesForConnectionChain(), collectTargetNodeIdsForConnectionChain() (+10 more)

### Community 37 - "src/components/schema/SchemaPanel.tsx"
Cohesion: 0.19
Nodes (16): FileSelectorOption, SchemaFileSelector(), U, useStyles, ConfigPanelProps, schemaFileQuerySettings, SchemaPanel(), SchemaPanelBody() (+8 more)

### Community 44 - "src/core/state/Store.ts"
Cohesion: 0.14
Nodes (15): appSlice, AppState, initialState, functionSlice, FunctionState, initialFunctionState, initialSchemaState, schemaSlice (+7 more)

### Community 45 - "TrieTree"
Cohesion: 0.22
Nodes (4): TrieTree, TrieTreeNode, AppState, useSearch()

### Community 46 - "src/components/canvas/ReactFlow.tsx"
Cohesion: 0.16
Nodes (15): EdgePopOver(), EdgePopOverProps, DMReactFlowProps, edgeTypes, nodeTypes, NOTE: Putting this useEffect here for vis next to onSave, ReactFlowWrapper(), reactFlowStyle (+7 more)

### Community 47 - "src/components/schema/useSchema.ts"
Cohesion: 0.24
Nodes (15): SchemaTree(), SchemaTreeProps, SchemaTreeNode(), SchemaTreeNodeProps, TypeAnnotation(), SchemaTreeNodeHandle(), SchemaTreeNodeHandleProps, useHandleStyles (+7 more)

### Community 48 - "src/components/functionList/FunctionList.tsx"
Cohesion: 0.21
Nodes (15): functionCategoryItemKeyPrefix, FunctionDataTreeItem, FunctionList(), FunctionListProps, fuseFunctionSearchOptions, loopFuseFunctionSearchOptions, NOTE: Explicitly use this instead of isAddingInlineFunction to track…, FunctionListHeader() (+7 more)

### Community 49 - "src/components/codeView/CodeViewPanel.tsx"
Cohesion: 0.22
Nodes (10): CodeViewPanel(), CodeViewPanelProps, CodeViewPanelBody(), CodeViewPanelBodyProps, useStyles, Panel(), PanelProps, PanelXButton() (+2 more)

### Community 50 - "src/core/services/dataMapperApiService/index.ts"
Cohesion: 0.19
Nodes (12): DataMapperApiServiceOptions, DmErrorResponse, NOTE: From BPM repo, looks like two schema files with the same name will prefer…, dataMapperApiVersions, defaultDataMapperApiServiceOptions, GenerateXsltResponse, InitDataMapperApiService(), TestMapResponse (+4 more)

### Community 51 - "src/core/state/PanelSlice.ts"
Cohesion: 0.18
Nodes (11): CodeViewState, ConfigPanelView, FunctionPanelState, initialState, MapCheckPanelState, MapCheckTabType, panelSlice, PanelState (+3 more)

### Community 53 - "ConnectionDictionary"
Cohesion: 0.31
Nodes (11): DataMapOperationState, InitialDataMapAction, convertConnectionShorthandToId(), generateFunctionConnectionMetadata(), generateMapMetadata(), ConnectionDictionary, FunctionDictionary, DataMapOperationState (+3 more)

### Community 55 - "core/state/PanelSlice.ts"
Cohesion: 0.21
Nodes (11): TestMapResponse, CodeViewState, ConfigPanelView, FunctionPanelState, initialState, MapCheckPanelState, MapCheckTabType, panelSlice (+3 more)

### Community 56 - "src/components/commandBar/EditorCommandBar.tsx"
Cohesion: 0.24
Nodes (9): EditorCommandBar(), EditorCommandBarProps, useStyles, generateDataMapXslt(), initialState, modalSlice, ModalState, NOTE: Currently, modal is just used for discard data map changes warning (+1 more)

### Community 57 - "components/commandBar/EditorCommandBar.tsx"
Cohesion: 0.24
Nodes (8): EditorCommandBar(), EditorCommandBarProps, useStyles, MetaMapDefinition, initialState, modalSlice, ModalState, WarningModalState

### Community 58 - "src/components/common/reactflow/FunctionNode.tsx"
Cohesion: 0.31
Nodes (8): CanvasNode(), CanvasNodeProps, CardProps, FunctionCardProps, FunctionNode(), useStyles, useHoverFunctionNode(), useSelectedNode()

### Community 59 - "src/components/common/selector/__test__/FileSelector.spec.tsx"
Cohesion: 0.31
Nodes (6): FileDropdownTree(), FileDropdownTreeProps, MockFileService, FileSelectorProps, MockFileService, useStyles

### Community 60 - "src/components/test/TestPanel.tsx"
Cohesion: 0.40
Nodes (6): useStyles, TestPanel(), TestPanelProps, TestPanelBody(), TestPanelBodyProps, testDataMap()

### Community 61 - "components/common/panel/Panel.tsx"
Cohesion: 0.39
Nodes (5): Panel(), PanelProps, PanelXButton(), PanelXButtonProps, useStyles

### Community 62 - "src/ui/hooks/useAutoLayout.ts"
Cohesion: 0.29
Nodes (7): autoLayout(), Direction, elk, elkLayout(), LayoutAlgorithm, LayoutOptions, panelWidth

### Community 65 - "MapDefinition.Utils.ts"
Cohesion: 0.83
Nodes (3): fixMapDefinitionCustomValues(), loadMapDefinition(), TODO: Handle arrays better, currently fine for XML, but this will need to be…

## Knowledge Gaps
- **197 isolated node(s):** `cache`, `intl`, `EdgePopOverProps`, `DMReactFlowProps`, `nodeTypes` (+192 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 364 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `FunctionData` connect `FunctionData` to `MapDefinitionDeserializer`, `src/components/functionConfigurationMenu/inputTab/inputTab.tsx`, `Connection.Utils.ts`, `DataMapDataProvider.tsx`, `Schema.Utils.ts`, `src/core/state/DataMapSlice.ts`, `DataMap.Utils.ts`, `src/core/state/Store.ts`, `MapChecker.Utils.ts`, `src/components/functionList/FunctionList.tsx`, `core/index.ts`, `Function.Utils.ts`, `components/functionList/FunctionList.tsx`, `components/canvas/ReactFlow.tsx`, `MapDefinitionDeserializer.ts`, `components/functionConfigurationMenu/inputTab/inputTab.tsx`, `src/components/common/reactflow/FunctionNode.tsx`, `ReactFlow.Util.ts`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `LogCategory` connect `core/index.ts` to `Icon.Utils.tsx`, `Schema.Utils.ts`, `src/components/functionList/FunctionList.tsx`, `Edge.Utils.ts`, `Function.Utils.ts`, `components/functionList/FunctionList.tsx`, `src/components/commandBar/EditorCommandBar.tsx`, `components/commandBar/EditorCommandBar.tsx`, `src/components/test/TestPanel.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `FunctionCategory` connect `FunctionData` to `src/images/FunctionIcons/CategoryIcons.tsx`, `Icon.Utils.tsx`, `Connection.Utils.ts`, `src/core/state/DataMapSlice.ts`, `DataMap.Utils.ts`, `src/components/functionIcon/FunctionIcon.tsx`, `src/components/functionList/FunctionList.tsx`, `Function.Utils.ts`, `components/functionList/FunctionList.tsx`, `components/functionConfigurationMenu/inputTab/inputTab.tsx`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `cache`, `intl`, `EdgePopOverProps` to the rest of the system?**
  _197 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `MapDefinitionDeserializer` be split into smaller, more focused modules?**
  _Cohesion score 0.13968253968253969 - nodes in this community are weakly interconnected._
- **Should `MapDefinitionSerializer.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1361344537815126 - nodes in this community are weakly interconnected._
- **Should `Icon.Utils.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06280193236714976 - nodes in this community are weakly interconnected._