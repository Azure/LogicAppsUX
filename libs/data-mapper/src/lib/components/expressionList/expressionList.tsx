import { getExpressions } from '../../core/queries/expressions';
import type { Expression } from '../../models/Expression';
import { ExpressionCategory } from '../../models/Expression';
import { iconUriForIconImageName } from '../../utils/Icon.Utils';
import type {
  IGroup,
  IGroupedListStyleProps,
  IGroupedListStyles,
  ISearchBoxStyleProps,
  ISearchBoxStyles,
  IStyleFunctionOrObject,
} from '@fluentui/react';
import { mergeStyles, GroupedList, SearchBox } from '@fluentui/react';
import { Body1, Button, Caption1, makeStyles, shorthands, tokens, typographyStyles, Image } from '@fluentui/react-components';
import { InfoDot } from '@microsoft/designer-ui';
import { useState } from 'react';
import { useQuery } from 'react-query';

export interface ExpressionListProps {
  sample: string;
}

const cardStyles = makeStyles({
  button: {
    width: '100%',
    height: '40px',
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'flex',
    ...shorthands.border('0px'),
  },
  buttonHover: {
    backgroundColor: tokens.colorNeutralBackground1Hover,
  },
  text: {
    width: '150px',
  },
});

const titleStyle = makeStyles({
  header: {
    ...typographyStyles.body1Strong,
  },
});

export const ExpressionList: React.FC<ExpressionListProps> = () => {
  const expressionListData = useQuery<Expression[]>(['expressions'], () => getExpressions());
  let groups: IGroup[] = [];
  if (expressionListData.data) {
    const sortedExpressionsByCategory = expressionListData.data.sort((a, b) => a.expressionCategory.localeCompare(b.expressionCategory));
    console.log(sortedExpressionsByCategory);
    let startInd = 0;
    groups = Object.values(ExpressionCategory).map((value): IGroup => {
      let numInGroup = 0;
      sortedExpressionsByCategory.forEach((expression) => {
        if (expression.expressionCategory === value) {
          numInGroup++;
        }
      });
      const group: IGroup = { key: value, startIndex: startInd, name: value, count: numInGroup, data: expressionListData.data[0] };
      startInd += numInGroup;
      return group;
    });

    const cell = (expression: Expression) => {
      return <ExpressionListCell expression={expression}></ExpressionListCell>;
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
          height: 'fit-content',
        },
      },
    };

    const style2 = titleStyle();

    const searchBoxStyles: IStyleFunctionOrObject<ISearchBoxStyleProps, ISearchBoxStyles> = {
      root: {
        borderBottomColor: tokens.colorBrandForeground1,
        borderBottomWidth: '2px',
        borderRadius: tokens.borderRadiusMedium,
      },
    };

    return (
      // danielle to reuse search box
      <>
        <Body1 style={{ height: '30px' }} className={style2.header}>
          Expression
        </Body1>
        <SearchBox styles={searchBoxStyles} placeholder="Search"></SearchBox>
        <GroupedList
          groups={groups}
          styles={headerStyle}
          items={sortedExpressionsByCategory}
          onRenderCell={(depth, item) => cell(item)}
          selectionMode={0}
        ></GroupedList>
      </>
    );
  }

  return <div>loading</div>;
};

interface ExpressionListCellProps {
  expression: Expression;
}
const ExpressionListCell: React.FC<ExpressionListCellProps> = ({ expression }) => {
  const [isHover, setIsHover] = useState<boolean>(false);
  const cardStyle = cardStyles();
  const mergedButton = mergeStyles(cardStyle.button, cardStyle.buttonHover);
  const infoDotProps = {
    description: expression.detailedDescription,
    style: { paddingRight: tokens.spacingHorizontalXS, paddingLeft: tokens.spacingHorizontalXS },
  };

  return (
    // danielle to add back alt text alt={expression.name}
    <Button onMouseEnter={() => setIsHover(true)} onMouseLeave={() => setIsHover(false)} className={mergedButton} key={expression.name}>
      {expression.iconFileName && <Image src={iconUriForIconImageName(expression.iconFileName)} height={20} width={20} />}
      <Caption1 className={cardStyle.text} style={isHover ? { ...typographyStyles.caption1Strong } : {}}>
        {expression.name}{' '}
      </Caption1>
      <span style={{ justifyContent: 'right' }}>
        <InfoDot {...infoDotProps}></InfoDot>
      </span>
    </Button>
  );
};
