import type { RunAfterActionDetailsProps } from './runafteractiondetails';
import { RunAfterActionDetails } from './runafteractiondetails';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: RunAfterActionDetails,
  title: 'Components/RunAfter/single',
} as ComponentMeta<typeof RunAfterActionDetails>;
const Template: ComponentStory<typeof RunAfterActionDetails> = (args: RunAfterActionDetailsProps) => <RunAfterActionDetails {...args} />;

export const runAfter = Template.bind({});
runAfter.args = {
  collapsible: true,
  expanded: false,
  id: 'test',
  isDeleteVisible: true,
  readOnly: false,
  title: 'List Files in Folder',
  statuses: ['succeeded', 'failed'],
};
