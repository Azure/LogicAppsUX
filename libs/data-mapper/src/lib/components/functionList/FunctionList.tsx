import { sourcePrefix, targetPrefix } from '../../constants/ReactFlowConstants';
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
import { inputFromHandleId } from '../../utils/Connection.Utils';
import { hasOnlyCustomInputType } from '../../utils/Function.Utils';
import { LogCategory, LogService } from '../../utils/Logging.Utils';
import { createReactFlowFunctionKey } from '../../utils/ReactFlow.Util';
import { isSchemaNodeExtended } from '../../utils/Schema.Utils';
import Tree from '../tree/Tree';
import FunctionListHeader from './FunctionListHeader';
import FunctionListItem from './FunctionListItem';
import { Button, Input, Tooltip } from '@fluentui/react-components';
import { Dismiss20Regular } from '@fluentui/react-icons';
import type { FunctionPositionMetadata } from '@microsoft/logic-apps-shared';
import Fuse from 'fuse.js';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

const fuseFunctionSearchOptions: Fuse.IFuseOptions<FunctionData> = {
  includeScore: true,
  minMatchCharLength: 2,
  includeMatches: true,
  threshold: 0.4,
  keys: ['key', 'functionName', 'displayName', 'category'],
};

export const functionCategoryItemKeyPrefix = 'category&';

interface FunctionDataTreeItem extends FunctionData {
  isExpanded?: boolean;
  children: FunctionDataTreeItem[];
}

export const FunctionList = () => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const functionData = useSelector((state: RootState) => state.function.availableFunctions);
  const currentTargetSchemaNode = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.currentTargetSchemaNode);
  const inlineFunctionInputOutputKeys = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.inlineFunctionInputOutputKeys
  );
  const functionNodes = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.functionNodes);
  const flattenedSourceSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.flattenedSourceSchema);
  const flattenedTargetSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.flattenedTargetSchema);

  const [searchTerm, setSearchTerm] = useState<string>('');

  const isAddingInlineFunction = inlineFunctionInputOutputKeys.length > 0;

  const onFunctionItemClick = (selectedFunction: FunctionData) => {
    if (isAddingInlineFunction) {
      const newReactFlowKey = createReactFlowFunctionKey(selectedFunction);
      if (currentTargetSchemaNode) {
        const newPosition: FunctionPositionMetadata = {
          targetKey: currentTargetSchemaNode.key,
          position: {
            x: Number.parseInt(inlineFunctionInputOutputKeys[inlineFunctionInputOutputKeys.length - 2]) - 30,
            y: Number.parseInt(inlineFunctionInputOutputKeys[inlineFunctionInputOutputKeys.length - 1]),
          },
        };
        // eslint-disable-next-line no-param-reassign
        selectedFunction.positions = [newPosition];
      }

      dispatch(addFunctionNode({ functionData: selectedFunction, newReactFlowKey }));

      const reactFlowSource = inlineFunctionInputOutputKeys[0];
      const reactFlowDestination = inlineFunctionInputOutputKeys[1];
      const reactFlowDestinationPort = inlineFunctionInputOutputKeys[2];

      const source = reactFlowSource.startsWith(sourcePrefix)
        ? flattenedSourceSchema[reactFlowSource]
        : functionNodes[reactFlowSource].functionData;
      const destination = reactFlowDestination.startsWith(targetPrefix)
        ? flattenedTargetSchema[reactFlowDestination]
        : functionNodes[reactFlowDestination].functionData;

      dispatch(deleteConnection({ inputKey: reactFlowSource, outputKey: reactFlowDestination, port: reactFlowDestinationPort }));

      // Create connection between input and new function
      dispatch(
        makeConnection({
          source,
          reactFlowSource,
          destination: selectedFunction,
          reactFlowDestination: newReactFlowKey,
        })
      );

      const destinationInput =
        isSchemaNodeExtended(destination) || !reactFlowDestinationPort
          ? undefined
          : inputFromHandleId(reactFlowDestinationPort, destination);

      // Create connection between new function and output
      dispatch(
        makeConnection({
          source: selectedFunction,
          reactFlowSource: newReactFlowKey,
          destination,
          reactFlowDestination,
          specificInput: destinationInput,
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
        functionsList.sort((a, b) => a.displayName?.localeCompare(b.displayName)); // Alphabetically sort Functions

        // Create dictionary for Function Categories
        Object.values(FunctionCategory).forEach((category) => {
          const categoryItem = { isExpanded: false } as FunctionDataTreeItem;
          categoryItem.children = [];
          categoryItem.key = `${functionCategoryItemKeyPrefix}${category}`;

          functionCategoryDictionary[category] = categoryItem;
        });

        // NOTE: Explicitly use this instead of isAddingInlineFunction to track inlineFunctionInputOutputKeys value changes
        if (inlineFunctionInputOutputKeys.length === 2) {
          // Functions with no inputs shouldn't be shown when adding inline functions
          functionsList = functionsList.filter((functionNode) => functionNode.inputs.length !== 0);
          // Functions with only custom input shouldn't be shown when adding inline either
          functionsList = functionsList.filter((functionNode) => !hasOnlyCustomInputType(functionNode));
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
        LogService.error(LogCategory.FunctionList, 'functionListError', {
          message: error,
        });
        throw new Error(`Function List Error: ${error}`);
      }
      if (error instanceof Error) {
        LogService.error(LogCategory.FunctionList, 'functionListError', {
          message: error.message,
        });
        throw new Error(`Function List Error: ${error.message}`);
      }
    }

    return newFunctionListTree;
  }, [functionData, searchTerm, inlineFunctionInputOutputKeys]);

  const searchLoc = intl.formatMessage({
    defaultMessage: 'Search',
    id: '2NXYYu',
    description: 'Search',
  });

  const clearLoc = intl.formatMessage({
    defaultMessage: 'Clear',
    id: 'e9OvzW',
    description: 'Clear',
  });

  return (
    <>
      <span style={{ position: 'sticky', top: 0, zIndex: 2 }}>
        <Input
          value={searchTerm}
          onChange={(_e, data) => setSearchTerm(data.value ?? '')}
          placeholder={searchLoc}
          size="small"
          style={{ width: '100%', marginBottom: '6px' }}
          contentAfter={
            searchTerm ? (
              <Tooltip content={clearLoc} relationship="description">
                <Button
                  icon={<Dismiss20Regular />}
                  appearance="subtle"
                  onClick={() => setSearchTerm('')}
                  aria-label={clearLoc}
                  size="small"
                />
              </Tooltip>
            ) : undefined
          }
        />
      </span>

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
