import type { RunAfterActionDetailsProps } from './runafteractiondetails';
import { RunAfterActionDetails } from './runafteractiondetails';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: RunAfterActionDetails,
  title: 'Components/RunAfter',
} as ComponentMeta<typeof RunAfterActionDetails>;
const Template: ComponentStory<typeof RunAfterActionDetails> = (args: RunAfterActionDetailsProps) => <RunAfterActionDetails {...args} />;

export const runAfter = Template.bind({});
runAfter.args = {
  collapsible: true,
  expanded: false,
  icon: 'https://connectoricons-prod.azureedge.net/release-2021-12-11-apseth/1.0.1538.2616/sftpwithssh/icon.png',
  id: 'test',
  isDeleteVisible: true,
  readOnly: false,
  title: 'List Files in Folder',
  statuses: ['succeeded', 'failed'],
};
