import type { DropdownItem } from '../dropdown';
import { DropdownEditor } from '../dropdown';
import type { ChangeHandler } from '../editor/base';
import { createLiteralValueSegment } from '../editor/base/utils/helper';

interface RowDropdownProps {
  condition?: string;
  disabled: boolean;
  onChange: ChangeHandler;
}

export const RowDropdownOptions = {
  CONTAINS: 'contains',
  NOTCONTAINS: 'notcontains',
  EQUALS: 'equals',
  NOTEQUALS: 'notequals',
  GREATER: 'greater',
  GREATEROREQUALS: 'greaterOrEquals',
  LESS: 'less',
  LESSOREQUALS: 'lessOrEquals',
  STARTSWITH: 'startsWith',
  NOTSTARTSWITH: 'notstartsWith',
  ENDSWITH: 'endsWith',
  NOTENDSWITH: 'notendsWith',
} as const;
export type RowDropdownOptions = (typeof RowDropdownOptions)[keyof typeof RowDropdownOptions];

const items: DropdownItem[] = [
  { key: RowDropdownOptions.CONTAINS, displayName: 'contains', value: RowDropdownOptions.CONTAINS },
  { key: RowDropdownOptions.NOTCONTAINS, displayName: 'not contains', value: RowDropdownOptions.NOTCONTAINS },
  { key: RowDropdownOptions.EQUALS, displayName: '=', value: RowDropdownOptions.EQUALS },
  { key: RowDropdownOptions.NOTEQUALS, displayName: '≠', value: RowDropdownOptions.NOTEQUALS },
  { key: RowDropdownOptions.GREATER, displayName: '>', value: RowDropdownOptions.GREATER },
  { key: RowDropdownOptions.GREATEROREQUALS, displayName: '≥', value: RowDropdownOptions.GREATEROREQUALS },
  { key: RowDropdownOptions.LESS, displayName: '<', value: RowDropdownOptions.LESS },
  { key: RowDropdownOptions.LESSOREQUALS, displayName: '≤', value: RowDropdownOptions.LESSOREQUALS },
  { key: RowDropdownOptions.STARTSWITH, displayName: 'starts with', value: RowDropdownOptions.STARTSWITH },
  { key: RowDropdownOptions.NOTSTARTSWITH, displayName: 'not starts with', value: RowDropdownOptions.NOTSTARTSWITH },
  { key: RowDropdownOptions.ENDSWITH, displayName: 'ends with', value: RowDropdownOptions.ENDSWITH },
  { key: RowDropdownOptions.NOTENDSWITH, displayName: 'not ends with', value: RowDropdownOptions.NOTENDSWITH },
];

export const RowDropdown = ({ condition, disabled, onChange }: RowDropdownProps) => {
  return (
    <div className="msla-querybuilder-row-dropdown-container" style={{ minWidth: 0, maxWidth: '100%' }}>
      <DropdownEditor
        readonly={disabled}
        initialValue={condition ? [createLiteralValueSegment(condition)] : [createLiteralValueSegment('equals')]}
        onChange={onChange}
        options={items}
        height={24}
        fontSize={12}
        flexibleWidth={true}
      />
    </div>
  );
};
