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
import { getFunctionBrandingForCategory, isFunctionData } from '../../utils/Function.Utils';
import { createReactFlowFunctionKey } from '../../utils/ReactFlow.Util';
import { TreeHeader } from '../tree/TreeHeader';
import FunctionListCell from './FunctionListCell';
import type { IGroup, IGroupedListStyleProps, IGroupedListStyles, IStyleFunctionOrObject } from '@fluentui/react';
import { GroupedList } from '@fluentui/react';
import { tokens, typographyStyles } from '@fluentui/react-components';
import Fuse from 'fuse.js';
import { useEffect, useState } from 'react';
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
  const [functionsList, setFunctionsList] = useState<FunctionData[]>([]);
  const [functionCategoryGroups, setFunctionCategoryGroups] = useState<IGroup[]>([]);

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

  const compileFunctionsAndCategoryGroups = () => {
    if (functionData) {
      let functionCategories: FunctionCategory[] = [];
      let newFunctionsList: FunctionData[] = [...functionData];

      // If isAddingInlineFunction, filter out functions by type validation
      if (isAddingInlineFunction) {
        newFunctionsList = typeValidatePotentialInlineFunctions(newFunctionsList);
      }

      if (searchTerm) {
        const { searchedFunctions, sortedCategories } = performFunctionSearch(searchTerm, newFunctionsList, functionCategories);
        newFunctionsList = searchedFunctions;
        functionCategories = sortedCategories;
      } else {
        functionCategories = Object.values(FunctionCategory);
        sortAllFunctionsByCategory(newFunctionsList);
      }

      setFunctionsList(newFunctionsList);

      const newFunctionCategoryGroups = getFunctionCategoryGroups(newFunctionsList, functionCategories, functionCategoryGroups);
      setFunctionCategoryGroups(newFunctionCategoryGroups);
    }
  };

  // Compile functions list on first load, anytime searchTerm is changed, and anytime we change our inline function state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(compileFunctionsAndCategoryGroups, [inlineFunctionInputOutputKeys, searchTerm]);

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
          items={functionsList}
          onRenderCell={(_depth, functionNode: FunctionData) => getFunctionItemCell(functionNode)}
          selectionMode={0}
        />
      </div>
    </>
  );
};

// Returns copy of sorted functions list and function categories
const performFunctionSearch = (
  searchTerm: string,
  functionsToSearch: FunctionData[],
  functionCategories: FunctionCategory[]
): { searchedFunctions: FunctionData[]; sortedCategories: FunctionCategory[] } => {
  const fuseSearchOptions: Fuse.IFuseOptions<FunctionData> = {
    includeScore: true,
    minMatchCharLength: 2,
    includeMatches: true,
    threshold: 0.4,
    keys: ['key', 'functionName', 'displayName'],
  };

  const fuse = new Fuse(functionsToSearch, fuseSearchOptions);
  const results = fuse.search(searchTerm);

  const searchedFunctions = results.map((fuse) => ({ ...fuse.item, matchIndices: fuse.matches }));

  searchedFunctions.forEach((functionNode) => {
    if (!functionCategories.some((category) => category === functionNode.category)) {
      functionCategories.push(functionNode.category);
    }
  });

  // Sort categories and functions alphabetically
  return {
    searchedFunctions: searchedFunctions.sort((a, b) => a.category.localeCompare(b.category)),
    sortedCategories: functionCategories.sort((a, b) => a.localeCompare(b)),
  };
};

// Sorts in-place
const sortAllFunctionsByCategory = (functionsToSort: FunctionData[]): void => {
  functionsToSort.sort((a, b) => {
    const categorySort = a.category.localeCompare(b.category);
    if (categorySort !== 0) {
      return categorySort;
    } else {
      return a.key.localeCompare(b.key);
    }
  });
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
    // In Function manifest, Functions without any inputs won't even have a the inputs property
    // Either way, Functions with no inputs shouldn't be shown when adding inline functions
    if (!functionNode.inputs) {
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

const getFunctionCategoryGroups = (
  functionsList: FunctionData[],
  functionCategories: FunctionCategory[],
  previousFunctionCategoryGroups: IGroup[]
): IGroup[] => {
  // Sort the functions into groups by their category
  let startInd = 0;

  return functionCategories
    .map((value): IGroup => {
      let numInGroup = 0;
      functionsList.forEach((functionNode) => {
        if (functionNode.category === value) {
          numInGroup++;
        }
      });

      const functionCategoryGroup: IGroup = {
        key: value,
        startIndex: startInd,
        name: getFunctionBrandingForCategory(value).displayName,
        count: numInGroup,
        isCollapsed: previousFunctionCategoryGroups.find((group) => group.key === value)?.isCollapsed ?? true,
      };

      startInd += numInGroup;

      return functionCategoryGroup;
    })
    .filter((group) => group.count > 0);
};
