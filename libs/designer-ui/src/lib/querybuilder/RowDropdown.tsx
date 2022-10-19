import type { DropdownItem } from '../dropdown';
import { DropdownEditor } from '../dropdown';
import { ValueSegmentType } from '../editor';
import type { ChangeHandler } from '../editor/base';
import { guid } from '@microsoft-logic-apps/utils';

interface RowDropdownProps {
  selectedOption?: string;
  disabled: boolean;
  onChange: ChangeHandler;
}

const items: DropdownItem[] = [
  { key: 'contains', displayName: 'contains', value: 'contains' },
  { key: 'notcontains', displayName: '!contain', value: 'notcontains' },
  { key: 'equals', displayName: '=', value: 'equals' },
  { key: 'notequals', displayName: '!=', value: 'notequals' },
  { key: 'greater', displayName: '>', value: 'greater' },
  { key: 'greaterOrEquals', displayName: '>=', value: 'greaterOrEquals' },
  { key: 'less', displayName: '<', value: 'less' },
  { key: 'lessOrEquals', displayName: '<=', value: 'lessOrEquals' },
  { key: 'startsWith', displayName: 'starts with', value: 'startsWith' },
  { key: 'notstartsWith', displayName: '!start with', value: 'notstartsWith' },
  { key: 'endsWith', displayName: 'ends with', value: 'endsWith' },
  { key: 'notendsWith', displayName: '!end with', value: 'notendsWith' },
];

export const RowDropdown = ({ selectedOption, disabled, onChange }: RowDropdownProps) => {
  return (
    <div className="msla-querybuilder-row-dropdown-container">
      <DropdownEditor
        readonly={disabled}
        initialValue={
          selectedOption
            ? [{ id: guid(), type: ValueSegmentType.LITERAL, value: selectedOption }]
            : [{ id: guid(), type: ValueSegmentType.LITERAL, value: 'isequalto' }]
        }
        onChange={onChange}
        options={items}
        height={24}
        fontSize={12}
      />
    </div>
  );
};
