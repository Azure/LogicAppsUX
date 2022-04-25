// Button.stories.ts | Button.stories.tsx
import type { SearchBoxProps } from '.';
import { DesignerSearchBox } from '.';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: DesignerSearchBox,
  title: 'Components/SearchBox',
} as ComponentMeta<typeof DesignerSearchBox>;

const mockSearch = (term: string) => null;

const props: SearchBoxProps = {
  onSearch: mockSearch,
};

export const Standard: ComponentStory<typeof DesignerSearchBox> = () => <DesignerSearchBox {...props} />;
