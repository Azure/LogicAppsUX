import * as React from 'react';
import { PanelTab } from './';
import constants from '../constants';
import { WorkflowParameters } from '../workflowparameters/workflowparameters';

export const workflowParametersTab: PanelTab = {
  title: 'Workflow Parameters',
  name: constants.PANEL_TAB_NAMES.WORKFLOW_PARAMETERS,
  description: 'Workflow Parameters',
  enabled: true,
  content: (
    <WorkflowParameters
      parameters={[
        {
          id: 'test1',
          defaultValue: 'true',
          type: 'Bool',
          name: 'test',
          isEditable: true,
        },
        {
          id: 'test2',
          defaultValue: '{}',
          type: 'Object',
          name: 'test2',
          isEditable: false,
        },
      ]}
    />
  ),
  order: 0,
  icon: 'EditStyle',
};

export const aboutTab: PanelTab = {
  title: 'About',
  name: constants.PANEL_TAB_NAMES.ABOUT,
  description: 'test tab',
  enabled: true,
  content: <div />,
  order: 0,
  icon: 'EditStyle',
};

export const connectionTab: PanelTab = {
  title: 'Connection Long Name',
  name: constants.PANEL_TAB_NAMES.AUTH_CONNECTION,
  description: 'test tab',
  enabled: true,
  content: <div />,
  order: 0,
  icon: 'EditStyle',
};
