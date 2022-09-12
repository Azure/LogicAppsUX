import { getExpressions } from '../../core/queries/expressions';
import type { Expression } from '../../models/Expression';
import { ExpressionCategory } from '../../models/Expression';
import { iconUriForIconImageName } from '../../utils/Icon.Utils';
import { DMTooltip } from '../tooltip/tooltip';
import { TreeHeader } from '../tree/treeHeader';
import type { IGroup, IGroupedListStyleProps, IGroupedListStyles, IStyleFunctionOrObject } from '@fluentui/react';
import { GroupedList } from '@fluentui/react';
import { Button, Caption1, Image, makeStyles, mergeClasses, shorthands, tokens, typographyStyles } from '@fluentui/react-components';
import Fuse from 'fuse.js';
import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';

export interface ExpressionListProps {
  sample: string;
  onExpressionClick: (expression: Expression) => void;
}

const cardStyles = makeStyles({
  button: {
    width: '100%',
    height: '40px',
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'flex',
    ...shorthands.border('0px'),
  },
  text: {
    width: '150px',
  },
});

const buttonHoverStyles = makeStyles({
  button: {
    backgroundColor: tokens.colorNeutralBackground1Hover,
  },
});

export const ExpressionList: React.FC<ExpressionListProps> = (props: ExpressionListProps) => {
  const expressionListData = useQuery<Expression[]>(['expressions'], () => getExpressions());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortedExpressionsByCategory, setSortedExpressionsByCategory] = useState<Expression[]>([]);
  const [groups, setGroups] = useState<IGroup[]>([]);

  useEffect(() => {
    if (expressionListData.data) {
      const categoriesArray: string[] = [];
      let dataCopy = expressionListData.data;
      if (searchTerm) {
        const options: Fuse.IFuseOptions<Expression> = {
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
        const fuse = new Fuse(expressionListData.data, options);
        const results = fuse.search(searchTerm);
        dataCopy = results.map((fuse) => fuse.item);
        dataCopy.forEach((expression) => {
          if (!categoriesArray.find((category) => category === expression.expressionCategory))
            categoriesArray.push(expression.expressionCategory);
        });
      } else {
        dataCopy = expressionListData.data;
        Object.values(ExpressionCategory).forEach((category) => categoriesArray.push(category));
      }
      const newSortedExpressions = dataCopy.sort((a, b) => a.expressionCategory.localeCompare(b.expressionCategory));
      setSortedExpressionsByCategory(newSortedExpressions);
      let startInd = 0;
      const newGroups = categoriesArray.map((value): IGroup => {
        let numInGroup = 0;
        newSortedExpressions.forEach((expression) => {
          if (expression.expressionCategory === value) {
            numInGroup++;
          }
        });
        const group: IGroup = { key: value, startIndex: startInd, name: value, count: numInGroup, data: expressionListData.data[0] };
        startInd += numInGroup;
        return group;
      });
      setGroups(newGroups);
    }
  }, [expressionListData.data, searchTerm]);

  const cell = (expression: Expression, onExpressionClick: (expression: Expression) => void) => {
    return <ExpressionListCell expression={expression} onExpressionClick={onExpressionClick}></ExpressionListCell>;
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
      '.ms-List-page': {
        height: 'fit-content !important',
      },
    },
  };

  return (
    <>
      <TreeHeader onSearch={setSearchTerm} onClear={() => setSearchTerm('')} title="Expression"></TreeHeader>
      <div>
        <GroupedList
          onShouldVirtualize={() => false}
          groups={groups}
          styles={headerStyle}
          items={sortedExpressionsByCategory}
          onRenderCell={(depth, item) => cell(item, props.onExpressionClick)}
          selectionMode={0}
        ></GroupedList>
      </div>
    </>
  );
};

interface ExpressionListCellProps {
  expression: Expression;
  onExpressionClick: (expression: Expression) => void;
}

const ExpressionListCell: React.FC<ExpressionListCellProps> = ({ expression, onExpressionClick }) => {
  const [isHover, setIsHover] = useState<boolean>(false);
  const cardStyle = cardStyles();
  const buttonHovered = mergeClasses(cardStyle.button, buttonHoverStyles().button);

  return (
    <Button
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      key={expression.name}
      alt-text={expression.name}
      className={isHover ? buttonHovered : cardStyle.button}
      onClick={() => {
        onExpressionClick(expression);
      }}
    >
      {expression.iconFileName && <Image src={iconUriForIconImageName(expression.iconFileName)} height={20} width={20} />}
      <Caption1 className={cardStyle.text} style={isHover ? { ...typographyStyles.caption1Strong } : {}}>
        {expression.name}
      </Caption1>
      <span style={{ justifyContent: 'right' }}>
        <DMTooltip text={expression.detailedDescription}></DMTooltip>
      </span>
    </Button>
  );
};
