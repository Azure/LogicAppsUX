import type { RootState } from '../../core/state/Store';
import type { FunctionData } from '../../models/Function';
import { FunctionCategory } from '../../models/Function';
import { hasOnlyCustomInputType } from '../../utils/Function.Utils';
import { LogCategory, LogService } from '../../utils/Logging.Utils';
import FunctionListHeader from './FunctionListHeader';
import FunctionListItem from './FunctionListItem';
import type { TreeItemValue, TreeOpenChangeData, TreeOpenChangeEvent } from '@fluentui/react-components';
import { Tree } from '@fluentui/react-components';
import { SearchBox } from '@fluentui/react-search';
import Fuse from 'fuse.js';
import React, { useMemo, useState } from 'react';
import { useStyles } from './styles';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

const fuseFunctionSearchOptions: Fuse.IFuseOptions<FunctionData> = {
  includeScore: true,
  minMatchCharLength: 2,
  includeMatches: true,
  threshold: 0.4,
  ignoreLocation: true,
  keys: ['key', 'functionName', 'displayName', 'category'],
};

export const functionCategoryItemKeyPrefix = 'category&';

export interface FunctionDataTreeItem extends FunctionData {
  isExpanded?: boolean;
  children: FunctionDataTreeItem[];
}

export const FunctionList = () => {
  const styles = useStyles();
  const intl = useIntl();

  const [openItems, setOpenItems] = React.useState<Iterable<TreeItemValue>>(Object.values(FunctionCategory));
  const handleOpenChange = (event: TreeOpenChangeEvent, data: TreeOpenChangeData) => {
    setOpenItems(data.openItems);
  };

  const functionData = useSelector((state: RootState) => state.function.availableFunctions);
  const inlineFunctionInputOutputKeys = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.inlineFunctionInputOutputKeys
  );

  const [searchTerm, setSearchTerm] = useState<string>('');

  const stringResources = useMemo(
    () => ({
      SEARCH_FUNCTIONS: intl.formatMessage({
        defaultMessage: 'Search Functions',
        id: '2xQWRt',
        description: 'Search Functions',
      }),
    }),
    [intl]
  );

  const functionListTree = useMemo(() => {
    // Can safely typecast as we just use the root's children[]
    const newFunctionListTree = {} as FunctionDataTreeItem;
    newFunctionListTree.children = [];

    // Try/catch here to for critical Function-related errors to be caught by us & telemetry
    try {
      if (functionData) {
        const functionCategoryDictionary: {
          [key: string]: FunctionDataTreeItem;
        } = {};
        let functionsList: FunctionData[] = [...functionData];
        functionsList.sort((a, b) => a.displayName?.localeCompare(b.displayName)); // Alphabetically sort Functions

        // Create dictionary for Function Categories
        Object.values(FunctionCategory).forEach((category) => {
          const categoryItem = { isExpanded: true } as FunctionDataTreeItem;
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
          functionCategoryDictionary[functionData.category].children.push({
            ...functionData,
            children: [],
          });

          // If there's a search term, all present categories should be expanded as
          // they only show when they have Functions that match the search
          if (searchTerm) {
            functionCategoryDictionary[functionData.category].isExpanded = true;
            setOpenItems([...openItems, functionData.category]);
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
  }, [functionData, searchTerm, inlineFunctionInputOutputKeys, openItems]);

  const treeItems = functionListTree.children.map((node, index) => {
    return node.key.startsWith(functionCategoryItemKeyPrefix) ? (
      <FunctionListHeader
        key={`function-header-${index}`}
        category={node.key.replace(functionCategoryItemKeyPrefix, '') as FunctionCategory}
        functions={node}
      />
    ) : (
      <FunctionListItem key={`function-item-${index}`} functionData={node as FunctionData} />
    );
  });

  return (
    <>
      <span style={{ position: 'sticky', top: 0, zIndex: 2 }}>
        <SearchBox
          placeholder={stringResources.SEARCH_FUNCTIONS}
          className={styles.functionSearchBox}
          value={searchTerm}
          size="small"
          onChange={(_e, data) => setSearchTerm(data.value ?? '')}
        />
      </span>

      <Tree
        appearance="transparent"
        className={styles.functionTree}
        onOpenChange={handleOpenChange}
        openItems={openItems}
        aria-label="function-tree"
      >
        {treeItems}
      </Tree>
    </>
  );
};
