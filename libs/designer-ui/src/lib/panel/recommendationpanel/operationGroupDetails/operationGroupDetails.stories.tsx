import { mockOperationApi, mockOperationActionsData } from './mocks';
import type { OperationGroupDetailsPageProps } from './operationGroupDetails';
import { OperationGroupDetailsPage } from './operationGroupDetails';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: OperationGroupDetailsPage,
  title: 'Components/OperationGroupDetails',
} as ComponentMeta<typeof OperationGroupDetailsPage>;
export const CompletePage: ComponentStory<typeof OperationGroupDetailsPage> = (args: OperationGroupDetailsPageProps) => (
  <div style={{ padding: '16px', width: '560px' }}>
    <OperationGroupDetailsPage {...args} />
  </div>
);

CompletePage.args = {
  operationApi: mockOperationApi,
  operationActionsData: mockOperationActionsData,
};
