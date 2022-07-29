import constants from '../../../common/constants';
import type { PanelTab } from '@microsoft/designer-ui';
import { DictionaryEditor, testTokenSegment, SchemaEditor, Combobox, ValueSegmentType, ArrayEditor, Scratch } from '@microsoft/designer-ui';

export const ScratchTab = () => {
  const children = (): React.ReactNode => {
    return (
      <>
        <ArrayEditor
          labelProps={{ text: 'Input Array', isRequiredField: true }}
          initialItems={[
            {
              key: 'test',
              content: [
                { type: ValueSegmentType.LITERAL, value: 'This is Text' },
                testTokenSegment,
                { type: ValueSegmentType.LITERAL, value: 'Some Text' },
              ],
            },
            {
              key: 'test',
              content: [testTokenSegment, testTokenSegment, { type: ValueSegmentType.LITERAL, value: 'More Text' }],
            },
          ]}
        />
        <Combobox
          options={[
            { displayName: 'GET', value: 'GET', key: 'GET', disabled: false },
            { displayName: 'PUT', value: 'PUT', key: 'PUT', disabled: false },
            { displayName: 'POST', value: 'POST', key: 'POST', disabled: false },
            { displayName: 'PATCH', value: 'PATCH', key: 'PATCH', disabled: false },
            { displayName: 'DELETE', value: 'DELETE', key: 'DELETE', disabled: false },
          ]}
          placeholder="Method is Required"
          label="Method"
          selectedKey="PUT"
          customValue={null}
          initialValue={[{ id: '0', type: ValueSegmentType.LITERAL, value: 'PUT' }]}
        />
        <SchemaEditor
          initialValue={[{ id: '0', type: ValueSegmentType.LITERAL, value: '{\n"type": "object",\n"properties" : {}\n}' }]}
          label="Request Body JSON Schema"
        />
        <DictionaryEditor
          initialItems={[
            {
              key: [
                { type: ValueSegmentType.LITERAL, value: 'Key Text' },
                testTokenSegment,
                { type: ValueSegmentType.LITERAL, value: 'More Text' },
              ],
              value: [
                { type: ValueSegmentType.LITERAL, value: 'Value Text' },
                testTokenSegment,
                { type: ValueSegmentType.LITERAL, value: 'Additional Text' },
              ],
            },
            {
              key: [testTokenSegment, testTokenSegment, { type: ValueSegmentType.LITERAL, value: 'Key2 Text' }],
              value: [testTokenSegment, testTokenSegment, { type: ValueSegmentType.LITERAL, value: 'Value2 Text' }],
            },
          ]}
        />
      </>
    );
  };
  return <Scratch> {children()} </Scratch>;
};

export const scratchTab: PanelTab = {
  title: 'Scratch',
  name: constants.PANEL_TAB_NAMES.SCRATCH,
  description: 'To be removed',
  visible: true,
  content: <ScratchTab />,
  order: 0,
  icon: 'Rerun',
};
