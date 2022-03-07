// errorboundary.stories.js|jsx|ts|tsx
import type { ErrorBoundaryProps } from './index';
import { ErrorBoundary } from './index';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: ErrorBoundary,
  title: 'Components/ErrorBoundary',
} as ComponentMeta<typeof ErrorBoundary>;

const Fallback = () => <div>Fallback rendered when error occurs</div>;
const ThrowError = () => {
  throw new Error("I'm an error");
};

const Template: ComponentStory<typeof ErrorBoundary> = (args: ErrorBoundaryProps) => (
  <ErrorBoundary {...args}>
    <ThrowError />
  </ErrorBoundary>
);

export const Standard = Template.bind({});

export const WithFallback = Template.bind({});
WithFallback.args = {
  fallback: <Fallback />,
};
