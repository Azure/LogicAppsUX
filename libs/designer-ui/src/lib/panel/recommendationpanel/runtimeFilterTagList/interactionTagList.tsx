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

export const InteractionTagList = ({
  items,
  onTagSelect,
  initialSelectedItem,
  ...interactionTagProps
}: InteractionTagListProps & Partial<InteractionTagProps>) => {
  const [selectedItem, setSelectedItem] = React.useState<string | undefined>(initialSelectedItem ?? items[0]?.value);
  const classNames = useInteractionTagListStyles();

  const handleTagSelect = (value: string) => {
    setSelectedItem(value);
    onTagSelect(value);
  };

  return (
    <TagGroup>
      {items.map(({ key, text, value }) => (
        <InteractionTag
          key={key}
          {...interactionTagDefaultProps}
          {...interactionTagProps}
          value={value}
          appearance={selectedItem === value ? 'brand' : 'outline'}
        >
          <InteractionTagPrimary
            onClick={() => handleTagSelect(value)}
            aria-pressed={selectedItem === value}
            aria-label={text}
            data-automation-id={value}
            className={selectedItem === value ? classNames.selectedTag : undefined}
          >
            {text}
          </InteractionTagPrimary>
        </InteractionTag>
      ))}
    </TagGroup>
  );
};
