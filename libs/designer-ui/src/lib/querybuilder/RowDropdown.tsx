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
  { key: 'doesnotcontain', displayName: 'does not contain', value: 'does not contain' },
  { key: 'isequalto', displayName: '=', value: 'isequalto' },
  { key: 'isnotequalto', displayName: '!=', value: 'isnotequalto' },
  { key: 'isgreaterthan', displayName: '>', value: 'isgreaterthan' },
  { key: 'isgreaterthanorequal', displayName: '>=', value: 'isgreaterthanorequal' },
  { key: 'islessthan', displayName: '<', value: 'islessthan' },
  { key: 'islessthanorequal', displayName: '<=', value: 'islessthanorequal' },
  { key: 'startswith', displayName: 'starts with', value: 'startswith' },
  { key: 'doesnotstartwith', displayName: 'does not start with', value: 'doesnotstartwith' },
  { key: 'endswith', displayName: 'ends with', value: 'endswith' },
  { key: 'doesnotendwith', displayName: 'does not end with', value: 'doesnotendwith' },
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
