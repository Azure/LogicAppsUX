// Button.stories.ts | Button.stories.tsx

import React from 'react'

import { Meta } from '@storybook/react';

import { TestElement } from './index';

export default {
  component: TestElement,
  title: 'Components/TestElement',
} as Meta;

export const Primary: React.VFC<{}> = () => <TestElement text="Hello World"></TestElement>;
export const Secondary: React.VFC<{}> = () => <TestElement text="Goodbye World"></TestElement>;
export const InaccessibleButton = () => (
  <button style={{ backgroundColor: 'red', color: 'darkRed' }}>Inaccessible button</button>
);