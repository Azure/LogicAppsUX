import type { AppDispatch } from '../../state/store';
import { useIsLocal, useIsConsumption } from '../../state/workflowLoadingSelectors';
import { setConsumption, setIsLocalSelected } from '../../state/workflowLoadingSlice';
import { ChoiceGroup } from '@fluentui/react';
import { useDispatch } from 'react-redux';

const SourceSettings = () => {
  const isLocal = useIsLocal();
  const isConsumption = useIsConsumption();
  const dispatch = useDispatch<AppDispatch>();

  return (
    <div style={{ display: 'flex', gap: '24px' }}>
      <ChoiceGroup
        label="Environment"
        options={[
          { key: 'azure', text: 'Azure' },
          { key: 'local', text: 'Local' },
        ]}
        onChange={(_, option) => dispatch(setIsLocalSelected(option?.key === 'local'))}
        selectedKey={isLocal ? 'local' : 'azure'}
      />
      <ChoiceGroup
        label="Runtime"
        options={[
          { key: 'standard', text: 'Standard' },
          { key: 'consumption', text: 'Consumption' },
        ]}
        onChange={(_, option) => dispatch(setConsumption(option?.key === 'consumption'))}
        selectedKey={isConsumption ? 'consumption' : 'standard'}
      />
    </div>
  );
};

export default SourceSettings;
