import React from 'react';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { PanelContainer, PanelContainerProps } from './';
import { WorkflowParameters } from '../workflowparameters/workflowparameters';

export default {
  component: PanelContainer,
  title: 'Components/Panel',
} as ComponentMeta<typeof PanelContainer>;
export const Standard: ComponentStory<typeof PanelContainer> = (args: PanelContainerProps) => <PanelContainer {...args} />;

Standard.args = {
  isRight: true,
  width: '30vw',
  tabs: [
    { itemKey: 'Parameters', itemText: 'Parameters', content: <div> Parameters </div> },
    { itemKey: 'Query Parameters', itemText: 'Query Parameters', content: <div> Query Parameters </div> },
    { itemKey: 'Recommendations', itemText: 'Recommendations', content: <div> Recommendations </div> },
    { itemKey: 'Settings', itemText: 'Settings', content: <div> Settings </div> },
    { itemKey: 'Code View', itemText: 'Code View', content: <div> Code View </div> },
    { itemKey: 'Testing', itemText: 'Testing', content: <div> Testing </div> },
    {
      itemKey: 'Workflow Parameters',
      itemText: 'Workflow Parameters',
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
    },
  ],
};
