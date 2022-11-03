import { sourcePrefix, targetPrefix } from '../../constants/ReactFlowConstants';
import {
  addFunctionNode,
  makeConnection,
  setCanvasToolboxTabToDisplay,
  setInlineFunctionInputOutputKeys,
} from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import type { FunctionData } from '../../models/Function';
import { FunctionCategory } from '../../models/Function';
import { getFunctionBrandingForCategory } from '../../utils/Function.Utils';
import { createReactFlowFunctionKey } from '../../utils/ReactFlow.Util';
import { TreeHeader } from '../tree/TreeHeader';
import FunctionListCell from './FunctionListCell';
import type { IGroup, IGroupedListStyleProps, IGroupedListStyles, IStyleFunctionOrObject } from '@fluentui/react';
import { GroupedList } from '@fluentui/react';
import { tokens, typographyStyles } from '@fluentui/react-components';
import Fuse from 'fuse.js';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const headerStyle: IStyleFunctionOrObject<IGroupedListStyleProps, IGroupedListStyles> = {
  root: {
    '.ms-GroupHeader': {
      height: '28px',
      width: '100%',
      display: 'flex',
      'div:first-child': {
        height: '28px',
      },
      borderRadius: tokens.borderRadiusMedium,
    },
    '.ms-GroupHeader-title': {
      ...typographyStyles.caption1,
      'span:nth-of-type(2)': {
        display: 'none',
      },
    },
    '.ms-GroupHeader-expand': {
      height: '28px',
      width: '16px',
      paddingLeft: tokens.spacingHorizontalXS,
      ':hover': {
        backgroundColor: 'inherit',
      },
    },
    '.ms-GroupedList-group': {
      paddingBottom: '8px',
    },
  },
};

export const FunctionList = () => {
  const dispatch = useDispatch<AppDispatch>();

  const functionData = useSelector((state: RootState) => state.function.availableFunctions);
  const inlineFunctionInputOutputKeys = useSelector((state: RootState) => state.dataMap.curDataMapOperation.inlineFunctionInputOutputKeys);
  const currentFunctionNodes = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentFunctionNodes);
  const flattenedSourceSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedSourceSchema);
  const flattenedTargetSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedTargetSchema);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortedFunctionsByCategory, setSortedFunctionsByCategory] = useState<FunctionData[]>([]);
  const [functionCategoryGroups, setFunctionCategoryGroups] = useState<IGroup[]>([]);

  const isAddingInlineFunction = useMemo(() => inlineFunctionInputOutputKeys.length === 2, [inlineFunctionInputOutputKeys]);

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

  useEffect(() => {
    // TODO: If isAddingInlineFunction, filter out functions that don't have the correct input/output types
    if (functionData) {
      const categoriesArray: FunctionCategory[] = [];
      let newSortedFunctions: FunctionData[] = [];
      let functionDataCopy = [...functionData];

      // If there's a search term, filter the function data
      if (searchTerm) {
        const options: Fuse.IFuseOptions<FunctionData> = {
          includeScore: true,
          minMatchCharLength: 2,
          includeMatches: true,
          threshold: 0.4,
          keys: [
            {
              name: 'key',
            },
            {
              name: 'functionName',
            },
            {
              name: 'displayName',
            },
          ],
        };

        const fuse = new Fuse(functionData, options);
        const results = fuse.search(searchTerm);

        functionDataCopy = results.map((fuse) => {
          return { ...fuse.item, matchIndices: fuse.matches };
        });

        functionDataCopy.forEach((functionNode) => {
          if (!categoriesArray.find((category) => category === functionNode.category)) categoriesArray.push(functionNode.category);
        });

        newSortedFunctions = functionDataCopy.sort((a, b) => a.category.localeCompare(b.category));
      } else {
        // If no search term, sort the function data by category
        Object.values(FunctionCategory).forEach((category) => categoriesArray.push(category));

        newSortedFunctions = functionDataCopy.sort((a, b) => {
          const categorySort = a.category.localeCompare(b.category);
          if (categorySort !== 0) {
            return categorySort;
          } else {
            return a.key.localeCompare(b.key);
          }
        });
      }

      setSortedFunctionsByCategory(newSortedFunctions);
      let startInd = 0;

      // Sort the functions into groups by their category
      const newFunctionCategoryGroups = categoriesArray
        .map((value): IGroup => {
          let numInGroup = 0;
          newSortedFunctions.forEach((functionNode) => {
            if (functionNode.category === value) {
              numInGroup++;
            }
          });

          const functionCategoryGroup: IGroup = {
            key: value,
            startIndex: startInd,
            name: getFunctionBrandingForCategory(value).displayName,
            count: numInGroup,
            isCollapsed: true,
          };

          startInd += numInGroup;

          return functionCategoryGroup;
        })
        .filter((group) => group.count > 0);

      setFunctionCategoryGroups(newFunctionCategoryGroups);
    }
  }, [functionData, searchTerm]);

  const getFunctionItemCell = (functionNode: FunctionData) => {
    return <FunctionListCell functionData={functionNode} onFunctionClick={onFunctionItemClick} />;
  };

  return (
    <>
      <TreeHeader onSearch={setSearchTerm} onClear={() => setSearchTerm('')} />
      <div>
        <GroupedList
          onShouldVirtualize={() => false}
          groups={functionCategoryGroups}
          styles={headerStyle}
          items={sortedFunctionsByCategory}
          onRenderCell={(_depth, item) => getFunctionItemCell(item)}
          selectionMode={0}
        />
      </div>
    </>
  );
};
