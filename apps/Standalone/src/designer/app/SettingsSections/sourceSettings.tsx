import { environment } from '../../../environments/environment';
import { getStateHistory } from '../../state/historyHelpers';
import type { AppDispatch } from '../../state/store';
import { useIsLocal, useIsConsumption, useResourcePath } from '../../state/workflowLoadingSelectors';
import { loadLastWorkflow, setConsumption, setIsLocalSelected } from '../../state/workflowLoadingSlice';
import { ChoiceGroup, IconButton } from '@fluentui/react';
import { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';

const SourceSettings = ({
  showEnvironment = true,
  showHistoryButton = true,
}: { showEnvironment?: boolean; showHistoryButton?: boolean }) => {
  const isLocal = useIsLocal();
  const isConsumption = useIsConsumption();
  const dispatch = useDispatch<AppDispatch>();

  const resourcePath = useResourcePath();
  const stateHistory = useMemo(() => getStateHistory(), []);

  const armToken = environment.armToken;
  useEffect(() => {
    if (!armToken && showEnvironment) {
      dispatch(setIsLocalSelected(true));
    }
  }, [armToken, dispatch, showEnvironment]);

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
        options={[
          { key: 'standard', text: 'Standard' },
          { key: 'consumption', text: 'Consumption' },
        ]}
        onChange={(_, option) => dispatch(setConsumption(option?.key === 'consumption'))}
        selectedKey={isConsumption ? 'consumption' : 'standard'}
      />
      {/* History Button to load last loaded workflow */}
      {showHistoryButton && !resourcePath && stateHistory ? (
        <IconButton iconProps={{ iconName: 'History' }} title="History" ariaLabel="History" onClick={() => dispatch(loadLastWorkflow())} />
      ) : null}
    </div>
  );
};

export default SourceSettings;
