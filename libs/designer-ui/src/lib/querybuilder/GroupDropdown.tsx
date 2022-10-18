import type { DropdownItem } from '../dropdown';
import { DropdownEditor } from '../dropdown';
import { ValueSegmentType } from '../editor';
import type { ChangeHandler } from '../editor/base';
import { guid } from '@microsoft-logic-apps/utils';

export enum GroupDropdownOptions {
  AND = 'and',
  OR = 'or',
}

interface GroupDropdownProps {
  selectedOption?: GroupDropdownOptions;
  onChange: ChangeHandler;
}

const items: DropdownItem[] = [
  { key: GroupDropdownOptions.AND, displayName: 'AND', value: GroupDropdownOptions.AND },
  { key: GroupDropdownOptions.OR, displayName: 'OR', value: GroupDropdownOptions.OR },
];

export const GroupDropdown = ({ selectedOption, onChange }: GroupDropdownProps) => {
  return (
    <div className="msla-querybuilder-group-dropdown-container">
      <DropdownEditor
        initialValue={
          selectedOption
            ? [{ id: guid(), type: ValueSegmentType.LITERAL, value: selectedOption }]
            : [{ id: guid(), type: ValueSegmentType.LITERAL, value: GroupDropdownOptions.AND }]
        }
        options={items}
        onChange={onChange}
      />
    </div>
  );
};
