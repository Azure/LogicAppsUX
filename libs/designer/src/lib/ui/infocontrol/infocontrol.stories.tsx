// Button.stories.ts | Button.stories.tsx

import React from 'react';

import { ComponentMeta, ComponentStory } from '@storybook/react';

import { InfoControl, InfoControlProps } from './index';
import { MessageBarType } from '@fluentui/react';

export default {
  component: InfoControl,
  title: 'Components/InfoControl',
} as ComponentMeta<typeof InfoControl>;

export const Standard: ComponentStory<typeof InfoControl> = (args: InfoControlProps) => <InfoControl {...args} />;

Standard.args = {
  dismissButtonAriaLabel: 'Dismiss',
  dismissible: true,
  infoText: 'XSLT 2.0 and XSLT 3.0 are in Preview.',
  messageBarType: MessageBarType.info,
};
