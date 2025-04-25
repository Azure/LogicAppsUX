import type { InteractionTagProps } from '@fluentui/react-components';
import { InteractionTag, InteractionTagPrimary, makeStyles, shorthands, TagGroup, tokens } from '@fluentui/react-components';
import React from 'react';

interface InteractionTagItem {
  key: string;
  text: string;
  value: string;
}

const interactionTagDefaultProps: Partial<InteractionTagProps> = {
  shape: 'circular',
  size: 'small',
};

export interface InteractionTagListProps {
  items: InteractionTagItem[];
  initialSelectedItem?: string;
  onTagSelect: (value: string) => void;
}

const useInteractionTagListStyles = makeStyles({
  selectedTag: {
    backgroundColor: tokens.colorBrandBackgroundInvertedSelected,
    color: tokens.colorBrandForeground1,
    ...shorthands.borderColor(tokens.colorBrandForeground1),
  },
});

export const InteractionTagList = (props: InteractionTagListProps & Partial<InteractionTagProps>) => {
  const { items, onTagSelect, initialSelectedItem, ...interactionTagProps } = props;
  const [selectedItem, setSelectedItem] = React.useState<string | undefined>(initialSelectedItem ?? items[0]?.value);

  const classNames = useInteractionTagListStyles();

  return (
    <TagGroup>
      {items.map((item) => (
        <InteractionTag
          {...interactionTagDefaultProps}
          {...interactionTagProps}
          value={item.value}
          key={item.key}
          appearance={selectedItem === item.value ? 'brand' : 'outline'}
        >
          <InteractionTagPrimary
            onClick={() => {
              setSelectedItem(item.value);
              onTagSelect(item.value);
            }}
            aria-pressed={selectedItem === item.value}
            aria-label={item.text}
            data-automation-id={item.value}
            className={selectedItem === item.value ? classNames.selectedTag : undefined}
          >
            {item.text}
          </InteractionTagPrimary>
        </InteractionTag>
      ))}
    </TagGroup>
  );
};
