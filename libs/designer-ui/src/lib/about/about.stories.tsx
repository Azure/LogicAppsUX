import type { AboutProps } from '.';
import { About } from './';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: About,
  title: 'Components/About',
} as ComponentMeta<typeof About>;
export const Standard: ComponentStory<typeof About> = (args: AboutProps) => <About {...args} />;

Standard.args = {
  connectorDisplayName: 'Node Name',
  description: 'This is a description ',
  descriptionDocumentation: { url: 'www.example.com', description: 'more info' },
  headerIcons: [
    { title: 'Tag1', badgeText: 'test' },
    { title: 'Tag2', badgeText: 'more' },
  ],
};
