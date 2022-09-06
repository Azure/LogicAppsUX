import { store } from '../../core/state/Store';
import type { EditorCommandBarProps } from './EditorCommandBar';
import { EditorCommandBar } from './EditorCommandBar';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { Provider } from 'react-redux';

const MockStore = ({ children }) => {
  return <Provider store={store}>{children}</Provider>;
};

export default {
  component: EditorCommandBar,
  title: 'Data Mapper Components/Command Bar',
} as ComponentMeta<typeof EditorCommandBar>;

const Template: ComponentStory<typeof EditorCommandBar> = (args: EditorCommandBarProps) => <EditorCommandBar {...args} />;

Template.args = {
  onSaveClick: () => console.log('Save button clicked'),
  onUndoClick: () => console.log('Undo button clicked'),
  onRedoClick: () => console.log('Redo button clicked'),
};

export const Editor = Template.bind({});
Editor.decorators = [
  (story) => {
    return <MockStore>{story()}</MockStore>;
  },
];
