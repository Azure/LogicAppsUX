import type { RootState } from '../../core/state/Store';
import type { FunctionData } from '../../models/Function';
import { FunctionCategory } from '../../models/Function';
import { hasOnlyCustomInputType } from '../../utils/Function.Utils';
import { LogCategory, LogService } from '../../utils/Logging.Utils';
import FunctionListHeader from './FunctionListHeader';
import FunctionListItem from './FunctionListItem';
import type { TreeItemValue, TreeOpenChangeData, TreeOpenChangeEvent } from '@fluentui/react-components';
import { Tree } from '@fluentui/react-components';
import Fuse from 'fuse.js';
import React, { useCallback, useMemo } from 'react';
import { useStyles } from './styles';
import { useSelector } from 'react-redux';

const fuseFunctionSearchOptions: Fuse.IFuseOptions<FunctionData> = {
  includeScore: true,
  minMatchCharLength: 1,
  includeMatches: true,
  threshold: 0.4,
  ignoreLocation: true,
  keys: ['displayName', 'category'],
};

export const functionCategoryItemKeyPrefix = 'category&';

export interface FunctionDataTreeItem extends FunctionData {
  isExpanded?: boolean;
  children: FunctionDataTreeItem[];
}

export type FunctionListProps = {
  searchTerm?: string;
};

export const FunctionList = (props: FunctionListProps) => {
  const { searchTerm } = props;
  const styles = useStyles();

  const [openItems, setOpenItems] = React.useState<Iterable<TreeItemValue>>(Object.values(FunctionCategory).slice(0, 2));
  const handleOpenChange = (_event: TreeOpenChangeEvent, data: TreeOpenChangeData) => {
    setOpenItems(data.openItems);
  };

  const functionData = useSelector((state: RootState) => state.function.availableFunctions);
  const inlineFunctionInputOutputKeys = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.inlineFunctionInputOutputKeys
  );

  const functionList: FunctionData[] = useMemo(() => {
    if (functionData) {
      const list: FunctionData[] = [...functionData];
      // Alphabetically sort Functions
      list.sort((a, b) => a.displayName?.localeCompare(b.displayName));
      return list;
    }
    return [];
  }, [functionData]);

  const getFunctionCategories = useCallback(() => {
    const dict: Record<string, FunctionDataTreeItem> = {};
    for (const category of Object.values(FunctionCategory)) {
      const categoryItem = { isExpanded: true } as FunctionDataTreeItem;
      categoryItem.children = [];
      categoryItem.key = `${functionCategoryItemKeyPrefix}${category}`;
      dict[category] = categoryItem;
    }
    return dict;
  }, []);

  const filteredFunctionList = useMemo(() => {
    let updateFunctionList = [...functionList];
    const updatedFunctionCategories = { ...getFunctionCategories() };

    // Try/catch here to for critical Function-related errors to be caught by us & telemetry
    try {
      // NOTE: Explicitly use this instead of isAddingInlineFunction to track inlineFunctionInputOutputKeys value changes
      if (inlineFunctionInputOutputKeys.length === 2) {
        // Functions with no inputs shouldn't be shown when adding inline functions
        updateFunctionList = updateFunctionList.filter((functionNode) => functionNode.inputs.length !== 0);
        // Functions with only custom input shouldn't be shown when adding inline either
        updateFunctionList = functionList.filter((functionNode) => !hasOnlyCustomInputType(functionNode));
      }

      if (searchTerm) {
        const fuse = new Fuse(updateFunctionList, fuseFunctionSearchOptions);
        updateFunctionList = fuse.search(searchTerm).map((result) => result.item);
      }

      // Add functions to their respective categories
      for (const functionData of updateFunctionList) {
        updatedFunctionCategories[functionData.category].children.push({
          ...functionData,
          children: [],
        });
      }

      // Incase of searching, expand all categories
      if (searchTerm) {
        setOpenItems(Object.values(FunctionCategory).filter((category) => updatedFunctionCategories[category].children.length > 0));
      }

      // Add function categories as children to the tree root, filtering out any that don't have any children
      return Object.values(updatedFunctionCategories).filter((category) => category.children.length > 0);
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

    return [];
  }, [functionList, getFunctionCategories, searchTerm, inlineFunctionInputOutputKeys, setOpenItems]);

  const treeItems = useMemo(
    () =>
      filteredFunctionList.map((node, index) => {
        return node.key.startsWith(functionCategoryItemKeyPrefix) ? (
          <FunctionListHeader
            key={`function-header-${index}`}
            category={node.key.replace(functionCategoryItemKeyPrefix, '') as FunctionCategory}
            functions={node}
          />
        ) : (
          <FunctionListItem key={`function-item-${index}`} functionData={node as FunctionData} />
        );
      }),
    [filteredFunctionList]
  );

  return (
    <Tree
      appearance="transparent"
      className={styles.functionTree}
      onOpenChange={handleOpenChange}
      openItems={openItems}
      aria-label="function-tree"
    >
      {treeItems}
    </Tree>
  );
};
