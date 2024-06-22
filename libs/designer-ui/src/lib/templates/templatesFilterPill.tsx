import { Checkbox, DefaultButton, PrimaryButton, Text } from '@fluentui/react';
import { ToggleButton } from '@fluentui/react-components';
import { useState } from 'react';
import { useIntl } from 'react-intl';

const btnStyles = {
  backgroundColor: '#E6F2FB',
  border: 'none',
  height: '24px',
  fontSize: '13px',
};

const checkedBtnStyles = {
  backgroundColor: '#c8c8c8',
};

export interface FilterObject {
  value: string;
  displayName: string;
}

interface TemplatesFilterPillProps {
  filterName: string;
  items: FilterObject[];
  onApplyButtonClick: (_filterItems: FilterObject[] | undefined) => void;
}

export const TemplatesFilterPill = ({ filterName, items, onApplyButtonClick }: TemplatesFilterPillProps) => {
  const intl = useIntl();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selected, setSelected] = useState<FilterObject[] | undefined>();

  const intlText = {
    All: intl.formatMessage({
      defaultMessage: 'All',
      id: 'eaEXYa',
      description: 'Checkbox text for the filter representing all items',
    }),
    APPLY: intl.formatMessage({
      defaultMessage: 'Apply',
      id: 'a+Wx9e',
      description: 'Button text for applying the selected filters',
    }),
    CANCEL: intl.formatMessage({
      defaultMessage: 'Cancel',
      id: '21sQ1Q',
      description: 'Button text for closing the filters selection',
    }),
  };

  return (
    <div className="msla-templates-fillter-pill">
      <ToggleButton
        style={{ ...btnStyles, ...(isExpanded ? checkedBtnStyles : {}) }}
        shape="circular"
        checked={isExpanded}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Text className="msal-template-filter-pill-name">{filterName}:</Text>
        {selected ? selected.map((item, index) => `${item?.displayName}${index < selected.length - 1 ? ', ' : ''}`) : intlText.All}
      </ToggleButton>
      {isExpanded && (
        <div>
          <Checkbox
            label={intlText.All}
            checked={!selected}
            onChange={(_, checked) => {
              if (checked) {
                setSelected(undefined);
              }
            }}
          />
          {items.map((item) => (
            <Checkbox
              key={item.value}
              label={item.displayName}
              checked={selected?.some((i) => i.value === item.value)}
              onChange={(_, checked) => {
                if (checked) {
                  setSelected(selected ? [...selected, item] : [item]);
                } else {
                  setSelected(selected?.filter((i) => i.value !== item.value));
                }
              }}
            />
          ))}
          <div>
            <PrimaryButton
              onClick={() => {
                onApplyButtonClick(selected);
                setIsExpanded(false);
              }}
            >
              {intlText.APPLY}
            </PrimaryButton>
            <DefaultButton
              onClick={() => {
                onApplyButtonClick(selected);
                setIsExpanded(false);
              }}
              style={{
                marginLeft: '8px',
              }}
            >
              {intlText.CANCEL}
            </DefaultButton>
          </div>
        </div>
      )}
    </div>
  );
};
