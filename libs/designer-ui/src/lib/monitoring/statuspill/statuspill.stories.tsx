import React from 'react';

import { ComponentMeta, ComponentStory } from '@storybook/react';

import { StatusPill, StatusPillProps } from './index';
import './statuspill.story.less';
import Constants from '../../constants';
export default {
  component: StatusPill,
  title: 'Components/Monitoring/StatusPill',
} as ComponentMeta<typeof StatusPill>;

const Template: ComponentStory<typeof StatusPill> = (args: StatusPillProps) => <StatusPill {...args} />;

export const Succeeded = Template.bind({});
Succeeded.args = {
  hasRetries: false,
  status: Constants.STATUS.SUCCEEDED,
  duration: '1m',
};

export const Canceled = Template.bind({});
Canceled.args = {
  hasRetries: false,
  status: Constants.STATUS.CANCELLED,
  duration: '1m',
};

export const Failed = Template.bind({});
Failed.args = {
  hasRetries: false,
  status: Constants.STATUS.FAILED,
  duration: '1m',
};

export const Faulted = Template.bind({});
Faulted.args = {
  hasRetries: false,
  status: Constants.STATUS.FAULTED,
  duration: '1m',
};

export const Ignored = Template.bind({});
Ignored.args = {
  hasRetries: false,
  status: Constants.STATUS.IGNORED,
  duration: '1m',
};

export const Paused = Template.bind({});
Paused.args = {
  hasRetries: false,
  status: Constants.STATUS.PAUSED,
  duration: '1m',
};

export const Running = Template.bind({});
Running.args = {
  hasRetries: false,
  status: Constants.STATUS.RUNNING,
  duration: '1m',
};

export const Skipped = Template.bind({});
Skipped.args = {
  hasRetries: false,
  status: Constants.STATUS.SKIPPED,
  duration: '1m',
};

export const SucceededWithRetries = Template.bind({});
SucceededWithRetries.args = {
  hasRetries: true,
  status: Constants.STATUS.SUCCEEDED,
  duration: '1m',
};

export const Suspended = Template.bind({});
Suspended.args = {
  hasRetries: false,
  status: Constants.STATUS.SUSPENDED,
  duration: '1m',
};

export const TimedOut = Template.bind({});
TimedOut.args = {
  hasRetries: false,
  status: Constants.STATUS.TIMEDOUT,
  duration: '1m',
};

export const Waiting = Template.bind({});
Waiting.args = {
  hasRetries: false,
  status: Constants.STATUS.WAITING,
  duration: '1m',
};

export const NoDuration = Template.bind({});
NoDuration.args = {
  hasRetries: false,
  status: Constants.STATUS.WAITING,
};
