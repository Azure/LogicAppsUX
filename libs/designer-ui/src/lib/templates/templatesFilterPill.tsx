import { Checkbox, Text } from '@fluentui/react';
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

interface FilterObject {
  value: string;
  displayName: string;
}

interface TemplatesFilterPillProps {
  filterName: string;
  items: FilterObject[];
  onApplyButtonClick: (_filterItems: FilterObject[]) => void;
}

export const TemplatesFilterPill = ({ filterName, items }: TemplatesFilterPillProps) => {
  const intl = useIntl();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selected, setSelected] = useState<FilterObject[]>([]);

  const intlText = {
    APPLY: intl.formatMessage({
      defaultMessage: 'Apply',
      id: 'a+Wx9e',
      description: 'Button text for applying the selected filters',
    }),
    All: intl.formatMessage({
      defaultMessage: 'All',
      id: 'eaEXYa',
      description: 'Checkbox text for the filter representing all items',
    }),
  };

  return (
    <div>
      <ToggleButton
        style={{ ...btnStyles, ...(isExpanded ? checkedBtnStyles : {}) }}
        shape="circular"
        checked={isExpanded}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Text>{filterName}:</Text>
        {selected.length > 1 ? selected?.map((item) => <Text key={item?.value}>{item?.displayName}</Text>) : intlText.All}
      </ToggleButton>
      {isExpanded && (
        <div>
          <Checkbox
            label={intlText.All}
            checked={selected.length === 0}
            onChange={(_, checked) => {
              if (checked) {
                setSelected([]);
              }
            }}
          />
          {items.map((item) => (
            <Checkbox
              key={item.value}
              label={item.displayName}
              checked={selected.some((i) => i.value === item.value)}
              onChange={(_, checked) => {
                if (checked) {
                  setSelected([...selected, item]);
                } else {
                  setSelected(selected.filter((i) => i.value !== item.value));
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
