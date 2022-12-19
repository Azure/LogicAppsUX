import { sourcePrefix, targetPrefix } from '../../constants/ReactFlowConstants';
import appInsights from '../../core/services/appInsights/AppInsights';
import {
  addFunctionNode,
  deleteConnection,
  makeConnection,
  setCanvasToolboxTabToDisplay,
  setInlineFunctionInputOutputKeys,
} from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import type { FunctionData } from '../../models/Function';
import { FunctionCategory } from '../../models/Function';
import { createReactFlowFunctionKey } from '../../utils/ReactFlow.Util';
import Tree from '../tree/Tree';
import { TreeHeader } from '../tree/TreeHeader';
import FunctionListHeader from './FunctionListHeader';
import FunctionListItem from './FunctionListItem';
import Fuse from 'fuse.js';
import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const fuseFunctionSearchOptions: Fuse.IFuseOptions<FunctionData> = {
  includeScore: true,
  minMatchCharLength: 2,
  includeMatches: true,
  threshold: 0.4,
  keys: ['key', 'functionName', 'displayName'],
};

export const functionCategoryItemKeyPrefix = 'category&';

interface FunctionDataTreeItem extends FunctionData {
  isExpanded?: boolean;
  children: FunctionDataTreeItem[];
}

export const FunctionList = () => {
  const dispatch = useDispatch<AppDispatch>();

  const functionData = useSelector((state: RootState) => state.function.availableFunctions);
  const inlineFunctionInputOutputKeys = useSelector((state: RootState) => state.dataMap.curDataMapOperation.inlineFunctionInputOutputKeys);
  const currentFunctionNodes = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentFunctionNodes);
  const flattenedSourceSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedSourceSchema);
  const flattenedTargetSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedTargetSchema);

  const [searchTerm, setSearchTerm] = useState<string>('');

  const isAddingInlineFunction = inlineFunctionInputOutputKeys.length === 2;

  const onFunctionItemClick = (selectedFunction: FunctionData) => {
    if (isAddingInlineFunction) {
      const newReactFlowKey = createReactFlowFunctionKey(selectedFunction);
      dispatch(addFunctionNode({ functionData: selectedFunction, newReactFlowKey }));

      const reactFlowSource = inlineFunctionInputOutputKeys[0];
      const reactFlowDestination = inlineFunctionInputOutputKeys[1];

      const source = reactFlowSource.startsWith(sourcePrefix)
        ? flattenedSourceSchema[reactFlowSource]
        : currentFunctionNodes[reactFlowSource];
      const destination = reactFlowDestination.startsWith(targetPrefix)
        ? flattenedTargetSchema[reactFlowDestination]
        : currentFunctionNodes[reactFlowDestination];

      dispatch(deleteConnection({ inputKey: reactFlowSource, outputKey: reactFlowDestination }));

      // Create connection between input and new function
      dispatch(
        makeConnection({
          source,
          reactFlowSource,
          destination: selectedFunction,
          reactFlowDestination: newReactFlowKey,
        })
      );

      // Create connection between new function and output
      dispatch(
        makeConnection({
          source: selectedFunction,
          reactFlowSource: newReactFlowKey,
          destination,
          reactFlowDestination,
        })
      );

      dispatch(setInlineFunctionInputOutputKeys(undefined));
      dispatch(setCanvasToolboxTabToDisplay(''));
    } else {
      dispatch(addFunctionNode(selectedFunction));
    }
  };

  const functionListTree = useMemo(() => {
    // Can safely typecast as we just use the root's children[]
    const newFunctionListTree = {} as FunctionDataTreeItem;
    newFunctionListTree.children = [];

    // Try/catch here to for critical Function-related errors to be caught by us & telemetry
    try {
      if (functionData) {
        const functionCategoryDictionary: { [key: string]: FunctionDataTreeItem } = {};
        let functionsList: FunctionData[] = [...functionData];
        functionsList.sort((a, b) => a.displayName.localeCompare(b.displayName)); // Alphabetically sort Functions

        // Create dictionary for Function Categories
        Object.values(FunctionCategory).forEach((category) => {
          const categoryItem = {} as FunctionDataTreeItem;
          categoryItem.children = [];
          categoryItem.key = `${functionCategoryItemKeyPrefix}${category}`;

          functionCategoryDictionary[category] = categoryItem;
        });

        // NOTE: Explicitly use this instead of isAddingInlineFunction to track inlineFunctionInputOutputKeys value changes
        if (inlineFunctionInputOutputKeys.length === 2) {
          // Functions with no inputs shouldn't be shown when adding inline functions
          functionsList = functionsList.filter((functionNode) => functionNode.inputs.length !== 0);
        }

        if (searchTerm) {
          const fuse = new Fuse(functionsList, fuseFunctionSearchOptions);
          functionsList = fuse.search(searchTerm).map((result) => result.item);
        }

        // Add functions to their respective categories
        functionsList.forEach((functionData) => {
          functionCategoryDictionary[functionData.category].children.push({ ...functionData, children: [] });

          // If there's a search term, all present categories should be expanded as
          // they only show when they have Functions that match the search
          if (searchTerm) {
            functionCategoryDictionary[functionData.category].isExpanded = true;
          }
        });

        // Add function categories as children to the tree root, filtering out any that don't have any children
        newFunctionListTree.children = Object.values(functionCategoryDictionary).filter((category) => category.children.length > 0);
      }
    } catch (error) {
      if (typeof error === 'string') {
        appInsights.trackException({ exception: new Error(error) });
        throw new Error(`Function List Error: ${error}`);
      } else if (error instanceof Error) {
        appInsights.trackException({ exception: error });
        throw new Error(`Function List Error: ${error.message}`);
      }
    }

    return newFunctionListTree;
  }, [functionData, searchTerm, inlineFunctionInputOutputKeys]);

  return (
    <>
      <TreeHeader onSearch={setSearchTerm} onClear={() => setSearchTerm('')} />

      <Tree<FunctionDataTreeItem>
        treeRoot={functionListTree}
        nodeContent={(node) =>
          node.key.startsWith(functionCategoryItemKeyPrefix) ? (
            <FunctionListHeader category={node.key.replace(functionCategoryItemKeyPrefix, '') as FunctionCategory} />
          ) : (
            <FunctionListItem functionData={node as FunctionData} />
          )
        }
        childPadding={0}
        onClickItem={(node) => !node.key.startsWith(functionCategoryItemKeyPrefix) && onFunctionItemClick(node as FunctionData)}
        parentItemClickShouldExpand
      />
    </>
  );
};
