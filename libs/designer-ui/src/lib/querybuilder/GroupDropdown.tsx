import type { DropdownItem } from '../dropdown';
import { DropdownEditor } from '../dropdown';
import { ValueSegmentType } from '../editor';
import { guid } from '@microsoft-logic-apps/utils';

interface GroupDropdownProps {
  selectedOption?: string;
}

const items: DropdownItem[] = [
  { key: 'and', displayName: 'AND', value: 'and' },
  { key: 'or', displayName: 'OR', value: 'or' },
];

export const GroupDropdown = ({ selectedOption }: GroupDropdownProps) => {
  return (
    <div className="msla-querybuilder-group-dropdown-container">
      <DropdownEditor
        initialValue={
          selectedOption
            ? [{ id: guid(), type: ValueSegmentType.LITERAL, value: selectedOption }]
            : [{ id: guid(), type: ValueSegmentType.LITERAL, value: 'and' }]
        }
        options={items}
      />
    </div>
  );
};
