import { environment } from '../../../environments/environment';
import { getStateHistory } from '../../state/historyHelpers';
import type { AppDispatch } from '../../state/store';
import { useIsLocal, useHostingPlan, useResourcePath } from '../../state/workflowLoadingSelectors';
import { type HostingPlanTypes, loadLastWorkflow, setHostingPlan, setIsLocalSelected } from '../../state/workflowLoadingSlice';
import { ChoiceGroup, IconButton } from '@fluentui/react';
import { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { LocalLogicAppSelector } from '../LocalDesigner/LogicAppSelector/LogicAppSelector';
import { AzureConsumptionLogicAppSelector } from '../AzureLogicAppsDesigner/LogicAppSelectionSetting/AzureConsumptionLogicAppSelector';
import { AzureStandardLogicAppSelector } from '../AzureLogicAppsDesigner/LogicAppSelectionSetting/AzureStandardLogicAppSelector';

const SourceSettings = ({
  showEnvironment = true,
  showHistoryButton = true,
  showHybridPlan = true,
}: { showEnvironment?: boolean; showHistoryButton?: boolean; showHybridPlan?: boolean }) => {
  const isLocal = useIsLocal();
  const hostingPlan = useHostingPlan();

  const dispatch = useDispatch<AppDispatch>();

  const resourcePath = useResourcePath();
  const stateHistory = useMemo(() => getStateHistory(), []);

  const armToken = environment.armToken;
  useEffect(() => {
    if (!armToken && showEnvironment) {
      dispatch(setIsLocalSelected(true));
    }
  }, [armToken, dispatch, showEnvironment]);
  const planOptions = [
    { key: 'standard', text: 'Standard' },
    { key: 'consumption', text: 'Consumption' },
  ];
  if (showHybridPlan) {
    planOptions.push({ key: 'hybrid', text: 'Hybrid' });
  }

  return (
    <div style={{ display: 'flex', gap: '24px' }}>
      {showEnvironment ? (
        <ChoiceGroup
          label="Environment"
          options={[
            { key: 'azure', text: 'Azure', disabled: !armToken },
            { key: 'local', text: 'Local' },
          ]}
          onChange={(_, option) => dispatch(setIsLocalSelected(option?.key === 'local'))}
          selectedKey={isLocal ? 'local' : 'azure'}
        />
      ) : null}
      <ChoiceGroup
        label="Plan"
        options={planOptions}
        onChange={(_, option) => dispatch(setHostingPlan((option?.key as HostingPlanTypes) || 'standard'))}
        selectedKey={hostingPlan}
      />
      {/* History Button to load last loaded workflow */}
      {showHistoryButton && !resourcePath && stateHistory ? (
        <IconButton iconProps={{ iconName: 'History' }} title="History" ariaLabel="History" onClick={() => dispatch(loadLastWorkflow())} />
      ) : null}
      {/* Logic App Selector */}
      <div style={{ flexGrow: 1 }}>
        {isLocal ? (
          <LocalLogicAppSelector />
        ) : hostingPlan === 'consumption' ? (
          <AzureConsumptionLogicAppSelector />
        ) : (
          <AzureStandardLogicAppSelector />
        )}
      </div>
    </div>
  );
};

export default SourceSettings;
