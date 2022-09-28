import { getFunctions } from '../../core/queries/functions';
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
import { useQuery } from 'react-query';

export interface FunctionListProps {
  onFunctionClick: (functionNode: FunctionData) => void;
}

const buttonHoverStyles = makeStyles({
  button: {
    backgroundColor: tokens.colorNeutralBackground1Hover,
  },
});

export const FunctionList: React.FC<FunctionListProps> = (props: FunctionListProps) => {
  const functionListData = useQuery<FunctionData[]>(['functions'], () => getFunctions());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortedFunctionsByCategory, setSortedFunctionsByCategory] = useState<FunctionData[]>([]);
  const [groups, setGroups] = useState<IGroup[]>([]);

  useEffect(() => {
    if (functionListData.data) {
      const categoriesArray: FunctionCategory[] = [];
      let newSortedFunctions: FunctionData[] = [];
      let dataCopy = functionListData.data;
      if (searchTerm) {
        const options: Fuse.IFuseOptions<FunctionData> = {
          includeScore: true,
          minMatchCharLength: 2,
          includeMatches: true,
          threshold: 0.4,
          keys: [
            {
              name: 'name',
            },
          ],
        };
        const fuse = new Fuse(functionListData.data, options);
        const results = fuse.search(searchTerm);
        dataCopy = results.map((fuse) => {
          return { ...fuse.item, matchIndices: fuse.matches };
        });
        dataCopy.forEach((functionNode) => {
          if (!categoriesArray.find((category) => category === functionNode.functionCategory))
            categoriesArray.push(functionNode.functionCategory);
        });
        newSortedFunctions = dataCopy.sort((a, b) => a.functionCategory.localeCompare(b.functionCategory));
      } else {
        dataCopy = functionListData.data;
        Object.values(FunctionCategory).forEach((category) => categoriesArray.push(category));
        newSortedFunctions = dataCopy.sort((a, b) => {
          const categorySort = a.functionCategory.localeCompare(b.functionCategory);
          if (categorySort !== 0) {
            return categorySort;
          } else {
            return a.name.localeCompare(b.name);
          }
        });
      }

      setSortedFunctionsByCategory(newSortedFunctions);
      let startInd = 0;
      const newGroups = categoriesArray.map((value): IGroup => {
        let numInGroup = 0;
        newSortedFunctions.forEach((functionNode) => {
          if (functionNode.functionCategory === value) {
            numInGroup++;
          }
        });
        const group: IGroup = {
          key: value,
          startIndex: startInd,
          name: getFunctionBrandingForCategory(value).displayName,
          count: numInGroup,
          data: functionListData.data[0],
        };
        startInd += numInGroup;
        return group;
      });
      setGroups(newGroups);
    }
  }, [functionListData.data, searchTerm]);

  const cell = (functionNode: FunctionData, onFunctionClick: (functionNode: FunctionData) => void) => {
    return <FunctionListCell functionData={functionNode} onFunctionClick={onFunctionClick}></FunctionListCell>;
  };

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

  return (
    <>
      <TreeHeader onSearch={setSearchTerm} onClear={() => setSearchTerm('')} title="Function"></TreeHeader>
      <div>
        <GroupedList
          onShouldVirtualize={() => false}
          groups={groups}
          styles={headerStyle}
          items={sortedFunctionsByCategory}
          onRenderCell={(depth, item) => cell(item, props.onFunctionClick)}
          selectionMode={0}
        ></GroupedList>
      </div>
    </>
  );
};

interface FunctionListCellProps {
  functionData: FunctionData;
  onFunctionClick: (functionNode: FunctionData) => void;
}

const cardStyles = makeStyles({
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

const FunctionListCell: React.FC<FunctionListCellProps> = ({ functionData, onFunctionClick }) => {
  const [isHover, setIsHover] = useState<boolean>(false);
  const cardStyle = cardStyles();
  const buttonHovered = mergeClasses(cardStyle.button, buttonHoverStyles().button);
  const brand = getFunctionBrandingForCategory(functionData.functionCategory);

  return (
    <Button
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      key={functionData.name}
      alt-text={functionData.name}
      className={isHover ? buttonHovered : cardStyle.button}
      onClick={() => {
        onFunctionClick(functionData);
      }}
    >
      <span
        style={{
          backgroundColor: brand.colorLight /* need to add this to theme task no. 15544832*/,
          height: '28px',
          width: '28px',
          borderRadius: '14px',
        }}
      >
        <div style={{ paddingTop: '4px', color: tokens.colorNeutralBackground1 }}>
          {getIconForFunction(functionData.name, functionData.iconFileName, brand)}
        </div>
      </span>
      <Caption1 truncate block className={cardStyle.text} style={isHover ? { ...typographyStyles.caption1Strong } : {}}>
        {functionData.name}
      </Caption1>
      <span style={{ justifyContent: 'right' }}>
        <DMTooltip text={functionData.detailedDescription}></DMTooltip>
      </span>
    </Button>
  );
};
