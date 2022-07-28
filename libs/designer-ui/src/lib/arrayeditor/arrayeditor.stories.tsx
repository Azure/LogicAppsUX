import { ValueSegmentType } from '../editor/models/parameter';
// Tokens commented out until Tokens enabled in storybook
// import { testTokenSegment } from '../editor/shared/testtokensegment';
import type { ArrayEditorProps } from './';
import { ArrayEditor } from './';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: ArrayEditor,
  title: 'Components/Editor/Array',
} as ComponentMeta<typeof ArrayEditor>;
const Template: ComponentStory<typeof ArrayEditor> = (args: ArrayEditorProps) => <ArrayEditor {...args} />;

export const Standard = Template.bind({});
Standard.args = {
  labelProps: { text: 'Input Array', isRequiredField: true },
  initialItems: [
    {
      key: 'test',
      content: [
        { type: ValueSegmentType.LITERAL, value: 'This is Text' },
        // testTokenSegment,
        { type: ValueSegmentType.LITERAL, value: 'More Text' },
      ],
    },
    {
      key: 'test2',
      content: [
        // testTokenSegment, testTokenSegment,
        { type: ValueSegmentType.LITERAL, value: 'More Text' },
      ],
    },
  ],
};
