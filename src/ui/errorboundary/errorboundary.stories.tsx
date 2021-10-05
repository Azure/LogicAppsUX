// Button.stories.ts | Button.stories.tsx

import React from 'react';

import { ComponentMeta, ComponentStory } from '@storybook/react';

import { ErrorBoundary } from './index';
export default {
  component: ErrorBoundary,
  title: 'Components/ErrorBoundary',
} as ComponentMeta<typeof ErrorBoundary>;

const Fallback = () => {
  return <div>Fallback rendered when error occurs</div>;
};
const ThrowError = () => {
  throw new Error("I'm an error");
};

export const Standard: ComponentStory<typeof ErrorBoundary> = () => {
  return (
    <>
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    </>
  );
};

export const WithAFallback: ComponentStory<typeof ErrorBoundary> = () => {
  return (
    <>
      <ErrorBoundary fallback={<Fallback />}>
        <ThrowError />
      </ErrorBoundary>
    </>
  );
};
