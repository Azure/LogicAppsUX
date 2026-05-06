# Graph Report - src  (2026-05-06)

## Corpus Check
- 143 files · ~77,576 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 892 nodes · 1005 edges · 213 communities (204 shown, 9 thin omitted)
- Extraction: 80% EXTRACTED · 20% INFERRED · 0% AMBIGUOUS · INFERRED: 196 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `299674b2`
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
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 68|Community 68]]

## God Nodes (most connected - your core abstractions)
1. `applyConnectionValue()` - 13 edges
2. `applyConnectionValue()` - 13 edges
3. `isSchemaNodeExtended()` - 10 edges
4. `TrieTree` - 10 edges
5. `isSchemaNodeExtended()` - 10 edges
6. `TrieTree` - 9 edges
7. `createSourcePath()` - 8 edges
8. `isCustomValueConnection()` - 8 edges
9. `TrieTreeNode` - 8 edges
10. `createSourcePath()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `getCoordinatesForHandle()` --calls--> `isFunctionNode()`  [INFERRED]
  components/common/reactflow/edges/useEdgePath.ts → utils/ReactFlow.Util.ts
- `createSourcePath()` --calls--> `isEmptyConnection()`  [INFERRED]
  mapHandling/MapDefinitionSerializer.ts → utils/Connection.Utils.ts
- `createSourcePath()` --calls--> `isCustomValueConnection()`  [INFERRED]
  mapHandling/MapDefinitionSerializer.ts → utils/Connection.Utils.ts
- `createSourcePath()` --calls--> `isSchemaNodeExtended()`  [INFERRED]
  mapHandling/MapDefinitionSerializer.ts → utils/Schema.Utils.ts
- `createSourcePath()` --calls--> `formatDirectAccess()`  [INFERRED]
  mapHandling/MapDefinitionSerializer.ts → utils/Function.Utils.ts

## Communities (213 total, 9 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (51): if(), getPathForSrcSchemaNode(), useHoverNode(), addConnection(), deleteConnectionFromConnections(), deleteNodeFromConnections(), deleteParentRepeatingConnections(), handleDirectAccessConnection() (+43 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (47): findLast(), addRepeatingInputConnection(), applyConnectionValue(), areAllFunctionInputsFilled(), collectSourceNodeIdsForConnectionChain(), collectTargetNodeIdsForConnectionChain(), connectionDoesExist(), createConnectionEntryIfNeeded() (+39 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (39): amendSourceKeyForDirectAccessIfNeeded(), collectConditionalValues(), collectFunctionValue(), collectSequenceValue(), combineFunctionAndInputs(), createSchemaNodeOrFunction(), extractScopeFromLoop(), getDestinationKey() (+31 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (24): addConditionalToNewPathItems(), convertToArray(), convertToMapDefinition(), createSourcePath(), createYamlFromMap(), findKeyInMap(), generateMapDefinitionBody(), generateMapDefinitionHeader() (+16 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (16): CodeViewPanel(), CodeViewPanelBody(), EditorCommandBar(), DataMapperApiService, DataMapperApiServiceInstance(), DataMapperFileService(), InitDataMapperFileService(), XsltFilePicker() (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (21): addLoopingForToNewPathItems(), convertConnectionShorthandToId(), generateFunctionConnectionMetadata(), addOutputClick(), getIDForTargetConnection(), removeConnection(), updateConnection(), validateAndCreateConnection() (+13 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (15): EdgePopOver(), ConnectedEdge(), getCoordinatesForHandle(), useEdgePath(), FunctionIcon(), autoLayout(), useHoverEdge(), useHoverFunctionNode() (+7 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (19): getLoopTargetNode(), getLoopTargetNodeWithJson(), MapDefinitionDeserializer, convertSchemaNodeToSchemaNodeExtended(), convertSchemaToSchemaExtended(), deepestNode(), findNodeForKey(), flattenSchemaIntoDictionary() (+11 more)

### Community 8 - "Community 8"
Cohesion: 0.1
Nodes (17): changeValue(), InputDropdown(), onChange(), onOptionSelect(), selectCustomValueOnClose(), InputCustomInfoLabel(), render(), updateCustomInputConnection() (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (16): convertSchemaNodeToSchemaNodeExtended(), convertSchemaToSchemaExtended(), deepestNode(), findNodeForKey(), flattenSchemaIntoDictionary(), flattenSchemaIntoSortArray(), flattenSchemaNode(), flattenSchemaNodeMap() (+8 more)

### Community 11 - "Community 11"
Cohesion: 0.18
Nodes (3): TrieTree, TrieTreeNode, useSearch()

### Community 12 - "Community 12"
Cohesion: 0.15
Nodes (13): isNodeConnection(), checkIfValueNeedsQuotes(), quoteSelectedCustomValue(), quoteString(), changeValue(), onChange(), onOptionSelect(), selectCustomValueOnClose() (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.12
Nodes (6): generateDataMapXslt(), testDataMap(), DataMapperApiService, getFunctions(), DataMapperApiServiceInstance(), getSelectedSchema()

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (9): ConnectedEdge(), EdgePopOver(), getReactFlowNodeId(), useHoverEdge(), useHoverNode(), useLooping(), useSelectedEdge(), getCoordinatesForHandle() (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (5): getLoopTargetNode(), getLoopTargetNodeWithJson(), MapDefinitionDeserializer, getConnectionForAnyKey(), hasExpectedConnection()

### Community 16 - "Community 16"
Cohesion: 0.23
Nodes (12): convertCanvasToGridPoint(), findPath(), generateBoundingBoxes(), generatePathfindingGrid(), getLinearDistance(), getLineStretchLength(), getNextPointFromPosition(), getQuadraticCurve() (+4 more)

### Community 17 - "Community 17"
Cohesion: 0.23
Nodes (12): convertCanvasToGridPoint(), findPath(), generateBoundingBoxes(), generatePathfindingGrid(), getLinearDistance(), getLineStretchLength(), getNextPointFromPosition(), getQuadraticCurve() (+4 more)

### Community 22 - "Community 22"
Cohesion: 0.28
Nodes (5): addQuotesToString(), updateCustomInputConnection(), updateInput(), validateAndCreateConnection(), onCustomTextBoxChange()

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (4): FunctionIcon(), iconForFunctionCategory(), iconForNormalizedDataType(), TypeAnnotation()

### Community 24 - "Community 24"
Cohesion: 0.29
Nodes (4): DataMapperDesigner(), DataMapperFileService(), InitDataMapperFileService(), XsltFilePicker()

### Community 27 - "Community 27"
Cohesion: 0.4
Nodes (3): createFileDropdownTree(), MockFileService, render()

## Knowledge Gaps
- **4 isolated node(s):** `MockFileService`, `MockFileService`, `MockFileService`, `MockFileService`
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `isSchemaNodeExtended()` connect `Community 5` to `Community 0`, `Community 9`, `Community 3`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `getReactFlowNodeId()` connect `Community 0` to `Community 9`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `applyConnectionValue()` (e.g. with `setUpBackoutLoopTest()` and `createSchemaToSchemaNodeConnection()`) actually correct?**
  _`applyConnectionValue()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `applyConnectionValue()` (e.g. with `addConnection()` and `setUpBackoutLoopTest()`) actually correct?**
  _`applyConnectionValue()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `isSchemaNodeExtended()` (e.g. with `createSourcePath()` and `addLoopingForToNewPathItems()`) actually correct?**
  _`isSchemaNodeExtended()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `isSchemaNodeExtended()` (e.g. with `deleteParentRepeatingConnections()` and `createSourcePath()`) actually correct?**
  _`isSchemaNodeExtended()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `MockFileService`, `MockFileService`, `MockFileService` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._