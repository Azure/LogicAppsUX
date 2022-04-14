// Button.stories.ts | Button.stories.tsx
import { DesignerSearchBox } from '.';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: DesignerSearchBox,
  title: 'Components/SearchBox',
} as ComponentMeta<typeof DesignerSearchBox>;

export const Standard: ComponentStory<typeof DesignerSearchBox> = () => <DesignerSearchBox name={'name'} />;
