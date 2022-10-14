import { customTokens } from '../../core';
import type { FunctionData } from '../../models/Function';
import { FunctionCategory } from '../../models/Function';
import { getFunctionBrandingForCategory } from '../../utils/Function.Utils';
import { getIconForFunction } from '../../utils/Icon.Utils';
import { DMTooltip } from '../tooltip/tooltip';
import { TreeHeader } from '../tree/TreeHeader';
import type { IGroup, IGroupedListStyleProps, IGroupedListStyles, IStyleFunctionOrObject } from '@fluentui/react';
import { GroupedList } from '@fluentui/react';
import { Button, Caption1, makeStyles, mergeClasses, shorthands, tokens, typographyStyles } from '@fluentui/react-components';
import Fuse from 'fuse.js';
import { useEffect, useState } from 'react';

const buttonHoverStyles = makeStyles({
  button: {
    backgroundColor: tokens.colorNeutralBackground1Hover,
  },
});

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

export interface FunctionListProps {
  functionData: FunctionData[];
  onFunctionClick: (functionNode: FunctionData) => void;
}

export const FunctionList = ({ functionData, onFunctionClick }: FunctionListProps) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortedFunctionsByCategory, setSortedFunctionsByCategory] = useState<FunctionData[]>([]);
  const [groups, setGroups] = useState<IGroup[]>([]);

  useEffect(() => {
    if (functionData) {
      const categoriesArray: FunctionCategory[] = [];
      let newSortedFunctions: FunctionData[] = [];
      let dataCopy = [...functionData];

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

        dataCopy = results.map((fuse) => {
          return { ...fuse.item, matchIndices: fuse.matches };
        });

        dataCopy.forEach((functionNode) => {
          if (!categoriesArray.find((category) => category === functionNode.category)) categoriesArray.push(functionNode.category);
        });

        newSortedFunctions = dataCopy.sort((a, b) => a.category.localeCompare(b.category));
      } else {
        Object.values(FunctionCategory).forEach((category) => categoriesArray.push(category));

        newSortedFunctions = dataCopy.sort((a, b) => {
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

      const newGroups = categoriesArray
        .map((value): IGroup => {
          let numInGroup = 0;
          newSortedFunctions.forEach((functionNode) => {
            if (functionNode.category === value) {
              numInGroup++;
            }
          });

          const group: IGroup = {
            key: value,
            startIndex: startInd,
            name: getFunctionBrandingForCategory(value).displayName,
            count: numInGroup,
            isCollapsed: true,
          };

          startInd += numInGroup;

          return group;
        })
        .filter((group) => group.count > 0);

      setGroups(newGroups);
    }
  }, [functionData, searchTerm]);

  const cell = (functionNode: FunctionData, onFunctionClick: (functionNode: FunctionData) => void) => {
    return <FunctionListCell functionData={functionNode} onFunctionClick={onFunctionClick}></FunctionListCell>;
  };

  return (
    <>
      <TreeHeader onSearch={setSearchTerm} onClear={() => setSearchTerm('')} title="Function" />
      <div>
        <GroupedList
          onShouldVirtualize={() => false}
          groups={groups}
          styles={headerStyle}
          items={sortedFunctionsByCategory}
          onRenderCell={(_depth, item) => cell(item, onFunctionClick)}
          selectionMode={0}
        />
      </div>
    </>
  );
};

const useCardStyles = makeStyles({
  button: {
    width: '100%',
    height: '40px',
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'flex',
    justifyContent: 'left',
    ...shorthands.border('0px'),
    ...shorthands.padding('1px 4px 1px 4px'),
  },
  text: {
    width: '180px',
    paddingLeft: '4px',
    paddingRight: '4px',
    ...shorthands.overflow('hidden'),
  },
});

const fnIconSize = '28px';

interface FunctionListCellProps {
  functionData: FunctionData;
  onFunctionClick: (functionNode: FunctionData) => void;
}

const FunctionListCell = ({ functionData, onFunctionClick }: FunctionListCellProps) => {
  const [isHover, setIsHover] = useState<boolean>(false);
  const cardStyle = useCardStyles();
  const buttonHovered = mergeClasses(cardStyle.button, buttonHoverStyles().button);
  const brand = getFunctionBrandingForCategory(functionData.category);

  return (
    <Button
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      key={functionData.key}
      alt-text={functionData.displayName}
      className={isHover ? buttonHovered : cardStyle.button}
      onClick={() => {
        onFunctionClick(functionData);
      }}
    >
      <span
        style={{
          backgroundColor: customTokens[brand.colorTokenName],
          height: fnIconSize,
          width: fnIconSize,
          borderRadius: '50%',
        }}
      >
        <div style={{ paddingTop: '4px', color: tokens.colorNeutralBackground1 }}>
          {
            getIconForFunction(
              functionData.displayName,
              undefined,
              brand
            ) /* TODO: undefined -> functionData.iconFileName once all SVGs in */
          }
        </div>
      </span>
      <Caption1 truncate block className={cardStyle.text} style={isHover ? { ...typographyStyles.caption1Strong } : {}}>
        {functionData.displayName}
      </Caption1>
      <span style={{ justifyContent: 'right' }}>
        <DMTooltip text={functionData.description}></DMTooltip>
      </span>
    </Button>
  );
};
