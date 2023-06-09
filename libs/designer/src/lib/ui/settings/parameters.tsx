import { updateParameterConditionalVisibility } from '../../core/state/operation/operationMetadataSlice';
import type { Settings } from './settingsection';
import type { IDropdownOption } from '@fluentui/react';
import { SearchBox, DropdownMenuItemType, Dropdown } from '@fluentui/react';
import type { FC } from 'react';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

export interface SearchableParametersDropdownProps {
  conditionallyInvisibleSettings: Settings[];
  groupId: string | undefined;
  nodeId: string;
}

export const SearchableParametersDropdown: FC<SearchableParametersDropdownProps> = ({
  conditionallyInvisibleSettings,
  groupId,
  nodeId,
}): JSX.Element => {
  const showFilterInputItemThreshold = 4;
  const headerKey = 'FilterHeader';

  const intl = useIntl();
  const dispatch = useDispatch();

  const [conditionalVisibilityTempArray, setConditionalVisibilityTempArray] = useState<string[]>([]);
  const [filterText, setFilterText] = useState('');

  const addNewParamText = intl.formatMessage({
    defaultMessage: 'Add new parameters',
    description: 'Text for add new parameter button',
  });

  const searchOperation = intl.formatMessage({
    defaultMessage: 'Search',
    description: 'Placeholder for search box that searches conditional parameters',
  });

  const options = conditionallyInvisibleSettings.map((setting): IDropdownOption => ({
    key: (setting.settingProp as any).id,
    text: (setting.settingProp as any).label ?? '',
  })).filter((option) => option.text.toLowerCase().includes(filterText.toLowerCase()));

  if (conditionallyInvisibleSettings.length >= showFilterInputItemThreshold) {
    options.unshift(
      { key: headerKey, text: '', itemType: DropdownMenuItemType.Header },
      { key: 'FilterDivider', text: '-', itemType: DropdownMenuItemType.Divider },
    );
  }

  return (
    <div style={{ paddingTop: '5px' }}>
      <Dropdown
        className="msla-setting-section-parameter-dropdown"
        placeholder={addNewParamText}
        multiSelect
        options={options}
        selectedKeys={conditionalVisibilityTempArray}
        onChange={(_e: any, item: any) => {
          if (item?.key) {
            setConditionalVisibilityTempArray(
              conditionalVisibilityTempArray.includes(item.key)
                ? conditionalVisibilityTempArray.filter((key) => key !== item.key)
                : [...conditionalVisibilityTempArray, item.key]
            );
          }
        }}
        onDismiss={() => {
          conditionalVisibilityTempArray.forEach((parameterId) => {
            dispatch(updateParameterConditionalVisibility({ nodeId, groupId: groupId ?? '', parameterId, value: true }));
          });
          setConditionalVisibilityTempArray([]);
          setFilterText('');
        }}
        onRenderItem={(item, defaultRenderer) => {
          if (item?.key === headerKey) {
            return (
              <SearchBox
                autoFocus={true}
                className="msla-setting-section-parameter-dropdown-search"
                onChange={(e, newValue) => setFilterText(newValue ?? '')}
                placeholder={searchOperation}
              />
            );
          }

          return defaultRenderer?.(item) ?? null;
        }}
      />
    </div>
  );
};
