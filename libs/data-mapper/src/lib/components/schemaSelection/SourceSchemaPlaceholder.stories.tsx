import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { SourceSchemaPlaceholder } from './SourceSchemaPlaceholder';
import type { SourceSchemaPlaceholderProps } from './SourceSchemaPlaceholder';

export default {
  component: SourceSchemaPlaceholder,
  title: 'Data Mapper Components/SelectSchemaCard',
} as ComponentMeta<typeof SourceSchemaPlaceholder>;

export const Standard: ComponentStory<typeof SourceSchemaPlaceholder> = (args: SourceSchemaPlaceholderProps) => <SourceSchemaPlaceholder {...args} />;
Standard.args = {
  onClickSelectElement: () => console.log('Clicked select element'),
};
