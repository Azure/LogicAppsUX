import { sourcePrefix, targetPrefix } from '../../constants/ReactFlowConstants';
import {
  addFunctionNode,
  makeConnection,
  setCanvasToolboxTabToDisplay,
  setInlineFunctionInputOutputKeys,
} from '../../core/state/DataMapSlice';
import { store } from '../../core/state/Store';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { NormalizedDataType } from '../../models';
import type { FunctionData } from '../../models/Function';
import { FunctionCategory } from '../../models/Function';
import { isFunctionData } from '../../utils/Function.Utils';
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
        functionsList.sort((a, b) => a.key.localeCompare(b.key)); // Alphabetically sort Functions

        // Create dictionary for Function Categories
        Object.values(FunctionCategory).forEach((category) => {
          const categoryItem = {} as FunctionDataTreeItem;
          categoryItem.children = [];
          categoryItem.key = `${functionCategoryItemKeyPrefix}${category}`;

          functionCategoryDictionary[category] = categoryItem;
        });

        // Filter out functions if we're adding an inline function and/or have a searchTerm
        if (inlineFunctionInputOutputKeys.length === 2) {
          // NOTE: Explicitly use this instead of isAddingInlineFunction to non-warningly add inlineFunction...Keys to dependencies to track value changes
          functionsList = typeValidatePotentialInlineFunctions(functionsList);
        }

        if (searchTerm) {
          const fuse = new Fuse(functionsList, fuseFunctionSearchOptions);
          functionsList = fuse.search(searchTerm).map((result) => result.item);
        }

        // Add functions to their respective categories
        functionsList.forEach((functionData) => {
          functionCategoryDictionary[functionData.category].children.push({ ...functionData, children: [] });
        });

        // Add function categories as children to the tree root, filtering out any that don't have any children
        newFunctionListTree.children = Object.values(functionCategoryDictionary).filter((category) => category.children.length > 0);
      }
    } catch (error) {
      if (typeof error === 'string') {
        throw new Error(`Function List Error: ${error}`);
      } else if (error instanceof Error) {
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
        nodeContent={(node: FunctionDataTreeItem) =>
          node.key.startsWith(functionCategoryItemKeyPrefix) ? (
            <FunctionListHeader category={node.key.replace(functionCategoryItemKeyPrefix, '') as FunctionCategory} />
          ) : (
            <FunctionListItem functionData={node} />
          )
        }
        childPadding={0}
        onClickItem={(node) => !node.key.startsWith(functionCategoryItemKeyPrefix) && onFunctionItemClick(node)}
        parentItemClickShouldExpand
      />
    </>
  );
};

// Returns copy of type-validated array
const typeValidatePotentialInlineFunctions = (functionsToTypeValidate: FunctionData[]): FunctionData[] => {
  const inlineFunctionInputOutputKeys = store.getState().dataMap.curDataMapOperation.inlineFunctionInputOutputKeys;
  const flattenedSourceSchema = store.getState().dataMap.curDataMapOperation.flattenedSourceSchema;
  const currentFunctionNodes = store.getState().dataMap.curDataMapOperation.currentFunctionNodes;
  const flattenedTargetSchema = store.getState().dataMap.curDataMapOperation.flattenedTargetSchema;

  const reactFlowSource = inlineFunctionInputOutputKeys[0];
  const reactFlowDestination = inlineFunctionInputOutputKeys[1];
  const source = reactFlowSource.startsWith(sourcePrefix) ? flattenedSourceSchema[reactFlowSource] : currentFunctionNodes[reactFlowSource];
  const destination = reactFlowDestination.startsWith(targetPrefix)
    ? flattenedTargetSchema[reactFlowDestination]
    : currentFunctionNodes[reactFlowDestination];

  // NOTE: Here, we can just flatMap all of a Function's inputs' types as all inputs
  // are guaranteed to be empty as we're creating a new Function (as opposed to what the InputDropdown handles)

  // Obtain input's normalized output type, and compare it against each function's inputs' allowedTypes
  const inputNormalizedOutputType = isFunctionData(source) ? source.outputValueType : source.normalizedDataType;

  // Obtain the output's normalized input type (schema node), or a list of its inputs' allowedTypes (function node), and compare it against each function's output type
  const outputNormalizedInputTypes = isFunctionData(destination)
    ? destination.inputs.flatMap((input) => input.allowedTypes)
    : [destination.normalizedDataType];

  return functionsToTypeValidate.filter((functionNode) => {
    // Functions with no inputs shouldn't be shown when adding inline functions
    if (functionNode.inputs.length === 0) {
      return false;
    }

    const functionInputTypes = functionNode.inputs.flatMap((input) => input.allowedTypes);
    const functionOutputType = functionNode.outputValueType;

    // NOTE: This case will only happen when the existing connection is to a Function node
    // What would happen if we didn't return false here is that we'd be saying this potential new Function's output type
    // matches one of the output Function's inputs' types, but for a different input slot than the existing one goes to
    // - which raises the question - do we overwrite that new slot if there's something in it? Etc etc...
    // So, TODO: figure out how we want to handle this case, and likely handle it here
    if (functionNode.outputValueType !== inputNormalizedOutputType) {
      return false;
    }

    return (
      (inputNormalizedOutputType === NormalizedDataType.Any ||
        functionInputTypes.some((type) => type === NormalizedDataType.Any || type === inputNormalizedOutputType)) &&
      (functionOutputType === NormalizedDataType.Any ||
        outputNormalizedInputTypes.some((type) => type === NormalizedDataType.Any || type === functionOutputType))
    );
  });
};
