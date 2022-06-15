import type { RunAfterProps } from '.';
import { RunAfter } from '.';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: RunAfter,
  title: 'Components/RunAfter/multiple',
} as ComponentMeta<typeof RunAfter>;
const Template: ComponentStory<typeof RunAfter> = (args: RunAfterProps) => <RunAfter {...args} />;

const items = [
  {
    collapsible: true,
    expanded: false,
    icon: 'https://connectoricons-prod.azureedge.net/release-2021-12-11-apseth/1.0.1538.2616/sftpwithssh/icon.png',
    id: 'test',
    isDeleteVisible: true,
    readOnly: false,
    title: 'List Files in Folder',
    statuses: ['succeeded', 'failed'],
  },
  {
    collapsible: true,
    expanded: false,
    icon: 'https://connectoricons-prod.azureedge.net/release-2021-12-11-apseth/1.0.1538.2616/sftpwithssh/icon.png',
    id: 'test',
    isDeleteVisible: true,
    readOnly: false,
    title: 'List Files in Folder',
    statuses: ['succeeded', 'failed'],
  },
];
export const multipleRunAfter = Template.bind({});
multipleRunAfter.args = { items };
