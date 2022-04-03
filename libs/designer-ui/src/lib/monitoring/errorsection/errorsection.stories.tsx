import type { ErrorSectionProps } from './';
import { ErrorSection } from './';
import { MessageBarType } from '@fluentui/react';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: ErrorSection,
  title: 'Components/Monitoring/ErrorSection',
} as ComponentMeta<typeof ErrorSection>;
export const Standard: ComponentStory<typeof ErrorSection> = (args: ErrorSectionProps) => <ErrorSection {...args} />;

Standard.args = {
  className: 'msla-error-section',
  error: {
    code: 'Unauthorized',
    message: 'The user is not authorized to perform the request.',
    messageBarType: MessageBarType.warning,
  },
};
