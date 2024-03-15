import type { DropdownItem } from '../dropdown';
import { DropdownEditor } from '../dropdown';
import type { ChangeHandler } from '../editor/base';
import { createLiteralValueSegment } from '../editor/base/utils/helper';

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
        initialValue={condition ? [createLiteralValueSegment(condition)] : [createLiteralValueSegment(GroupDropdownOptions.AND)]}
        options={items}
        onChange={onChange}
        readonly={readonly}
      />
    </div>
  );
};
