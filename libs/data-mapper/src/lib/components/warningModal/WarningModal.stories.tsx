import { openDiscardWarning } from '../../core/state/ModalSlice';
import { store } from '../../core/state/Store';
import { WarningModal } from './WarningModal';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { Provider } from 'react-redux';

const MockStore = ({ children }) => {
  store.dispatch(openDiscardWarning());
  return <Provider store={store}>{children}</Provider>;
};

export default {
  component: WarningModal,
  title: 'Data Mapper Components/Notifications/Warning modal',
} as ComponentMeta<typeof WarningModal>;

const Template: ComponentStory<typeof WarningModal> = () => <WarningModal />;

export const DiscardChange = Template.bind({});

DiscardChange.decorators = [
  (story) => {
    return <MockStore>{story()}</MockStore>;
  },
];
