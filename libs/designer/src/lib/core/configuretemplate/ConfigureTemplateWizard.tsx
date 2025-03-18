import { useSelector } from 'react-redux';
import type { RootState } from '../state/templates/store';
import { useState } from 'react';
import { ResourcePicker } from '../../ui/templates/basics/resourcepicker';
import { equals } from '@microsoft/logic-apps-shared';
import { useWorkflowsInApp } from '../templates/utils/queries';
import { Button, Checkbox } from '@fluentui/react-components';

export const ConfigureTemplateWizard = () => {
  const { isConsumption, logicAppName, subscriptionId, resourceGroup } = useSelector((state: RootState) => state.workflow);
  const [disableSelection, setDisableSelection] = useState<boolean>(false);
  const { data: workflows, isLoading } = useWorkflowsInApp(subscriptionId, resourceGroup, logicAppName ?? '', !!isConsumption);
  return (
    <div>
      <ResourcePicker onSelectApp={(app) => setDisableSelection(equals(app.plan, 'consumption'))} />
      <div>
        <h4>Workflows</h4>
        <div>
          {isLoading ? <div>Loading...</div> : workflows?.map((w) => <Checkbox disabled={disableSelection} label={w.name} key={w.id} />)}
        </div>
      </div>
      <div>
        <Button>{'Get Connections'}</Button>
        <Button>{'Get Parameters'}</Button>
      </div>
    </div>
  );
};
