import * as React from 'react';
import { PanelTab } from './';
import constants from '../constants';
import { useIntl } from 'react-intl';
import { WorkflowParameters } from '../workflowparameters/workflowparameters';

// const HandleIntl = (input: string): string => {
//   const intl = useIntl();
//   switch (input) {
//     case 'workflowParameterTitle': {
//       const workflowParameterTitle = intl.formatMessage({
//         defaultMessage: 'Workflow Parameters',
//         description: 'Label for workflow parameter panel title',
//       });
//       return workflowParameterTitle;
//     }
//     default:
//       return '';
//   }
// };

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
