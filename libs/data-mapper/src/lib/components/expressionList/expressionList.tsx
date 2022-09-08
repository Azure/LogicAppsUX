import { getExpressions } from '../../core/queries/expressions';
import type { Expression } from '../../models/expression';
import { ExpressionCategory } from '../../models/expression';
import type { IGroup } from '@fluentui/react';
import { GroupedList } from '@fluentui/react';
import { useQuery } from 'react-query';

export interface ExpressionListProps {
  sample: string;
}

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
    const cell = (expression: Expression) => <div key={expression.name}>{expression.name}</div>;

    return <GroupedList groups={groups} items={sortedExpressionsByCategory} onRenderCell={(depth, item) => cell(item)}></GroupedList>;
  }

  return <div>loading</div>;
};
