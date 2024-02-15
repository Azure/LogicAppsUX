import type { DropdownItem } from '../dropdown';
import { DropdownEditor } from '../dropdown';
import { ValueSegmentType } from '../editor';
import type { ChangeHandler } from '../editor/base';
import { guid } from '@microsoft/logic-apps-shared';

export const GroupDropdownOptions = {
  AND: 'and',
  OR: 'or',
} as const;
export type GroupDropdownOptions = (typeof GroupDropdownOptions)[keyof typeof GroupDropdownOptions];

interface GroupDropdownProps {
  condition?: GroupDropdownOptions;
  readonly?: boolean;
  onChange: ChangeHandler;
}

const items: DropdownItem[] = [
  { key: GroupDropdownOptions.AND, displayName: 'AND', value: GroupDropdownOptions.AND },
  { key: GroupDropdownOptions.OR, displayName: 'OR', value: GroupDropdownOptions.OR },
];

export const GroupDropdown = ({ condition, readonly, onChange }: GroupDropdownProps) => {
  return (
    <div className="msla-querybuilder-group-dropdown-container">
      <DropdownEditor
        initialValue={
          condition
            ? [{ id: guid(), type: ValueSegmentType.LITERAL, value: condition }]
            : [{ id: guid(), type: ValueSegmentType.LITERAL, value: GroupDropdownOptions.AND }]
        }
        options={items}
        onChange={onChange}
        readonly={readonly}
      />
    </div>
  );
};
