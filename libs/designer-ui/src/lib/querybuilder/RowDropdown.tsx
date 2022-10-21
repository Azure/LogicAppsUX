import type { DropdownItem } from '../dropdown';
import { DropdownEditor } from '../dropdown';
import { ValueSegmentType } from '../editor';
import type { ChangeHandler } from '../editor/base';
import { guid } from '@microsoft-logic-apps/utils';

interface RowDropdownProps {
  condition?: string;
  disabled: boolean;
  onChange: ChangeHandler;
}

export enum RowDropdownOptions {
  CONTAINS = 'contains',
  NOTCONTAINS = 'notcontains',
  EQUALS = 'equals',
  NOTEQUALS = 'notequals',
  GREATER = 'greater',
  GREATEROREQUALS = 'greaterOrEquals',
  LESS = 'less',
  LESSOREQUALS = 'lessOrEquals',
  STARTSWITH = 'startsWith',
  NOTSTARTSWITH = 'notstartsWith',
  ENDSWITH = 'endsWith',
  NOTENDSWITH = 'notendsWith',
}

const items: DropdownItem[] = [
  { key: RowDropdownOptions.CONTAINS, displayName: 'contains', value: RowDropdownOptions.CONTAINS },
  { key: RowDropdownOptions.NOTCONTAINS, displayName: '!contain', value: RowDropdownOptions.NOTCONTAINS },
  { key: RowDropdownOptions.EQUALS, displayName: '=', value: RowDropdownOptions.EQUALS },
  { key: RowDropdownOptions.NOTEQUALS, displayName: '!=', value: RowDropdownOptions.NOTEQUALS },
  { key: RowDropdownOptions.GREATER, displayName: '>', value: RowDropdownOptions.GREATER },
  { key: RowDropdownOptions.GREATEROREQUALS, displayName: '>=', value: RowDropdownOptions.GREATEROREQUALS },
  { key: RowDropdownOptions.LESS, displayName: '<', value: RowDropdownOptions.LESS },
  { key: RowDropdownOptions.LESSOREQUALS, displayName: '<=', value: RowDropdownOptions.LESSOREQUALS },
  { key: RowDropdownOptions.STARTSWITH, displayName: 'starts with', value: RowDropdownOptions.STARTSWITH },
  { key: RowDropdownOptions.NOTSTARTSWITH, displayName: '!start with', value: RowDropdownOptions.NOTSTARTSWITH },
  { key: RowDropdownOptions.ENDSWITH, displayName: 'ends with', value: RowDropdownOptions.ENDSWITH },
  { key: RowDropdownOptions.NOTENDSWITH, displayName: '!end with', value: RowDropdownOptions.NOTENDSWITH },
];

export const RowDropdown = ({ condition, disabled, onChange }: RowDropdownProps) => {
  return (
    <div className="msla-querybuilder-row-dropdown-container">
      <DropdownEditor
        readonly={disabled}
        initialValue={
          condition
            ? [{ id: guid(), type: ValueSegmentType.LITERAL, value: condition }]
            : [{ id: guid(), type: ValueSegmentType.LITERAL, value: 'equals' }]
        }
        onChange={onChange}
        options={items}
        height={24}
        fontSize={12}
      />
    </div>
  );
};
