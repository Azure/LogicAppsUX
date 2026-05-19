# Graph Report - src  (2026-05-19)

## Corpus Check
- 143 files · ~77,576 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1505 nodes · 2671 edges · 182 communities (173 shown, 9 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 118 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 121|Community 121]]
- [[_COMMUNITY_Community 122|Community 122]]
- [[_COMMUNITY_Community 123|Community 123]]
- [[_COMMUNITY_Community 124|Community 124]]
- [[_COMMUNITY_Community 125|Community 125]]
- [[_COMMUNITY_Community 126|Community 126]]
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

## God Nodes (most connected - your core abstractions)
1. `RootState` - 30 edges
2. `ConnectionDictionary` - 22 edges
3. `applyConnectionValue()` - 21 edges
4. `isSchemaNodeExtended()` - 20 edges
5. `convertSchemaToSchemaExtended()` - 17 edges
6. `isCustomValueConnection()` - 17 edges
7. `AppDispatch` - 16 edges
8. `isEmptyConnection()` - 16 edges
9. `FunctionData` - 16 edges
10. `isNodeConnection()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `getInputTypeFromNode()` --calls--> `isSchemaNodeExtended()`  [INFERRED]
  components/functionConfigurationMenu/inputTab/inputTab.tsx → utils/Schema.Utils.ts
- `createSourcePath()` --calls--> `isEmptyConnection()`  [EXTRACTED]
  mapHandling/MapDefinitionSerializer.ts → utils/Connection.Utils.ts
- `createSourcePath()` --calls--> `isCustomValueConnection()`  [EXTRACTED]
  mapHandling/MapDefinitionSerializer.ts → utils/Connection.Utils.ts
- `getPathForSrcSchemaNode()` --calls--> `findLast()`  [EXTRACTED]
  mapHandling/MapDefinitionSerializer.ts → utils/Array.Utils.ts
- `addConditionalToNewPathItems()` --calls--> `collectConditionalValues()`  [EXTRACTED]
  mapHandling/MapDefinitionSerializer.ts → utils/DataMap.Utils.ts

## Communities (182 total, 9 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.13
Nodes (13): addRepeatingInputConnection(), areAllFunctionInputsFilled(), collectSourceNodeIdsForConnectionChain(), collectTargetNodeIdsForConnectionChain(), connectionDoesExist(), getActiveNodes(), isEmptyConnection(), isFunctionInputSlotAvailable() (+5 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (28): ConnectedEdge(), EdgePopOver(), getLoopTargetNode(), getLoopTargetNodeWithJson(), MapDefinitionDeserializer, convertSchemaNodeToSchemaNodeExtended(), convertSchemaToSchemaExtended(), deepestNode() (+20 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (15): isCustomValueConnection(), getDestinationKey(), getDestinationNode(), getSourceNode(), calculateIndexValue(), findFunctionForFunctionName(), findFunctionForKey(), functionDropDownItemText() (+7 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (13): amendSourceKeyForDirectAccessIfNeeded(), collectConditionalValues(), collectFunctionValue(), collectSequenceValue(), combineFunctionAndInputs(), createSchemaNodeOrFunction(), extractScopeFromLoop(), getInputValues() (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.18
Nodes (3): TrieTree, TrieTreeNode, useSearch()

### Community 5 - "Community 5"
Cohesion: 0.27
Nodes (7): isNodeConnection(), generateFunctionConnectionMetadata(), addOutputClick(), getIDForTargetConnection(), removeConnection(), updateConnection(), validateAndCreateConnection()

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (6): generateDataMapXslt(), testDataMap(), DataMapperApiService, getFunctions(), DataMapperApiServiceInstance(), getSelectedSchema()

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (16): applyConnectionValue(), createConnectionEntryIfNeeded(), createNewEmptyConnection(), createNodeConnection(), getConnectedSourceSchemaNodes(), getConnectedTargetSchemaNodes(), getParentId(), addConnection() (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.15
Nodes (13): findLast(), addConditionalToNewPathItems(), convertToArray(), convertToMapDefinition(), createYamlFromMap(), findKeyInMap(), generateMapDefinitionBody(), generateMapDefinitionHeader() (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.19
Nodes (12): generateInputHandleId(), nodeHasSpecificInputEventually(), addParentConnectionForRepeatingElementsNested(), isParentTargetNode(), addSourceReactFlowPrefix(), addTargetReactFlowPrefix(), createReactFlowEdgeLabels(), getTreeNodeId() (+4 more)

### Community 10 - "Community 10"
Cohesion: 0.23
Nodes (12): convertCanvasToGridPoint(), findPath(), generateBoundingBoxes(), generatePathfindingGrid(), getLinearDistance(), getLineStretchLength(), getNextPointFromPosition(), getQuadraticCurve() (+4 more)

### Community 11 - "Community 11"
Cohesion: 0.01
Nodes (144): actualForLoopObject, actualForLoopObjectKeys, addFunctionId, categorizedCatalogChildren, categorizedCatalogObject, complexArray1Object, complexArrayObject, concatFunctionId (+136 more)

### Community 14 - "Community 14"
Cohesion: 0.20
Nodes (8): createCustomInputConnection(), newConnectionWillHaveCircularLogic(), addQuotesToString(), if(), updateCustomInputConnection(), updateInput(), validateAndCreateConnection(), onCustomTextBoxChange()

### Community 15 - "Community 15"
Cohesion: 0.25
Nodes (4): FunctionIcon(), iconForFunctionCategory(), iconForNormalizedDataType(), TypeAnnotation()

### Community 16 - "Community 16"
Cohesion: 0.29
Nodes (4): DataMapperDesigner(), DataMapperFileService(), InitDataMapperFileService(), XsltFilePicker()

### Community 18 - "Community 18"
Cohesion: 0.40
Nodes (3): createFileDropdownTree(), MockFileService, render()

### Community 121 - "Community 121"
Cohesion: 0.07
Nodes (34): MapCheckerItem(), MapCheckerItemProps, MapCheckerPanel(), useMapCheckerItemStyles, useStyles, CodeViewState, ConfigPanelView, FunctionPanelState (+26 more)

### Community 122 - "Community 122"
Cohesion: 0.06
Nodes (22): AbsoluteValue32Regular, AngleIcon, CeilingValue32Regular, Count32Regular, Divide32Regular, EPowerX32Regular, FloorValue32Regular, GreaterThan32Regular (+14 more)

### Community 123 - "Community 123"
Cohesion: 0.09
Nodes (26): EdgePopOver(), EdgePopOverProps, DMReactFlowProps, edgeTypes, nodeTypes, ReactFlowWrapper(), reactFlowStyle, useStyles (+18 more)

### Community 124 - "Community 124"
Cohesion: 0.09
Nodes (28): collectionBranding, conversionBranding, customBranding, dateTimeBranding, FunctionGroupBranding, logicalBranding, mathBranding, stringBranding (+20 more)

### Community 125 - "Community 125"
Cohesion: 0.06
Nodes (34): absoluteKey, amendedSourceKey, backoutRegex, childKey, ConditionalMetadata, connections, directAccessSeparated, error (+26 more)

### Community 126 - "Community 126"
Cohesion: 0.06
Nodes (31): atypicallyMockFunctionNode, connections, dummyNode, extendedComprehensiveSourceSchema, extendedComprehensiveTargetSchema, extendedSourceSchema, extendedTargetSchema, funcData (+23 more)

### Community 127 - "Community 127"
Cohesion: 0.13
Nodes (20): InputDropdown(), InputDropdownProps, InputOptionProps, useStyles, InputCustomInfoLabel(), CommonProps, CustomListItem(), CustomListItemProps (+12 more)

### Community 128 - "Community 128"
Cohesion: 0.10
Nodes (21): mapNodeParams, reservedMapDefinitionKeys, reservedMapDefinitionKeysArray, reservedMapNodeParamsArray, addConditionalToNewPathItems(), convertToArray(), convertToMapDefinition(), createYamlFromMap() (+13 more)

### Community 129 - "Community 129"
Cohesion: 0.09
Nodes (24): ComponentState, DataMapOperationState, dataMapSlice, DataMapState, DeleteConnectionAction, deleteConnectionFromConnections(), deleteParentRepeatingConnections(), Draft2 (+16 more)

### Community 130 - "Community 130"
Cohesion: 0.07
Nodes (22): CustomValueConnection, a, aName, children, customerTarget, extendedAdjSchema, extendedComprehensiveSourceSchema, extendedComprehensiveTargetSchema (+14 more)

### Community 131 - "Community 131"
Cohesion: 0.11
Nodes (22): nodeHasSpecificInputEventually(), addParentConnectionForRepeatingElementsNested(), amendSourceKeyForDirectAccessIfNeeded(), createSchemaNodeOrFunction(), DReservedToken, DSeparators, FunctionCreationMetadata, getDestinationNode() (+14 more)

### Community 132 - "Community 132"
Cohesion: 0.14
Nodes (17): DataMapperFileService(), XsltFilePicker(), FileWithVsCodePath, SchemaFile, SchemaPanelNodeReactFlowDataProps, ConfigPanelProps, schemaFileQuerySettings, SchemaPanel() (+9 more)

### Community 133 - "Community 133"
Cohesion: 0.08
Nodes (12): Any16Filled, Any16Regular, Array16Filled, Array16Regular, Binary16Filled, Binary16Regular, Decimal16Filled, Decimal16Regular (+4 more)

### Community 134 - "Community 134"
Cohesion: 0.08
Nodes (12): Any24Filled, Any24Regular, Array24Filled, Array24Regular, Binary24Filled, Binary24Regular, Decimal24Filled, Decimal24Regular (+4 more)

### Community 135 - "Community 135"
Cohesion: 0.13
Nodes (3): TrieTree, TrieTreeNode, AppState

### Community 136 - "Community 136"
Cohesion: 0.13
Nodes (12): useStyles, FunctionCategoryColorToken, customDarkTokens, customTokens, DataMapperTheme, extendedWebDarkTheme, extendedWebLightTheme, fnColors (+4 more)

### Community 137 - "Community 137"
Cohesion: 0.21
Nodes (15): HandleResponseProps, useSchema(), useSchemaProps, SchemaTree(), SchemaTreeProps, SchemaTreeNode(), SchemaTreeNodeProps, TypeAnnotation() (+7 more)

### Community 138 - "Community 138"
Cohesion: 0.16
Nodes (13): useHoverNode(), extendedSchema, convertSchemaNodeToSchemaNodeExtended(), convertSchemaToSchemaExtended(), deepestNode(), getReactFlowNodeId(), maxProperties(), nodeCount() (+5 more)

### Community 139 - "Community 139"
Cohesion: 0.18
Nodes (13): FunctionConfigurationPopover(), FunctionConfigurationPopoverProps, TabTypes, useStyles, OutputTabContents(), CardProps, FunctionCardProps, FunctionNode() (+5 more)

### Community 140 - "Community 140"
Cohesion: 0.15
Nodes (15): DataMapperApiServiceOptions, DmErrorResponse, filename, formattedFilePath, dataMapperApiVersions, defaultDataMapperApiServiceOptions, GenerateXsltResponse, IDataMapperApiService (+7 more)

### Community 141 - "Community 141"
Cohesion: 0.15
Nodes (14): convertConnectionShorthandToId(), generateFunctionConnectionMetadata(), Connection, ConnectionDictionary, EmptyConnection, NodeConnection, conn, errors (+6 more)

### Community 142 - "Community 142"
Cohesion: 0.16
Nodes (16): BoundingBox, convertCanvasToGridPoint(), findPath(), generateBoundingBoxes(), generatePathfindingGrid(), getLinearDistance(), getLineStretchLength(), getNextPointFromPosition() (+8 more)

### Community 143 - "Community 143"
Cohesion: 0.19
Nodes (11): Panel(), PanelProps, PanelXButton(), PanelXButtonProps, useStyles, useStyles, TestPanelProps, TestPanelBody() (+3 more)

### Community 144 - "Community 144"
Cohesion: 0.16
Nodes (13): areAllFunctionInputsFilled(), collectSourceNodeIdsForConnectionChain(), collectTargetNodeIdsForConnectionChain(), collectTargetNodesForConnectionChain(), getActiveNodes(), inputFromHandleId(), isFunctionInputSlotAvailable(), isValidConnectionByType() (+5 more)

### Community 145 - "Community 145"
Cohesion: 0.20
Nodes (13): FunctionDataTreeItem, FunctionListProps, fuseFunctionSearchOptions, loopFuseFunctionSearchOptions, FunctionListHeader(), FunctionListHeaderProps, DropResult, FunctionListItem() (+5 more)

### Community 146 - "Community 146"
Cohesion: 0.15
Nodes (12): IDataMapperFileService, InitDataMapperFileService(), SchemaFile, FunctionList(), FunctionPanel(), PanelProps, FunctionsSVG(), TestPanel() (+4 more)

### Community 147 - "Community 147"
Cohesion: 0.17
Nodes (11): EditorCommandBar(), EditorCommandBarProps, MetaMapDefinition, generateMapMetadata(), initialState, modalSlice, ModalState, WarningModalState (+3 more)

### Community 148 - "Community 148"
Cohesion: 0.15
Nodes (13): ReactFlowStatesProps, generateInputHandleId(), getFunctionNode(), ContainerLayoutNode, convertWholeDataMapToLayoutTree(), createReactFlowEdgeLabels(), createReactFlowFunctionKey(), LayoutContainer (+5 more)

### Community 149 - "Community 149"
Cohesion: 0.13
Nodes (14): connections, extendedSource, extendedTarget, flattenedSource, flattenedTarget, indexed, mockFunctionData, mockSchemaNodeExtended (+6 more)

### Community 150 - "Community 150"
Cohesion: 0.16
Nodes (12): MapDefinitionDeserializer, connectionDictionary, extendedSource, extendedTarget, getConnectionForAnyKey(), hasExpectedConnection(), mapDefinitionDeserializer, simpleMap (+4 more)

### Community 151 - "Community 151"
Cohesion: 0.26
Nodes (12): InputConnection, addConnection(), setUpBackoutLoopTest(), createSchemaToSchemaNodeConnection(), mockFunctionData, mockSchemaNodeExtended, applyConnectionValue(), createConnectionEntryIfNeeded() (+4 more)

### Community 152 - "Community 152"
Cohesion: 0.20
Nodes (9): useStyles, FileDropdownTree(), FileDropdownTreeProps, availableSchemas, mocked, MockFileService, renderedDropdown, spySelect (+1 more)

### Community 153 - "Community 153"
Cohesion: 0.21
Nodes (7): FunctionIcon(), FunctionIconProps, CollectionRegular, StringCategory20Regular, result, iconForFunction(), iconForFunctionCategory()

### Community 154 - "Community 154"
Cohesion: 0.17
Nodes (11): deleteNodeFromConnections(), connectionDict, connections, connections1, destinationId, extendedSchema, functionData, functionDict (+3 more)

### Community 155 - "Community 155"
Cohesion: 0.23
Nodes (12): addLoopingForToNewPathItems(), createSourcePath(), collectConditionalValues(), collectFunctionValue(), collectSequenceValue(), combineFunctionAndInputs(), extractScopeFromLoop(), getDestinationKey() (+4 more)

### Community 156 - "Community 156"
Cohesion: 0.22
Nodes (9): directAccessPseudoFunction, FunctionData, FunctionDictionary, FunctionInput, functionMock, ifPseudoFunction, indexPseudoFunction, pseudoFunctions (+1 more)

### Community 157 - "Community 157"
Cohesion: 0.22
Nodes (6): DataMapDataProviderProps, Bounds, DataMapperDesignerContext, DataMapperWrappedContext, ScrollLocation, ScrollProps

### Community 158 - "Community 158"
Cohesion: 0.29
Nodes (7): checkIfValueNeedsQuotes(), quoteSelectedCustomValue(), quoteString(), changeValue(), onChange(), onOptionSelect(), selectCustomValueOnClose()

### Community 159 - "Community 159"
Cohesion: 0.22
Nodes (8): extendedTarget, [fileName, filePath], node, nodeProperties, findNodeForKey(), getFileNameAndPath(), removeGuidFromKey(), searchChildrenNodeForKey()

### Community 160 - "Community 160"
Cohesion: 0.39
Nodes (5): CodeViewPanel(), CodeViewPanelProps, CodeViewPanelBody(), CodeViewPanelBodyProps, useStyles

### Community 161 - "Community 161"
Cohesion: 0.38
Nodes (5): reactPlugin, DataMapperDesignerProvider(), DataMapperDesignerProviderProps, getCustomizedTheme(), store

### Community 162 - "Community 162"
Cohesion: 0.29
Nodes (6): FileSelectorProps, availableSchemas, MockFileService, props, renderedDropdown, user

### Community 163 - "Community 163"
Cohesion: 0.38
Nodes (4): DataMapperApiServiceInstance(), generateDataMapXslt(), testDataMap(), getSelectedSchema()

### Community 164 - "Community 164"
Cohesion: 0.29
Nodes (5): appSlice, AppState, initialState, AppStore, ExtendedRenderOptions

### Community 166 - "Community 166"
Cohesion: 0.40
Nodes (4): errorsSlice, ErrorsState, initialFunctionState, MapIssue

### Community 168 - "Community 168"
Cohesion: 0.80
Nodes (3): checkIfValueNeedsQuotes(), quoteSelectedCustomValue(), quoteString()

### Community 169 - "Community 169"
Cohesion: 0.50
Nodes (3): NodeIds, ReactFlowEdgeType, ReactFlowNodeType

### Community 170 - "Community 170"
Cohesion: 0.50
Nodes (3): functionSlice, FunctionState, initialFunctionState

### Community 171 - "Community 171"
Cohesion: 0.50
Nodes (3): initialSchemaState, schemaSlice, SchemaState

### Community 172 - "Community 172"
Cohesion: 0.50
Nodes (3): InputListWrapper, createFileDropdownTree(), renderWithRedux()

### Community 176 - "Community 176"
Cohesion: 0.67
Nodes (3): flattenSchemaIntoSortArray(), flattenSchemaNode(), flattenSchemaNodeMap()

## Knowledge Gaps
- **426 isolated node(s):** `LoopMetadata`, `ConditionalMetadata`, `connections`, `parsedYamlKeys`, `formattedTargetKey` (+421 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ConnectionDictionary` connect `Community 141` to `Community 128`, `Community 129`, `Community 130`, `Community 131`, `Community 11`, `Community 139`, `Community 144`, `Community 148`, `Community 149`, `Community 150`, `Community 151`, `Community 121`, `Community 154`, `Community 124`, `Community 125`, `Community 126`, `Community 127`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `RootState` connect `Community 123` to `Community 160`, `Community 164`, `Community 132`, `Community 137`, `Community 139`, `Community 143`, `Community 145`, `Community 146`, `Community 147`, `Community 148`, `Community 121`, `Community 127`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `convertSchemaToSchemaExtended()` connect `Community 138` to `Community 130`, `Community 132`, `Community 11`, `Community 149`, `Community 150`, `Community 154`, `Community 124`, `Community 157`, `Community 126`, `Community 159`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `LoopMetadata`, `ConditionalMetadata`, `connections` to the rest of the system?**
  _426 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.12554112554112554 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.0595959595959596 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1076923076923077 - nodes in this community are weakly interconnected._