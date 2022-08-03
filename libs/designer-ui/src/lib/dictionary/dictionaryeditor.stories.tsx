import { ValueSegmentType } from '../editor/models/parameter';
// import { testTokenSegment } from '../editor/shared/testtokensegment';
import type { DictionaryEditorProps } from './';
import { DictionaryEditor } from './';
import { guid } from '@microsoft-logic-apps/utils';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: DictionaryEditor,
  title: 'Components/Editor/Dictionary',
} as ComponentMeta<typeof DictionaryEditor>;
const Template: ComponentStory<typeof DictionaryEditor> = (args: DictionaryEditorProps) => <DictionaryEditor {...args} />;

export const Standard = Template.bind({});
Standard.args = {
  initialItems: [
    {
      key: [
        { id: guid(), type: ValueSegmentType.LITERAL, value: 'Key Text' },
        // testTokenSegment,
        { id: guid(), type: ValueSegmentType.LITERAL, value: 'More Text' },
      ],
      value: [
        { id: guid(), type: ValueSegmentType.LITERAL, value: 'Value Text' },
        // testTokenSegment,
        { id: guid(), type: ValueSegmentType.LITERAL, value: 'Additional Text' },
      ],
    },
    {
      key: [
        // testTokenSegment, testTokenSegment,
        { id: guid(), type: ValueSegmentType.LITERAL, value: 'Key2 Text' },
      ],
      value: [
        // testTokenSegment, testTokenSegment,
        { id: guid(), type: ValueSegmentType.LITERAL, value: 'Value2 Text' },
      ],
    },
  ],
};
