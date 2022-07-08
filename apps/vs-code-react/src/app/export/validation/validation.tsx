import { getValidationColumns } from './helper';
import { DetailsRow, GroupedList } from '@fluentui/react';
import { SelectionMode } from '@fluentui/react';
import type { IGroup } from '@fluentui/react';

export const Validation: React.FC = () => {
  const onRenderCell = (nestingDepth?: number, item?: any, itemIndex?: number, group?: IGroup): React.ReactNode => {
    return item && typeof itemIndex === 'number' && itemIndex > -1 ? (
      <DetailsRow
        columns={getValidationColumns()}
        groupNestingDepth={nestingDepth}
        item={item}
        itemIndex={itemIndex}
        selectionMode={SelectionMode.none}
        compact={true}
        group={group}
      />
    ) : null;
  };

  return (
    <div className="msla-export-validation">
      <GroupedList items={[]} onRenderCell={onRenderCell} selectionMode={SelectionMode.none} compact={true} />
    </div>
  );
};
